from __future__ import annotations

import json
import re
from functools import lru_cache
from pathlib import Path
from typing import Any

import imagehash
import pandas as pd
from fastapi import FastAPI, File, HTTPException, UploadFile
from PIL import Image
from pydantic import BaseModel, Field
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestRegressor
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder

BASE = Path(__file__).resolve().parent
DATA = BASE / "data"
PRICE_CSV = DATA / "market_prices_expanded.csv"
FRAUD_CSV = DATA / "fraud_listings_synthetic.csv"

IMAGE_HIGH_MAX = 5
IMAGE_MEDIUM_MAX = 10
BANNED_TERMS = {"whatsapp me", "telegram me", "pay first", "send advance", "outside platform only", "bkash first", "urgent advance"}
PROHIBITED_TERMS = {"weapon", "gun", "nid card", "passport for sale", "exam paper", "bank account for sale"}

class AnalyzeRequest(BaseModel):
    title: str
    description: str
    category: str
    brand: str = ""
    condition: str
    price: float = Field(gt=0)
    seller_information: dict[str, Any] = Field(default_factory=dict)
    image_hashes: list[str] = Field(default_factory=list)
    existing_image_hashes: list[str] = Field(default_factory=list)
    existing_descriptions: list[str] = Field(default_factory=list)

app = FastAPI(title="RADIUS Explainable Fraud Service", version="1.0.0")

@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}

@app.post("/hash-image")
async def hash_image(image: UploadFile = File(...)) -> dict[str, str]:
    if image.content_type and image.content_type not in {"image/jpeg", "image/png", "image/webp"}:
        raise HTTPException(400, "Unsupported image type")
    try:
        opened = Image.open(image.file).convert("RGB")
        digest = imagehash.phash(opened)
    except Exception as exc:
        raise HTTPException(400, "Invalid image") from exc
    return {"image_hash": str(digest)}

def hamming(a: str, b: str) -> int:
    try:
        return (int(a, 16) ^ int(b, 16)).bit_count()
    except (TypeError, ValueError):
        return 999

def image_risk(own: list[str], existing: list[str]) -> tuple[float, str]:
    if not own or not existing:
        return 0.0, "No matching historical image was found."
    nearest = min(hamming(a, b) for a in own for b in existing)
    if nearest <= IMAGE_HIGH_MAX:
        return 95.0, f"Possible reused/stolen image signal: perceptual hash distance is {nearest}."
    if nearest <= IMAGE_MEDIUM_MAX:
        return 60.0, f"Uploaded image is visually similar to an existing listing (hash distance {nearest})."
    return 5.0, f"No close perceptual-image match; nearest hash distance is {nearest}."

@lru_cache(maxsize=1)
def price_model() -> Pipeline:
    df = pd.read_csv(PRICE_CSV)
    features = ["category", "brand", "condition"]
    model = Pipeline([
        ("prep", ColumnTransformer([("cat", OneHotEncoder(handle_unknown="ignore"), features)])),
        ("rf", RandomForestRegressor(n_estimators=120, random_state=42, min_samples_leaf=2)),
    ])
    model.fit(df[features], df["price"])
    return model

def price_risk(category: str, brand: str, condition: str, actual: float) -> tuple[float, float, str]:
    expected = float(price_model().predict(pd.DataFrame([{"category": category, "brand": brand or "generic", "condition": condition}]))[0])
    ratio = actual / max(expected, 1)
    if ratio < .45: score = 95.0
    elif ratio < .60: score = 78.0
    elif ratio < .75: score = 55.0
    elif ratio < .90: score = 30.0
    else: score = 8.0
    return score, expected, f"Estimated market price is about BDT {expected:,.0f}; listing price is BDT {actual:,.0f}."

@lru_cache(maxsize=1)
def text_model() -> Pipeline:
    df = pd.read_csv(FRAUD_CSV)
    model = Pipeline([("tfidf", TfidfVectorizer(ngram_range=(1, 2), min_df=1)), ("nb", MultinomialNB())])
    model.fit((df["title"].fillna("") + " " + df["description"].fillna("")), df["label"])
    return model

