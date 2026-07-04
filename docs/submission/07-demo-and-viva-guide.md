# Demo and Viva Guide

## 1. Demo Accounts

Use these if the seed data is loaded.

Admin:

- Email: `admin@local.test`
- Password: `admin12345`

Seller/user accounts:

- Email: `seller1@local.test`
- Password: `password123`

Other seeded users:

- `seller2@local.test` to `seller5@local.test`
- Password: `password123`

Do not print real production passwords in public submission documents. These are local demo credentials only.

## 2. Recommended Live Demo Flow

### Step 1: Browse page

Show:

- Trust Radar.
- Nearby listing nodes.
- Search bar.
- Category filters.
- Listing cards.

Say:

> This is the main marketplace page. Users can discover nearby secondhand products, and the Trust Radar shows both distance and safety status.

### Step 2: Trust Radar interaction

Click a radar node.

Show:

- Product thumbnail.
- Price.
- Distance.
- Trust label.
- View Listing button.

Say:

> The radar is not decorative. It is connected to real listings from the database.

### Step 3: Listing detail

Open a product.

Show:

- Product image.
- Price.
- Seller card.
- Trust scan.
- Price radar/similar listing area.
- Report button.
- Chat button.

Say:

> The listing detail page explains the trust score and lets users chat or report suspicious content.

### Step 4: Sell item

Login as a normal user and go to Sell.

Show:

- Dropzone.
- Listing form.
- Category/condition.
- Description.
- AI scanning animation after submission.

Say:

> When a user submits a listing, it is sent to the ML service for trust scoring before it is saved.

### Step 5: Admin dashboard

Login as admin.

Show:

- Stats.
- Fraud queue.
- Reports.
- Users.
- ML Log.

Say:

> Admin can see exactly why listings were flagged. The ML Log records model version, score, signals, and feature snapshot.

## 3. Suspicious Listing Example for Demo

Use this to trigger risk signals:

- Title: `iPhone 13 urgent sale`
- Category: `phone`
- Condition: `excellent`
- Brand: `Apple`
- Price: `900`
- Description: `Urgent sale. WhatsApp 01712345678 and pay token money first.`

Expected signals may include:

- price anomaly
- urgent language
- off-platform contact
- new seller risk

## 4. Common Viva Questions and Answers

### Q1. What is the main purpose of this project?

Radius helps users buy and sell secondhand products nearby while reducing fraud risk using explainable AI/ML trust scoring.

### Q2. What are the user roles?

There are guest, registered user, and admin roles. Guests can browse. Registered users can sell, chat, report, and review. Admins can moderate listings, reports, users, and ML predictions.

### Q3. What is the AI/ML feature?

The main AI/ML feature is the trust/risk engine. It scores listings using image hash similarity, price anomaly, seller history, listing text, brand mismatch, and reused description. The ML service also includes price suggestion and candidate fraud model training.

### Q4. Is it a real ML model or only rules?

The online fraud decision is an explainable hybrid rules-and-signals engine because the dataset is still small. But the project also has real ML components: Random Forest price prediction, TF-IDF plus Naive Bayes candidate fraud training, metric evaluation, feature snapshots, and label collection. This is a practical first version for a fraud system.

### Q5. Why use explainable scoring?

Fraud moderation needs explanations. Admins must know why a listing is suspicious. A black-box score is less useful in an academic showcase and early-stage product.

### Q6. How does duplicate image detection work?

The ML service generates a perceptual hash from the uploaded image. It compares that hash with existing listing photo hashes. If the Hamming distance is small, the images are visually similar and the listing is flagged.

### Q7. How does price anomaly detection work?

The system keeps market price statistics by category and condition. If a listing price is far below the median, it adds risk points.

### Q8. How does price suggestion work?

The ML service trains a Random Forest Regressor using category, condition, brand, and price data. It predicts a suggested price range for sellers.

### Q9. What database is used?

Supabase Postgres is the primary database. PostGIS is used for nearby listing search. Supabase Storage is used for listing images.

### Q10. What is PostGIS used for?

PostGIS calculates distances and filters listings within a radius from the user's location.

### Q11. Why use Socket.io?

Socket.io provides real-time chat updates between buyer and seller.

### Q12. How are passwords protected?

Passwords are hashed with bcrypt. The database stores password hashes, not plain passwords.

### Q13. How is admin access protected?

Admin routes require JWT authentication and admin role. Normal users cannot access admin APIs.

### Q14. What are ML labels?

Labels are examples of clean or risky listings. Admin decisions create strong labels, reports create weak labels, and manual CSV import can add training examples.

### Q15. What are the limitations?

The dataset is small, there is no payment gateway, no identity verification, and the online fraud engine is not a large production-trained deep learning model yet.

### Q16. What future improvements can be added?

Larger dataset, stronger classifier, graph-based fraud detection, escrow payment, identity verification, push notifications, and mobile app.

## 5. One-Minute Explanation

Radius is a local secondhand marketplace with AI trust screening. Users can browse nearby items, sell products, chat, report suspicious listings, and review after trades. Admins can moderate fraud reports and users. The intelligent feature is a Python FastAPI trust engine that checks duplicate images, suspicious prices, seller behavior, risky text, and brand mismatch. It returns a score and explanations, and the admin can inspect those predictions in the ML Log.

## 6. Two-Minute Explanation

Radius was built because secondhand marketplaces often have fake listings and low trust. Our system supports guest, user, and admin roles. Guests browse listings. Registered users sell products, chat, report suspicious listings, and review after trades. Admins manage reports, users, and suspicious listings.

The unique feature is the Trust Radar. It shows nearby products as interactive nodes around the user's location, with trust status colors. The AI/ML part is handled by a Python FastAPI service. When a listing is submitted, the service checks duplicate photos using perceptual hashing, detects price anomalies from market data, analyzes seller history, and scans text for risky language. It returns score, decision, signals, explanations, and feature snapshot hash.

The project also includes price suggestion using Random Forest and candidate fraud model training using TF-IDF and Naive Bayes. This makes the project both practical and research-informed.

