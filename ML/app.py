from fastapi import FastAPI
from pydantic import BaseModel
from typing import List
import warnings
warnings .filterwarnings ("ignore")

import pandas as pd
import numpy as np
import joblib

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

app =FastAPI (title ="Restaurant Demand Forecast API")

class PredictionRequest (BaseModel ):
    itemIds :List [int ]

@app .get ("/")
def home ():
    return {"message":"Restaurant Demand Forecast API running"}

def add_known_calendar_features (df :pd .DataFrame )->pd .DataFrame :
    df =df .copy ()
    df ["is_weekend"]=(df ["ds"].dt .dayofweek >=5 ).astype (int )
    df ["is_month_start"]=df ["ds"].dt .is_month_start .astype (int )
    df ["is_month_end"]=df ["ds"].dt .is_month_end .astype (int )
    return df

def fetch_recent_actuals (item_id :int ,days :int =28 )->pd .DataFrame :
    query =f"""
    SELECT
        DATE(OrderedAt) AS OrderDate,
        SUM(Quantity)   AS TotalQuantity
    FROM Orders
    WHERE MenuItemId = {item_id }
      AND Status = 'Completed'
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
    df .set_index ("OrderDate")
    .reindex (full_dates )
    .fillna (0 )
    .rename_axis ("OrderDate")
    .reset_index ()
    )

    return df

def build_future_calendar (last_date :pd .Timestamp ,periods :int =7 )->pd .DataFrame :
    future_dates =pd .date_range (
    start =last_date +pd .Timedelta (days =1 ),
    periods =periods ,
    freq ="D"
    )
    future =pd .DataFrame ({"ds":future_dates })
    future =add_known_calendar_features (future )
    return future

def safe_percent_change (current :float ,previous :float )->float :
    if previous <=0 :
        return 0.0
    return round (((current -previous )/previous )*100 ,1 )

def recommendation_from_forecast (forecast_change_percent :float ,confidence :int )->str :
    if confidence <60 :
        return "Monitor demand"
    if forecast_change_percent >=12 :
        return "Increase stock"
    if forecast_change_percent >=4 :
        return "Prepare slightly more"
    if forecast_change_percent <=-12 :
        return "Reduce stock"
    return "Maintain stock"

def empty_result (item_id :int )->dict :
    return {
    "menuItemId":item_id ,
    "dishName":f"Item {item_id }",
    "thisWeek":0 ,
    "lastWeek":0 ,
    "twoWeeksAgo":0 ,
    "predictedNextWeek":0 ,
    "trendPercent":0.0 ,
    "forecastChangePercent":0.0 ,
    "confidencePercent":0 ,
    "lowerBound":0 ,
    "upperBound":0 ,
    "recommendation":"No data",
    "forecastSource":"Prophet",
    "aiInsight":"Not enough historical data."
    }

@app .get ("/festival/predict/{festival_date}")
def festival_predict (festival_date :str ):
    target_date =pd .to_datetime (festival_date )
    results =[]

    for item_id ,model_data in models .items ():
        model =model_data ["model"]
        dish_name =model_data ["dish_name"]

        future =pd .DataFrame ({"ds":[target_date ]})
        future =add_known_calendar_features (future )

        forecast =model .predict (future )
        yhat =max (float (forecast .iloc [0 ]["yhat"]),0.0 )

        results .append ({
        "menuItemId":int (item_id ),
        "dishName":dish_name ,
        "predictedSales":int (round (yhat ))
        })

    results .sort (key =lambda x :x ["predictedSales"],reverse =True )
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
        dish_name =model_data ["dish_name"]
        train_conf =int (round (model_data .get ("metrics",{}).get ("confidence",75 )))

        df_hist =fetch_recent_actuals (item_id ,days =28 )

        if df_hist .empty or len (df_hist )<14 :
            results .append ({
            "menuItemId":item_id ,
            "dishName":dish_name ,
            "thisWeek":0 ,
            "lastWeek":0 ,
            "twoWeeksAgo":0 ,
            "predictedNextWeek":0 ,
            "trendPercent":0.0 ,
            "forecastChangePercent":0.0 ,
            "confidencePercent":train_conf ,
            "lowerBound":0 ,
            "upperBound":0 ,
            "recommendation":"Monitor demand",
            "forecastSource":"Prophet",
            "aiInsight":"Historical data is limited, so forecast is conservative."
            })
            continue

        y =df_hist ["TotalQuantity"].astype (float ).tolist ()

        while len (y )<21 :
            y .insert (0 ,0.0 )

        this_week =float (sum (y [-7 :]))
        last_week =float (sum (y [-14 :-7 ]))
        two_weeks_ago =float (sum (y [-21 :-14 ]))

        last_date =pd .to_datetime (df_hist ["OrderDate"].iloc [-1 ])
        future =build_future_calendar (last_date ,periods =7 )

        forecast =model .predict (future )

        next_week_pred =float (max (forecast ["yhat"].sum (),0.0 ))
        lower_total =float (max (forecast ["yhat_lower"].sum (),0.0 ))
        upper_total =float (max (forecast ["yhat_upper"].sum (),0.0 ))

        recent_baseline =np .mean ([this_week ,last_week ,two_weeks_ago ])

        if recent_baseline >0 :
            max_allowed =recent_baseline *1.25
            min_allowed =recent_baseline *0.75
            next_week_pred =min (max (next_week_pred ,min_allowed ),max_allowed )
            lower_total =min (max (lower_total ,min_allowed *0.9 ),max_allowed )
            upper_total =min (max (upper_total ,next_week_pred ),max_allowed *1.1 )

        trend_percent =safe_percent_change (this_week ,last_week )
        forecast_change_percent =safe_percent_change (next_week_pred ,this_week )

        interval_width =max (upper_total -lower_total ,0.0 )
        if next_week_pred >0 :
            band_score =max (50 ,min (95 ,round (100 -(interval_width /next_week_pred )*20 )))
        else :
            band_score =50

        confidence =int (round ((train_conf *0.6 )+(band_score *0.4 )))
        confidence =max (50 ,min (95 ,confidence ))

        recommendation =recommendation_from_forecast (forecast_change_percent ,confidence )

        if forecast_change_percent >=12 :
            insight =f"{dish_name } is expected to rise next week, so plan extra prep and stock."
        elif forecast_change_percent <=-12 :
            insight =f"{dish_name } may soften next week, so avoid over-preparation."
        else :
            insight =f"{dish_name } demand looks stable based on recent order history."

        results .append ({
        "menuItemId":item_id ,
        "dishName":dish_name ,
        "thisWeek":int (round (this_week )),
        "lastWeek":int (round (last_week )),
        "twoWeeksAgo":int (round (two_weeks_ago )),
        "predictedDemand":int (round (next_week_pred )),
        "trendPercent":trend_percent ,
        "forecastChangePercent":forecast_change_percent ,
        "confidencePercent":confidence ,
        "lowerBound":int (round (lower_total )),
        "upperBound":int (round (upper_total )),
        "recommendation":recommendation ,
        "forecastSource":"Prophet",
        "aiInsight":insight
        })

    return results