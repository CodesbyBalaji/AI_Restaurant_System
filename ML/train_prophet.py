import pandas as pd
import numpy as np
import joblib
import warnings

warnings .filterwarnings ("ignore")

from sqlalchemy import create_engine
from prophet import Prophet
from sklearn .metrics import (
mean_absolute_error ,
mean_absolute_percentage_error ,
r2_score
)

DB_USER ="root"
DB_PASSWORD ="balaji900"
DB_HOST ="localhost"
DB_NAME ="restaurantdb"

engine =create_engine (
f"mysql+pymysql://{DB_USER }:{DB_PASSWORD }@{DB_HOST }/{DB_NAME }"
)

print ("Loading data from MySQL ...")

query ="""
SELECT
    MenuItemId,
    DATE(OrderedAt)   AS OrderDate,
    SUM(Quantity)     AS TotalQuantity
FROM Orders
WHERE Status != 'Cancelled'
GROUP BY MenuItemId, DATE(OrderedAt)
ORDER BY MenuItemId, OrderDate
"""

df =pd .read_sql (query ,engine )
df ["OrderDate"]=pd .to_datetime (df ["OrderDate"])

print (
f"  Loaded {len (df ):,} daily rows "
f"for {df ['MenuItemId'].nunique ()} items."
)

ITEM_NAMES ={
1 :"Biryani",
2 :"Fried Rice",
3 :"Noodles",
4 :"Burger",
5 :"Pizza"
}

def build_prophet_df (item_df :pd .DataFrame )->pd .DataFrame :
    """
    Takes a raw item dataframe (OrderDate, TotalQuantity),
    fills missing dates, adds all regressors, drops NaNs.
    """

    item_df =item_df .sort_values ("OrderDate")

    full_dates =pd .date_range (
    start =item_df ["OrderDate"].min (),
    end =item_df ["OrderDate"].max (),
    freq ="D"
    )
    item_df =(
    item_df
    .set_index ("OrderDate")
    .reindex (full_dates )
    .fillna (0 )
    .rename_axis ("OrderDate")
    .reset_index ()
    )

    p =pd .DataFrame ()
    p ["ds"]=pd .to_datetime (item_df ["OrderDate"])
    p ["y"]=item_df ["TotalQuantity"].astype (float )

    p ["is_weekend"]=(p ["ds"].dt .dayofweek >=5 ).astype (int )
    p ["day_of_week"]=p ["ds"].dt .dayofweek
    p ["month"]=p ["ds"].dt .month
    p ["is_month_end"]=p ["ds"].dt .is_month_end .astype (int )

    p ["lag_1"]=p ["y"].shift (1 )
    p ["lag_7"]=p ["y"].shift (7 )
    p ["lag_14"]=p ["y"].shift (14 )

    p ["rolling_3"]=p ["y"].rolling (3 ).mean ()
    p ["rolling_7"]=p ["y"].rolling (7 ).mean ()
    p ["rolling_14"]=p ["y"].rolling (14 ).mean ()
    p ["rolling_21"]=p ["y"].rolling (21 ).mean ()

    p ["rolling_std_7"]=p ["y"].rolling (7 ).std ()

    p ["trend_slope_7"]=(
    p ["y"].rolling (8 ).apply (
    lambda x :np .polyfit (range (len (x )),x ,1 )[0 ],
    raw =True
    )
    )

    p =p .dropna ().reset_index (drop =True )
    return p

REGRESSORS =[
"is_weekend",
"day_of_week",
"month",
"is_month_end",
"lag_1",
"lag_7",
"lag_14",
"rolling_3",
"rolling_7",
"rolling_14",
"rolling_21",
"rolling_std_7",
"trend_slope_7",
]

models ={}
overall_results =[]

