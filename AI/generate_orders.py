import random
import math
import numpy as np
from datetime import datetime ,timedelta
from sqlalchemy import create_engine ,text

DB_USER ="root"
DB_PASSWORD ="balaji900"
DB_HOST ="localhost"
DB_NAME ="restaurantdb"

engine =create_engine (
f"mysql+pymysql://{DB_USER }:{DB_PASSWORD }@{DB_HOST }/{DB_NAME }"
)

START_DATE =datetime (2024 ,1 ,1 )
END_DATE =datetime .now ()
TOTAL_DAYS =(END_DATE -START_DATE ).days

random .seed (42 )
np .random .seed (42 )

menu_items =[
{
"id":1 ,"name":"Biryani","price":180 ,
"base_share":0.30 ,
"month_peak":6 ,
"month_amp":0.15 ,
"rain_boost":0.92 ,
"weekend_lift":1.20 ,
},
{
"id":2 ,"name":"Fried Rice","price":150 ,
"base_share":0.18 ,
"month_peak":8 ,
"month_amp":0.08 ,
"rain_boost":1.05 ,
"weekend_lift":1.05 ,
},
{
"id":3 ,"name":"Noodles","price":140 ,
"base_share":0.20 ,
"month_peak":7 ,
"month_amp":0.10 ,
"rain_boost":1.20 ,
"weekend_lift":1.08 ,
},
{
"id":4 ,"name":"Burger","price":120 ,
"base_share":0.15 ,
"month_peak":4 ,
"month_amp":0.08 ,
"rain_boost":0.95 ,
"weekend_lift":1.12 ,
},
{
"id":5 ,"name":"Pizza","price":250 ,
"base_share":0.17 ,
"month_peak":12 ,
"month_amp":0.12 ,
"rain_boost":1.10 ,
"weekend_lift":1.30 ,
},
]

_festival_strs =[
"2024-01-01","2024-01-15","2024-04-14","2024-08-15","2024-10-31","2024-12-25",
"2025-01-01","2025-01-14","2025-04-14","2025-08-15","2025-11-01","2025-12-25",
"2026-01-01","2026-01-15","2026-04-14","2026-08-15","2026-11-12","2026-12-25",
]
festival_dates ={
datetime .strptime (d ,"%Y-%m-%d").date ()for d in _festival_strs
}

dow_multiplier ={0 :0.75 ,1 :0.80 ,2 :0.88 ,3 :0.95 ,4 :1.05 ,5 :1.25 ,6 :1.32 }

_hour_weights_raw ={
8 :0.5 ,9 :0.8 ,10 :0.7 ,11 :1.0 ,
12 :3.5 ,13 :4.0 ,14 :3.0 ,15 :1.5 ,
16 :0.8 ,17 :1.2 ,18 :2.0 ,19 :3.8 ,
20 :4.2 ,21 :3.5 ,22 :2.0 ,23 :0.8 ,
}
_total_hw =sum (_hour_weights_raw .values ())
hour_weights ={h :w /_total_hw for h ,w in _hour_weights_raw .items ()}
hours_list =list (hour_weights .keys ())
hours_probs =[hour_weights [h ]for h in hours_list ]

rain_prob_by_month ={
1 :0.04 ,2 :0.04 ,3 :0.06 ,4 :0.10 ,5 :0.14 ,
6 :0.28 ,7 :0.38 ,8 :0.32 ,9 :0.26 ,10 :0.20 ,
11 :0.10 ,12 :0.05 ,
}

STATUS_NORMAL =["Completed"]*91 +["Cancelled"]*6 +["Pending"]*3
STATUS_FESTIVAL =["Completed"]*88 +["Cancelled"]*9 +["Pending"]*3

QTY_WEIGHTS =[0.45 ,0.32 ,0.13 ,0.07 ,0.03 ]
QTY_CHOICES =[1 ,2 ,3 ,4 ,5 ]

def s_curve_growth (day_index :int ,total_days :int ,
max_growth :float =0.25 )->float :
    """
    Returns a growth multiplier between 1.0 and (1 + max_growth).
    Follows a sigmoid so growth is slow at first, ramps, then plateaus.
    """
    x =(day_index /total_days )*10 -5
    sigmoid =1 /(1 +math .exp (-x ))
    return 1.0 +max_growth *sigmoid

