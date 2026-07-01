# AI Restaurant Demand & Menu Optimization System (v2)

An enterprise-grade, full-stack predictive dashboard and operations management system. By combining order transactions, competitor benchmarks, calendar holidays, and local artificial intelligence, the platform replaces guesswork with data-backed decisions to reduce food waste, optimize margins, and facilitate real-time team coordination.

---

## 🚀 Key Features

* **[1] Order Tracking:** Place, track, and update order statuses in real-time, backed by daily KPI revenue analytics.
* **[2] Demand Prediction:** Multi-item time-series forecasting powered by pre-trained Python Prophet models, generating confidence limits and actionable stock directions.
* **[3] Menu Optimization:** Cost-margin analyzer integrated with local LLMs (Ollama `phi3`) recommending target structural adjustments, price optimizations (clamped to business rules), and promo ideas.
* **[4] Peak Hour Detection:** Interactive dashboard charts tracking order volumes and gross revenues by hour of the day.
* **[5] Business Intelligence Reports:** Summary matrices displaying 30-day revenue timelines, category splits, and daily KPIs.
* **[6] Price Intelligence:** Competitor pricing benchmarks that identify pricing gaps and categorize items as under-priced or over-priced.
* **[7] Festival Analytics:** Holiday-specific forecasting (Pongal, Diwali, Christmas, etc.) projecting demand spikes compared to the previous year.
* **[8] Chat & AI Assistant (`RestaurantAI`):** Bidirectional text messaging UI featuring active presence badges, read checkmarks, and an integrated, context-aware AI assistant (`qwen2.5:3b`) that answers operational questions based on live inventory and optimization forecasts.

---

## 🛠️ Technology Stack

| Layer | Technology | Description |
| :--- | :--- | :--- |
| **Frontend** | Angular 17+ (TypeScript) | Standalone client dashboard, forms, interactive Chart.js widgets, and real-time SignalR WebSocket chat window. |
| **Backend** | ASP.NET Core 9 (C#) | RESTful API gateway, service orchestrator, SignalR Hub coordinator, and JWT Claims security controller. |
| **Database** | MySQL | Relational database engine storing menu records, historical transactions, competitor benchmarks, and chat logs. |
| **ORM** | Entity Framework Core | Database access and migration schema management from C# code. |
| **AI/ML Engine** | Python (FastAPI) | Predictive microservice hosting Prophet forecasting models. |
| **LLM Inference** | Ollama (Local Daemon) | Local LLM server hosting `phi3` (for pricing advice JSON prompts) and `qwen2.5:3b` (for operations chat context). |

---

## 📂 Project Structure

```text
AI_Restaurant_System/
├── AI/                          # Python FastAPI service & Prophet forecasting scripts
│   ├── app.py                   # Main forecast REST endpoints (Port 8000)
│   ├── train_prophet.py         # Time-series model training scripts
│   ├── prophet_models.pkl       # Serialized Prophet model
│   └── generate_orders.py       # Dummy order data generator
│
├── API/                         # ASP.NET Core 9 Web API
│   ├── Controllers/             # Auth, Orders, Reports, Menu, Forecast, and Chat endpoints
│   ├── Hubs/                    # SignalR hubs (ChatHub, PresenceHub)
│   ├── Services/                # Business logic, Menu Optimization, Demand Forecasting, RestaurantAIService
│   ├── Data/                    # AppDbContext, Entity Framework configurations & migrations
│   └── Tests/                   # API test project
│
├── UI/                          # Angular 17+ client application
│   ├── src/app/core/            # Guards, interceptors, SignalR chat & presence services
│   ├── src/app/features/        # Dashboard, Orders, Pricing, Reports, Chat, etc.
│   └── Tests/                   # UI test project
│
└── docs/                        # Documentation & specifications
    └── System Design - v2.md    # Detailed architectural design specification
```
---

## ⚙️ Quick Start & Setup Guide

### Prerequisites
Before setting up the components, ensure you have the following installed locally:
* **MySQL Server** (listening on Port 3306)
* **.NET 9 SDK**
* **Node.js** (v18+)
* **Python 3.9+**
* **Ollama** (Running locally on Port 11434)

---

### Step 1: Database Setup
1. Log into your MySQL instance and create a blank database:
   ```sql
   CREATE DATABASE restaurantdb;
   ```
2. Navigate to the `API/` directory and apply the EF database migrations to generate tables:
   ```bash
   cd API
   dotnet ef database update
   ```

---

### Step 2: Local LLM Setup (Ollama)
1. Download and start the local Ollama daemon.
2. Pull the required models:
   ```bash
   ollama pull phi3
   ollama pull qwen2.5:3b
   ```
3. Verify the Ollama server is running at `http://localhost:11434`.

---

### Step 3: Python FastAPI Service Setup
1. Navigate to the `AI/` directory:
   ```bash
   cd AI
   ```
2. Create and activate a Python virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```
3. Install the required packages:
   ```bash
   pip install fastapi uvicorn prophet pandas numpy joblib sqlalchemy pymysql
   ```
4. Start the forecasting microservice:
   ```bash
   python app.py
   ```
   *The server runs at `http://localhost:8000`.*

---

### Step 4: ASP.NET Core API Setup
1. Navigate to the `API/` directory:
   ```bash
   cd API
   ```
2. Verify connection string settings in `appsettings.Development.json` match your MySQL credentials.
3. Build and launch the gateway API:
   ```bash
   dotnet run
   ```
   *The API gateway runs at `http://localhost:5000`.*

---

### Step 5: Angular UI Setup
1. Navigate to the `UI/` directory:
   ```bash
   cd UI
   ```
2. Install npm dependencies:
   ```bash
   npm install
   ```
3. Start the Angular dev server:
   ```bash
   npm start
   ```
   *Open your browser and navigate to `http://localhost:4200`.*

---

## 🔒 Security Design
The system employs strict claims-based security:
* **Token Handshake:** JWT tokens securely store the username as `ClaimTypes.NameIdentifier` and the role claim.
* **WebSocket Mapping:** SignalR connections are mapped using the `NameUserIdProvider` targeting `ClaimTypes.NameIdentifier` directly, preventing user-identity spoofing.
* **REST Guarding:** Controllers and hub endpoints retrieve the sender context directly from claims verification (`Context.UserIdentifier`), ensuring users cannot inspect or manipulate other conversations.
