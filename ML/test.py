import pandas as pd
from sqlalchemy import create_engine

engine =create_engine (
"mysql+pymysql://root:balaji900@localhost/restaurantdb"
)

df =pd .read_csv (
"/Users/balajia/Downloads/tamil_nadu_competitor_prices_normalized.csv"
)

df .to_sql (
"CompetitorPrices",
con =engine ,
if_exists ="append",
index =False ,
chunksize =1000
)

print (f"Imported {len (df )} rows successfully")