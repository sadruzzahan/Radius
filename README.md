# RADIUS — Hyperlocal Secondhand Marketplace

RADIUS is a CSE479 mini-project: a PHP/MySQL hyperlocal secondhand marketplace with an explainable Python/FastAPI fraud-risk service.

> **Important:** the trust layer produces risk signals, not proof that a user or listing is fraudulent. Suspicious/high-risk listings are routed to human moderation.

## Required stack

**Main application:** PHP 8+, HTML5, CSS3, vanilla JavaScript, MySQL, PHP Sessions, PDO.  
**AI service:** Python 3, FastAPI, pandas, scikit-learn, Pillow, ImageHash.

There is no React, Vite, Node.js, Express, Socket.io, or Supabase dependency in this rewrite.

## Features

- Guest browse/search/filter and nearby-distance discovery.
- Registration/login/logout with `password_hash()` / `password_verify()` and PHP sessions.
- Buyer/seller profiles, listing creation, secure local image uploads, reporting, reviews.
- Buyer-seller chat with lightweight 3-second AJAX polling.
- Trade states: requested → accepted/rejected → cancelled/completed.
- Trust Radar visualization.
- Admin dashboard, user/listing management, reports, fraud queue, complete risk panels.
- Graceful AI-service failure: listing persists and admin can retry analysis.
- CSRF protection, PDO prepared statements, output escaping, role authorization, MIME/image validation, randomized filenames.

## Explainable fraud analysis

`POST /analyze-listing` returns a 0–100 score and five components:

- Image similarity — **25%**: pHash + Hamming distance (`<=5` high, `6–10` medium).
- Price anomaly — **25%**: `RandomForestRegressor` estimates expected market price.
- Seller risk — **20%**: account age, reports, removed/suspicious listings, completed-trade/review history.
- Text risk — **20%**: TF-IDF + `MultinomialNB`, with reused-text signal.
- Policy/brand risk — **10%**: prohibited/off-platform phrases and recognizable brand mismatch.

Bands: `0–29 Safe`, `30–49 Low Risk`, `50–69 Suspicious`, `70–100 High Risk`.

## Main structure

```text
/admin              moderation pages
/api                chat/trade/fraud actions
/assets             responsive CSS + vanilla JS
/config             app + PDO configuration
/includes           auth, CSRF, shared helpers/layout
/uploads            listing/profile images
/ai_service         FastAPI service, seed datasets, generator
index.php            home
listings.php         marketplace
listing.php          listing detail
create-listing.php   secure listing creation + AI analysis
messages.php/chat.php
trade-requests.php
trust-radar.php
database.sql
seed.php
```

## Local setup

1. Create the database and schema:
   ```bash
   mysql -u root -p < database.sql
   ```
2. Export environment variables (or configure them in Replit Secrets):
   ```bash
   export DB_HOST=127.0.0.1
   export DB_PORT=3306
   export DB_NAME=radius
   export DB_USER=root
   export DB_PASSWORD='your-password'
   export AI_SERVICE_URL=http://127.0.0.1:8001
   ```
3. Install the AI dependencies:
   ```bash
   python3 -m pip install -r ai_service/requirements.txt
   ```
4. Optionally generate the large academic datasets:
   ```bash
   python3 ai_service/training/generate_datasets.py 15000 20000
   ```
5. Seed demo data:
   ```bash
   php seed.php
   ```
6. Run both services:
   ```bash
   bash run.sh
   ```
7. Open the PHP server (default `http://localhost:3000`). FastAPI health is `http://127.0.0.1:8001/health`.

## Replit

1. Import this GitHub repository into Replit.
2. Provision an external MySQL-compatible database if MySQL is not available in the Repl.
3. Add Secrets: `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `AI_SERVICE_URL=http://127.0.0.1:8001`.
4. Run `mysql ... < database.sql` against the external database once, then `php seed.php`.
5. Click **Run**. `.replit` invokes `bash run.sh`; FastAPI uses local port 8001 and PHP uses Replit's `$PORT`.

## Demo accounts

After `php seed.php`, all demo accounts use password `RadiusDemo123!`:

- Admin: `admin@radius.test`
- Seller: `seller@radius.test`
- Buyer: `buyer@radius.test`
- User: `nadia@radius.test`

The seed creates at least 20 realistic listings with varied categories and trust states.

## API

### FastAPI
- `GET /health` → `{ "status": "ok" }`
- `POST /hash-image` → perceptual image hash
- `POST /analyze-listing` → explainable risk result

### PHP action endpoints
- `/api/chat.php` — start/send/poll conversation messages
- `/api/trade.php` — request/accept/reject/cancel/complete trades
- `/api/fraud.php` — admin approve/remove/retry analysis

## Security notes

- Never commit `.env` or production credentials.
- Rotate any credentials that were committed in earlier repository history.
- Uploaded images are validated by upload error, size, extension, MIME and image decoding; generated filenames are random.
- User supplied HTML is escaped with `htmlspecialchars`.
- Private conversations are scoped to their buyer/seller participants.
- Users cannot perform seller-only trade transitions or admin moderation actions.

## Final workflow to test

Guest → Browse → Register → Login → Create listing → Upload image → Fraud analysis → Listing/moderation → Another user views → Chat → Trade request → Seller accepts → Complete → Review.

Also test: suspicious listing → Fraud Queue → full explanation → Admin approve/remove; report flow; duplicate review/trade protection; AI service unavailable; unauthorized admin/chat access; invalid image upload.
