# RADIUS hardening upgrade — 2026-08-17

This branch separates moderation from marketplace availability, fixes mobile navigation, strengthens listing validation, prevents sold items from hurting seller risk, adds safe public seller profiles, incremental chat polling, active-seller filtering, and Docker/Render/Aiven TLS support.

## Existing database

Run the migration once before using this code against an existing RADIUS database:

```bash
mysql -u root -p radius < migrations/20260817_hardening.sql
```

A fresh installation can import `database.sql` directly and does not need the migration.

## Listing state model

`status` is moderation only: `pending`, `approved`, `flagged`, `removed`.

`availability_status` is marketplace lifecycle only: `available`, `reserved`, `sold`, `withdrawn`.

Completed sales now set `availability_status=sold`; they no longer set moderation status to `removed`, so legitimate successful sellers do not accumulate a fraud-risk penalty.

## Local run

```bash
python -m venv ai_service/.venv
# Windows: ai_service\.venv\Scripts\activate
# Linux/macOS: source ai_service/.venv/bin/activate
pip install -r ai_service/requirements.txt
bash run.sh
```

On Windows you can continue running FastAPI and PHP in separate PowerShell terminals.

## AI behavior

RandomForest price anomaly scoring and TF-IDF + MultinomialNB text scoring remain enabled and are part of the required weighted fraud score. If `SERPAPI_KEY` is configured, live BDT-only Google evidence is appended as secondary explanatory evidence; it never replaces the RandomForest score and Indian rupee values are deliberately not parsed as BDT.

## Production

`Dockerfile` runs PHP and FastAPI together. `render.yaml` contains a Render blueprint and supports Aiven-style verified MySQL TLS through `DB_SSL_MODE=REQUIRED` and `DB_SSL_CA_PEM`.

Do not commit production passwords, API keys, or CA secrets.
