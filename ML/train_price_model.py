import pandas as pd
import numpy as np
import joblib

from sqlalchemy import create_engine

from xgboost import XGBRegressor

from sklearn .model_selection import train_test_split

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

prophet_models =joblib .load (
"prophet_models.pkl"
)

query ="""
SELECT
    MenuItemId,
    DATE(OrderedAt) as OrderDate,
    SUM(Quantity) as TotalQuantity
FROM Orders
WHERE Status != 'Cancelled'
GROUP BY MenuItemId, DATE(OrderedAt)
ORDER BY MenuItemId, OrderDate
"""

orders_df =pd .read_sql (
query ,
engine
)

menu_query ="""
SELECT
    Id,
    Name,
    Price,
    CostPrice
FROM MenuItems
"""

menu_df =pd .read_sql (
menu_query ,
engine
)

df =orders_df .merge (

menu_df ,

left_on ="MenuItemId",

right_on ="Id",

how ="left"
)

predicted_demands =[]

trend_percents =[]

confidence_percents =[]

for _ ,row in df .iterrows ():

    item_id =row ["MenuItemId"]

    if item_id not in prophet_models :

        predicted_demands .append (0 )

        trend_percents .append (0 )

        confidence_percents .append (50 )

        continue

    model_data =prophet_models [item_id ]

    model =model_data ["model"]

    future =model .make_future_dataframe (

    periods =14 ,

    freq ="D"
    )

    future ["is_weekend"]=(
    future ["ds"].dt .dayofweek >=5
    ).astype (int )

    future ["lag_1"]=model_data ["last_lag_1"]

    future ["lag_7"]=model_data ["last_lag_7"]

    future ["rolling_7"]=model_data ["last_rolling_7"]

    future ["rolling_14"]=model_data ["last_rolling_14"]

    forecast =model .predict (future )

    next_14 =forecast .tail (14 )

    current_week =next_14 .head (7 )

    next_week =next_14 .tail (7 )

    current_total =(
    current_week ["yhat"]
    .sum ()
    )

    next_total =(
    next_week ["yhat"]
    .sum ()
    )

    current_total =max (
    current_total ,
    1
    )

    next_total =max (
    next_total ,
    0
    )

    trend =(
    (
    next_total -current_total
    )
    /
    current_total
    )*100

    lower =(
    next_week ["yhat_lower"]
    .sum ()
    )

    upper =(
    next_week ["yhat_upper"]
    .sum ()
    )

    interval_width =upper -lower

    confidence =100 -(
    (
    interval_width
    /
    next_total
    )*100
    )

    confidence =max (
    50 ,
    min (99 ,confidence )
    )

    predicted_demands .append (
    round (next_total ,2 )
    )

    trend_percents .append (
    round (trend ,2 )
    )

    confidence_percents .append (
    round (confidence ,2 )
    )

df ["PredictedDemand"]=predicted_demands

df ["TrendPercent"]=trend_percents

df ["ConfidencePercent"]=confidence_percents

df ["MarginPercent"]=(

(
df ["Price"]
-
df ["CostPrice"]
)
/
df ["Price"]
)*100

"""
AI PERFORMANCE SCORE

This is NOT a pricing formula.

This is a business-performance label
representing overall menu success.
"""

df ["PerformanceScore"]=(

(
df ["TotalQuantity"]*0.35
)

+

(
df ["PredictedDemand"]*0.30
)

+

(
df ["MarginPercent"]*0.20
)

+

(
df ["ConfidencePercent"]*0.15
)
)

min_score =df ["PerformanceScore"].min ()

max_score =df ["PerformanceScore"].max ()

df ["PerformanceScore"]=(

(
df ["PerformanceScore"]-min_score
)

/

(
max_score -min_score
)

)*100

features =[

"Price",

"CostPrice",

"TotalQuantity",

"PredictedDemand",

"TrendPercent",

"ConfidencePercent",

"MarginPercent"
]

X =df [features ]

y =df ["PerformanceScore"]

X_train ,X_test ,y_train ,y_test =train_test_split (

X ,
y ,

test_size =0.2 ,

random_state =42
)

model =XGBRegressor (

n_estimators =300 ,

learning_rate =0.05 ,

max_depth =5 ,

subsample =0.9 ,

colsample_bytree =0.9 ,

random_state =42
)

model .fit (
X_train ,
y_train
)

preds =model .predict (X_test )

mae =mean_absolute_error (
y_test ,
preds
)

mape =(
mean_absolute_percentage_error (
y_test ,
preds
)*100
)

r2 =r2_score (
y_test ,
preds
)

accuracy =100 -mape

print ("\n"+"="*60 )

print ("XGBOOST MENU PERFORMANCE MODEL")

print ("="*60 )

print (f"MAE       : {mae :.2f}")

print (f"MAPE      : {mape :.2f}%")

print (f"Accuracy  : {accuracy :.2f}%")

print (f"R²        : {r2 :.3f}")

sample =pd .DataFrame ({

"Actual":y_test .values [:10 ],

"Predicted":preds [:10 ]
})

print ("\nSample Predictions")

print (
sample .round (2 )
.to_string (index =False )
)

importance_df =pd .DataFrame ({

"Feature":features ,

"Importance":model .feature_importances_
})

importance_df =importance_df .sort_values (

by ="Importance",

ascending =False
)

print ("\nFeature Importance")

print (
importance_df
.round (4 )
.to_string (index =False )
)

joblib .dump (
model ,
"menu_performance_model.pkl"
)

print ("\n✅ Menu Performance Model Saved")