def text_risk(title: str, description: str, existing: list[str]) -> tuple[float, str]:
    text = f"{title} {description}".lower().strip()
    model = text_model()
    classes = list(model.named_steps["nb"].classes_)
    probs = model.predict_proba([text])[0]
    suspicious_prob = float(probs[classes.index("suspicious")]) if "suspicious" in classes else 0.0
    reused = any(_similarity(text, x.lower()) >= .92 for x in existing if x)
    score = min(100.0, suspicious_prob * 100 + (25 if reused else 0))
    reason = f"TF-IDF/Naive Bayes suspicious-text probability is {suspicious_prob:.0%}."
    if reused: reason += " Listing text is also highly similar to an existing description."
    return score, reason

def _similarity(a: str, b: str) -> float:
    wa=set(re.findall(r"[a-z0-9]+",a)); wb=set(re.findall(r"[a-z0-9]+",b));
    return len(wa & wb) / max(len(wa | wb), 1)

def seller_risk(s: dict[str, Any]) -> tuple[float, str]:
    score=0.0; reasons=[]
    if int(s.get("account_age_days",0)) < 7: score += 28; reasons.append("new account")
    reports=int(s.get("report_count",0)); score += min(30, reports*10)
    removed=int(s.get("removed_listings",0)); score += min(25, removed*12)
    suspicious=int(s.get("suspicious_listings",0)); score += min(20, suspicious*7)
    completed=int(s.get("completed_trades",0)); rating=float(s.get("rating_average",0) or 0)
    if completed >= 5 and rating >= 4: score -= 18; reasons.append("positive completed-trade history")
    return max(0,min(100,score)), "Seller signals: " + (", ".join(reasons) if reasons else "no strong historical risk signal") + "."

def policy_risk(title: str, description: str, brand: str) -> tuple[float, str]:
    text=f"{title} {description}".lower(); hits=[x for x in BANNED_TERMS|PROHIBITED_TERMS if x in text]
    mismatch=False
    known={"apple":["iphone","ipad","macbook"],"samsung":["galaxy","samsung"],"dell":["xps","latitude","inspiron"]}
    mentioned=[b for b,words in known.items() if any(w in text for w in words)]
    if brand and mentioned and brand.lower() not in mentioned: mismatch=True
    score=min(100,len(hits)*30 + (35 if mismatch else 0))
    reasons=[]
    if hits: reasons.append("policy/off-platform phrases: " + ", ".join(hits[:3]))
    if mismatch: reasons.append("brand field conflicts with recognizable product wording")
    return float(score), "; ".join(reasons) if reasons else "No major policy or brand mismatch signal."

@app.post("/analyze-listing")
def analyze(p: AnalyzeRequest) -> dict[str, Any]:
    image_score,image_reason=image_risk(p.image_hashes,p.existing_image_hashes)
    price_score,expected,price_reason=price_risk(p.category,p.brand,p.condition,p.price)
    seller_score,seller_reason=seller_risk(p.seller_information)
    text_score,text_reason=text_risk(p.title,p.description,p.existing_descriptions)
    policy_score,policy_reason=policy_risk(p.title,p.description,p.brand)
    total=round(image_score*.25 + price_score*.25 + seller_score*.20 + text_score*.20 + policy_score*.10,2)
    status="safe" if total < 30 else "low_risk" if total < 50 else "suspicious" if total < 70 else "high_risk"
    reasons=[r for score,r in [(image_score,image_reason),(price_score,price_reason),(seller_score,seller_reason),(text_score,text_reason),(policy_score,policy_reason)] if score >= 30]
    explanation=(" ".join(reasons) if reasons else "No strong fraud indicators were detected.")
    return {"fraud_score":total,"trust_status":status,"image_score":round(image_score,2),"price_score":round(price_score,2),"seller_score":round(seller_score,2),"text_score":round(text_score,2),"policy_score":round(policy_score,2),"estimated_market_price":round(expected,2),"explanation":explanation,"signals":{"image":image_reason,"price":price_reason,"seller":seller_reason,"text":text_reason,"policy":policy_reason},"model_name":"RADIUS Explainable Ensemble","model_version":"1.0","feature_snapshot":p.model_dump()}
