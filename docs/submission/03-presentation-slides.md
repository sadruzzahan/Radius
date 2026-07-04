# Presentation Slides Content

Use this as the slide text for PowerPoint, Google Slides, or Canva.

## Slide 1: Title

**Radius: AI Assisted Hyperlocal Marketplace**

Subtitle: Buy and sell safely with people nearby.

Presented by: `[Team Name]`

Members: `[Names and IDs]`

## Slide 2: Problem

Secondhand marketplaces are useful but risky.

- Fake listings.
- Reused product photos.
- Suspiciously low prices.
- New sellers with no reputation.
- Off-platform payment pressure.
- Weak admin moderation.

Key point: Users need both local discovery and trust.

## Slide 3: Proposed Solution

Radius is a hyperlocal marketplace with AI-powered trust screening.

- Browse nearby products.
- Sell items with photo upload.
- Chat with buyers/sellers.
- Report suspicious listings.
- Admin reviews fraud queue.
- Trust Radar shows distance plus safety.

## Slide 4: User Roles

Guest:

- Browse and search listings.

Registered user:

- Sell items.
- Chat.
- Report.
- Complete trades.
- Review after trade.

Admin:

- Review fraud queue.
- Resolve reports.
- Manage users.
- Inspect ML logs.

## Slide 5: System Architecture

Frontend:

- React, Vite, Framer Motion.

Backend:

- Node.js, Express, Socket.io, JWT.

Database:

- Supabase Postgres, PostGIS, Storage.

ML Service:

- Python, FastAPI, scikit-learn, pandas, imagehash.

## Slide 6: Trust Radar

Trust Radar is the unique visual feature.

- Center means user location.
- Product nodes show nearby listings.
- Node image comes from real listing.
- Distance and trust are shown together.
- Verified, review, and flagged states use different colors.
- Selecting a node opens a mini product card.

## Slide 7: AI/ML Fraud Detection

The trust engine checks:

- Duplicate photos.
- Price anomaly.
- New seller risk.
- Prior seller flags.
- Urgent/payment pressure language.
- Phone number or off-platform contact.
- Prohibited item language.
- Brand/title mismatch.
- Reused description.

Output:

- Score.
- Decision.
- Signals.
- Explanations.
- Feature snapshot.

## Slide 8: Price Intelligence

The ML service includes price suggestion.

- Dataset contains market prices by category, condition, and brand.
- Random Forest regressor predicts suggested price.
- System returns low, high, and suggested price.
- Price anomaly detection compares listing price with category-condition baseline.

## Slide 9: Admin Dashboard

Admin can:

- See total listings, users, reports, fraud count.
- Review suspicious listings.
- Approve or remove listings.
- Resolve reports.
- Suspend users.
- View ML prediction log.

Why it matters:

- AI does not silently remove listings.
- Human admin makes final moderation decisions.

## Slide 10: Database and Security

Database tables:

- Users.
- Listings.
- Photos.
- Chats.
- Trades.
- Reviews.
- Reports.
- ML events.
- ML predictions.
- ML labels.

Security:

- bcrypt password hashing.
- JWT authentication.
- Role-based admin protection.
- Server-only Supabase service key.
- Rate limiting and validation.

## Slide 11: Testing and Results

Verification:

- ML service tests: 9 passed.
- Server tests: 23 passed.
- Client production build: passed.

Evaluation metrics supported:

- Precision.
- Recall.
- F1 score.
- False positive rate.

## Slide 12: Conclusion

Radius is not just a product selling system.

It combines:

- Local marketplace.
- Role-based access.
- Chat and reviews.
- Admin moderation.
- AI/ML trust scoring.
- Price intelligence.
- Explainable fraud detection.

Final message:

Radius helps users discover nearby products with more confidence.

