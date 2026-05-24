import pandas as pd 
import numpy as np 
import joblib 

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

query ="""
SELECT
    MenuItemId,
    DATE(OrderedAt) as OrderDate,
    SUM(Quantity) as TotalQuantity
FROM Orders
GROUP BY MenuItemId, DATE(OrderedAt)
ORDER BY MenuItemId, OrderDate
"""

df =pd .read_sql (query ,engine )

df ["OrderDate"]=pd .to_datetime (df ["OrderDate"])

models ={}

all_results =[]

for item_id in sorted (df ["MenuItemId"].unique ()):

    print ("\n"+"="*60 )
    print (f"Item {item_id }")
    print ("="*60 )

    item_df =df [
    df ["MenuItemId"]==item_id 
    ].copy ()

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

    item_df ["MenuItemId"]=item_id 

    item_df .rename (
    columns ={
    "index":"OrderDate"
    },
    inplace =True 
    )

    prophet_df =pd .DataFrame ()

    prophet_df ["ds"]=pd .to_datetime (
    item_df ["OrderDate"]
    )

    prophet_df ["y"]=(
    item_df ["TotalQuantity"]
    .astype (float )
    )

    prophet_df ["is_weekend"]=(
    prophet_df ["ds"].dt .dayofweek >=5 
    ).astype (int )

    prophet_df ["lag_1"]=(
    prophet_df ["y"].shift (1 )
    )

    prophet_df ["lag_7"]=(
    prophet_df ["y"].shift (7 )
    )

    prophet_df ["rolling_7"]=(
    prophet_df ["y"]
    .rolling (7 )
    .mean ()
    )

    prophet_df ["rolling_14"]=(
    prophet_df ["y"]
    .rolling (14 )
    .mean ()
    )

    prophet_df =prophet_df .dropna ()

    if len (prophet_df )<60 :

        print ("Not enough data")

        continue 

    split_index =int (
    len (prophet_df )*0.8 
    )

    train_df =prophet_df .iloc [:split_index ]

    test_df =prophet_df .iloc [split_index :]

    model =Prophet (

    yearly_seasonality =True ,

    weekly_seasonality =True ,

    daily_seasonality =False ,

    changepoint_prior_scale =0.08 ,

    seasonality_prior_scale =15 ,

    holidays_prior_scale =20 ,

    seasonality_mode ="multiplicative",

    interval_width =0.95 
    )

    model .add_country_holidays (
    country_name ='IN'
    )

    regressors =[

    "is_weekend",

    "lag_1",

    "lag_7",

    "rolling_7",

    "rolling_14"
    ]

    for reg in regressors :

        model .add_regressor (reg )

    model .fit (train_df )

    future =model .make_future_dataframe (

    periods =len (test_df ),

    freq ="D"
    )

    full_df =pd .concat ([
    train_df ,
    test_df 
    ])

    future =future .merge (

    full_df [[
    "ds",
    "is_weekend",
    "lag_1",
    "lag_7",
    "rolling_7",
    "rolling_14"
    ]],

    on ="ds",

    how ="left"
    )

    for col in regressors :

        future [col ]=future [col ].fillna (

        full_df [col ].iloc [-1 ]
        )

    forecast =model .predict (future )

    preds =(
    forecast ["yhat"]
    .tail (len (test_df ))
    .values 
    )

    preds =np .maximum (preds ,0 )

    actuals =test_df ["y"].values 

    mae =mean_absolute_error (
    actuals ,
    preds 
    )

    mape =(
    mean_absolute_percentage_error (
    actuals ,
    preds 
    )*100 
    )

    r2 =r2_score (
    actuals ,
    preds 
    )

    accuracy =100 -mape 

    print (f"MAE       : {mae :.2f}")

    print (f"MAPE      : {mape :.2f}%")

    print (f"Accuracy  : {accuracy :.2f}%")

    print (f"R²        : {r2 :.3f}")

    sample =pd .DataFrame ({

    "Actual":actuals [:10 ],

    "Predicted":preds [:10 ].round (2 )
    })

    print ("\nSample Predictions")

    print (sample .to_string (index =False ))

    all_results .append ({

    "Item":item_id ,

    "MAE":mae ,

    "MAPE":mape ,

    "Accuracy":accuracy ,

    "R2":r2 
    })

    models [item_id ]={

    "model":model ,

    "accuracy":round (accuracy ,2 ),

    "mape":round (mape ,2 ),

    "mae":round (mae ,2 ),

    "r2":round (r2 ,3 ),

    "last_rolling_7":float (
    prophet_df ["rolling_7"].iloc [-1 ]
    ),

    "last_rolling_14":float (
    prophet_df ["rolling_14"].iloc [-1 ]
    ),

    "last_lag_1":float (
    prophet_df ["lag_1"].iloc [-1 ]
    ),

    "last_lag_7":float (
    prophet_df ["lag_7"].iloc [-1 ]
    ),

    "last_is_weekend":int (
    prophet_df ["is_weekend"].iloc [-1 ]
    )
    }

results_df =pd .DataFrame (all_results )

print ("\n"+"="*60 )

print ("OVERALL RESULTS")

print ("="*60 )

print (results_df )

print ("\nAverage")

print (f"MAE  : {results_df ['MAE'].mean ():.2f}")

print (f"MAPE : {results_df ['MAPE'].mean ():.2f}%")

print (f"R²   : {results_df ['R2'].mean ():.3f}")

print (f"Accuracy : {results_df ['Accuracy'].mean ():.2f}%")

joblib .dump (
models ,
"prophet_models.pkl"
)

print ("\n✅ Advanced Prophet Models Saved")