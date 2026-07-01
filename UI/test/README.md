# UI Tests

This folder is maintained to follow the **Project Development Guidelines for Freshers**.

## Purpose

The frontend tests validate the core functionality of the Angular application by verifying component behavior, helper methods, service availability, and authentication-related functionality.

---

## Test Coverage

### Dashboard Component

The following scenarios are covered:

- Dashboard component creation
- Trend indicator helper methods
- Confidence level color mapping
- Food image path mapping

### App Component

The following scenario is covered:

- Application component creation

### Authentication

The following scenario is covered:

- Authentication interceptor creation

### API Service

The following scenario is covered:

- API service initialization

---

## Testing Framework

- Angular 21
- Vitest
- RxJS

---

## Test Summary

| Test Type | Feature | Status |
|-----------|---------|--------|
| Component Test | Dashboard Component | ✅ |
| Component Test | App Component | ✅ |
| Interceptor Test | Auth Interceptor | ✅ |
| Service Test | ApiService | ✅ |

**Total Test Files:** 4

**Total Tests Executed:** 12

All tests execute successfully using the Angular testing framework.