import hashlib
import json
import re
from difflib import SequenceMatcher

from app.services.pricing import price_anomaly


MODEL_VERSION = "rules-risk-v2"

HIGH_VALUE_CATEGORIES = {"phone", "laptop", "camera", "gaming", "appliance"}
PRESSURE_TERMS = {
    "urgent",
    "inbox fast",
    "advance",
    "bkash only",
    "cash first",
    "deposit",
    "token money",
    "no inspection",
    "final price today",
}
OFF_PLATFORM_TERMS = {"whatsapp", "imo", "telegram", "direct call", "outside app"}
PROHIBITED_TERMS = {
    "passport",
    "nid card",
    "national id",
    "driving license",
    "weapon",
    "gun",
    "exam paper",
    "sim card",
    "bank account",
}
BRAND_KEYWORDS = {
    "apple": {"iphone", "ipad", "macbook", "airpods"},
    "samsung": {"galaxy", "samsung"},
    "dell": {"dell", "xps", "inspiron", "latitude"},
    "canon": {"canon", "eos"},
}


def normalized_text(*parts: str) -> str:
    return " ".join(str(part or "").lower().strip() for part in parts if part is not None)


def hamming_distance(hex_a: str, hex_b: str) -> int:
    try:
        a = int(hex_a, 16)
        b = int(hex_b, 16)
    except ValueError:
        return 999
    return (a ^ b).bit_count()


def text_similarity(a: str, b: str) -> float:
    return SequenceMatcher(None, a.lower().strip(), b.lower().strip()).ratio()


def duplicate_image_signal(photo_hashes: list[str], existing_hashes: list[str]) -> tuple[float, str | None]:
    closest = 999
    for photo_hash in photo_hashes:
        for existing_hash in existing_hashes:
            closest = min(closest, hamming_distance(photo_hash, existing_hash))
    if closest <= 4:
        return 35, f"Image hash is near-duplicate of an existing listing, Hamming distance {closest}."
    if closest <= 8:
        return 18, f"Image hash is visually similar to an existing listing, Hamming distance {closest}."
    return 0, None


def has_phone_number(text: str) -> bool:
    return bool(re.search(r"(?:\+?88)?01[3-9]\d{8}", text))


def brand_title_mismatch(title_description: str, brand: str) -> bool:
    brand_key = (brand or "").lower().strip()
    if not brand_key:
        return False
    mentioned_brands = [
        candidate
        for candidate, keywords in BRAND_KEYWORDS.items()
        if any(keyword in title_description for keyword in keywords)
    ]
    return bool(mentioned_brands and brand_key not in mentioned_brands)


def add_signal(signals: list[tuple[str, float, str]], name: str, points: float, explanation: str) -> None:
    if not any(existing[0] == name for existing in signals):
        signals.append((name, points, explanation))


def behavior_signals(listing: dict, existing_descriptions: list[str]) -> list[tuple[str, float, str]]:
    signals: list[tuple[str, float, str]] = []
    seller = listing.get("seller") or {}
    price = float(listing.get("price") or 0)
    title_description = normalized_text(listing.get("title", ""), listing.get("description", ""))
    account_age = int(seller.get("account_age_days") or 0)
    reviews = int(seller.get("review_count") or 0)
    rating = float(seller.get("rating_average") or seller.get("ratingAverage") or 0)
    seller_prior_flags = int(seller.get("prior_flagged_listings") or 0)
    active_listing_count = int(seller.get("active_listing_count") or 0)
    category = str(listing.get("category") or "").lower().strip()
    high_value_category = category in HIGH_VALUE_CATEGORIES
    if account_age <= 3 and reviews == 0 and (price >= 20000 or (high_value_category and price >= 10000)):
        add_signal(signals, "new_seller_high_value", 24, "Brand-new seller with no reviews is posting a high-value item.")
    if account_age <= 7 and reviews == 0 and active_listing_count >= 4:
        add_signal(signals, "new_seller_many_listings", 14, "New seller has posted several active listings before building trust.")
    if seller_prior_flags > 0:
        add_signal(signals, "seller_prior_flags", min(28, 14 + seller_prior_flags * 4), "Seller has prior listings that required fraud review.")
    if reviews >= 3 and rating >= 4.3 and account_age >= 30:
        add_signal(signals, "trusted_seller_history", -10, "Seller has established positive review history.")
    if any(term in title_description for term in PRESSURE_TERMS):
        add_signal(signals, "urgent_language", 12, "Listing uses urgency, deposit, or payment-pressure wording.")
    if any(term in title_description for term in OFF_PLATFORM_TERMS) or has_phone_number(title_description):
        add_signal(signals, "off_platform_contact", 16, "Listing tries to move negotiation or payment outside Radius.")
    if any(term in title_description for term in PROHIBITED_TERMS):
        add_signal(signals, "prohibited_item_language", 46, "Listing text matches prohibited or regulated item language.")
    if brand_title_mismatch(title_description, listing.get("brand", "")):
        add_signal(signals, "brand_title_mismatch", 18, "Brand field conflicts with recognizable product terms in the title or description.")
    if any(text_similarity(title_description, normalized_text(existing)) >= 0.9 for existing in existing_descriptions if existing):
        add_signal(signals, "reused_description", 18, "Title and description are near-identical to an existing listing.")
    return signals


