# AI Restaurant System Report

## 1. Overview

This repository implements an AI-enabled restaurant management system with:
- `API/` backend written in .NET 9
- `ML/` Python prediction server and training scripts
- `UI/` Angular frontend (not covered in detail here)

The core capabilities are:
- demand forecasting
- menu optimization
- price intelligence
- festival sales analytics
- AI-generated insights

---

## 2. Database and domain model

### Tables and entities

`AppDbContext` exposes:
- `MenuItems`
- `Orders`
- `CompetitorPrices`

### `MenuItem`
- `Id`
- `Name`
- `Category`
- `Price`
- `CostPrice`
- `IsAvailable`
- related `Orders`

### `Order`
- `MenuItemId`
- `MenuItemName`
- `Quantity`
- `TotalPrice`
- `OrderedAt`
- `Status`

### `CompetitorPrice`
- `Restaurant`
- `City`
- `DishCategory`
- `DishName`
- `MinPrice`
- `MaxPrice`
- `Source`
- `CollectedAt`

### Seed data

`DbSeeder` seeds:
- 5 sample menu items
- 100 synthetic completed orders spread over the last 72 hours

---

## 3. Demand prediction flow

### API endpoint

`API/Controllers/DemandController.cs`
- route: `GET api/demand/predict`
- restricted to `Admin,Manager`
- uses `DemandService.PredictDemandAsync()`

### Demand service

`API/Services/DemandService.cs`
- loads menu items with orders
- calls `MlPredictionService.PredictBatchAsync(itemIds)`
- receives forecast results for each item
- builds `DemandForecast` objects
- computes a recommendation string with `GetRecommendation(...)`
- returns top 5 items by `PredictedNextWeek`

### Prediction service

`API/Services/MlPredictionService.cs`
- sends HTTP POST to `http://127.0.0.1:8000/predict`
- payload: `{ itemIds: [ ... ] }`
- deserializes a list of `MlPredictionResult`
- returns a dictionary keyed by `MenuItemId`

### Forecast output includes
- `ThisWeek`
- `LastWeek`
- `TwoWeeksAgo`
- `TrendPercent`
- `PredictedNextWeek`
- `ForecastChangePercent`
- `ConfidencePercent`
- `LowerBound`
- `UpperBound`
- `Recommendation`
- `ForecastSource`

---

## 4. ML prediction engine

### ML service

`ML/app.py`
- FastAPI service for demand predictions
- loads `prophet_models.pkl`
- exposes:
  - `GET /` health
  - `POST /predict`
  - `GET /festival/predict/{festival_date}`

### Prediction logic

For each requested item:
- fetch recent 28 days of completed order history from MySQL
- fill missing dates with zero demand
- compute recent weekly aggregates (`thisWeek`, `lastWeek`, `twoWeeksAgo`)
- build a 7-day future calendar with weekend/month markers
- use the saved Prophet model to forecast the next 7 days
- sum the forecasted `yhat` values to get `predictedDemand`
- use forecast interval width to compute confidence
- compute percent change and recommendation text

### Recommendation rules

`recommendation_from_forecast(...)` uses:
- confidence threshold < 60 => `Monitor demand`
- forecast change >= 12% => `Increase stock`
- forecast change >= 4% => `Prepare slightly more`
- forecast change <= -12% => `Reduce stock`
- otherwise => `Maintain stock`

### Forecast model type

The prediction engine is based on Prophet time-series models:
- per-item Prophet models saved in `prophet_models.pkl`
- uses holidays and calendar regressors
- forecasts daily demand values

---

## 5. Menu optimization flow

### API service

`API/Services/MenuOptService.cs`
- collects 7-day order totals per menu item
- loads all menu items
- calls `MlPredictionService.PredictBatchAsync(itemIds)`
- obtains forecasted demand and trend data
- computes margin and category labels
- generates AI insights via `MenuAIInsightService`
- returns an object per menu item containing:
  - `optimizedPrice`
  - `priceChangePercent`
  - `marginPercent`
  - demand values
  - `trendPercent`
  - `confidencePercent`
  - `category`
  - `strategy`
  - `promotion`
  - `inventoryAction`

### Pricing adjustment logic

The code performs heuristic price changes:
- if predicted demand > current demand by > 10% => increase price by 3%
- if predicted demand < current demand by > 5% => decrease price by 2%
- otherwise keep current price
- clamp final price between 95% and 108% of current price

### Category labels

Items are labeled as:
- `Needs Improvement`
- `Star Item`
- `Premium Item`
- `Popular Item`

These are derived from demand and margin heuristics.

---

## 6. AI insight generation

### Overall demand insight

