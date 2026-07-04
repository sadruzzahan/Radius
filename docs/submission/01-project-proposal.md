# Project Proposal

## Project Title

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

## 1. Introduction

Radius is a web-based secondhand marketplace where people can buy and sell products near their current location. The system focuses on local discovery and buyer safety. A normal marketplace shows product cards only. Radius adds a **Trust Radar** and an **AI/ML based fraud screening engine** so users can see nearby items and understand whether a listing looks safe, suspicious, or needs admin review.

The project is designed as a portfolio-quality full-stack system, not only a basic CRUD assignment. It includes authentication, role-based access, product listing, image upload, chat, reports, reviews, admin moderation, location-based browsing, and intelligent trust scoring.

## 2. Problem Statement

Secondhand marketplaces are useful but risky. Common problems include:

- Fake product listings.
- Unrealistically low prices used to attract victims.
- Reused or stolen product photos.
- New sellers posting high-value products with no reputation.
- Sellers pushing buyers to communicate or pay outside the platform.
- Lack of clear admin tools for reviewing suspicious listings.

Because of these issues, buyers may not trust local secondhand marketplaces. Sellers also lose credibility when the platform has too many scams.

## 3. Proposed Solution

Radius solves this problem by combining a hyperlocal marketplace with explainable AI/ML trust features.

Main idea:

> Users can discover products nearby, while the system automatically scans listings for fraud signals before risky listings reach buyers.

The system provides:

- Nearby product discovery using geolocation and radius filters.
- Product listing and management for registered users.
- Real-time chat between buyer and seller.
- Trade and review workflow.
- User report system.
- Admin dashboard for fraud queue, reports, users, and ML prediction logs.
- AI/ML trust scoring for suspicious listings.
- Price suggestion and price anomaly detection using a market price dataset.

## 4. User Roles

### Guest

- Browse public listings.
- Search and filter products.
- View listing details.
- Cannot chat, sell, report, or review.

### Registered User

- Create and manage own listings.
- Upload listing photos.
- Chat with sellers or buyers.
- Report suspicious listings.
- Complete trade workflow.
- Give reviews after completed trades.

### Admin

- View analytics.
- Review suspicious listings.
- Approve or remove flagged listings.
- Resolve user reports.
- Suspend or activate users.
- Inspect ML prediction logs.

## 5. Intelligent Feature

The main intelligent feature is the **Trust/Risk Engine**.

It scores every submitted listing using multiple signals:

- Duplicate or near-duplicate image hash.
- Price far below category and condition baseline.
- Brand-new seller posting high-value products.
- Seller with prior flagged listings.
- Urgent or payment-pressure words.
- Phone number or off-platform contact attempt.
- Prohibited item language.
- Brand and title mismatch.
- Reused title or description.
- Trusted seller history as a risk reducer.

The ML service also includes:

- Price suggestion with a Random Forest regression model.
- Candidate fraud model training using TF-IDF and Naive Bayes.
- Precision, recall, F1, and false-positive-rate evaluation.
- Durable ML prediction logs for admin review.

## 6. Dataset Plan

The project uses a local Dhaka secondhand-market dataset for price baselines. The dataset includes categories such as phone, laptop, camera, furniture, bicycle, appliance, fashion, books, gaming, and accessories.

Dataset sources and plan:

- Initial deterministic dataset generated for development and testing.
- Manual CSV import endpoint for adding labeled clean/fraud examples.
- Admin decisions create strong labels.
- User reports create weak labels.
- Future expansion can use allowed public marketplace pages or manually collected listing data.

Important dataset fields:

- Title
- Description
- Category
- Condition
- Brand
- Price
- Photo hash
- Seller account age
- Seller review count
- Label: clean, fraud, duplicate, prohibited, spam, or unknown

## 7. Research Background

The project design is based on ideas from marketplace fraud detection and e-commerce fraud research:

- Marketplace fraud detection can use seller behavior, listing behavior, and transaction history.
- Fraud detection must handle class imbalance because fraud examples are usually fewer than clean examples.
- Precision, recall, F1, and false-positive rate are important metrics.
- Reused product images are a real risk in secondhand e-commerce.
- Explainable models are useful for admin review because admins need to know why something was flagged.

Key references are listed in `05-research-review-and-dataset-plan.md`.

## 8. Technology Stack

### Frontend

- React
- Vite
- Framer Motion
- Lucide React icons
- CSS custom design system

### Backend

- Node.js
- Express.js
- Socket.io
- JWT authentication
- bcrypt password hashing
- Zod validation

### Database and Storage

- Supabase Postgres
- PostGIS geofencing
- Supabase Storage for listing photos
- In-memory store for local demos only

### AI/ML Service

- Python
- FastAPI
- scikit-learn
- pandas
- Pillow and imagehash

## 9. Core Modules

- Authentication and role-based access.
- Browse and Trust Radar.
- Listing creation and management.
- Image upload and pHash generation.
- Chat.
- Trade and review.
- Report system.
- Admin dashboard.
- Fraud scoring and ML logs.
- Price suggestion.

## 10. Expected Outcome

At the end of the project, Radius will demonstrate:

- A working full-stack marketplace.
- Multiple user roles.
- Real-time buyer-seller interaction.
- A meaningful AI/ML feature.
- A database-backed workflow.
- Admin moderation.
- Research-informed fraud scoring.
- A polished UI suitable for portfolio showcase.

## 11. Project Scope

Included:

- Marketplace CRUD.
- Role-based auth.
- Location-based browsing.
- Intelligent trust scoring.
- Admin review.
- Chat and review flow.

Not included in current academic scope:

- Real payment gateway.
- Government identity verification.
- Mobile app packaging.
- Production-scale fraud model trained on millions of rows.

## 12. Timeline

| Phase | Work |
|---|---|
| Week 1 | Requirement analysis, research paper review, project planning |
| Week 2 | Authentication, roles, listing CRUD, database schema |
| Week 3 | Chat, reports, reviews, admin dashboard |
| Week 4 | ML service, fraud scoring, price suggestion |
| Week 5 | UI polish, Trust Radar, testing, documentation |

## 13. Conclusion

Radius is a practical and creative marketplace system that satisfies the academic requirements while also being useful as a professional portfolio project. Its main value is combining local product discovery with explainable AI fraud screening.

