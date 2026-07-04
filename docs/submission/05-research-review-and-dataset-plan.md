# Research Review and Dataset Plan

## 1. Research Goal

The AI/ML goal of Radius is to detect suspicious secondhand marketplace listings. The system should not only return a score; it should also explain why a listing is risky so that admins can make informed decisions.

## 2. Search Keywords Used

Recommended Google Scholar/search keywords:

- "e-commerce fraud detection machine learning"
- "digital marketplace fraud detection machine learning"
- "organized retail fraud digital marketplaces"
- "secondhand product image fraud machine learning"
- "product image reused detection e-commerce"
- "fraud detection precision recall F1 class imbalance"
- "price anomaly detection online marketplace"

## 3. Paper List

### 1. Mutemi and Bacao, 2023

Title: *A numeric-based machine learning design for detecting organized retail fraud in digital marketplaces*

Publication: Scientific Reports

Link: https://doi.org/10.1038/s41598-023-38304-5

Why it matters:

- It is directly related to digital marketplace fraud.
- It supports the idea that marketplace features can be used to detect fraud.
- It shows that fraud detection is not only about payment transactions; listing and seller behavior are also important.

How Radius uses the idea:

- Radius uses seller account age, review count, prior flags, active listings, listing price, and listing content as risk signals.

### 2. Ali et al., 2022

Title: *Financial Fraud Detection Based on Machine Learning: A Systematic Literature Review*

Publication: Applied Sciences

Link: https://doi.org/10.3390/app12199637

Why it matters:

- It summarizes many ML fraud detection approaches.
- It discusses common evaluation metrics and fraud detection challenges.
- It confirms that supervised ML, anomaly detection, and classification are common fraud detection directions.

How Radius uses the idea:

- Radius stores labels and feature snapshots.
- Radius uses precision, recall, F1, and false positive rate for candidate model evaluation.

### 3. Chatrath, Batra, and Chaba, 2022

Title: *Handling consumer vulnerability in e-commerce product images using machine learning*

Publication: Heliyon

Link: https://doi.org/10.1016/j.heliyon.2022.e10743

Why it matters:

- It focuses on secondhand goods and product images.
- It explains that reused or manipulated product images can create buyer vulnerability.
- It motivates image-based trust checking.

How Radius uses the idea:

- Radius generates perceptual image hashes.
- It compares new listing images against existing hashes.
- It flags exact or near-duplicate image cases.

### 4. Amazon Science Fraud Dataset Benchmark

Title: *Fraud Dataset Benchmark*

Link: https://github.com/amazon-science/fraud-dataset-benchmark

Why it matters:

- It shows how fraud datasets can be standardized.
- It includes fraud categories such as card-not-present fraud, bot attacks, malicious traffic, credit risk, and content moderation.
- It emphasizes train/test splits and evaluation metrics.

How Radius uses the idea:

- Radius stores ML events, predictions, labels, and training runs.
- The system is designed so future data can be used for better model training.

## 4. Key Lessons from Research

### Fraud data is usually imbalanced

Most marketplace listings are clean. Fraud listings are fewer. Because of this, accuracy alone is not enough. A model can get high accuracy by predicting "clean" every time. Radius therefore uses recall, precision, F1, and false positive rate.

### Explainability matters

Admins need to know why a listing was flagged. A score without reason is not useful for moderation. Radius returns signal names and explanations.

### Multiple signals work better than one signal

One suspicious sign may not prove fraud. For example, a low price may be a real discount. But low price plus new seller plus urgent payment language is much more suspicious. Radius combines multiple signals.

### Image reuse is important for secondhand products

Fake sellers often reuse photos from old listings or the internet. Radius uses pHash and Hamming distance to detect near-duplicate images.

### Human moderation should remain in the loop

The system should not automatically ban or remove every listing. Radius sends high-risk listings to the admin queue.

## 5. Dataset Used in Radius

### Price Dataset

Location:

- `ml_service/data/market_prices.csv`
- `ml_service/data/market_prices_expanded.csv`

Fields:

- category
- condition
- brand
- price

Purpose:

- Train price suggestion model.
- Build category-condition median and standard deviation.
- Detect price anomalies.

### Fraud Label Dataset

Sources:

- Admin decisions.
- User reports.
- Manual CSV import.

Manual CSV expected fields:

```csv
title,description,category,price,condition,source,label,label_reason
```

Labels:

- clean
- fraud
- duplicate
- prohibited
- spam
- unknown

## 6. Feature Engineering

Features used for trust scoring:

| Feature | Why useful |
|---|---|
| Category | Different products have different fraud risk |
| Condition | Price depends on condition |
| Price | Very low price can indicate scam |
| Brand | Brand mismatch can reveal fake listing |
| Title and description | Text can contain urgent or prohibited terms |
| Photo hash | Duplicate image detection |
| Seller account age | New seller risk |
| Seller review count | Reputation signal |
| Seller rating | Trust signal |
| Active listing count | New seller posting many items can be suspicious |
| Prior flagged listings | Seller history risk |

## 7. Model and Evaluation Plan

### Current Online Model

The current online fraud decision is an explainable rules-and-signals model. It is used because:

- The dataset is still small.
- The project needs explainability.
- It is safer for admin moderation.

### Candidate Trainable Model

The ML service includes a candidate model:

- TF-IDF text vectorizer.
- Multinomial Naive Bayes classifier.
- Binary target: clean vs risky.

Evaluation metrics:

- Precision.
- Recall.
- F1.
- False positive rate.

Promotion rule:

- Candidate model is accepted only if recall is high enough and false positive rate is low enough.

## 8. Future Dataset Collection Plan

Future dataset collection should follow ethical and legal rules:

- Use only allowed public pages.
- Respect website terms of service.
- Avoid collecting private user data.
- Store only necessary listing fields.
- Remove personally identifiable information.
- Label data manually or through admin decisions.

Possible sources:

- Manually collected local marketplace listings.
- Public research datasets.
- Kaggle fraud/e-commerce datasets.
- Admin-labeled project data.

## 9. Simple Explanation for Viva

If asked "Where is the ML?", answer:

The ML part is in the Python FastAPI service. It has image hashing, fraud scoring, price anomaly detection, price suggestion with Random Forest, and candidate fraud model training with TF-IDF and Naive Bayes. The online fraud decision is intentionally explainable, so admins can see exactly why a listing was flagged.

If asked "Why not use a deep learning model?", answer:

For this project, our dataset is small. A deep learning model would not be reliable without a large labeled dataset. So we used an explainable hybrid approach first, and we also built the data pipeline needed to train stronger models later.

