from fastapi import FastAPI
from pydantic import BaseModel
from typing import List

import pandas as pd
import numpy as np
import joblib
import warnings

warnings .filterwarnings ("ignore")

from sqlalchemy import create_engine

DB_USER ="root"
DB_PASSWORD ="balaji900"
DB_HOST ="localhost"
DB_NAME ="restaurantdb"

engine =create_engine (
f"mysql+pymysql://{DB_USER }:{DB_PASSWORD }@{DB_HOST }/{DB_NAME }",
pool_pre_ping =True ,
pool_recycle =1800 ,
)

models =joblib .load ("prophet_models.pkl")

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

app =FastAPI ()

class PredictionRequest (BaseModel ):
    itemIds :List [int ]

@app .get ("/")
def home ():
    return {"message":"Prophet Forecast API — Running"}

def fetch_recent_actuals (item_id :int ,days :int =30 )->pd .DataFrame :
    """
    Pull the last `days` days of actuals from the DB.
    Always returns a fully date-filled DataFrame (no gaps).
    """
    query =f"""
    SELECT
        DATE(OrderedAt)   AS OrderDate,
        SUM(Quantity)     AS TotalQuantity
    FROM Orders
    WHERE MenuItemId = {item_id }
      AND Status    != 'Cancelled'
      AND OrderedAt >= DATE_SUB(CURDATE(), INTERVAL {days } DAY)
    GROUP BY DATE(OrderedAt)
    ORDER BY OrderDate
    """
    df =pd .read_sql (query ,engine )

    if df .empty :
        return df

    df ["OrderDate"]=pd .to_datetime (df ["OrderDate"])

    full_dates =pd .date_range (
    start =df ["OrderDate"].min (),
    end =df ["OrderDate"].max (),
    freq ="D"
    )
    df =(
    df
    .set_index ("OrderDate")
    .reindex (full_dates )
    .fillna (0 )
    .rename_axis ("OrderDate")
    .reset_index ()
    )
    return df

def _compute_features_df (df :pd .DataFrame )->pd .DataFrame :
    """Re-derive all regressors from a raw (OrderDate, TotalQuantity) df."""

    df =df .sort_values ("OrderDate").copy ()

    full_dates =pd .date_range (
    start =df ["OrderDate"].min (),
    end =df ["OrderDate"].max (),
    freq ="D"
    )
    df =(
    df
    .set_index ("OrderDate")
    .reindex (full_dates )
    .fillna (0 )
    .rename_axis ("OrderDate")
    .reset_index ()
    )

    p =pd .DataFrame ()
    p ["ds"]=pd .to_datetime (df ["OrderDate"])
    p ["y"]=df ["TotalQuantity"].astype (float )

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

    p ["trend_slope_7"]=p ["y"].rolling (8 ).apply (
    lambda x :np .polyfit (range (len (x )),x ,1 )[0 ],
    raw =True
    )

    p =p .dropna ().reset_index (drop =True )
    return p

def roll_forward_features (
y_series :list ,
periods :int ,
last_date :pd .Timestamp ,
)->pd .DataFrame :
    """
    Builds a future feature DataFrame by rolling features forward
    one day at a time using the live y_series as the seed.

    KEY FIX: We use the actual rolling mean of recent values as
    the projected y (not trend_slope which can diverge badly),
    then recompute slope on each step. This keeps predictions
    anchored to the real recent demand level while still
    capturing short-term momentum.
    """
    y =list (y_series )
    future_rows =[]

    for i in range (1 ,periods +1 ):
        future_date =last_date +pd .Timedelta (days =i )

        recent_mean =float (np .mean (y [-7 :]))if len (y )>=7 else float (np .mean (y ))

        if len (y )>=8 :
            slope_data =y [-8 :]
            current_slope =float (np .polyfit (range (len (slope_data )),slope_data ,1 )[0 ])
        else :
            current_slope =0.0

        max_slope_contribution =recent_mean *0.20
        slope_contribution =np .clip (current_slope ,-max_slope_contribution ,max_slope_contribution )
        next_y =max (recent_mean +slope_contribution ,0.0 )

        lag_1 =y [-1 ]if len (y )>=1 else 0.0
        lag_7 =y [-7 ]if len (y )>=7 else 0.0
        lag_14 =y [-14 ]if len (y )>=14 else 0.0

        rolling_3 =float (np .mean (y [-3 :]))if len (y )>=3 else float (np .mean (y ))
        rolling_7 =float (np .mean (y [-7 :]))if len (y )>=7 else float (np .mean (y ))
        rolling_14 =float (np .mean (y [-14 :]))if len (y )>=14 else float (np .mean (y ))
        rolling_21 =float (np .mean (y [-21 :]))if len (y )>=21 else float (np .mean (y ))

        rolling_std_7 =float (np .std (y [-7 :]))if len (y )>=7 else 0.0
        trend_slope_7 =current_slope

        is_weekend =int (future_date .dayofweek >=5 )
        day_of_week =int (future_date .dayofweek )
        month =future_date .month
        is_month_end =int (future_date .is_month_end )

        future_rows .append ({
        "ds":future_date ,
        "is_weekend":is_weekend ,
        "day_of_week":day_of_week ,
        "month":month ,
        "is_month_end":is_month_end ,
        "lag_1":lag_1 ,
        "lag_7":lag_7 ,
        "lag_14":lag_14 ,
        "rolling_3":rolling_3 ,
        "rolling_7":rolling_7 ,
        "rolling_14":rolling_14 ,
        "rolling_21":rolling_21 ,
        "rolling_std_7":rolling_std_7 ,
        "trend_slope_7":trend_slope_7 ,
        })

        y .append (next_y )

    return pd .DataFrame (future_rows )

