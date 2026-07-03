# NeighborTrust Hyperlocal Marketplace

Full-stack MERN-style secondhand marketplace with roles, geofenced browsing, Socket.io chat, reviews, reports, admin moderation, FastAPI fraud scoring, and price suggestion.

## Features

- Guest, registered user, and admin roles.
- JWT auth with bcrypt password hashing.
- Listing CRUD with category, condition, price, description, location, and photo hash metadata.
- Authenticated listing photo uploads through Supabase Storage with server-side pHash generation.
- Geofenced browsing with radius, location, category, condition, price, and search filters.
- Socket.io real-time chat.
- Reviews/reputation after trades.
- Reports for suspicious listings.
- Admin analytics, user moderation, and AI fraud review queue.
- FastAPI ML service: duplicate image hash comparison, price anomaly detection, behavioral/text rules, fraud score, evaluation, and price suggestion.
- Supabase/Postgres schema with PostGIS geofence functions plus credential-free memory demo mode.

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
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-server-only-service-role-key
SUPABASE_STORAGE_BUCKET=listing-photos
```

Create the `listing-photos` Storage bucket in Supabase before using uploads. The service-role key stays on the Express server only; the browser sends images to `POST /api/uploads/listing-photo` and receives server-issued `{ url, path, hash, storage }` metadata for listing creation.

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

## Large Demo Seed

```bash
npm run seed:500 -w server
```

This creates 55 demo users, 500 listings, 140 reviews, 35 reports, varied statuses, and deterministic duplicate/fraud cases through the configured store.
