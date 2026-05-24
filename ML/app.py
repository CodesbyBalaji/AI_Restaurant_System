from fastapi import FastAPI 
from pydantic import BaseModel 
from typing import List 

import pandas as pd 
import numpy as np 
import joblib 

from sqlalchemy import create_engine 

DB_USER ="root"
DB_PASSWORD ="balaji900"
DB_HOST ="localhost"
DB_NAME ="restaurantdb"

engine =create_engine (
f"mysql+pymysql://{DB_USER }:{DB_PASSWORD }@{DB_HOST }/{DB_NAME }"
)
models =joblib .load ("prophet_models.pkl")
app =FastAPI ()

class PredictionRequest (BaseModel ):

    itemIds :List [int ]

@app .get ("/")
def home ():

    return {
    "message":"Advanced Prophet API Running"
    }

def build_features (item_id ):

    query =f"""
    SELECT
        DATE(OrderedAt) as OrderDate,
        SUM(Quantity) as TotalQuantity
    FROM Orders
    WHERE MenuItemId = {item_id }
    GROUP BY DATE(OrderedAt)
    ORDER BY OrderDate
    """

    df =pd .read_sql (query ,engine )

    if df .empty :
        return None 

    df ["OrderDate"]=pd .to_datetime (
    df ["OrderDate"]
    )

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

    prophet_df =pd .DataFrame ()

    prophet_df ["ds"]=pd .to_datetime (
    df ["OrderDate"]
    )

    prophet_df ["y"]=(
    df ["TotalQuantity"]
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

    prophet_df =prophet_df .bfill ()

    prophet_df =prophet_df .fillna (0 )

    return prophet_df 

@app .post ("/predict")
def predict (request :PredictionRequest ):

    results =[]

    for item_id in request .itemIds :

        if item_id not in models :

            results .append ({

            "menuItemId":item_id ,

            "predictedDemand":0 ,

            "trendPercent":0 ,

            "confidencePercent":0 ,

            "lowerBound":0 ,

            "upperBound":0 
            })

            continue 

        model_data =models [item_id ]

        model =model_data ["model"]

        prophet_df =build_features (item_id )

        if prophet_df is None :

            results .append ({

            "menuItemId":item_id ,

            "predictedDemand":0 ,

            "trendPercent":0 ,

            "confidencePercent":0 ,

            "lowerBound":0 ,

            "upperBound":0 
            })

            continue 

        future =model .make_future_dataframe (

        periods =14 ,

        freq ="D"
        )
        last_row =prophet_df .iloc [-1 ]

        future ["is_weekend"]=(
        future ["ds"].dt .dayofweek >=5 
        ).astype (int )

        future ["lag_1"]=last_row ["lag_1"]

        future ["lag_7"]=last_row ["lag_7"]

        future ["rolling_7"]=last_row ["rolling_7"]

        future ["rolling_14"]=last_row ["rolling_14"]

        forecast =model .predict (future )
        
        next_14 =forecast .tail (14 )

        current_week =next_14 .head (7 )

        current_week_total =(
        current_week ["yhat"]
        .sum ()
        )

        next_week =next_14 .tail (7 )

        next_week_total =(
        next_week ["yhat"]
        .sum ()
        )

        current_week_total =max (
        current_week_total ,
        0 
        )

        next_week_total =max (
        next_week_total ,
        0 
        )

        if current_week_total >0 :

            trend_percent =(

            (next_week_total -current_week_total )

            /current_week_total 

            )*100 

        else :

            trend_percent =0 

        trend_percent =round (
        float (trend_percent ),
        1 
        )

        lower_total =(
        next_week ["yhat_lower"]
        .sum ()
        )

        upper_total =(
        next_week ["yhat_upper"]
        .sum ()
        )

        interval_width =(
        upper_total -lower_total 
        )

        if next_week_total >0 :

            confidence =100 -(

            (interval_width /next_week_total )

            *100 
            )

        else :

            confidence =0 

        confidence =max (
        50 ,
        min (99 ,confidence )
        )

        confidence =round (confidence )

        next_week_total =round (
        float (next_week_total ),
        2 
        )

        lower_total =round (
        float (lower_total ),
        2 
        )

        upper_total =round (
        float (upper_total ),
        2 
        )

        results .append ({

        "menuItemId":item_id ,

        "predictedDemand":next_week_total ,

        "trendPercent":trend_percent ,

        "confidencePercent":confidence ,

        "lowerBound":lower_total ,

        "upperBound":upper_total 
        })

    return results 