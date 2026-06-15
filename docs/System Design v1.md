AI Restaurant Demand & Menu Optimization System


Helps restaurants predict popular dishes and optimize menu pricing based on order history.

-Authentication - manager(username and pass)

## Features

| # | Feature | What It Does |
|---|---|---|
| 1 | Order Tracking | Add, view, update, and delete restaurant orders |
| 2 | Demand Prediction | Predicts which dishes will sell most in the coming days |
| 3 | Menu Optimization Insights | Suggests price changes based on demand and profit margin |
| 4 | Peak Hour Detection | Shows which hours of the day are busiest |
| 5 | Reports | Revenue trends, top dishes, and order summaries |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Angular (TypeScript) |
| Backend | ASP.NET Core (C#) |
| Database | MS SQL Server / MySQL |
| Charts | Chart.js (in Angular) |

---

## Architecture

```
┌─────────────────────────────────────────────┐
│           Browser (Restaurant Manager)      │
│              Angular App            │
│                                             │
│  [Orders] [Demand] [Menu] [Peak] [Reports]  │
└──────────────────┬──────────────────────────┘
                   │  HTTP / REST (JSON)
                   │
┌──────────────────▼──────────────────────────┐
│         ASP.NET Core Web API                │
│                                             │
│  OrdersController                           │
│  ReportsController  ──► ReportService       │
│  DemandController   ──► DemandService       │
│  MenuController     ──► MenuOptService      │
└──────────────────┬──────────────────────────┘
                   │  Entity Framework Core
                   │
┌──────────────────▼──────────────────────────┐
│          MS SQL Server / MySQL              │
│                                             │
│  Tables: Orders, MenuItems                  │
└─────────────────────────────────────────────┘
```

## Database Tables

### Table: `Orders`

| Column | Type | Notes |
|---|---|---|
| Id | INT | Primary Key, auto-increment |
| MenuItemId | INT | Foreign Key → MenuItems.Id |
| MenuItemName | NVARCHAR(100) | Denormalized for speed |
| Quantity | INT | Number of portions ordered |
| TotalPrice | DECIMAL(10,2) | Price at time of order |
| OrderedAt | DATETIME | Timestamp of the order |
| Status | NVARCHAR(20) | Pending / Completed / Cancelled |

### Table: `MenuItems`

| Column | Type | Notes |
|---|---|---|
| Id | INT | Primary Key, auto-increment |
| Name | NVARCHAR(100) | Dish name |
| Category | NVARCHAR(50) | Main / Starter / Breakfast / Beverage |
| Price | DECIMAL(10,2) | Selling price |
| CostPrice | DECIMAL(10,2) | Ingredient cost (used for margin calc) |
| IsAvailable | BIT | 1 = available, 0 = hidden from menu |

--
> `Price` = what the customer pays. `CostPrice` = what it costs to make.
> Profit Margin = `(Price - CostPrice) / Price × 100`
> The Menu Optimization feature uses this to decide whether to raise or lower a price.

---

## API Endpoints

### Orders  — Feature 1: Order Tracking

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/orders` | Get all orders (sorted by newest first) |
| GET | `/api/orders/{id}` | Get a single order by ID |
| POST | `/api/orders` | Create a new order |
| PUT | `/api/orders/{id}/status` | Update order status (Pending → Completed) |
| DELETE | `/api/orders/{id}` | Delete an order |

**POST `/api/orders` — Request Body:**
```json
{
  "menuItemId": 2,
  "menuItemName": "Biryani",
  "quantity": 2,
  "totalPrice": 360.00
}
```

---

### Reports — Feature 4: Peak Hour Detection + Feature 5: Reports

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/reports/peak-hours` | Order count and revenue per hour of the day |
| GET | `/api/reports/top-dishes?days=7` | Top dishes by quantity sold in last N days |
| GET | `/api/reports/revenue/daily?days=30` | Revenue per day for last N days |
| GET | `/api/reports/summary` | Today's total orders and total revenue |

**GET `/api/reports/peak-hours` — Response:**
```json
[
  { "hour": 12, "label": "12:00", "orderCount": 42, "revenue": 7560.00 },
  { "hour": 13, "label": "13:00", "orderCount": 58, "revenue": 10440.00 },
  { "hour": 20, "label": "20:00", "orderCount": 35, "revenue": 6300.00 }
]
```

---

### Demand — Feature 2: Demand Prediction

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/demand/predict` | Top 5 predicted dishes for next 7 days |

**GET `/api/demand/predict` — Response:**
```json
[
  {
    "dishName": "Biryani",
    "lastWeekActual": 80,
    "predictedNextWeek": 90,
    "trendPercent": 12.5,
    "confidencePercent": 80
  }
]
```

> **How the prediction works (simple rule-based):**
> Compare last 7 days vs previous 7 days → calculate % change → apply capped trend to predict next week.
> High demand + growing trend → 80% confidence. Declining → 50% confidence.

---

### Menu — Feature 3: Menu Optimization Insights

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/menu/optimize` | Pricing recommendation for every menu item |
| PUT | `/api/menu/{id}/price` | Apply a suggested price change |

**GET `/api/menu/optimize` — Response:**
```json
[
  {
    "itemId": 1,
    "itemName": "Biryani",
    "category": "Main",
    "currentPrice": 180.00,
    "costPrice": 80.00,
    "marginPercent": 55.6,
    "demandLast30Days": 240,
    "action": "Increase Price",
    "reason": "High demand with strong margin. Market can support a higher price.",
    "suggestedPrice": 200.00
  }
]
```

> **Optimization logic:**
> - High demand + good margin → **Increase Price**
> - Low demand → **Reduce Price**
> - Low margin regardless of demand → **Review Cost**
> - Balanced → **Keep Price**

---




------------------------------------------------------------------------------------------------------------------------------------------------------------------------




















































## .NET Project Structure

```
RestaurantAI.API/
├── Controllers/
│   ├── OrdersController.cs
│   ├── ReportsController.cs
│   ├── DemandController.cs
│   └── MenuController.cs
├── Models/
│   ├── Order.cs
│   └── MenuItem.cs
├── DTOs/
│   ├── CreateOrderDto.cs
│   ├── UpdateStatusDto.cs
│   ├── PeakHourDto.cs
│   ├── TopDishDto.cs
│   ├── DailyRevenueDto.cs
│   ├── DemandPredictionDto.cs
│   └── MenuOptimizationDto.cs
├── Services/
│   ├── IOrderService.cs / OrderService.cs
│   ├── ReportService.cs
│   ├── DemandService.cs
│   └── MenuOptService.cs
├── Data/
│   ├── AppDbContext.cs
│   └── DbSeeder.cs
├── Program.cs
└── appsettings.json
```

---

## Angular Project Structure

```
src/app/
├── core/
│   ├── services/
│   │   └── api.service.ts          ← all HTTP calls in one place
│   └── models/
│       ├── order.model.ts
│       └── menu-item.model.ts
├── features/
│   ├── orders/
│   │   ├── orders-list/            ← view all orders
│   │   └── add-order/              ← add order form
│   ├── demand/
│   │   └── demand-prediction/      ← prediction table
│   ├── menu-opt/
│   │   └── menu-optimization/      ← optimization insights table
│   ├── peak-hours/
│   │   └── peak-hours/             ← bar chart
│   └── reports/
│       └── reports-dashboard/      ← stat cards + charts
└── shared/
    └── components/
        └── navbar/
```

---

## Angular Routes

| URL | Component | Feature |
|---|---|---|
| `/orders` | OrdersListComponent | Order Tracking |
| `/orders/add` | AddOrderComponent | Order Tracking |
| `/peak-hours` | PeakHoursComponent | Peak Hour Detection |
| `/demand` | DemandPredictionComponent | Demand Prediction |
| `/menu-opt` | MenuOptimizationComponent | Menu Optimization |
| `/reports` | ReportsDashboardComponent | Reports |

---

## Which API Does Each Screen Call?

| Screen | API Called |
|---|---|
| Orders List | `GET /api/orders` |
| Add Order | `POST /api/orders` |
| Peak Hours Chart | `GET /api/reports/peak-hours` |
| Reports Dashboard | `GET /api/reports/top-dishes` + `GET /api/reports/revenue/daily` |
| Demand Prediction | `GET /api/demand/predict` |
| Menu Optimization | `GET /api/menu/optimize` + `PUT /api/menu/{id}/price` |

---

## Key Terms (Quick Reference)

| Term | What It Means |
|---|---|
| Controller | Receives HTTP requests, calls the service, returns response |
| Service | Contains all the business logic (calculations, DB queries) |
| DTO | The shape of data the API sends or receives — not the DB model directly |
| DbContext | EF Core's connection to the database — one class, all tables |
| Migration | EF Core command that creates/updates database tables from C# models |
| `subscribe()` | Angular way to receive data back from an HTTP call |
| `forkJoin` | Run two API calls at the same time, wait for both to finish |
| `*ngFor` | Angular directive to repeat HTML for each item in a list |
| CORS | Must be enabled in .NET so Angular (port 4200) can call the API (port 5001) |

---

*Stack: Angular · ASP.NET Core C# · MS SQL / MySQL · EF Core · Chart.js*
