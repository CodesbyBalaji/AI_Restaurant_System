# System Design Document — AI Restaurant Demand & Menu Optimization System (v2)

**Confidential — Internal Use Only**  
**Version:** 2.0  
**Last Updated:** June 15, 2026  

---

## 01 Executive Summary & Tech Stack

The **AI Restaurant Demand & Menu Optimization System** is a full-stack, enterprise-grade internal web application designed to empower restaurant owners and managers with actionable, data-backed operational insights. By integrating order history, competitor pricing, holiday trends, and local artificial intelligence (including predictive modeling and a context-aware chat assistant), the platform eliminates gut-feeling decisions, reduces food waste, maximizes profit margins, and facilitates seamless internal communications.

### Technology Stack

| Layer | Technology | Role in the System |
| :--- | :--- | :--- |
| **Frontend** | Angular 17+ (TypeScript) | Client-side dashboard, forms, real-time presence indicators, chat UI with AI assistant integration, interactive charts. |
| **Backend** | ASP.NET Core 9 (C#) | RESTful API gateway, service orchestrator, SignalR hub coordinator, security manager. |
| **Database** | MySQL  | Relational storage for menu items, orders, competitor price benchmarks, and persistent messages. |
| **ORM** | Entity Framework Core | Database access and schema management from .NET code. |
| **AI/ML Engine** | Python (FastAPI) | Predictive time-series server running custom-trained Prophet models. |
| **LLM Inference** | Ollama (Local LLMs) | Local LLM engine running `phi3` (structured JSON generation for pricing and menu insights) and `qwen2.5:3b` (real-time, context-enriched chat assistant). |
| **Charts** | Chart.js | Visual rendering of peak hours, 30-day revenue trends, and top dish distributions. |
| **Real-time Chats** | ASP.NET Core SignalR | Bidirectional WebSocket channel for live messaging, online status tracking, and AI chat assistant integration. |

---

## 02 Problem Statement & User Roles

### The Problem

Traditional restaurants face significant operational inefficiencies due to three primary vectors:
* **Inventory Waste:** Over-preparing dishes with low real-time demand leads to high spoilage costs.
* **Stockouts:** Under-preparing highly popular dishes leads to unmet customer demand and lost revenue.
* **Suboptimal Pricing:** Static menus fail to capture seasonal demand spikes, ignore competitor pricing changes, and erode margins.
* **Coordination Gaps:** Operations managers and administrators lack instant internal communications and live shift monitoring tools, slowing down execution.

### Target Users

| Role | Description | Access Rights |
| :--- | :--- | :--- |
| **Admin** | Restaurant Owner | Full read/write access. Can modify menu base prices, view all performance insights, manage accounts, chat with managers, and consult the AI assistant. |
| **Manager** | Shift Supervisor | Read-only access on pricing insights. Can view/add orders, monitor demand reports, track calendar events, chat with admins, and consult the AI assistant. |

*Note: This is an internal tool only. Customers, delivery riders, and kitchen line staff do not log into this platform.*

---

## 03 Features (Functional Scope)

The system provides exactly eight core features:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              REST COMPONENT FEATURES                                   │
├─► [1] Order Tracking: Place, view, modify order status (Pending/Completed).            │
├─► [2] Demand Prediction: Top 5 dishes forecasted for next 7 days (Prophet).            │
├─► [3] Menu Optimization: Cost-margin analysis and AI price recommendations (Phi-3).    │
├─► [4] Peak Hour Detection: Hourly order volume and revenue distributions.              │
├─► [5] Reports Dashboard: 30-day revenue trends, categories, and today's stats.         │
├─► [6] Price Intelligence: Competitor price comparison, market gap notifications.        │
├─► [7] Festival Analytics: Holiday demand predictions, growth analysis, operational tips.│
└────────────────────────────────────────────────────────────────────────────────────────┘
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                            REAL-TIME SIGNALR FEATURES                                  │
├─► [8] Chat, Presence & AI: Peer-to-peer live chat, online badges, and AI assistant.    │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

| # | Feature | Detailed Capabilities | Who Uses It |
|---|---|---|---|
| **1** | **Order Tracking** | Create, view, update status, and soft-delete orders. Features KPI cards for today's order count, total revenue, pending queue size, and average order value. | Admin + Manager |
| **2** | **Demand Prediction** | High-precision time-series forecasting. Predicts top 5 dishes expected to sell next week. Displays actual sales history, predicted count, trend percentages, and confidence metrics. | Admin + Manager |
| **3** | **Menu Optimization** | Suggests structural adjustments (Increase, Reduce, Keep, Review Cost) based on demand metrics and raw ingredient margins. | Admin (apply price) + Manager (view-only) |
| **4** | **Peak Hour Detection** | Interactive bar charts displaying total orders and gross revenue by hour of the day. Highlights the quietest and busiest hours. | Admin + Manager |
| **5** | **Reports Dashboard** | High-level business intelligence. Renders a 30-day revenue timeline (line chart), top dish distribution (doughnut chart), and sales splits by category. | Admin + Manager |
| **6** | **Price Intelligence** | Benchmark dashboard comparing own menu pricing against market averages. Classifies items (e.g., *Potential price increase opportunity*, *Above market pricing*) using competitor minimum/maximum indices. | Admin + Manager |
| **7** | **Festival Analytics** | Forecasting spikes on calendar holidays (Pongal, Diwali, Tamil New Year, Christmas, etc.). Predicts dish ranks, calculates growth percentages vs. last year, and displays AI operational guidance. | Admin + Manager |
| **8** | **Chat, Presence & AI** | Instant message console with live delivery/read receipts and connection tracking. Real-time online/offline badges keep users synced. Integrates `RestaurantAI`, an automated assistant that answers inventory, stock, and menu planning questions using current forecasts and pricing recommendations as background context. | Admin + Manager |

### Authentication & Access Control
A secure login screen guards the application. JSON Web Tokens (JWT) are generated on successful authentication. Role-based access control (RBAC) is enforced at two levels:
* **Frontend Routing:** Angular guards restrict route access (`/` and `/chat` require active login session).
* **API Endpoints:** ASP.NET controllers are secured using standard `[Authorize(Roles = "Admin,Manager")]` or `[Authorize(Roles = "Admin")]` filters, with user identity resolved securely from claims.

---

## 04 System Architecture (High-Level)

The platform follows a modular, multi-service architecture utilizing RESTful communication and bidirectional WebSockets:

```
┌────────────────────────────────────────────────────────────────────────────────┐
│                             BROWSER CLIENT (Angular)                           │
│  ┌───────────────┐ ┌───────────────┐ ┌──────────────┐ ┌──────────────┐         │
│  │ Dashboard/Rep │ │ Price Intel.  │ │   Festival   │ │ Chat Console │         │
│  └───────┬───────┘ └───────┬───────┘ └──────┬───────┘ └──────┬───────┘         │
└──────────┼─────────────────┼────────────────┼────────────────┼─────────────────┘
           │ HTTP/REST (JSON)│                │                │ SignalR (WebSockets)
           ▼                 ▼                ▼                ▼
┌────────────────────────────────────────────────────────────────────────────────┐
│                           API GATEWAY (ASP.NET Core 9)                         │
│  ┌───────────────────────┐ ┌──────────────────────┐ ┌───────────────────────┐  │
│  │   OrdersController    │ │ PriceIntelController │ │    AuthController     │  │
│  ├───────────────────────┤ ├──────────────────────┤ ├───────────────────────┤  │
│  │   ReportsController   │ │  FestivalController  │ │  Chat & Presence Hubs │  │
│  ├───────────────────────┤ ├──────────────────────┤ └──────────┬────────────┘  │
│  │   DemandController    │ │   MenuController     │            │               │
│  └───────────┬───────────┘ └──────────┬───────────┘            ▼               │
│              │                        │               RestaurantAIService      │
│      DemandService               MenuOptService                │               │
│              │                        │                        │               │
│              ├────────────────────────┴────────────────────────┤               │
│              ▼ HTTP/POST (/predict)                            ▼               │
│    MlPredictionService ──────────────────────────────► [ML Service (FastAPI)] │
│                                                        - load: prophet_models  │
│              ├─────────────────────────────────────────► [Ollama Local Hosts] │
│              ▼ HTTP/POST (/api/generate)               - phi3 (optimizations)  │
│    AIInsightService / MenuAIInsightService /           - qwen2.5:3b (chat assistant)
│    RestaurantAIService                                                         │
└──────────────┬─────────────────────────────────────────────────────────────────┘
               │ Entity Framework Core
               ▼
┌────────────────────────────────────────────────────────────────────────────────┐
│                            DATABASE LAYER (MySQL)                              │
│   ┌───────────────┐ ┌───────────────┐ ┌─────────────────┐ ┌───────────────┐    │
│   │   MenuItems   │ │    Orders     │ │CompetitorPrices │ │   Messages    │    │
│   └───────────────┘ └───────────────┘ └─────────────────┘ └───────────────┘    │
└────────────────────────────────────────────────────────────────────────────────┘
```

### Layer Responsibilities

1. **Presentation Layer (Angular 17+):**
   * Manages layout states, renders tables, and controls user actions.
   * Directs REST calls via a consolidated API client (`api.service.ts`).
   * Manages SignalR hubs (`chat.service.ts` and `presence.service.ts`) for real-time updates, auto-reconnections, and AI typing states.
   * Stores the active JWT in memory/local storage and automatically appends it using an HTTP interceptor.

2. **Business Application Layer (ASP.NET Core 9):**
   * Intercepts HTTP requests, validates tokens, and checks user role permissions.
   * Orchestrates services: aggregates database rows, posts batch inputs to Python prediction hosts, targets Ollama prompts, and powers AI conversations.
   * Maps entities to contracts using lightweight Data Transfer Objects (DTOs).
   * Runs the real-time SignalR Hubs (`ChatHub` and `PresenceHub`) with thread-safe online state tracking (`PresenceTracker`) and delegates assistant tasks to `RestaurantAIService`.

3. **ML Prediction Server (FastAPI):**
   * Python-based microservice listening on port `8000`.
   * Loads serialized Prophet models (`prophet_models.pkl`) to execute multi-item forecasts.
   * Directly queries the MySQL instance to fetch sliding windows (recent 28 days) of historical orders for feature construction.

4. **LLM Orchestration Server (Ollama):**
   * Local background daemon running on port `11434`.
   * Houses the lightweight `phi3` model (for structured JSON menu optimizations) and the `qwen2.5:3b` model (for natural language assistant chats).
   * Supports structured JSON generation and conversational analytics response generation.

5. **Relational Database (MySQL):**
   * Stores persistent entities (menu records, historical orders, competitor pricing indices, and chat histories).

---

## 05 Database Schema Design

The application operates on a structured relational schema in MySQL:

```
  ┌───────────────┐                  ┌─────────────┐
  │   MenuItems   │1                *│   Orders    │
  ├───────────────┤──────────────────┤─────────────┤
  │ Id (PK)       │                  │ Id (PK)     │
  │ Name          │                  │ MenuItemId  │
  │ Category      │                  │ MenuItemName│
  │ Price         │                  │ Quantity    │
  │ CostPrice     │                  │ TotalPrice  │
  │ IsAvailable   │                  │ OrderedAt   │
  │ CreatedAt     │                  │ Status      │
  └───────────────┘                  └─────────────┘

  ┌────────────────────┐             ┌─────────────┐
  │  CompetitorPrices  │             │  Messages   │
  ├────────────────────┤             ├─────────────┤
  │ Id (PK)            │             │ Id (PK)     │
  │ Restaurant         │             │ SenderId    │
  │ City               │             │ ReceiverId  │
  │ DishCategory       │             │ Content     │
  │ DishName           │             │ SentAt      │
  │ MinPrice           │             │ DeliveredAt │
  │ MaxPrice           │             │ ReadAt      │
  │ Source             │             └─────────────┘
  │ CollectedAt        │
  └────────────────────┘
```

### 1. `MenuItems` Table
Stores the official restaurant dishes, base pricing, and cost margins.
```sql
CREATE TABLE MenuItems (
    Id INT PRIMARY KEY AUTO_INCREMENT,
    Name VARCHAR(255) NOT NULL,
    Category VARCHAR(100) NOT NULL,
    Price DECIMAL(10, 2) NOT NULL,
    CostPrice DECIMAL(10, 2) NOT NULL,
    IsAvailable BOOLEAN DEFAULT TRUE,
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_category (Category),
    INDEX idx_name (Name)
);
```

### 2. `Orders` Table
Tracks real-time sales transactions, linking back to the MenuItem.
```sql
CREATE TABLE Orders (
    Id INT PRIMARY KEY AUTO_INCREMENT,
    MenuItemId INT NOT NULL,
    MenuItemName VARCHAR(255) NOT NULL,
    Quantity INT NOT NULL,
    TotalPrice DECIMAL(10, 2) NOT NULL,
    OrderedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    Status VARCHAR(50) DEFAULT 'Pending',
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (MenuItemId) REFERENCES MenuItems(Id) ON DELETE CASCADE,
    INDEX idx_menu_item_id (MenuItemId),
    INDEX idx_ordered_at (OrderedAt),
    INDEX idx_status (Status)
);
```

### 3. `CompetitorPrices` Table
Stores crowdsourced or scraped market benchmark data used for price intelligence.
```sql
CREATE TABLE CompetitorPrices (
    Id INT PRIMARY KEY AUTO_INCREMENT,
    Restaurant VARCHAR(255) NOT NULL,
    City VARCHAR(100) NOT NULL,
    DishCategory VARCHAR(100) NOT NULL,
    DishName VARCHAR(255) NOT NULL,
    MinPrice DECIMAL(10, 2) NOT NULL,
    MaxPrice DECIMAL(10, 2) NOT NULL,
    Source VARCHAR(100) DEFAULT '',
    CollectedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_dish_category (DishCategory),
    INDEX idx_city (City),
    INDEX idx_restaurant (Restaurant),
    INDEX idx_collected_at (CollectedAt)
);
```

### 4. `Messages` Table
Persists peer-to-peer real-time communication logs.
```sql
CREATE TABLE Messages (
    Id CHAR(36) PRIMARY KEY, -- Guid mapped
    SenderId VARCHAR(100) NOT NULL,
    ReceiverId VARCHAR(100) NOT NULL,
    Content TEXT NOT NULL,
    SentAt DATETIME NOT NULL,
    DeliveredAt DATETIME NULL,
    ReadAt DATETIME NULL
);
```

---

## 06 API Endpoint Directory

All endpoints use JSON payloads and require standard token authentication.

### 1. Authentication Endpoints (`/api/auth/`)
| Method | Route | Access | Request Body | Response Body |
| :--- | :--- | :--- | :--- | :--- |
| **POST** | `login` | Public | `{ "username": "...", "password": "..." }` | `{ "token": "...", "role": "Admin", "username": "admin" }` |

### 2. Order Tracking Endpoints (`/api/orders/`)
| Method | Route | Access | Description | Response Shape |
| :--- | :--- | :--- | :--- | :--- |
| **GET** | `/` | Admin/Manager | Get all orders, newest first | `[{ "id": 1, "menuItemId": 2, "menuItemName": "Biryani", "quantity": 2, "totalPrice": 360.00, "orderedAt": "...", "status": "Completed" }]` |
| **GET** | `{id}` | Admin/Manager | Retrieve single order details | `{ "id": 1, "menuItemName": "Biryani", "quantity": 2, ... }` |
| **POST** | `/` | Admin/Manager | Submit a new order | `{ "id": 12, "menuItemId": 2, "menuItemName": "Biryani", ... }` |
| **PUT** | `{id}/status`| Admin/Manager | Transition status (`Pending` -> `Completed`) | `204 No Content` |
| **DELETE**| `{id}` | Admin Only | Delete an order permanently | `204 No Content` |

### 3. Business Intelligence & Reports (`/api/reports/`)
| Method | Route | Query Params | Description | Response Shape |
| :--- | :--- | :--- | :--- | :--- |
| **GET** | `peak-hours` | None | Orders and revenue aggregates grouped by hour | `[{ "hour": 12, "label": "12:00", "orderCount": 42, "revenue": 7560.00 }]` |
| **GET** | `top-dishes` | `days` (Default 7) | Fetch most popular menu items sold | `[{ "dishName": "Biryani", "quantity": 140 }]` |
| **GET** | `revenue/daily`| `days` (Default 30)| Gross revenue trends per day | `[{ "date": "2026-06-01", "revenue": 14500.00 }]` |
| **GET** | `summary` | None | Summary dashboard stats for current day | `{ "todayOrdersCount": 15, "todayRevenue": 2700.00, "pendingOrders": 2, "averageOrderValue": 180.00 }` |

### 4. Machine Learning & Demand (`/api/demand/`)
| Method | Route | Access | Description | Response Shape |
| :--- | :--- | :--- | :--- | :--- |
| **GET** | `predict` | Admin/Manager | Top 5 predicted items next 7 days | `[{ "dishName": "Biryani", "thisWeek": 85, "lastWeek": 80, "twoWeeksAgo": 75, "trendPercent": 6.3, "predictedNextWeek": 90, "confidencePercent": 82, "recommendation": "Increase stock", "aiInsight": "..." }]` |

### 5. Menu Pricing & AI Insights (`/api/menu/`)
| Method | Route | Access | Description | Response Shape |
| :--- | :--- | :--- | :--- | :--- |
| **GET** | `/` | Admin/Manager | Fetch raw list of menu items | `[{ "id": 1, "name": "Biryani", "price": 180.00, ... }]` |
| **GET** | `optimize` | Admin/Manager | Fetch structured pricing and promotion advice | `[{ "id": 1, "name": "Biryani", "currentPrice": 180.00, "optimizedPrice": 185.40, "priceChangePercent": 3.0, "category": "Premium Item", "strategy": "Increase price slightly", "promotion": "...", "inventoryAction": "..." }]` |
| **PUT** | `{id}/price`| Admin Only | Apply selected pricing recommendation | `204 No Content` (accepts decimal value in request body) |

### 6. Price Intelligence Endpoints (`/api/priceintelligence/`)
| Method | Route | Query Params | Description | Response Shape |
| :--- | :--- | :--- | :--- | :--- |
| **GET** | `summary` | None | Average, Min, Max competitor prices | `[{ "dish": "Biryani", "averagePrice": 195.0, ... }]` |
| **GET** | `cities` | `dish` | Competitor pricing averaged by city | `[{ "city": "Chennai", "averagePrice": 190.0 }]` |
| **GET** | `competitors` | `dish` | Specific competitor restaurants pricing | `[{ "restaurant": "Cafe A", "averagePrice": 205.0 }]` |
| **GET** | `price-comparison`| None | Detailed benchmark of own items vs market | `[{ "dish": "Biryani", "yourPrice": 180.0, "marketAverage": 195.0, "differencePercent": -7.7, "recommendation": "Competitively priced", "aiInsight": "..." }]` |

### 7. Festival Analytics Endpoints (`/api/festival/`)
| Method | Route | Access | Description | Response Shape |
| :--- | :--- | :--- | :--- | :--- |
| **GET** | `analytics/{festivalDate}` | Admin/Manager | Predict sales spikes on specific holiday | `{ "title": "🪔 Pongal", "date": "2026-01-14", "lastYearTotalSales": 450, "predictedTotalSales": 510, "overallGrowthPercent": 13.3, "topPredictedDish": "Biryani", "operationalAdvice": ["...", "..."], "items": [...] }` |

### 8. Message Logs Endpoints (`/api/chat/`)
| Method | Route | Query Params | Description | Response Shape |
| :--- | :--- | :--- | :--- | :--- |
| **GET** | `conversation` | `otherUserId` | Load message history for authenticated user session | `[{ "senderId": "admin", "receiverId": "manager", "content": "..." }]` |
| **POST** | `mark-read/{messageId}` | None | Set message status to read | `200 OK` |
| **GET** | `last-message` | `otherUserId` | Load most recent thread entry for authenticated user session | `{ "senderId": "admin", "content": "Hello", "sentAt": "..." }` |
| **DELETE**| `{messageId}` | None | Delete single message entry | `204 No Content` |

---

## 07 Module Structure and Security Design

### Frontend Component Map (Angular)
The frontend application is structured as a series of standalone features, routed in [app.routes.ts](file:///Users/balajia/Desktop/AI_Restaurant_System/UI/src/app/app.routes.ts):

* **`core/`**
  * **`services/`**
    * [api.service.ts](file:///Users/balajia/Desktop/AI_Restaurant_System/UI/src/app/core/services/api.service.ts): Global REST Client handles base queries for orders, menus, dashboards, and price statistics.
    * [auth.service.ts](file:///Users/balajia/Desktop/AI_Restaurant_System/UI/src/app/core/services/auth.service.ts): Handles credentials validation, token persistence, and role parsing.
    * [chat.service.ts](file:///Users/balajia/Desktop/AI_Restaurant_System/UI/src/app/core/services/chat.service.ts): Connects to the SignalR chat endpoint, manages connection state and lifecycle events (automatic reconnection), handles AI typing notifications, and sends/receives messages.
    * [presence.service.ts](file:///Users/balajia/Desktop/AI_Restaurant_System/UI/src/app/core/services/presence.service.ts): Connects to the SignalR presence hub, maps online users, and triggers global toast alerts when managers connect.
  * **`guards/`**
    * [auth-guard.ts](file:///Users/balajia/Desktop/AI_Restaurant_System/UI/src/app/core/guards/auth-guard.ts): Verifies active JWT token presence and blocks unauthenticated navigation.
* **`features/`**
  * **`dashboard/`**
    * Renders operational KPIs, interactive 30-day timelines, and doughnut distribution charts via Chart.js.
  * **`orders/`**
    * Handles order history listing, updates status queues, and launches creation modals.
  * **`menu/`**
    * Displays interactive digital catalog details and raw prices.
  * **`menu-insights/`**
    * Combined interface mapping price optimizations, cost margins, inventory priorities, and promotional advice.
  * **`calendar/`**
    * Interactive holiday planner rendering Pongal, Diwali, and Christmas forecasting growth targets.
  * **`pages/price-intelligence/`**
    * Displays pricing distribution, lowest competitor margins, and own price benchmarking models.
  * **`pages/chat/`**
    * Interactive messaging workspace displaying online status tags, history trails, and action toggles.

### Security & User Identity Verification
To prevent user spoofing across real-time and REST boundaries:
* **Token Claims Alignment:** The JWT generation process attaches the user's username as both `ClaimTypes.Name` and `ClaimTypes.NameIdentifier`.
* **SignalR Provider:** The `NameUserIdProvider` implements `IUserIdProvider` to resolve connection identity using `ClaimTypes.NameIdentifier`. This enforces that SignalR maps connections strictly by the authenticated user ID.
* **REST & Hub Verification:** Endpoints and Hub actions (such as `MarkAsRead`, `DeleteMessage`, `GetConversation`, and `SendMessage`) no longer allow clients to specify the sender's user ID via query parameters or payloads. Instead, the server extracts `ClaimTypes.NameIdentifier` directly from the user claims context (`User.FindFirstValue` or `Context.UserIdentifier`), ensuring that users can only fetch or manipulate messages belonging to their active session.

---

## 08 Core Data Flows

### Flow 1: High-Precision Demand Forecasting (Prophet Pipeline)
Runs when a user visits the **Demand Prediction** screen:

```
[Angular UI]               [Web API]             [FastAPI Server]            [MySQL DB]
     │                         │                         │                        │
     │── GET /demand/predict ─►│                         │                        │
     │                         │── PredictBatchAsync ───►│                        │
     │                         │    (Active Item IDs)    │                        │
     │                         │                         │── Query Last 28 Days ─►│
     │                         │                         │◄── Return Order Rows ──│
     │                         │                         │                        │
     │                         │                         │── Run Prophet Forecast │
     │                         │                         │   (Add weekend/holidays│
     │                         │                         │    regressors)         │
     │                         │                         │                        │
     │                         │◄── Return Predictions ──│                        │
     │                         │    (ThisWeek/LastWeek/  │                        │
     │                         │     PredictedNextWeek/  │                        │
     │                         │     Confidence/Bounds)  │                        │
     │                         │                         │                        │
     │◄── Return JSON Data ────│                         │                        │
     │    (Aggregated with AI  │                         │                        │
     │     Recommendations)    │                         │                        │
```

#### Step-by-Step Execution:
1. **Request Dispatch:** Angular fires `GET /api/demand/predict` to the .NET gateway.
2. **Batch Prediction Call:** `DemandService` fetches all active `MenuItemIds` with order histories and forwards them to the Python FastAPI server (`POST http://localhost:8000/predict`).
3. **Data Pre-processing:** The FastAPI script pulls the last 28 days of completed orders from MySQL, fills gaps with zero demand using Pandas `date_range`, and aggregates past weekly metrics:
   * $ThisWeek = \sum_{t=0}^{6} Quantity(t)$
   * $LastWeek = \sum_{t=7}^{13} Quantity(t)$
   * $TwoWeeksAgo = \sum_{t=14}^{20} Quantity(t)$
4. **Prophet Execution:**
   * Reads the pre-trained Prophet model configuration from `prophet_models.pkl`.
   * Builds a future calendar data frame for the next 7 days, mapping weekend regressors ($dayofweek \ge 5$) and month boundaries.
   * Runs the model to generate the forecast $\hat{y}$ (predicted demand), lower bounds $\hat{y}_{lower}$, and upper bounds $\hat{y}_{upper}$.
5. **Statistical Smoothing & Capping:**
   * Computes a baseline: $Baseline = Mean(ThisWeek, LastWeek, TwoWeeksAgo)$.
   * To prevent wild swings in synthetic datasets, the prediction is clamped:
     $$MinAllowed = Baseline \times 0.75$$
     $$MaxAllowed = Baseline \times 1.25$$
     $$\hat{y}_{final} = Clamp(\hat{y}_{raw}, MinAllowed, MaxAllowed)$$
6. **Confidence Metrics:**
   * The training accuracy score ($TrainConf$) is calculated during evaluation: $70\% \times (100 - MAPE) + 30\% \times (R^2 \times 100)$.
   * Live prediction variance is computed using the forecast interval width:
     $$BandScore = 100 - \left( \frac{\hat{y}_{upper} - \hat{y}_{lower}}{\hat{y}_{final}} \times 20 \right)$$
   * Final Confidence is a weighted blend: $0.6 \times TrainConf + 0.4 \times BandScore$ (clamped between 50% and 95%).
7. **Aggregated Recommendation:** The API parses the forecasted change:
   * $ForecastChangePercent = \frac{\hat{y}_{final} - ThisWeek}{ThisWeek} \times 100\%$
   * Generates localized operational instructions (e.g., *Increase stock*, *Reduce stock*, *Maintain stock*).

---

### Flow 2: Intelligent Menu Optimization (Prophet + local Phi-3 LLM)
Runs when a user visits the **Menu Insights** screen:

1. **Request Dispatch:** Angular sends `GET /api/menu/optimize` to the .NET API.
2. **Aggregated Forecast Retrieval:** The backend fetches active menu items, and gets demand forecasts from the Prophet engine.
3. **LLM Prompts Targeting:** For each item, the `.NET MenuOptService` calculates the current profit margin:
   $$Margin\% = \frac{Price - CostPrice}{Price} \times 100$$
   And fires a structured request to the local Ollama instance running the `phi3` model:
   * **System Prompt Instructions:** Instructs the model to act as a restaurant revenue optimization agent. It inputs the item's margin, weekly demand trend, and forecast confidence.
   * **Enforced Business Constraints:**
     * Maximum price increase of 8%.
     * Maximum price decrease of 5%.
     * Hold price static if predicted demand is within $\pm 10\%$ of current demand.
     * Permit price increases only if $Trend\% > 15\%$ and predicted demand exceeds current demand.
   * **Strict Format Enforcement:** The prompt demands *only* valid JSON fitting this contract:
     ```json
     {
       "optimizedPrice": 185.00,
       "category": "Premium Item",
       "strategy": "Increase price slightly based on demand",
       "promotion": "Bundle with beverage",
       "priority": "High",
       "inventoryAction": "Increase stock buffer by 10%"
     }
     ```
4. **Fallback Heuristics:** If the local LLM times out or returns malformed JSON, a C# try-catch block automatically activates, running fallback calculations:
   * If predicted demand is $> 10\%$ over current demand $\to$ sets optimized price to $+3\%$.
   * If predicted demand is $< 5\%$ below current demand $\to$ sets optimized price to $-2\%$.
   * Clamps price boundaries between $95\%$ and $108\%$ of the original price.
5. **Execution (Admin Only):** When the Admin clicks "Apply" on the UI, Angular fires `PUT /api/menu/{id}/price` with the new decimal value, updating the target record in the `MenuItems` table.

---

### Flow 3: Competitor Price Intelligence
Runs when a user views the **Price Intelligence** dashboard:

1. **Request Dispatch:** Angular sends `GET /api/priceintelligence/price-comparison` to the .NET controller.
2. **Market Aggregates Calculation:** The controller queries the `CompetitorPrices` table, matching records where `DishCategory == MenuItem.Name`:
   * Calculates the market average benchmark:
     $$MarketAverage = Average\left( \frac{MinPrice + MaxPrice}{2} \right)$$
   * Determines the variance from market average:
     $$Difference\% = \frac{Price - MarketAverage}{MarketAverage} \times 100\%$$
3. **Threshold Classification:**
   * If $Difference\% \le -15\% \to$ Recommendation: `"Potential price increase opportunity"`.
   * If $Difference\% \ge 15\% \to$ Recommendation: `"Above market pricing"`.
   * Otherwise $\to$ Recommendation: `"Competitively priced"`.
4. **Narrative Enrichment:** The server attaches natural language suggestions based on these thresholds:
   * *Under-priced items:* "Priced X% below average. Demand remains competitive; recommend a price increase."
   * *Over-priced items:* "Priced X% above average. Monitor demand and competitor pricing closely."
5. **UI Visualization:** Angular renders comparison histograms and data tables highlighting price gaps.

---

### Flow 4: Festival Sales Forecasting
Runs when a user selects a holiday on the **Festival Calendar** dashboard:

1. **Date Parsing:** The client queries `/api/festival/analytics/{festivalDate}` (e.g., `2026-11-12` for Diwali).
2. **Historical Lookup:** The service looks up sales on the same holiday last year ($Date - 1\text{ Year}$), grouping by dish name to calculate total historical quantities sold.
3. **Future Sales Projection:** The service calls the Python FastAPI endpoint `/festival/predict/{festivalDate}`.
   * FastAPI queries the pre-trained Prophet model for each dish, inputting the specific target date.
   * The model predicts daily demand ($\hat{y}$ value) for that specific date.
4. **Growth Analysis:** The API compiles predictions alongside historical sales, computing the growth rate:
   $$Growth\% = \frac{PredictedSales - LastYearSales}{LastYearSales} \times 100\%$$
5. **Guidance Generation:**
   * If $OverallGrowth > 25\% \to$ Guidance: `"High Rush Expected. Prepare extra stock and staff."`
   * If $OverallGrowth < 0\% \to$ Guidance: `"Soft Demand Risk. Avoid overstocking."`
6. **UI Display:** Renders a list of ranked dishes, target prep numbers, and operational checklists.

---

### Flow 5: Real-Time Chat & Presence Monitoring (SignalR WebSocket Flow)
Tracks instant message exchanges and user connectivity:

```
[User A (Manager)]              [SignalR Gateway]             [User B (Admin)]
        │                               │                             │
        │─── Connection Established ───►│                             │
        │    (Sends Access Token)       │─── Broadcast: UserOnline ──►│
        │                               │                             │
        │─── SendMessage(B, "Hello") ──►│                             │
        │    (Persists to Messages DB)  │─── Relay Message ──────────►│
        │                               │                             │
        │◄── MessageDelivered ──────────│                             │
        │                               │◄── MarkAsRead(messageId) ───│
        │◄── MessageRead(messageId) ────│                             │
```

#### Detailed Logic:
1. **Authentication Handshake:** The Angular client connects to `/hubs/presence` and `/hubs/chat` using WebSockets, sending the JWT in the query string parameter (`access_token`).
2. **Presence Registration:**
   * `PresenceHub.OnConnectedAsync` reads the user's name from claims.
   * Invokes `PresenceTracker.UserConnected(userId, connectionId)`, adding the connection to a thread-safe dictionary (`Dictionary<string, List<string>>`).
   * If this is the user's first active connection, SignalR broadcasts `UserOnline(userId)` to all active clients.
   * The server sends the current list of online users back to the caller.
3. **Message Relaying:**
   * When User A clicks send, Angular invokes `SendMessage(receiverId, content)` via the WebSocket.
   * `ChatHub` intercepts, creates a new `Message` model, and commits it to the database.
   * Dispatches the message via `Clients.User(receiverId).SendAsync("ReceiveMessage", message)`.
   * Sets `DeliveredAt = DateTime.UtcNow` and sends delivery confirmation back to the sender.
4. **Read Status Tracking:** When User B views the chat window, Angular invokes `MarkAsRead(messageId)`. The hub updates the database, and broadcasts a `MessageRead(messageId)` event to User A, updating checkmarks on their screen.
5. **Presence Deregistration:** When a user closes the browser tab, the connection times out. `PresenceHub` calls `UserDisconnected`, updates the tracker, and, if no connections remain for that user, broadcasts `UserOffline(userId)` to all clients.

---

### Flow 6: Real-Time AI Chat Assistant (Local LLM Integration)
Enables users (Admins or Managers) to interact with an AI-powered restaurant operations assistant (`RestaurantAI`):

```
[User A (Manager)]              [SignalR ChatHub]           [RestaurantAIService]         [Ollama Server]
        │                               │                            │                           │
        │── SendMessage("RestaurantAI")►│                            │                           │
        │    (Persist User Msg to DB)   │                            │                           │
        │◄── ReceiveMessage (User Msg)──│                            │                           │
        │◄── MessageDelivered ──────────│                            │                           │
        │◄── AITyping ──────────────────│                            │                           │
        │                               │── AskAsync(Prompt) ───────►│                           │
        │                               │                            │── Fetch Forecast/Menu ───►[MySQL DB]
        │                               │                            │◄── Return DB Context ─────[MySQL DB]
        │                               │                            │                           │
        │                               │                            │── POST /api/generate ────►│
        │                               │                            │   (qwen2.5:3b)            │
        │                               │                            │◄── Return AI Reply ───────│
        │                               │◄── Return Reply Text ──────│                           │
        │                               │                            │                           │
        │                               │ (Persist AI Msg to DB)     │                           │
        │◄── ReceiveMessage (AI Reply)──│                            │                           │
        │◄── AIStoppedTyping ───────────│                            │                           │
```

#### Detailed Logic:
1. **AI Message Interception:**
   * When a user sends a message to receiver `"RestaurantAI"`, `ChatHub.SendMessage` intercepts it.
   * A user message is instantiated, saved to the database, and broadcasted back to the sender's client with a delivery receipt.
2. **Typing Status Broadcast:**
   * The hub immediately sends the `AITyping` event to the caller. On the Angular UI, this triggers a dynamic message bubble with a bouncing ellipsis animation under the assistant's header.
3. **Contextual Enrichment & LLM Invocation:**
   * `ChatHub` delegates prompt execution to the backend `RestaurantAIService`.
   * `RestaurantAIService` retrieves current demand forecasts via `DemandService` and pricing insights via `MenuOptService`.
   * The services query historical records and active models in MySQL to compile the data into a JSON serialized payload.
   * A master prompt is constructed, binding the operational context, the user's question, and key generation rules (simple English, bullet points, stock recommendations, confidence level, and a limit of 120 words).
4. **Local LLM Inference:**
   * `RestaurantAIService` targets the local Ollama daemon's `/api/generate` endpoint on port `11434`, passing the prompt parameters and selecting the `qwen2.5:3b` model.
   * Ollama returns the generated analytical reply.
5. **Response Dispatch & Cleanup:**
   * The hub instantiates the AI message model, commits it to the MySQL `Messages` table, and relays the reply content via `ReceiveMessage` to the client.
   * Finally, the hub dispatches the `AIStoppedTyping` event, turning off the dynamic animation bubble in the UI.

---

## 09 Error Handling & UI State Management

The application implements a robust, layered fault-tolerance architecture:

```
                                 [ ERROR SOURCE ]
                                         │
                 ┌───────────────────────┴───────────────────────┐
                 ▼                                               ▼
         [Backend (C# / API)]                            [Frontend (Angular)]
                 │                                               │
   ┌─────────────┴─────────────┐                   ┌─────────────┴─────────────┐
   ▼                           ▼                   ▼                           ▼
[Global Middleware]     [Ollama Fallbacks]  [HTTP Interceptor]      [State Indicators]
- Catch Unhandled Ex    - Parse failures    - Catch 401s            - Spinner display
- Return status 500     - Catch Timeouts    - Route to /login       - Red Error panels
- Return JSON:          - Load heuristic    - Show green toasts     - Disable inputs
  {"error": "..."}        model               for successes           during submit
```

### 1. Backend API Error Strategies
* **Global Exception Middleware:** A centralized exception handling middleware catches all unhandled runtime errors, logs the stack trace, and returns a standard `500 Internal Server Error` response with a sanitised JSON payload:
  ```json
  { "error": "An unexpected error occurred." }
  ```
* **HTTP Status Codes:**
  * `200 OK` / `201 Created` / `204 NoContent` for successful transactions.
  * `400 BadRequest` if inputs fail validation (e.g., negative order quantity).
  * `401 Unauthorized` / `403 Forbidden` if JWT is missing, expired, or roles do not match route constraints.
  * `404 NotFound` if requested IDs (menu item, order) do not exist in the database.
* **LLM Fallback Strategy:** If Ollama is offline or the response fails to parse, a robust catch block logs the failure and falls back to mathematical heuristic calculations, returning a valid JSON payload to prevent application crashes.

### 2. Frontend UI State Management
* **Loading State Indicators:** When asynchronous HTTP requests are in progress, UI elements display animated spinners or skeleton screens, and action buttons are disabled to prevent duplicate form submissions.
* **API Failure Banners:** If an API endpoint returns an error, the UI replaces table bodies with a user-friendly message: *"Could not load data. Please check your connection and try again."*
* **Automatic Session Invalidation:** An Angular HTTP Interceptor monitors all outgoing responses. If any API call returns a `401 Unauthorized` code, the interceptor clears the local token and redirects the browser to `/login`.
* **Toast Notifications:** Standard action confirmations (e.g., updating a menu price) trigger animated success toasts: *"Dish price updated to ₹200.00 successfully"*.
