# Setup and Deployment Guide

## 1. Requirements

Install:

- Node.js 24+
- npm
- Python 3.11+
- PostgreSQL client if using Supabase SQL files

## 2. Install Dependencies

From project root:

```bash
npm install
npm run install:ml
```

## 3. Environment Variables

Create or update `.env`.

For persisted Supabase mode:

```bash
DATABASE_URL=postgresql://...
USE_MEMORY_STORE=false
JWT_SECRET=change-this-to-a-long-secret-at-least-32-chars
CLIENT_ORIGIN=http://localhost:5173
API_PORT=4000
ML_SERVICE_URL=http://127.0.0.1:8001
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=server-only-key
SUPABASE_STORAGE_BUCKET=listing-photos
```

For local memory-only demo:

```bash
USE_MEMORY_STORE=true
JWT_SECRET=change-this-to-a-long-secret-at-least-32-chars
```

Use memory mode only for temporary demos where data loss is acceptable.

## 4. Database Setup

Apply schema:

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/schema.sql
```

Apply seed:

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/seed.sql
```

Optional large seed:

```bash
npm run seed:500 -w server
```

## 5. Run Development Server

Run all services:

```bash
npm run dev
```

URLs:

- Frontend: `http://localhost:5173`
- Backend health: `http://localhost:4000/healthz`
- ML health: `http://localhost:8001/health`

## 6. Run Services Separately

Backend:

```bash
npm run dev -w server
```

Frontend:

```bash
npm run dev -w client
```

ML service:

```bash
cd ml_service
.venv/bin/python -m uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```

## 7. Verification Commands

Server tests:

```bash
npm test -w server
```

ML tests:

```bash
cd ml_service
python -m pytest -q
```

Client build:

```bash
npm run build -w client
```

Full verification:

```bash
npm test
npm run build
```

## 8. Deployment Notes

Recommended deployment:

- Frontend: Vercel, Netlify, Cloudflare Pages, or static host.
- Backend: Railway, Render, Fly.io, or VPS.
- ML service: Railway, Render, Fly.io, or VPS.
- Database: Supabase Postgres.
- Storage: Supabase Storage.

Important:

- Do not expose `SUPABASE_SERVICE_ROLE_KEY` to the browser.
- Use `USE_MEMORY_STORE=false` for real deployment.
- Use a strong `JWT_SECRET`.
- Configure CORS `CLIENT_ORIGIN` to the deployed frontend URL.
- Keep ML service URL private or protected if possible.

## 9. Demo Checklist

Before presenting:

- Start frontend, backend, and ML service.
- Confirm `/healthz` returns ok.
- Confirm `/health` on ML service returns ok.
- Login as admin.
- Open Admin page.
- Confirm fraud queue and ML Log load.
- Open Browse page.
- Confirm Trust Radar has product nodes.
- Submit one suspicious listing if you want a live fraud demo.

## 10. Troubleshooting

### Frontend cannot load listings

Check backend is running on port 4000 and `VITE_API_URL` or default API URL is correct.

### Login fails

Check seed data exists and the correct store is selected.

### Upload fails

Check Supabase credentials and Storage bucket.

### Fraud score fallback appears

This means the ML service is not reachable. Start FastAPI service on port 8001.

### Database data disappears

You are probably using memory store. Set `USE_MEMORY_STORE=false` for persisted Supabase mode.