`API/Services/AIInsightService.cs`
- builds a prompt from demand forecast data
- requests a single analytical sentence from a local LLM
- uses model `phi3` at `http://localhost:11434/api/generate`

### Menu item insight

`API/Services/MenuAIInsightService.cs`
- builds a JSON-only prompt for each dish
- asks the model for:
  - `optimizedPrice`
  - `category`
  - `strategy`
  - `promotion`
  - `priority`
  - `inventoryAction`
- enforces business rules:
  - max increase 8%
  - max decrease 5%
  - keep price when demand is within 10%
  - increase price only if trend > 15 and predicted demand > current demand

### AI fallback

If the LLM response fails, the code returns a safe default JSON object.

---

## 7. Price intelligence features

`API/Controllers/PriceIntelligenceController.cs` provides:
- `GET api/priceintelligence/summary`
  - category-level competitor average, min, max, count
- `GET api/priceintelligence/cities?dish=...`
  - city-level average price for the dish category
- `GET api/priceintelligence/competitors?dish=...`
  - competitor entries for the dish category
- `GET api/priceintelligence/cheapest?dish=...`
  - ten cheapest competitor entries
- `GET api/priceintelligence/premium?dish=...`
  - ten highest competitor entries
- `GET api/priceintelligence/price-comparison`
  - compares own menu price to competitor average
  - returns recommendation based on percent difference

### Price comparison logic

- if own price is ≥ 15% below market => `Potential price increase opportunity`
- if own price is ≥ 15% above market => `Above market pricing`
- otherwise => `Competitively priced`

---

## 8. Festival analytics

`API/Controllers/FestivalController.cs`
- endpoint: `GET api/festival/analytics/{festivalDate}`
- compares last year’s sales for the same date with forecasted festival sales
- fetches festival predictions from the ML service
- computes:
  - total predicted sales
  - growth percent vs previous year
  - top predicted dish
  - crowd tag
  - operational advice

### Recommendations

- growth > 25% => `High demand likely`
- growth > 10% => `Moderate growth expected`
- growth ≥ 0 => `Stable demand expected`
- growth < 0 => `Demand may soften`

---

## 9. ML training scripts

### `ML/train_prophet.py`
- trains Prophet time-series models per menu item
- uses daily demand series with holidays and calendar regressors
- saves `prophet_models.pkl`
- computes MAE, MAPE, R², and confidence estimates

### `ML/train_model.py`
- trains an XGBoost demand model using lag, rolling, and calendar features
- saves `demand_models.pkl`
- saves `feature_columns.pkl`

### `ML/train_price_model.py`
- uses demand forecasts and pricing data to compute a `PerformanceScore`
- trains an XGBoost menu performance model
- saves `menu_performance_model.pkl`

### Actual API dependency

- The live API uses `ML/app.py` and therefore the Prophet models saved in `prophet_models.pkl`
- `train_model.py` and `train_price_model.py` are present as training/experiment scripts but are not directly called by the API

---

## 10. System summary

### What is prediction?
- A time-series forecasting pipeline using Prophet models
- It is run by `ML/app.py`
- The API sends menu item IDs, the ML server returns future demand forecasts
- `DemandService` uses the forecast to produce recommendations and top forecasted items

### How menu optimization works
- `MenuOptService` combines controller data and forecast output
- It calculates margin and demand trends
- It applies simple price adjustment rules
- It enriches results with AI-generated item-level strategy and promotion advice

### Key observations
- Demand forecasting is the core ML feature
- Price intelligence is competitor-price analysis over database records
- Menu optimization is driven by heuristic price changes plus AI insight
- Festival analytics adds calendar-based demand planning

---

## 11. Notes and improvement opportunities

- The seeded dataset is small and synthetic
- The system depends on local services at ports `8000` and `11434`
- The menu optimizer is not a full optimizer, but a heuristic pricing recommendation system
- `MenuAIInsightService` will rely on the quality of the local LLM response
- `PriceIntelligenceController` should map categories and dish names more consistently

---

## 12. File map of the main implementation

- `API/Program.cs`
- `API/Data/AppDbContext.cs`
- `API/Data/DbSeeder.cs`
- `API/Models/MenuItem.cs`
- `API/Models/Order.cs`
- `API/Models/CompetitorPrice.cs`
- `API/Services/MlPredictionService.cs`
- `API/Services/DemandService.cs`
- `API/Services/MenuOptService.cs`
- `API/Services/AIInsightService.cs`
- `API/Services/MenuAIInsightService.cs`
- `API/Controllers/DemandController.cs`
- `API/Controllers/FestivalController.cs`
- `API/Controllers/PriceIntelligenceController.cs`
- `ML/app.py`
- `ML/train_prophet.py`
- `ML/train_model.py`
- `ML/train_price_model.py`
