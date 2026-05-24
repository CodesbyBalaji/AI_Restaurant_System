import pandas as pd 
import numpy as np 
import joblib 

from sqlalchemy import create_engine 

from sklearn .metrics import (
mean_absolute_error ,
mean_absolute_percentage_error ,
r2_score 
)

from xgboost import XGBRegressor 

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

feature_columns =None 


for item_id in sorted (df ["MenuItemId"].unique ()):

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

    item_df ["Target"]=(
    item_df ["TotalQuantity"]
    .shift (-1 )
    )

    item_df ["day_of_week"]=(
    item_df ["OrderDate"]
    .dt .dayofweek 
    )

    item_df ["month"]=(
    item_df ["OrderDate"]
    .dt .month 
    )

    item_df ["week"]=(
    item_df ["OrderDate"]
    .dt .isocalendar ()
    .week 
    .astype (int )
    )

    item_df ["quarter"]=(
    item_df ["OrderDate"]
    .dt .quarter 
    )

    item_df ["is_weekend"]=(
    item_df ["day_of_week"]
    .isin ([5 ,6 ])
    .astype (int )
    )

    item_df ["dow_sin"]=np .sin (
    2 *np .pi *
    item_df ["day_of_week"]/7 
    )

    item_df ["dow_cos"]=np .cos (
    2 *np .pi *
    item_df ["day_of_week"]/7 
    )

    item_df ["lag_1"]=(
    item_df ["TotalQuantity"]
    .shift (1 )
    )

    item_df ["lag_2"]=(
    item_df ["TotalQuantity"]
    .shift (2 )
    )

    item_df ["lag_3"]=(
    item_df ["TotalQuantity"]
    .shift (3 )
    )

    item_df ["lag_7"]=(
    item_df ["TotalQuantity"]
    .shift (7 )
    )

    item_df ["lag_14"]=(
    item_df ["TotalQuantity"]
    .shift (14 )
    )

    item_df ["lag_21"]=(
    item_df ["TotalQuantity"]
    .shift (21 )
    )

    item_df ["roll_mean_3"]=(
    item_df ["TotalQuantity"]
    .rolling (3 )
    .mean ()
    )

    item_df ["roll_mean_7"]=(
    item_df ["TotalQuantity"]
    .rolling (7 )
    .mean ()
    )

    item_df ["roll_mean_14"]=(
    item_df ["TotalQuantity"]
    .rolling (14 )
    .mean ()
    )

    item_df ["roll_std_3"]=(
    item_df ["TotalQuantity"]
    .rolling (3 )
    .std ()
    )

    item_df ["roll_std_7"]=(
    item_df ["TotalQuantity"]
    .rolling (7 )
    .std ()
    )

    item_df ["roll_std_14"]=(
    item_df ["TotalQuantity"]
    .rolling (14 )
    .std ()
    )

    item_df ["trend_7_14"]=(
    item_df ["roll_mean_7"]/
    (item_df ["roll_mean_14"]+1 )
    )

    item_df =item_df .dropna ()

    feature_cols =[

    "day_of_week",
    "month",
    "week",
    "quarter",
    "is_weekend",

    "dow_sin",
    "dow_cos",

    "lag_1",
    "lag_2",
    "lag_3",

    "lag_7",
    "lag_14",
    "lag_21",

    "roll_mean_3",
    "roll_mean_7",
    "roll_mean_14",

    "roll_std_3",
    "roll_std_7",
    "roll_std_14",

    "trend_7_14"
    ]

    X =item_df [feature_cols ]

    y =item_df ["Target"]

    split_index =int (len (item_df )*0.8 )

    X_train =X .iloc [:split_index ]

    X_test =X .iloc [split_index :]

    y_train =y .iloc [:split_index ]

    y_test =y .iloc [split_index :]

    model =XGBRegressor (

    n_estimators =300 ,

    learning_rate =0.03 ,

    max_depth =5 ,

    subsample =0.8 ,

    colsample_bytree =0.8 ,

    random_state =42 
    )

    model .fit (X_train ,y_train )

    preds =model .predict (X_test )

    preds =np .maximum (preds ,0 )

    mae =mean_absolute_error (
    y_test ,
    preds 
    )

    mape =mean_absolute_percentage_error (
    y_test ,
    preds 
    )*100 

    r2 =r2_score (
    y_test ,
    preds 
    )

    print ("\n"+"="*60 )

    print (f"Item {item_id }")

    print ("="*60 )

    print (f"MAE   : {mae :.2f}")

    print (f"MAPE  : {mape :.2f}%")

    print (f"R²    : {r2 :.3f}")

    sample =pd .DataFrame ({

    "Actual":y_test .values [:10 ],

    "Predicted":preds [:10 ].round (2 )
    })

    print ("\nSample Predictions")

    print (sample .to_string (index =False ))

    all_results .append ({

    "Item":item_id ,

    "MAE":mae ,

    "MAPE":mape ,

    "R2":r2 
    })

    models [item_id ]=model 

    feature_columns =feature_cols 

results_df =pd .DataFrame (all_results )

print ("\n"+"="*60 )

print ("OVERALL RESULTS")

print ("="*60 )

print (results_df )

print ("\nAverage")

print (f"MAE  : {results_df ['MAE'].mean ():.2f}")

print (f"MAPE : {results_df ['MAPE'].mean ():.2f}%")

print (f"R²   : {results_df ['R2'].mean ():.3f}")

joblib .dump (
models ,
"demand_models.pkl"
)

joblib .dump (
feature_columns ,
"feature_columns.pkl"
)

print ("\n✅ Models Saved")