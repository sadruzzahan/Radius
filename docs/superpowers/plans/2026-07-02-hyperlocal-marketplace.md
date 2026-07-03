# Hyperlocal Marketplace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete full-stack marketplace specified in `Project_Plan.pdf`.

**Architecture:** Express owns marketplace workflows and calls FastAPI for fraud intelligence. React consumes the API and Socket.io. Supabase/Postgres is the primary database with a local in-memory repository fallback for credential-free execution.

**Tech Stack:** React, Vite, Express, Socket.io, Supabase, Postgres/PostGIS, JWT, bcrypt, FastAPI, pandas, scikit-learn, Pillow, imagehash.

---

### Task 1: Core Utilities and Tests

**Files:**
- Create: `server/src/lib/geo.js`
- Create: `server/src/lib/rbac.js`
- Test: `server/src/lib/geo.test.js`
- Test: `server/src/lib/rbac.test.js`

- [x] Write failing tests for geofence filtering and role authorization.
- [x] Implement `distanceKm`, `filterListingsByRadius`, and `canAccess`.
- [x] Run `npm run test -w server`.

### Task 2: Backend API

**Files:**
- Create: `server/src/index.js`
- Create: `server/src/app.js`
- Create: `server/src/config.js`
- Create: `server/src/middleware/auth.js`
- Create: `server/src/routes/*.js`
- Create: `server/src/repositories/memoryStore.js`
- Create: `server/src/models/*.js`

- [x] Implement JWT auth, bcrypt password hashing, guest browsing, registered-user listing/chat/review/report flows, and admin moderation/analytics.
- [x] Add Supabase/Postgres schema and PostGIS geofence index.
- [x] Add Socket.io chat persistence and broadcast.

### Task 3: FastAPI ML Service

**Files:**
- Create: `ml_service/app/main.py`
- Create: `ml_service/app/services/fraud.py`
- Create: `ml_service/app/services/pricing.py`
- Create: `ml_service/data/market_prices.csv`
- Test: `ml_service/tests/test_fraud.py`

- [x] Implement pHash-compatible hash distance, price anomaly detection, behavior rules, text similarity, fraud scoring, evaluation, and price suggestion.
- [x] Run `pytest -q` in `ml_service`.

### Task 4: Frontend

**Files:**
- Create: `client/src/App.jsx`
- Create: `client/src/api.js`
- Create: `client/src/styles.css`

- [x] Build first-screen marketplace application, not a landing page.
- [x] Include role switching through real auth, nearby browse/search/filter, listing creation, chat, reviews, reports, admin fraud queue, user management, and analytics.

### Task 5: Verification and Execution

**Files:**
- Create: `README.md`
- Create: `.env.example`

- [x] Install Node and Python dependencies.
- [x] Run server tests, ML tests, frontend build.
- [x] Start ML, API, and frontend dev servers and report local URLs.