def empty_result (item_id :int )->dict :
    return {
    "menuItemId":item_id ,
    "thisWeek":0 ,
    "lastWeek":0 ,
    "twoWeeksAgo":0 ,
    "predictedDemand":0 ,
    "trendPercent":0.0 ,
    "forecastChangePercent":0.0 ,
    "confidencePercent":0 ,
    "lowerBound":0 ,
    "upperBound":0 ,
    }

@app .get ("/festival/predict/{festival_date}")

def festival_predict (festival_date :str ):

    festival_date =pd .to_datetime (festival_date )

    results =[]

    for item_id ,model_data in models .items ():

        model =model_data ["model"]

        future =pd .DataFrame ({
        "ds":[festival_date ]
        })

        future ["is_weekend"]=(
        future ["ds"].dt .dayofweek >=5
        ).astype (int )

        future ["day_of_week"]=(
        future ["ds"].dt .dayofweek
        )

        future ["month"]=(
        future ["ds"].dt .month
        )

        future ["is_month_end"]=(
        future ["ds"].dt .is_month_end
        ).astype (int )

        future ["lag_1"]=(
        model_data ["last_lag_1"]
        )

        future ["lag_7"]=(
        model_data ["last_lag_7"]
        )

        future ["lag_14"]=(
        model_data ["last_lag_14"]
        )

        future ["rolling_3"]=(
        model_data ["last_rolling_3"]
        )

        future ["rolling_7"]=(
        model_data ["last_rolling_7"]
        )

        future ["rolling_14"]=(
        model_data ["last_rolling_14"]
        )

        future ["rolling_21"]=(
        model_data ["last_rolling_21"]
        )

        future ["rolling_std_7"]=(
        model_data ["last_rolling_std_7"]
        )

        future ["trend_slope_7"]=(
        model_data ["last_trend_slope_7"]
        )

        forecast =model .predict (future )

        predicted =int (

        max (
        0 ,

        round (
        float (
        forecast .iloc [0 ]["yhat"]
        )
        )
        )
        )

        results .append ({

        "MenuItemId":int (item_id ),

        "MenuItemName":
        model_data ["dish_name"],

        "PredictedSales":
        predicted
        })

    return results

@app .post ("/predict")