def score_listing(listing: dict, existing_hashes: list[str], existing_descriptions: list[str]) -> dict:
    score = 0.0
    signal_names: list[str] = []
    explanations: list[str] = []
    component_scores: dict[str, float] = {}

    duplicate_points, duplicate_explanation = duplicate_image_signal(listing.get("photo_hashes") or [], existing_hashes or [])
    if duplicate_points:
        score += duplicate_points
        signal_names.append("duplicate_image")
        explanations.append(duplicate_explanation)
        component_scores["duplicate_image"] = duplicate_points

    price_result = price_anomaly(listing.get("category", ""), listing.get("condition", ""), float(listing.get("price") or 0))
    if price_result["is_anomaly"]:
        score += float(price_result["severity"])
        signal_names.append("price_anomaly")
        explanations.append(price_result["explanation"])
        component_scores["price_anomaly"] = float(price_result["severity"])

    for name, points, explanation in behavior_signals(listing, existing_descriptions or []):
        score += points
        component_scores[name] = points
        if points >= 0:
            signal_names.append(name)
            explanations.append(explanation)

    final_score = min(100, max(0, round(score)))
    if final_score >= 70:
        threshold_band = "high_priority_review"
    elif final_score >= 40:
        threshold_band = "review"
    else:
        threshold_band = "allow"
    feature_snapshot = {
        "category": listing.get("category", ""),
        "condition": listing.get("condition", ""),
        "price": float(listing.get("price") or 0),
        "brand": listing.get("brand", ""),
        "title_length": len(listing.get("title") or ""),
        "description_length": len(listing.get("description") or ""),
        "photo_hash_count": len(listing.get("photo_hashes") or []),
        "seller": listing.get("seller") or {},
        "existing_hash_count": len(existing_hashes or []),
        "existing_description_count": len(existing_descriptions or []),
        "signals": signal_names,
        "component_scores": component_scores,
    }
    feature_snapshot_hash = hashlib.sha256(
        json.dumps(feature_snapshot, sort_keys=True, separators=(",", ":")).encode("utf-8")
    ).hexdigest()
    return {
        "score": final_score,
        "decision": "review" if final_score >= 60 else "allow",
        "threshold_band": threshold_band,
        "risk_level": threshold_band,
        "signals": signal_names,
        "explanations": explanations,
        "component_scores": component_scores,
        "feature_snapshot": feature_snapshot,
        "model_version": MODEL_VERSION,
        "feature_snapshot_hash": feature_snapshot_hash,
    }


def evaluate_fixture() -> dict:
    cases = [
        (True, {"category": "phone", "condition": "excellent", "price": 12000, "description": "iPhone 13 urgent sale inbox fast", "photo_hashes": ["ff00ff00ff00ff00"], "seller": {"account_age_days": 1, "review_count": 0}}),
        (True, {"category": "laptop", "condition": "excellent", "price": 21000, "description": "Dell XPS urgent advance payment", "photo_hashes": ["aa00aa00aa00aa00"], "seller": {"account_age_days": 0, "review_count": 0}}),
        (False, {"category": "phone", "condition": "good", "price": 39000, "description": "Used Samsung phone with box.", "photo_hashes": ["1111222233334444"], "seller": {"account_age_days": 90, "review_count": 7}}),
        (False, {"category": "furniture", "condition": "good", "price": 5200, "description": "Study desk, pickup only.", "photo_hashes": ["5555666677778888"], "seller": {"account_age_days": 30, "review_count": 2}}),
    ]
    tp = fp = fn = 0
    for label, listing in cases:
        result = score_listing(listing, ["ff00ff00ff00ff01"], ["iPhone 13 urgent sale inbox fast"])
        predicted = result["decision"] == "review"
        tp += int(predicted and label)
        fp += int(predicted and not label)
        fn += int((not predicted) and label)
    precision = tp / max(tp + fp, 1)
    recall = tp / max(tp + fn, 1)
    return {"precision": round(precision, 3), "recall": round(recall, 3), "true_positive": tp, "false_positive": fp, "false_negative": fn}