for item_id in sorted (df ["MenuItemId"].unique ()):

    print ("\n"+"="*60 )
    item_name =ITEM_NAMES .get (item_id ,f"Item {item_id }")
    print (f"  Training: {item_name } (id={item_id })")
    print ("="*60 )

    item_df =df [df ["MenuItemId"]==item_id ][
    ["OrderDate","TotalQuantity"]
    ].copy ()

    prophet_df =build_prophet_df (item_df )

    if len (prophet_df )<120 :
        print ("  ⚠  Not enough data — skipping")
        continue

    split_index =int (len (prophet_df )*0.85 )
    train_df =prophet_df .iloc [:split_index ].copy ()
    test_df =prophet_df .iloc [split_index :].copy ()

    print (
    f"  Train: {train_df ['ds'].min ().date ()} → "
    f"{train_df ['ds'].max ().date ()} ({len (train_df )} days)"
    )
    print (
    f"  Test : {test_df ['ds'].min ().date ()} → "
    f"{test_df ['ds'].max ().date ()} ({len (test_df )} days)"
    )

    cv =(
    prophet_df ["y"].std ()
    /(prophet_df ["y"].mean ()+1e-6 )
    )

    if cv >0.8 :
        changepoint_scale =0.30
    elif cv >0.5 :
        changepoint_scale =0.18
    else :
        changepoint_scale =0.10

    model =Prophet (
    yearly_seasonality =True ,
    weekly_seasonality =True ,
    daily_seasonality =False ,
    changepoint_prior_scale =changepoint_scale ,
    seasonality_prior_scale =15 ,
    holidays_prior_scale =20 ,
    seasonality_mode ="multiplicative",
    interval_width =0.90 ,
    n_changepoints =30 ,
    )

    model .add_country_holidays (country_name ="IN")

    for reg in REGRESSORS :
        model .add_regressor (reg )

    model .fit (train_df )

    future =model .make_future_dataframe (
    periods =len (test_df ),freq ="D"
    )

    full_df =pd .concat ([train_df ,test_df ],ignore_index =True )

    future =future .merge (
    full_df [["ds"]+REGRESSORS ],
    on ="ds",
    how ="left"
    )

    for col in REGRESSORS :
        future [col ]=future [col ].fillna (
        train_df [col ].iloc [-1 ]
        )

    forecast =model .predict (future )

    preds =np .maximum (
    forecast ["yhat"].tail (len (test_df )).values ,
    0
    )
    actuals =test_df ["y"].values

    mae =mean_absolute_error (actuals ,preds )
    mape =mean_absolute_percentage_error (actuals ,preds )*100
    r2 =r2_score (actuals ,preds )
    accuracy =max (0.0 ,100 -mape )

    r2_clipped =max (0.0 ,min (1.0 ,r2 ))
    confidence =0.65 *accuracy +0.35 *(r2_clipped *100 )
    confidence =max (50.0 ,min (97.0 ,round (confidence ,1 )))

    print (f"\n  MAE        : {mae :.2f}")
    print (f"  MAPE       : {mape :.2f}%")
    print (f"  R²         : {r2 :.3f}")
    print (f"  Confidence : {confidence }%")

    sample =pd .DataFrame ({
    "Date":test_df ["ds"].head (10 ).dt .date ,
    "Actual":actuals [:10 ].round (1 ),
    "Predicted":preds [:10 ].round (1 ),
    "Error":(preds [:10 ]-actuals [:10 ]).round (1 ),
    })
    print ("\n  Sample predictions (first 10 test days):")
    print (sample .to_string (index =False ))

    overall_results .append ({
    "Item":item_name ,
    "MAE":round (mae ,2 ),
    "MAPE":round (mape ,2 ),
    "R2":round (r2 ,3 ),
    "Confidence":confidence ,
    })

    last_row =prophet_df .iloc [-1 ]

    models [item_id ]={
    "model":model ,
    "dish_name":item_name ,
    "accuracy":round (accuracy ,2 ),
    "confidence":confidence ,
    "mape":round (mape ,2 ),
    "mae":round (mae ,2 ),
    "r2":round (r2 ,3 ),

    "last_y":float (last_row ["y"]),
    "last_lag_1":float (last_row ["lag_1"]),
    "last_lag_7":float (last_row ["lag_7"]),
    "last_lag_14":float (last_row ["lag_14"]),
    "last_rolling_3":float (last_row ["rolling_3"]),
    "last_rolling_7":float (last_row ["rolling_7"]),
    "last_rolling_14":float (last_row ["rolling_14"]),
    "last_rolling_21":float (last_row ["rolling_21"]),
    "last_rolling_std_7":float (last_row ["rolling_std_7"]),
    "last_trend_slope_7":float (last_row ["trend_slope_7"]),
    "last_month":int (last_row ["month"]),
    "last_is_weekend":int (last_row ["is_weekend"]),
    "last_day_of_week":int (last_row ["day_of_week"]),
    "last_is_month_end":int (last_row ["is_month_end"]),

    "recent_y_30":prophet_df ["y"].tail (30 ).tolist (),

    "last_ds":prophet_df ["ds"].iloc [-1 ],
    }

results_df =pd .DataFrame (overall_results )

print ("\n"+"="*60 )
print ("OVERALL RESULTS")
print ("="*60 )
print (results_df .to_string (index =False ))
print (f"\nMean MAE        : {results_df ['MAE'].mean ():.2f}")
print (f"Mean MAPE       : {results_df ['MAPE'].mean ():.2f}%")
print (f"Mean R²         : {results_df ['R2'].mean ():.3f}")
print (f"Mean Confidence : {results_df ['Confidence'].mean ():.1f}%")

joblib .dump (models ,"prophet_models.pkl")
print ("\n✅  Models saved → prophet_models.pkl")