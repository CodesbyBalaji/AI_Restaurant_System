import pandas as pd
from sqlalchemy import create_engine

DB_USER ="root"
DB_PASSWORD ="balaji900"
DB_HOST ="localhost"
DB_NAME ="restaurantdb"

engine =create_engine (
f"mysql+pymysql://{DB_USER }:{DB_PASSWORD }@{DB_HOST }/{DB_NAME }"
)

query ="""
SELECT
    DATE(OrderedAt) as OrderDate,
    SUM(Quantity) as TotalQuantity
FROM Orders
WHERE MenuItemId = 1
GROUP BY DATE(OrderedAt)
ORDER BY OrderDate DESC
LIMIT 30
"""

df =pd .read_sql (query ,engine )

print (df .to_string ())