# NeighborTrust Hyperlocal Marketplace

Full-stack MERN-style secondhand marketplace with roles, geofenced browsing, participant-scoped chat, trade workflow, reviews, reports, admin moderation, explainable trust/risk scoring, and price suggestion.

## Features

- Guest, registered user, and admin roles.
- JWT auth with bcrypt password hashing.
- Listing CRUD with category, condition, price, description, location, and photo hash metadata.
- Authenticated listing photo uploads through Supabase Storage with server-side pHash generation.
- Geofenced browsing with radius, location, category, condition, price, and search filters.
- Socket.io real-time chat scoped to buyer-seller conversations.
- Trade requests with requested, accepted, rejected, cancelled, and completed states.
- Reviews/reputation only after completed trades.
- Reports for suspicious listings.
- Admin analytics, user moderation, and trust/risk review queue.
- FastAPI trust service: duplicate image hash comparison, price anomaly detection, behavioral/text rules, risk score, evaluation, and price suggestion.
- Showcase trust foundation: event capture, prediction audit records, admin/report/manual labels, manual CSV ingestion, and candidate training metrics.
- Supabase/Postgres schema with PostGIS geofence functions plus credential-free memory demo/test mode.

## Research Papers / Sources Used

- Liu et al., numeric ML design for detecting organized retail crime listings in marketplaces.
- E-commerce fraud detection ML survey/review work for precision/recall evaluation.
- Perceptual hashing and near-duplicate image detection literature for pHash/Hamming-distance duplicate checks.
- Secondhand item price prediction work using regression and MAE-style evaluation.

## Run

```bash
npm install
npm run install:ml
npm run dev
```

URLs:

- Frontend: `http://localhost:5173`
- API: `http://localhost:4000/healthz`
- ML service: `http://localhost:8001/health`

## Supabase

Apply the schema and seed data through the direct Postgres connection. On networks without IPv6 route to the direct database host, use the Supabase session pooler URL shown below.

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/schema.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/seed.sql
```

Runtime variables for Supabase mode:

```bash
DATABASE_URL=postgresql://postgres.eowhnrcoqcvtyobbinhl:<password>@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres
USE_MEMORY_STORE=false
JWT_SECRET=<32+ character server secret>
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-server-only-service-role-key
SUPABASE_STORAGE_BUCKET=listing-photos
```

Create the `listing-photos` Storage bucket in Supabase before using uploads. The service-role key stays on the Express server only; the browser sends images to `POST /api/uploads/listing-photo` and receives server-issued `{ url, path, hash, storage }` metadata for listing creation.

Use `USE_MEMORY_STORE=false` for any showcase, staging, or real persisted run. Use `USE_MEMORY_STORE=true` only for local smoke tests or credential-free demos where data loss is expected.

Demo accounts:

- Admin: `admin@local.test` / `admin12345`
- Sellers: `seller1@local.test` through `seller5@local.test` / `password123`

## Verify

```bash
npm test
npm run build
```

## Dataset

`ml_service/data/market_prices.csv` is the bundled baseline dataset for category-condition price statistics and the price suggestion regressor. `ml_service/scripts/collect_bikroy_sample.py` is a documented collector template for expanding the dataset from allowed public listing pages or manually collected CSVs.

`ml_service/scripts/build_market_dataset.py` generates `ml_service/data/market_prices_expanded.csv` with 500+ deterministic Dhaka secondhand-market rows across phones, laptops, cameras, furniture, bicycles, appliances, fashion, books, gaming, and accessories. The ML service prefers the expanded CSV when present.

## Showcase Trust/Risk Engine

The trust/risk path records durable scoring and training signals, but the online fraud decision is intentionally an explainable rules-and-signals engine for the showcase:

- `ml_events`: listing submissions, user reports, and admin fraud decisions.
- `ml_predictions`: model version, score, decision, threshold band, signals, explanations, and feature snapshot hash for every listing score.
- `ml_labels`: ground-truth labels from admins, report-derived weak labels, and manual CSV imports.
- `ml_model_versions` and `ml_training_runs`: model registry and training-run metadata.

FastAPI endpoints:

- `POST /datasets/manual-csv` accepts a CSV file with `title,description,category,price,condition,source,label,label_reason`.
- `POST /train/candidate` accepts normalized records and returns model version, metrics, and candidate/rejected promotion status.
- `POST /score` remains the online listing risk scorer and returns `model_version`, `threshold_band`, and `feature_snapshot_hash`.

Initial showcase policy: reports are weak labels, admin decisions are strong labels, and manual CSV rows are training data only. The app does not auto-remove listings; high-risk scores prioritize admin review.

## Large Demo Seed

```bash
npm run seed:500 -w server
```

This creates 55 showcase users, 500 listings, 140 completed-trade reviews, 35 reports, varied statuses, and deterministic duplicate/risk cases through the configured store.
