# API Tests

This folder is maintained to follow the **Project Development Guidelines for Freshers**. The executable test project is implemented separately as **API.Tests** following standard .NET testing practices.

## Purpose

The backend tests validate the correctness, reliability, and end-to-end functionality of the AI Restaurant Demand & Menu Optimization System. The tests cover critical business logic as well as API endpoint behavior.

---

## Test Coverage

### Unit Tests

#### Demand Prediction (DemandService)

The following scenarios are covered:

- Returns an empty result when no menu items are available.
- Returns demand forecasts for valid menu items.
- Verifies demand prediction business logic.
- Validates forecast mapping and output values.

#### Menu Optimization (MenuOptService)

The following scenarios are covered:

- Returns an empty result when no menu items are available.
- Generates optimized menu insights for valid menu items.
- Validates menu categorization and optimization logic.
- Verifies AI-generated pricing strategy and recommendation mapping.

---

## Integration Tests

The following API endpoints are tested using authenticated HTTP requests:

### Demand API

- Authenticates using JWT.
- Calls `GET /api/demand/predict`.
- Verifies successful API execution and HTTP 200 response.

### Menu API

- Authenticates using JWT.
- Calls `GET /api/menu/optimize`.
- Verifies successful API execution and HTTP 200 response.

---

## Testing Frameworks

- xUnit
- FluentAssertions
- Entity Framework Core InMemory Provider
- HttpClient
- Custom Fake HttpMessageHandler (for mocking external AI/ML services)

---

## Test Execution

The executable backend tests are maintained in the separate **API.Tests** project.

Run all tests using:

```bash
dotnet test API.Tests/API.Tests.csproj
```

---

## Test Summary

| Test Type | Feature | Status |
|-----------|---------|--------|
| Unit Test | Demand Prediction | ✅ |
| Unit Test | Menu Optimization | ✅ |
| Integration Test | Demand API | ✅ |
| Integration Test | Menu API | ✅ |

**Total Tests Implemented:** 6

- Unit Tests: 4
- Integration Tests: 2

All tests execute successfully without failures.