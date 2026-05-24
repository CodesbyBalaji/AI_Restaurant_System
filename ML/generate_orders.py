import random 
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

END_DATE =datetime (2026 ,12 ,31 )

TOTAL_DAYS =(
END_DATE -START_DATE 
).days 





menu_items =[

{
"id":1 ,
"name":"Biryani",
"price":180 ,

"base":42 ,

"weekend":1.30 ,

"festival":1.35 ,

"rain":0.95 ,

"growth":1.03 ,

"variance":0.04 
},

{
"id":2 ,
"name":"Fried Rice",
"price":150 ,

"base":24 ,

"weekend":1.08 ,

"festival":1.02 ,

"rain":1.00 ,

"growth":1.01 ,

"variance":0.03 
},

{
"id":3 ,
"name":"Noodles",
"price":140 ,

"base":28 ,

"weekend":1.06 ,

"festival":1.02 ,

"rain":1.18 ,

"growth":1.02 ,

"variance":0.04 
},

{
"id":4 ,
"name":"Burger",
"price":120 ,

"base":22 ,

"weekend":1.15 ,

"festival":1.04 ,

"rain":0.97 ,

"growth":0.99 ,

"variance":0.04 
},

{
"id":5 ,
"name":"Pizza",
"price":250 ,

"base":36 ,

"weekend":1.40 ,

"festival":1.10 ,

"rain":1.05 ,

"growth":1.04 ,

"variance":0.04 
}
]





festival_days =[

"2024-01-01",
"2024-01-15",
"2024-04-14",
"2024-08-15",
"2024-10-31",
"2024-12-25",

"2025-01-01",
"2025-01-14",
"2025-04-14",
"2025-08-15",
"2025-11-01",
"2025-12-25",

"2026-01-01",
"2026-01-15",
"2026-04-14",
"2026-08-15",
"2026-11-12",
"2026-12-25"
]

festival_days =[

datetime .strptime (
d ,
"%Y-%m-%d"
).date ()

for d in festival_days 
]





weekday_multiplier ={

0 :0.92 ,

1 :0.95 ,

2 :0.98 ,

3 :1.00 ,

4 :1.08 ,

5 :1.22 ,

6 :1.35 
}





def is_rainy (month ):

    rain_prob ={

    1 :0.05 ,

    2 :0.05 ,

    3 :0.08 ,

    4 :0.10 ,

    5 :0.15 ,

    6 :0.32 ,

    7 :0.42 ,

    8 :0.38 ,

    9 :0.28 ,

    10 :0.16 ,

    11 :0.08 ,

    12 :0.05 
    }

    return (

    random .random ()

    <rain_prob [month ]
    )





with engine .begin ()as conn :

    conn .execute (
    text ("DELETE FROM Orders")
    )

print ("🗑 Old Orders Deleted")





all_orders =[]

current =START_DATE 

while current <=END_DATE :

    dow =current .weekday ()

    month =current .month 

    rainy =is_rainy (month )

    festival =(
    current .date ()
    in festival_days 
    )

    yearly_progress =(

    (current -START_DATE ).days 

    /TOTAL_DAYS 
    )

    for item in menu_items :





        demand =item ["base"]





        demand *=weekday_multiplier [dow ]





        if dow in [5 ,6 ]:

            demand *=item ["weekend"]





        if festival :

            demand *=item ["festival"]





        if rainy :

            demand *=item ["rain"]





        growth_factor =(

        1 +

        (
        (item ["growth"]-1 )

        *yearly_progress 
        )
        )

        demand *=growth_factor 





        seasonal =(

        1 +

        (
        0.04 *

        np .sin (

        2 *np .pi *

        current .timetuple ().tm_yday 

        /365 
        )
        )
        )

        demand *=seasonal 





        variance =item ["variance"]

        demand *=random .uniform (

        1 -variance ,

        1 +variance 
        )





        if random .random ()<0.001 :

            demand *=random .uniform (
            1.03 ,
            1.08 
            )





        if random .random ()<0.001 :

            demand *=random .uniform (
            0.94 ,
            0.98 
            )





        daily_total =max (

        8 ,

        int (demand )
        )

        remaining =daily_total 





        order_count =max (

        5 ,

        int (daily_total /4 )
        )





        for _ in range (order_count ):

            if remaining <=0 :
                break 

            quantity =min (

            remaining ,

            random .randint (1 ,4 )
            )

            remaining -=quantity 

            hour =random .choice ([

            random .randint (12 ,15 ),

            random .randint (18 ,22 )
            ])

            minute =random .randint (0 ,59 )

            ordered_at =datetime (

            current .year ,

            current .month ,

            current .day ,

            hour ,

            minute 
            )

            all_orders .append ({

            "MenuItemId":item ["id"],

            "MenuItemName":item ["name"],

            "Quantity":quantity ,

            "TotalPrice":
            quantity *item ["price"],

            "OrderedAt":ordered_at ,

            "Status":"Completed"
            })

    current +=timedelta (days =1 )





query =text ("""

INSERT INTO Orders
(
    MenuItemId,
    MenuItemName,
    Quantity,
    TotalPrice,
    OrderedAt,
    Status
)

VALUES
(
    :MenuItemId,
    :MenuItemName,
    :Quantity,
    :TotalPrice,
    :OrderedAt,
    :Status
)

""")





with engine .begin ()as conn :

    conn .execute (
    query ,
    all_orders 
    )

print (f"\n✅ Inserted {len (all_orders )} orders")