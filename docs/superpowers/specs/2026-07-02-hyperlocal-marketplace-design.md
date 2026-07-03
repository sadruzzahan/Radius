# Hyperlocal Marketplace Design

## Goal
Build a MERN-style hyperlocal secondhand marketplace with Admin, Guest, and Registered User roles, geofenced listings, real-time chat, reviews, reports, admin analytics, and a Python FastAPI fraud/price ML service.

## Research Grounding
The fraud module follows a hybrid design because marketplace fraud data is usually imbalanced and adversarial. The implementation uses:

- Marketplace fraud classification ideas from organized retail crime listing detection work: seller/listing behavior and transaction signals are useful features.
- E-commerce fraud ML review patterns: score suspicious events and evaluate with precision/recall rather than accuracy alone.
- Perceptual image hashing literature and pHash practice: similar images are compared by Hamming distance instead of exact byte equality.
- Secondhand price prediction literature: category, condition, and brand are useful predictors; regression is evaluated with MAE/RMSE.

## Architecture
The app is a monorepo:

- `server/`: Express API, Socket.io chat server, JWT auth, role authorization, upload handling, Supabase repository integration, and in-memory demo repository fallback.
- `client/`: React + Vite frontend with a dense marketplace dashboard UI. Guests can browse. Registered users can list, chat, report, and review. Admins can review flagged listings, moderate users, and see analytics.
- `ml_service/`: FastAPI service for image hash comparison, price anomaly detection, behavior/text similarity rules, fraud score, price suggestion, and evaluation metrics.
- `docs/database-schema.md`: Supabase/Postgres tables, PostGIS functions, indexes, and operational notes.

## Roles
Guests can browse public nearby available listings using a default Dhaka location. Registered users can create/edit/delete their listings, search nearby listings, chat, review completed trades, and report suspicious listings. Admins can manage users, listings, reports, fraud queue decisions, and analytics.

## Data Flow
Listing creation accepts title, category, condition, price, description, brand, location, and photos. The Node API stores/upload metadata, sends listing attributes and comparable historical signals to the FastAPI service, receives a fraud score, and stores the review status. Browse/search applies geofence, category, price, condition, distance, and text filters. Chat events are persisted and broadcast over Socket.io.

## ML Design
Fraud scoring combines:

- Duplicate/stolen image detection using perceptual-hash Hamming distance.
- Price anomaly detection using category-condition statistics from a collected CSV dataset.
- Behavioral signals for new accounts, high-value items, low review count, urgent language, repeated descriptions, and text similarity.

The service returns a 0-100 score, named signals, explanations, and `allow` or `review`. Suspicious listings are routed to Admin review instead of being automatically removed.

## Testing
Core automated checks cover geospatial distance filtering, role permissions, and ML fraud scoring. The ML service includes an evaluation endpoint over a small labeled fixture to report precision and recall. The price suggestion pipeline reports MAE using a deterministic train/test split.
