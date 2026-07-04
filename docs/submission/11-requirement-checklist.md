# Project Requirement Checklist

This document maps the assignment requirements directly to Radius features.

## 1. Role-Based System

Requirement:

> The system must support different user roles such as Admin, Guest, Registered User, or other relevant roles.

Implemented:

| Role | Implemented Features |
|---|---|
| Guest | Browse listings, search, filter, view details |
| Registered User | Login/register, create listings, upload photos, manage own listings, chat, report, review after completed trade |
| Admin | Dashboard, analytics, fraud queue, report resolution, user moderation, ML prediction log |

Code areas:

- `server/src/lib/rbac.js`
- `server/src/middleware/auth.js`
- `server/src/routes/admin.js`
- `client/src/App.jsx`

## 2. Product Selling System

Requirement example:

> Product selling system.

Implemented:

- Product listing creation.
- Listing image upload.
- Listing update/delete for owner.
- Listing status management.
- Seller manage tab.
- Product detail page.
- Buyer-seller chat.
- Trade/review workflow.

## 3. Intelligent AI/ML Feature

Requirement:

> The system must have at least one intelligent AI/ML based feature.

Implemented intelligent features:

1. Trust/fraud risk scoring.
2. Duplicate image detection using perceptual hashing.
3. Price anomaly detection using market baseline.
4. Price suggestion using Random Forest regression.
5. Candidate fraud model training using TF-IDF and Naive Bayes.
6. ML prediction logging for admin explainability.

Code areas:

- `ml_service/app/services/fraud.py`
- `ml_service/app/services/pricing.py`
- `ml_service/app/services/training.py`
- `server/src/services/fraudClient.js`
- `server/src/routes/admin.js`

## 4. Dataset Collection or Existing Research

Requirement:

> To develop model, you may need to collect dataset on your own via web scraping or from existing research works.

Implemented:

- Market price CSV dataset exists in `ml_service/data/`.
- Dataset generation script exists for expanded local price rows.
- Manual CSV import endpoint exists for labeled fraud data.
- Admin decisions and reports are stored as labels.
- Research review document is included.

Files:

- `ml_service/data/market_prices.csv`
- `ml_service/data/market_prices_expanded.csv`
- `ml_service/scripts/build_market_dataset.py`
- `ml_service/scripts/collect_bikroy_sample.py`
- `docs/submission/05-research-review-and-dataset-plan.md`

## 5. Python Learning and ML Model

Requirement:

> To develop model, you may need to learn python.

Implemented:

- Python FastAPI ML service.
- pandas dataset loading.
- scikit-learn Random Forest price model.
- scikit-learn TF-IDF and Naive Bayes training pipeline.
- Pytest test suite.
- Image processing with Pillow and imagehash.

## 6. Research Paper Workflow

Requirement:

> Before implementing your model ask GPT to get well known research paper list on that topic then find and read them from Google Scholar.

Implemented documentation:

- Research paper list included.
- Summary of lessons included.
- Dataset plan included.
- Evaluation plan included.

Document:

- `docs/submission/05-research-review-and-dataset-plan.md`

## 7. Gradual Development

Requirement:

> Implement very basic role based system first then gradually improve it by adding those ML models there.

Implemented development path:

1. Authentication and roles.
2. Listing CRUD.
3. Chat, reports, reviews.
4. Admin dashboard.
5. ML fraud scoring.
6. Price suggestion.
7. Trust Radar and ML Log.

This progression is explained in:

- `01-project-proposal.md`
- `02-final-project-report.md`

## 8. Frameworks and Libraries

Requirement:

> You may use frameworks and libraries such as Bootstrap, jQuery, React, Angular, Laravel, or similar technologies.

Used:

| Area | Technology |
|---|---|
| Frontend | React, Vite, Framer Motion, Lucide React |
| Backend | Node.js, Express.js, Socket.io |
| Auth | JWT, bcrypt |
| Database | Supabase Postgres, PostGIS |
| ML API | Python FastAPI |
| ML Libraries | scikit-learn, pandas, Pillow, imagehash |
| Testing | Vitest, Pytest |

## 9. Portfolio Quality

Requirement:

> Build something valuable for your professional portfolio.

Portfolio features:

- Polished responsive UI.
- Interactive Trust Radar.
- Real admin moderation workflow.
- Explainable AI/ML fraud engine.
- Full-stack architecture.
- Database schema and seed data.
- Tests and build verification.
- Documentation pack.

## 10. Current Verification

Latest verification commands:

```bash
python -m pytest -q
npm test -w server
npm run build -w client
```

Latest result:

- ML tests: 9 passed.
- Server tests: 23 passed.
- Client build: passed.

