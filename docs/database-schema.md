# Supabase Database Schema

The primary database is Supabase Postgres. The app also keeps an in-memory fallback for local demos when `USE_MEMORY_STORE=true`.

## Tables

### app_users
- Stores JWT-app users: `name`, `email`, `password_hash`, `role`, `status`.
- Stores `lat`, `lng`, and generated PostGIS `location`.
- Indexes: unique `email`, lower-email lookup, GiST `location`.

### listings
- Stores marketplace listing details, price, status, fraud score, and seller FK.
- Stores `lat`, `lng`, and generated PostGIS `location`.
- Indexes: seller FK, GiST `location`, status/created composite, category/condition/price composite, GIN full-text search.

### listing_photos
- Stores Supabase Storage/local URL, perceptual hash, and listing FK.
- Indexes: listing FK and partial hash index for duplicate-photo checks.

### chat_messages
- Stores real-time chat history by listing and participants.
- Indexes: listing/created composite, sender FK, recipient FK.

### reviews
- Stores post-trade reputation.
- Unique constraint: `trade_id + reviewer_id`.
- Index: `reviewee_id`.

### reports
- Stores user reports for suspicious/prohibited listings.
- Indexes: listing FK, reporter FK, status.

## Functions

- `nearby_listings(...)`: PostGIS `ST_DWithin` geofence search with filters and distance ordering.
- `listing_by_id(uuid)`: listing lookup with seller and photo aggregation.
- `flagged_listings()`: admin fraud queue.
- `admin_marketplace_stats()`: admin analytics JSON.

## Security

All public tables have RLS enabled. The current Express API uses the Supabase `service_role` key server-side only; it is never exposed to the browser. The schema includes explicit `GRANT` statements for `service_role` because new Supabase projects no longer reliably expose tables to Data API roles by default.
