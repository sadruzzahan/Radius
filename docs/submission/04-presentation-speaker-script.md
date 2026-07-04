# Presentation Speaker Script

## Slide 1: Title

Good morning/afternoon. We are presenting our project named **Radius: AI Assisted Hyperlocal Marketplace**. Radius is a secondhand product marketplace where users can buy and sell products near their location. The special part of our project is that it includes an AI/ML based trust and fraud detection engine.

## Slide 2: Problem

The problem we focused on is trust in secondhand marketplaces. These platforms are useful, but users often face fake listings, copied product photos, unrealistic prices, and sellers who ask for payment outside the platform. Because of these risks, buyers may not feel confident. We wanted to build a marketplace where local discovery and safety work together.

## Slide 3: Proposed Solution

Our solution is Radius. It allows users to browse nearby products, sell their own items, chat with buyers or sellers, report suspicious listings, and complete trades. The system also has a Trust Radar and an AI fraud screening engine. So instead of only showing products, Radius also shows whether a product looks safe or risky.

## Slide 4: User Roles

We implemented three roles. A guest can browse and search listings. A registered user can create listings, upload photos, chat, report listings, complete trades, and give reviews. An admin can review suspicious listings, resolve reports, manage users, and inspect ML prediction logs. This satisfies the role-based requirement of the project.

## Slide 5: System Architecture

The project has three main parts. The frontend is built with React and Vite. The backend is built with Node.js, Express, Socket.io, JWT, and bcrypt. The database is Supabase Postgres with PostGIS for location search. The ML service is built with Python FastAPI, scikit-learn, pandas, Pillow, and imagehash.

## Slide 6: Trust Radar

The Trust Radar is one of the most important UI features. The center represents the user's location. Product nodes appear around the radar based on nearby listings. Each node uses the actual product image and shows trust status using color. When the user selects a node, a mini card appears with product title, price, distance, trust label, and a button to view the listing.

## Slide 7: AI/ML Fraud Detection

The intelligent feature is the trust and fraud detection engine. When a user submits a listing, the backend sends listing data to the ML service. The system checks duplicate image hash, price anomaly, new seller risk, prior flagged listings, urgent language, off-platform contact, prohibited words, brand mismatch, and reused description. It returns a score, decision, signals, explanations, and a feature snapshot. This makes the decision explainable.

## Slide 8: Price Intelligence

We also implemented price intelligence. The ML service has a market price dataset. A Random Forest regressor predicts a suggested price range using category, condition, and brand. The fraud engine also uses category-condition price baselines to detect listings that are far below normal market price.

## Slide 9: Admin Dashboard

The admin dashboard is important because AI should not make every final decision automatically. Admin can see analytics, fraud queue, user reports, users, and the ML log. If a listing is suspicious, admin can approve it or remove it. The ML log shows model version, score, decision, and signals, so the admin can understand why the system flagged a listing.

## Slide 10: Database and Security

The database stores users, listings, photos, chat messages, trades, reviews, reports, ML events, ML predictions, and ML labels. For security, passwords are hashed using bcrypt, authentication uses JWT, admin routes require admin role, and the Supabase service role key stays only on the server. The backend also uses validation, rate limiting, and secure middleware.

## Slide 11: Testing and Results

We verified the project with automated tests. The ML service has 9 passing tests. The server has 23 passing tests. The client production build also passes. The ML training pipeline supports precision, recall, F1 score, and false positive rate, which are standard evaluation metrics for fraud detection.

## Slide 12: Conclusion

In conclusion, Radius is a complete role-based marketplace with an AI/ML trust layer. It supports buying, selling, chat, reviews, reports, admin moderation, Trust Radar, fraud scoring, and price suggestion. The main contribution is that Radius combines nearby product discovery with explainable fraud detection, making the marketplace safer and more useful.

Thank you.

