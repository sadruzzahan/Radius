# Final Project Report

## Title

**Radius: AI Assisted Hyperlocal Marketplace**

## Team Information

- Team name: `[Team Name]`
- Members:
  - `[Member 1 Name, ID]`
  - `[Member 2 Name, ID]`
  - `[Member 3 Name, ID]`
- Course: `[Course Code]`
- Instructor: `[Instructor Name]`
- Submission date: `[Submission Date]`

## Abstract

Radius is a full-stack hyperlocal secondhand marketplace that helps users buy and sell products near their location. The system supports guest, registered user, and admin roles. Registered users can create listings, upload product images, chat, report suspicious listings, complete trades, and review sellers or buyers. Admins can moderate reports, manage users, review suspicious listings, and inspect AI/ML prediction logs.

The intelligent part of the system is an explainable trust and fraud detection engine. It analyzes listing price, product image hash, seller history, listing text, brand consistency, reused descriptions, and risky communication patterns. It returns a risk score, decision, threshold band, signals, explanations, and feature snapshot hash. The ML service also provides price suggestion using a Random Forest regressor and candidate fraud model training using TF-IDF with Naive Bayes. The project demonstrates how AI can improve trust and safety in a local marketplace while keeping decisions understandable for admins.

## 1. Introduction

Online secondhand marketplaces are popular because they allow users to buy affordable products and sell unused items. However, these platforms often suffer from fraud. Buyers may see fake listings, copied images, suspiciously low prices, and sellers who push payment outside the platform. These problems reduce trust.

Radius addresses this by building a marketplace around two ideas:

1. **Nearby discovery** - users should easily find products around them.
2. **Trust screening** - the system should identify suspicious listings early and explain why they are risky.

The project is implemented as a modern full-stack web application using React, Express, Supabase/Postgres, and Python FastAPI.

## 2. Objectives

The main objectives are:

- Build a role-based marketplace system.
- Allow users to browse, sell, manage, chat, report, and review.
- Use geolocation/radius filtering for hyperlocal discovery.
- Add at least one AI/ML based feature.
- Build an admin workflow for moderation.
- Store ML predictions and labels for future training.
- Create a polished user interface suitable for academic demonstration and portfolio use.

## 3. Requirement Mapping

| Requirement | Radius Implementation |
|---|---|
| Different user roles | Guest, registered user, admin |
| Product selling system | Users can create, update, delete, and manage listings |
| AI/ML feature | Trust/risk scoring, price anomaly detection, price suggestion, candidate fraud training |
| Dataset needed | Market price CSV, manual label CSV, admin/report labels |
| Python learning | FastAPI ML service uses Python, pandas, scikit-learn, imagehash |
| Framework allowed | React, Express, FastAPI, Supabase |
| Portfolio quality | Polished UI, Trust Radar, admin dashboard, tests, documentation |

## 4. Literature Review

Fraud detection research shows that machine learning can help detect suspicious behavior by learning patterns from historical data. A systematic review by Ali et al. describes common ML approaches, datasets, and metrics for fraud detection. It highlights precision, recall, F1, and class imbalance as important concerns.

Mutemi and Bacao studied organized retail fraud in digital marketplaces and showed that marketplace fraud can be approached using machine learning features from marketplace data. Their work supports the idea that seller behavior and listing behavior can be useful signals.

Chatrath, Batra, and Chaba focused on secondhand product images and consumer vulnerability. Their work is relevant because Radius checks duplicate or visually similar product photos using perceptual hashes.

Amazon Science's Fraud Dataset Benchmark is also relevant because it standardizes fraud datasets, train/test splits, and evaluation practices. Radius follows the same general idea of saving feature snapshots, labels, and evaluation metrics so a better model can be trained later.

## 5. Methodology

The system was developed gradually:

