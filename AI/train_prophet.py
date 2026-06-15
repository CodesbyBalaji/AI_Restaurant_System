import warnings
warnings .filterwarnings ("ignore")

import pandas as pd
import numpy as np
import joblib

from sqlalchemy import create_engine
from prophet import Prophet
from sklearn .metrics import mean_absolute_error ,mean_absolute_percentage_error ,r2_score

DB_USER ="root"
DB_PASSWORD ="balaji900"
DB_HOST ="localhost"
DB_NAME ="restaurantdb"

engine =create_engine (
f"mysql+pymysql://{DB_USER }:{DB_PASSWORD }@{DB_HOST }/{DB_NAME }",
pool_pre_ping =True ,
pool_recycle =1800 ,
)

ITEM_NAMES ={
1 :"Biryani",
2 :"Fried Rice",
3 :"Noodles",
4 :"Burger",
5 :"Pizza",
}

def get_custom_holidays ():
    festival_rows =[
    ("new_year","2024-01-01",0 ,1 ),
    ("pongal","2024-01-15",0 ,1 ),
    ("tamil_new_year","2024-04-14",0 ,1 ),
    ("independence_day","2024-08-15",0 ,0 ),
    ("diwali","2024-10-31",-1 ,1 ),
    ("christmas","2024-12-25",0 ,1 ),

    ("new_year","2025-01-01",0 ,1 ),
    ("pongal","2025-01-14",0 ,1 ),
    ("tamil_new_year","2025-04-14",0 ,1 ),
    ("independence_day","2025-08-15",0 ,0 ),
    ("diwali","2025-11-01",-1 ,1 ),
    ("christmas","2025-12-25",0 ,1 ),

    ("new_year","2026-01-01",0 ,1 ),
    ("pongal","2026-01-15",0 ,1 ),
    ("tamil_new_year","2026-04-14",0 ,1 ),
    ("independence_day","2026-08-15",0 ,0 ),
    ("diwali","2026-11-12",-1 ,1 ),
    ("christmas","2026-12-25",0 ,1 ),

    ("new_year","2027-01-01",0 ,1 ),
    ("pongal","2027-01-15",0 ,1 ),
    ("tamil_new_year","2027-04-14",0 ,1 ),
    ("independence_day","2027-08-15",0 ,0 ),
    ("diwali","2027-11-01",-1 ,1 ),
    ("christmas","2027-12-25",0 ,1 ),
    ]

    holidays =pd .DataFrame (
    festival_rows ,
    columns =["holiday","ds","lower_window","upper_window"]
    )
    holidays ["ds"]=pd .to_datetime (holidays ["ds"])
    return holidays

def load_daily_item_demand ():
    query ="""
    SELECT
        MenuItemId,
        DATE(OrderedAt) AS OrderDate,
        SUM(Quantity)   AS TotalQuantity
    FROM Orders
    WHERE Status = 'Completed'
    GROUP BY MenuItemId, DATE(OrderedAt)
    ORDER BY MenuItemId, OrderDate
    """
    df =pd .read_sql (query ,engine )
    df ["OrderDate"]=pd .to_datetime (df ["OrderDate"])
    return df

def make_continuous_daily_series (item_df ):
    item_df =item_df .sort_values ("OrderDate").copy ()

    full_dates =pd .date_range (
    start =item_df ["OrderDate"].min (),
    end =item_df ["OrderDate"].max (),
    freq ="D"
    )

    item_df =(
    item_df .set_index ("OrderDate")
    .reindex (full_dates )
    .fillna (0 )
    .rename_axis ("OrderDate")
    .reset_index ()
    )

    prophet_df =pd .DataFrame ({
    "ds":pd .to_datetime (item_df ["OrderDate"]),
    "y":item_df ["TotalQuantity"].astype (float )
    })

    return prophet_df

def add_known_calendar_features (df ):
    df =df .copy ()
    df ["is_weekend"]=(df ["ds"].dt .dayofweek >=5 ).astype (int )
    df ["is_month_start"]=df ["ds"].dt .is_month_start .astype (int )
    df ["is_month_end"]=df ["ds"].dt .is_month_end .astype (int )
    return df

def compute_metrics (actuals ,preds ):
    mae =mean_absolute_error (actuals ,preds )
    mape =mean_absolute_percentage_error (actuals ,preds )*100
    r2 =r2_score (actuals ,preds )

    acc =max (0.0 ,100 -mape )
    r2_clipped =max (0.0 ,min (1.0 ,r2 ))
    confidence =0.7 *acc +0.3 *(r2_clipped *100 )
    confidence =float (max (50 ,min (95 ,round (confidence ,1 ))))

    return {
    "mae":round (float (mae ),2 ),
    "mape":round (float (mape ),2 ),
    "r2":round (float (r2 ),3 ),
    "confidence":confidence
    }

