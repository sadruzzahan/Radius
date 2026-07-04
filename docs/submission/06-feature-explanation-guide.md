# Feature Explanation Guide

This guide explains the project in simple words so you can answer questions confidently.

## 1. What is Radius?

Radius is a secondhand marketplace for nearby products. Users can browse items, sell their own items, chat with sellers, report suspicious listings, and leave reviews after completed trades.

The special part is that Radius also checks listings for fraud risk using AI/ML style trust scoring.

## 2. Why is the project useful?

A normal marketplace only shows products. Radius tries to answer two extra questions:

1. Is this item near me?
2. Does this listing look trustworthy?

This is useful because secondhand marketplaces often have fake listings, copied photos, and scam sellers.

## 3. Main User Flow

### Guest flow

1. Open the website.
2. Browse nearby listings.
3. Search or filter products.
4. View listing details.
5. Sign in if they want to chat, sell, or report.

### Registered user flow

1. Register or login.
2. Browse products.
3. Open a listing.
4. Chat with seller.
5. Sell own item using the Sell tab.
6. Manage own listings using the Manage tab.
7. Report suspicious listings.
8. Review another user after completed trade.

### Admin flow

1. Login as admin.
2. Open Admin tab.
3. Check dashboard stats.
4. Review fraud queue.
5. Approve or remove suspicious listings.
6. Resolve reports.
7. Manage user status.
8. Inspect ML Log.

## 4. Role-Based Access

Role-based access means different users can do different things.

### Guest

Guest is a visitor without login. Guest can only browse.

### Registered user

Registered user has an account. They can sell, chat, report, and review.

### Admin

Admin has extra permission. Admin can moderate listings and users.

In code, roles are defined in:

- `server/src/lib/rbac.js`
- `server/src/middleware/auth.js`

## 5. Authentication

Authentication means proving who the user is.

Radius uses:

- Email and password login.
- bcrypt for password hashing.
- JWT token for logged-in sessions.

When a user logs in:

1. Backend checks email.
2. Backend compares password with stored bcrypt hash.
3. Backend creates JWT token.
4. Frontend stores token.
5. Future API requests send token in the Authorization header.

## 6. Trust Radar

Trust Radar is the hero feature on the browse page.

Simple explanation:

- The center is the user's location.
- Product nodes around the center are nearby listings.
- Each node shows the real product image.
- Distance is shown near the node.
- Color shows trust status.
- Clicking a node opens a mini product card.

Trust states:

| State | Meaning |
|---|---|
| Verified | Low fraud score |
| Under Review | Some risk signals |
| AI Review / Flagged | High risk score |

## 7. Listing Creation

When a registered user sells an item:

1. User fills title, price, category, condition, brand, description.
2. User uploads photo.
3. Backend uploads/validates photo.
4. ML service creates image perceptual hash.
5. Backend sends listing data to fraud scorer.
6. Fraud scorer returns risk result.
7. Listing is saved with fraud score and signals.
8. Admin can review if it is risky.

## 8. Image pHash

pHash means perceptual hash.

Normal file hash changes completely if the image is resized or slightly edited. Perceptual hash is different. It represents how the image looks.

So if two images look almost the same, their pHash values are close.

Radius uses pHash to detect:

- Same image reused.
- Slightly edited duplicate image.

The system uses Hamming distance:

- Small distance means images are similar.
- Distance 0 to 4 is treated as near duplicate.
- Distance 5 to 8 is treated as visually similar.

## 9. Fraud Scoring

The fraud scorer gives each listing a score from 0 to 100.

Low score means safe. High score means risky.

Signals that add risk:

- Duplicate image.
- Price too low.
- New seller selling expensive item.
- Seller has prior flagged listings.
- Urgent payment language.
- Phone number or WhatsApp/Telegram/off-platform contact.
- Prohibited item words.
- Brand mismatch.
- Reused description.

Signal that reduces risk:

- Established seller with good reviews and rating.

## 10. Example Fraud Score

Example listing:

- Title: iPhone 13 urgent sale.
- Price: very low.
- Seller: new account.
- Description: asks for WhatsApp and token money.
- Photo: duplicate of another listing.

Possible score:

- Duplicate image: +35.
- Price anomaly: +28.
- New seller: +24.
- Urgent language: +12.
- Off-platform contact: +16.

Final score becomes high, so the listing goes to admin review.

## 11. Price Suggestion

Price suggestion helps sellers choose a realistic price.

How it works:

1. Dataset contains product category, condition, brand, and price.
2. Python model learns price patterns.
3. Seller enters category, condition, and brand.
4. Model returns suggested price, low range, and high range.

The model uses Random Forest Regressor from scikit-learn.

## 12. Price Anomaly

Price anomaly means the price is unusual compared to similar products.

Example:

- Normal used iPhone price is around BDT 45,000.
- Someone lists it for BDT 8,000.
- That is suspicious because scammers often use very low prices to attract buyers.

Radius compares price with category-condition median and standard deviation.

## 13. Chat

Chat lets buyer and seller communicate inside the platform.

Why inside-platform chat matters:

- It keeps transaction evidence.
- It reduces off-platform scams.
- It helps admins understand disputes later.

Socket.io is used for real-time messaging.

## 14. Trade and Review

Reviews should be trustworthy. Radius allows reviews only after a completed trade.

This prevents users from creating fake reviews without any actual transaction.

Trade states:

- requested
- accepted
- rejected
- cancelled
- completed

## 15. Reports

Registered users can report suspicious listings.

Report examples:

- Fraud.
- Duplicate listing.
- Prohibited product.
- Misleading information.

Reports appear in the admin dashboard.

## 16. Admin Dashboard

Admin dashboard has:

- Analytics cards.
- Fraud queue.
- Reports.
- Users.
- ML Log.

The admin can approve or remove flagged listings.

## 17. ML Log

ML Log is important for explainability.

It shows:

- Model version.
- Score.
- Decision.
- Signals.
- Feature snapshot information.

This helps prove the AI/ML feature is not fake. The system saves actual predictions.

## 18. What is Real and What is Demo?

Real implemented features:

- Authentication.
- Role-based access.
- Listing CRUD.
- Photo upload metadata.
- Geofenced browsing.
- Chat.
- Reports.
- Admin moderation.
- Fraud scoring.
- Price suggestion.
- ML prediction logs.
- Tests.

Showcase/demo limitations:

- Dataset is demonstration-sized.
- Fraud engine is explainable hybrid scoring, not a huge production-trained model.
- Payment gateway is not included.
- Identity verification is not included.

## 19. How to Explain the ML Simply

Say this:

> Our AI/ML feature checks a listing like an experienced marketplace moderator. It looks at the photo, price, seller history, and text. Then it creates a score and explains the reasons. We also store labels and feature snapshots so a stronger model can be trained later.

## 20. Best Demo Order

1. Open Browse page.
2. Show Trust Radar.
3. Click a product node.
4. Open listing detail.
5. Show trust scan and price radar.
6. Login as seller.
7. Create a suspicious listing.
8. Login as admin.
9. Show it in fraud queue or ML Log.
10. Approve/remove the listing.