1. Build basic role-based authentication.
2. Add listing CRUD and geofenced browsing.
3. Add chat, reports, reviews, and admin tools.
4. Add ML service for trust scoring and price suggestion.
5. Store ML events, predictions, and labels.
6. Improve UI with Trust Radar and admin diagnostics.
7. Add tests and documentation.

The fraud engine uses a hybrid approach:

- Rule-based signals for online decision making.
- ML-style feature snapshots and labels for future model training.
- A trainable text classifier endpoint for candidate model experiments.
- A regression model for price suggestion.

This approach is suitable for an academic project because it is explainable, testable, and safer than a black-box model with a small dataset.

## 6. System Architecture

Radius has three main layers.

### Frontend

The frontend is a React application. It handles:

- Browse page.
- Trust Radar.
- Listing detail page.
- Sell flow.
- Seller manage page.
- Chat page.
- Admin dashboard.

### Backend API

The backend is an Express.js server. It handles:

- Authentication.
- Role checks.
- Listing APIs.
- Upload APIs.
- Chat APIs.
- Review APIs.
- Report APIs.
- Admin APIs.
- Communication with the ML service.

### ML Service

The ML service is a FastAPI Python service. It handles:

- Image pHash generation.
- Listing fraud scoring.
- Price suggestion.
- Manual CSV import.
- Candidate fraud model training.
- Evaluation metrics.

### Database

The primary database is Supabase Postgres. It stores:

- Users.
- Listings.
- Listing photos.
- Chat messages.
- Trades.
- Reviews.
- Reports.
- ML events.
- ML predictions.
- ML labels.
- Model versions and training runs.

PostGIS is used for location-based nearby listing search.

## 7. User Roles and Permissions

### Guest

Guests can browse and search listings. They cannot sell, chat, report, review, or access admin features.

### Registered User

Registered users can create listings, manage their own listings, chat with other users, report suspicious listings, and review users after completed trades.

### Admin

Admins can review suspicious listings, approve/remove listings, resolve reports, manage user status, view analytics, and inspect ML prediction logs.

## 8. Main Features

### 8.1 Trust Radar

The Trust Radar is an interactive visual feature on the browse page. The center represents the user's location. Nearby products appear as nodes around the radar. Each node uses the product image and a trust color:

- Verified: green/blue.
- Normal: neutral.
- Under review: amber.
- Flagged: red.

When a node is selected, a mini card shows product image, title, price, distance, trust status, and a view/review button.

### 8.2 Listing Management

Users can create listings with title, category, condition, brand, price, description, location, and photos. Photos are uploaded through the backend. The server generates pHash metadata and returns server-issued upload metadata.

### 8.3 Fraud and Trust Scoring

When a listing is submitted, the backend sends it to the ML service. The ML service returns:

- `score`
- `decision`
- `threshold_band`
- `signals`
- `explanations`
- `component_scores`
- `feature_snapshot`
- `model_version`
- `feature_snapshot_hash`

High-risk listings are not automatically deleted. They are prioritized for admin review.

### 8.4 Price Suggestion

The price suggestion feature uses a Random Forest regression model trained on market price data. It predicts a suggested price range based on category, condition, and brand.

### 8.5 Chat

Chat is scoped to a listing and participants. Socket.io provides real-time updates, and messages are stored in the database.

### 8.6 Trade and Review

The system supports trade states such as requested, accepted, rejected, cancelled, and completed. Reviews are allowed only after a completed trade, which prevents fake reviews without real transaction history.

### 8.7 Reports and Admin Moderation

Users can report suspicious listings. Admins can see reports, resolve them, review fraud queue items, and manage user account status.

### 8.8 ML Log

The admin ML Log shows recent predictions. It displays score, model version, decision, signals, and feature snapshot information. This makes the AI feature auditable.

## 9. AI/ML Feature Details

### 9.1 Fraud Signals

Radius checks:

- Duplicate image.
- Similar image.
- Price anomaly.
- New seller high-value listing.
- New seller many listings.
- Seller prior flags.
- Urgent language.
- Off-platform contact.
- Prohibited item language.
- Brand-title mismatch.
- Reused description.
- Trusted seller history.