def month_seasonality (month :int ,peak_month :int ,amplitude :float )->float :
    """Cosine seasonality centred on peak_month (1–12)."""
    delta =((month -peak_month )%12 )
    if delta >6 :
        delta -=12
    return 1.0 +amplitude *math .cos (math .pi *delta /6 )

def pick_hour ()->int :
    return random .choices (hours_list ,weights =hours_probs ,k =1 )[0 ]

def pick_minute ()->int :

    return random .randint (0 ,59 )

print ("Clearing old orders …")
with engine .begin ()as conn :
    conn .execute (text ("DELETE FROM Orders"))
print ("✓ Old orders deleted\n")

all_orders =[]
current =START_DATE
day_index =0

while current <=END_DATE :
    date =current .date ()
    dow =current .weekday ()
    month =current .month
    is_rain =random .random ()<rain_prob_by_month [month ]
    is_fest =date in festival_dates
    is_weekend =dow in (5 ,6 )

    base_orders =65.0
    base_orders *=dow_multiplier [dow ]

    if is_fest :
        base_orders *=random .uniform (1.15 ,1.30 )

    if is_rain :
        base_orders *=random .uniform (0.80 ,0.90 )

    base_orders *=s_curve_growth (day_index ,TOTAL_DAYS ,max_growth =0.30 )

    base_orders *=random .uniform (0.92 ,1.08 )

    total_orders_today =max (20 ,int (round (base_orders )))

    raw_shares =[]
    for item in menu_items :
        share =item ["base_share"]

        share *=month_seasonality (month ,item ["month_peak"],item ["month_amp"])

        if is_rain :
            share *=item ["rain_boost"]

        if is_weekend :
            share *=item ["weekend_lift"]

        share *=random .uniform (0.95 ,1.05 )
        raw_shares .append (max (share ,0.01 ))

    total_share =sum (raw_shares )
    item_order_counts =[]
    for s in raw_shares :
        count =int (round (total_orders_today *s /total_share ))
        item_order_counts .append (max (1 ,count ))

    status_pool =STATUS_FESTIVAL if is_fest else STATUS_NORMAL

    for item ,n_orders in zip (menu_items ,item_order_counts ):
        for _ in range (n_orders ):
            hour =pick_hour ()
            minute =pick_minute ()
            qty =random .choices (QTY_CHOICES ,weights =QTY_WEIGHTS ,k =1 )[0 ]
            status =random .choice (status_pool )

            ordered_at =datetime (
            current .year ,current .month ,current .day ,hour ,minute
            )

            all_orders .append ({
            "MenuItemId":item ["id"],
            "MenuItemName":item ["name"],
            "Quantity":qty ,
            "TotalPrice":qty *item ["price"],
            "OrderedAt":ordered_at ,
            "Status":status ,
            })

    current +=timedelta (days =1 )
    day_index +=1

random .shuffle (all_orders )

INSERT_SQL =text ("""
    INSERT INTO Orders
        (MenuItemId, MenuItemName, Quantity, TotalPrice, OrderedAt, Status)
    VALUES
        (:MenuItemId, :MenuItemName, :Quantity, :TotalPrice, :OrderedAt, :Status)
""")

BATCH =5000
print (f"Inserting {len (all_orders ):,} orders in batches of {BATCH } …")
with engine .begin ()as conn :
    for i in range (0 ,len (all_orders ),BATCH ):
        conn .execute (INSERT_SQL ,all_orders [i :i +BATCH ])
        print (f"  … {min (i +BATCH ,len (all_orders )):,} / {len (all_orders ):,}",end ="\r")

print (f"\n✅  Done — {len (all_orders ):,} orders inserted.")
print (f"\nExpected weekly totals per item (rough check):")
print ("  Run: SELECT MenuItemId, SUM(Quantity) FROM Orders")
print ("       WHERE OrderedAt >= DATE_SUB(NOW(), INTERVAL 7 DAY)")
print ("       AND Status != 'Cancelled' GROUP BY MenuItemId;")
print ("\nExpected range: ~300–700 per item per 7 days (realistic for a single outlet).")