def build_model (train_df ,holidays ):
    model =Prophet (
    holidays =holidays ,
    yearly_seasonality =True ,
    weekly_seasonality =True ,
    daily_seasonality =False ,
    seasonality_mode ="multiplicative",
    changepoint_prior_scale =0.08 ,
    seasonality_prior_scale =10.0 ,
    holidays_prior_scale =15.0 ,
    interval_width =0.85 ,
    n_changepoints =20 ,
    )

    model .add_regressor ("is_weekend")
    model .add_regressor ("is_month_start")
    model .add_regressor ("is_month_end")

    model .fit (train_df )
    return model

def main ():
    print ("Loading daily demand from MySQL...")
    raw_df =load_daily_item_demand ()
    holidays =get_custom_holidays ()

    print (f"Loaded {len (raw_df ):,} daily rows for {raw_df ['MenuItemId'].nunique ()} items.")

    models ={}
    overall_results =[]

    for item_id in sorted (raw_df ["MenuItemId"].unique ()):
        item_name =ITEM_NAMES .get (item_id ,f"Item {item_id }")
        print ("\n"+"="*60 )
        print (f"Training: {item_name } (ID={item_id })")
        print ("="*60 )

        item_df =raw_df [raw_df ["MenuItemId"]==item_id ][["OrderDate","TotalQuantity"]].copy ()
        prophet_df =make_continuous_daily_series (item_df )
        prophet_df =add_known_calendar_features (prophet_df )

        if len (prophet_df )<120 :
            print ("Not enough data. Skipping.")
            continue

        split_idx =int (len (prophet_df )*0.85 )
        train_df =prophet_df .iloc [:split_idx ].copy ()
        test_df =prophet_df .iloc [split_idx :].copy ()

        print (f"Train: {train_df ['ds'].min ().date ()} -> {train_df ['ds'].max ().date ()} ({len (train_df )} days)")
        print (f"Test : {test_df ['ds'].min ().date ()} -> {test_df ['ds'].max ().date ()} ({len (test_df )} days)")

        model =build_model (train_df ,holidays )

        future =test_df [["ds","is_weekend","is_month_start","is_month_end"]].copy ()
        forecast =model .predict (future )

        preds =np .maximum (forecast ["yhat"].values ,0.0 )
        actuals =test_df ["y"].values

        metrics =compute_metrics (actuals ,preds )

        print (f"MAE        : {metrics ['mae']}")
        print (f"MAPE       : {metrics ['mape']}%")
        print (f"R²         : {metrics ['r2']}")
        print (f"Confidence : {metrics ['confidence']}%")

        sample =pd .DataFrame ({
        "Date":test_df ["ds"].head (10 ).dt .date ,
        "Actual":actuals [:10 ].round (1 ),
        "Predicted":preds [:10 ].round (1 ),
        "Error":(preds [:10 ]-actuals [:10 ]).round (1 )
        })
        print (sample .to_string (index =False ))

        overall_results .append ({
        "Item":item_name ,
        "MAE":metrics ["mae"],
        "MAPE":metrics ["mape"],
        "R2":metrics ["r2"],
        "Confidence":metrics ["confidence"]
        })

        last_60 =prophet_df .tail (60 ).copy ()

        models [item_id ]={
        "model":model ,
        "dish_name":item_name ,
        "metrics":metrics ,
        "last_ds":prophet_df ["ds"].max (),
        "recent_daily_y":prophet_df ["y"].tail (60 ).tolist ()
        }

    results_df =pd .DataFrame (overall_results )

    print ("\n"+"="*60 )
    print ("OVERALL RESULTS")
    print ("="*60 )
    if not results_df .empty :
        print (results_df .to_string (index =False ))
        print (f"\nMean MAE        : {results_df ['MAE'].mean ():.2f}")
        print (f"Mean MAPE       : {results_df ['MAPE'].mean ():.2f}%")
        print (f"Mean R²         : {results_df ['R2'].mean ():.3f}")
        print (f"Mean Confidence : {results_df ['Confidence'].mean ():.1f}%")

    joblib .dump (models ,"prophet_models.pkl")
    print ("\nModels saved to prophet_models.pkl")

if __name__ =="__main__":
    main ()