### 9.2 Scoring Logic

Each risky signal adds points. Trusted seller history can reduce points. The final score is clamped between 0 and 100.

Decision bands:

| Score | Band | Meaning |
|---|---|---|
| 0-39 | allow | Low risk |
| 40-69 | review | Needs attention |
| 70-100 | high priority review | Strong risk |

The decision becomes `review` when the score is 60 or higher.

### 9.3 Why Explainable Scoring Was Used

For this project, explainability is important. If the system flags a listing, the admin must know the reason. A black-box model may only return a score, but Radius returns human-readable reasons such as "price anomaly" or "off-platform contact."

### 9.4 Candidate Model Training

The training endpoint uses:

- TF-IDF vectorization.
- Multinomial Naive Bayes classifier.
- Labels: clean, fraud, duplicate, prohibited, spam.
- Metrics: precision, recall, F1, false positive rate.

The candidate model is not blindly promoted. It must pass recall and false-positive-rate guardrails.

## 10. Database Design

Important tables:

- `app_users` - user accounts and roles.
- `listings` - product listing details and fraud score.
- `listing_photos` - image URLs and hashes.
- `chat_messages` - chat history.
- `trades` - trade workflow.
- `reviews` - reputation.
- `reports` - suspicious listing reports.
- `ml_events` - events such as submissions and decisions.
- `ml_predictions` - saved scoring results.
- `ml_labels` - labels from admin/report/manual CSV.
- `ml_training_runs` - model training metadata.

## 11. Security Features

- Passwords are hashed using bcrypt.
- JWT is used for authentication.
- Admin endpoints require admin role.
- Listing modification checks ownership or admin role.
- Express uses Helmet, CORS config, request size limit, and rate limiting.
- Supabase service role key is used only on the server.
- Browser does not receive database service role credentials.

## 12. Testing and Verification

The project includes:

- Server unit/integration tests with Vitest.
- ML service tests with Pytest.
- Build verification with Vite.

Latest verification:

```bash
python -m pytest -q
# 9 passed

npm test -w server
# 23 passed

npm run build -w client
# build passed
```

## 13. Limitations

- The online fraud decision is currently an explainable rules-and-signals engine, not a large production-trained deep learning model.
- The dataset is suitable for academic demonstration but not enough for real-world production fraud detection.
- No payment gateway is included.
- No official identity verification is included.
- Current deployment still relies on server-side service role access for database operations.

## 14. Future Work

- Collect a larger real dataset with permission.
- Train and deploy a stronger fraud classifier.
- Add graph-based seller-buyer fraud detection.
- Add device fingerprinting and velocity checks.
- Add payment escrow.
- Add push notifications.
- Add mobile app version.
- Add full Supabase RLS client access for selected safe operations.

## 15. Conclusion

Radius successfully implements a role-based marketplace with intelligent trust screening. The project meets the academic requirements by including multiple roles, an AI/ML feature, a dataset plan, Python ML service, and a complete web application. Its strongest contribution is the combination of hyperlocal product discovery and explainable fraud detection.

## References

1. Mutemi, A., and Bacao, F. (2023). *A numeric-based machine learning design for detecting organized retail fraud in digital marketplaces*. Scientific Reports. https://doi.org/10.1038/s41598-023-38304-5
2. Ali, A. et al. (2022). *Financial Fraud Detection Based on Machine Learning: A Systematic Literature Review*. Applied Sciences. https://doi.org/10.3390/app12199637
3. Chatrath, S. K., Batra, G. S., and Chaba, Y. (2022). *Handling consumer vulnerability in e-commerce product images using machine learning*. Heliyon. https://doi.org/10.1016/j.heliyon.2022.e10743
4. Grover, P. et al. *Fraud Dataset Benchmark*. Amazon Science GitHub repository. https://github.com/amazon-science/fraud-dataset-benchmark