def predict (request :PredictionRequest ):

    results =[]

    for item_id in request .itemIds :

        if item_id not in models :
            results .append (empty_result (item_id ))
            continue

        model_data =models [item_id ]
        model =model_data ["model"]

        df_long =fetch_recent_actuals (item_id ,days =60 )

        if df_long .empty or len (df_long )<8 :

            y_series =model_data .get ("recent_y_30",[model_data ["last_y"]])
            last_date =model_data .get ("last_ds",pd .Timestamp .today ().normalize ())
        else :
            y_series =df_long ["TotalQuantity"].astype (float ).tolist ()
            last_date =df_long ["OrderDate"].iloc [-1 ]

        if not df_long .empty and len (df_long )>=28 :
            df_hist =df_long
        else :
            df_hist =fetch_recent_actuals (item_id ,days =28 )

        if not df_hist .empty and len (df_hist )>=7 :
            y_hist =df_hist ["TotalQuantity"].astype (float ).tolist ()
        else :
            y_hist =y_series .copy ()

        while len (y_hist )<21 :
            y_hist .insert (0 ,0.0 )

        this_week_actual =float (sum (y_hist [-7 :]))
        last_week_actual =float (sum (y_hist [-14 :-7 ]))
        two_weeks_ago_actual =float (sum (y_hist [-21 :-14 ]))

        if not df_long .empty and len (df_long )>=8 :
            hist_features =_compute_features_df (df_long )
        else :
            hist_features =pd .DataFrame (columns =["ds"]+REGRESSORS )

        future_features =roll_forward_features (
        y_series =y_series ,
        periods =14 ,
        last_date =last_date ,
        )

        prophet_future =model .make_future_dataframe (periods =14 ,freq ="D")

        future_map ={
        pd .Timestamp (row ["ds"]).normalize ():row
        for _ ,row in future_features .iterrows ()
        }

        hist_map ={}
        if not hist_features .empty :
            for _ ,row in hist_features .iterrows ():
                hist_map [pd .Timestamp (row ["ds"]).normalize ()]=row

        for col in REGRESSORS :
            vals =[]
            for ds in prophet_future ["ds"]:
                key =pd .Timestamp (ds ).normalize ()
                if key in future_map :
                    vals .append (future_map [key ][col ])
                elif key in hist_map :
                    vals .append (hist_map [key ][col ])
                else :
                    vals .append (np .nan )
            prophet_future [col ]=vals

        last_known ={}
        if not hist_features .empty :
            last_row =hist_features .iloc [-1 ]
            for col in REGRESSORS :
                last_known [col ]=float (last_row [col ])
        else :
            last_known ={col :0.0 for col in REGRESSORS }

        for col in REGRESSORS :
            prophet_future [col ]=prophet_future [col ].fillna (last_known .get (col ,0.0 ))

        forecast =model .predict (prophet_future )

        next_14 =forecast .tail (14 )
        next_week =next_14 .tail (7 )

        prophet_next_week =float (max (next_week ["yhat"].sum (),0.0 ))

        lower_total =float (max (next_week ["yhat_lower"].sum (),0.0 ))
        upper_total =float (next_week ["yhat_upper"].sum ())

        daily_mean_14 =float (np .mean (y_series [-14 :]))if len (y_series )>=14 else float (np .mean (y_series ))
        baseline_week =daily_mean_14 *7.0

        if baseline_week >0 :
            divergence =(prophet_next_week -baseline_week )/baseline_week
        else :
            divergence =0.0

        if len (y_series )>=14 :
            slope_14 =float (np .polyfit (range (14 ),y_series [-14 :],1 )[0 ])
        else :
            slope_14 =0.0

        genuine_decline =slope_14 <-2.0

        if divergence <-0.15 and not genuine_decline :

            drop_magnitude =abs (divergence )-0.15
            blend_w =min (drop_magnitude *4.0 ,0.85 )
            predicted_next_week =(
            (1 -blend_w )*prophet_next_week
            +blend_w *baseline_week
            )

            if prophet_next_week >0 :
                scale =predicted_next_week /prophet_next_week
                lower_total =lower_total *scale
                upper_total =upper_total *scale
        else :
            predicted_next_week =prophet_next_week

        predicted_next_week =min (
        predicted_next_week ,
        this_week_actual *1.35
        )

        if last_week_actual >0 :
            trend_percent =(
            (this_week_actual -last_week_actual )
            /last_week_actual
            )*100
        else :
            trend_percent =0.0

        trend_percent =round (float (trend_percent ),1 )

        if this_week_actual >0 :
            forecast_change_percent =(
            (predicted_next_week -this_week_actual )
            /this_week_actual
            )*100
        else :
            forecast_change_percent =0.0

        forecast_change_percent =round (float (forecast_change_percent ),1 )

        interval_width =upper_total -lower_total

        if predicted_next_week >0 :
            ratio =interval_width /(predicted_next_week +1e-6 )
            conf_band =max (0.0 ,100 -ratio *25 )
        else :
            conf_band =50.0

        train_conf =model_data .get ("confidence",75.0 )
        confidence =0.5 *conf_band +0.5 *train_conf
        confidence =int (max (50 ,min (97 ,round (confidence ))))

        results .append ({
        "menuItemId":item_id ,
        "thisWeek":int (round (this_week_actual )),
        "lastWeek":int (round (last_week_actual )),
        "twoWeeksAgo":int (round (two_weeks_ago_actual )),
        "predictedDemand":int (round (predicted_next_week )),
        "trendPercent":trend_percent ,
        "forecastChangePercent":forecast_change_percent ,
        "confidencePercent":confidence ,
        "lowerBound":int (round (lower_total )),
        "upperBound":int (round (upper_total )),
        })

    return results