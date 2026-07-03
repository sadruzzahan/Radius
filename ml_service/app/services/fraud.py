from difflib import SequenceMatcher

from app.services.pricing import price_anomaly


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


def behavior_signals(listing: dict, existing_descriptions: list[str]) -> list[tuple[str, float, str]]:
    signals: list[tuple[str, float, str]] = []
    seller = listing.get("seller") or {}
    price = float(listing.get("price") or 0)
    description = listing.get("description") or ""
    account_age = int(seller.get("account_age_days") or 0)
    reviews = int(seller.get("review_count") or 0)
    high_value_category = listing.get("category") in {"phone", "laptop", "camera", "game", "appliance"}
    if account_age <= 3 and reviews == 0 and (price >= 20000 or (high_value_category and price >= 10000)):
        signals.append(("new_seller_high_value", 24, "Brand-new seller with no reviews is posting a high-value item."))
    if any(word in description.lower() for word in ["urgent", "inbox fast", "advance", "bkash only"]):
        signals.append(("urgent_language", 10, "Description contains urgency/payment-pressure language."))
    if any(text_similarity(description, existing) >= 0.9 for existing in existing_descriptions if existing):
        signals.append(("reused_description", 18, "Description is near-identical to an existing listing."))
    return signals


def score_listing(listing: dict, existing_hashes: list[str], existing_descriptions: list[str]) -> dict:
    score = 0.0
    signal_names: list[str] = []
    explanations: list[str] = []

    duplicate_points, duplicate_explanation = duplicate_image_signal(listing.get("photo_hashes") or [], existing_hashes or [])
    if duplicate_points:
        score += duplicate_points
        signal_names.append("duplicate_image")
        explanations.append(duplicate_explanation)

    price_result = price_anomaly(listing.get("category", ""), listing.get("condition", ""), float(listing.get("price") or 0))
    if price_result["is_anomaly"]:
        score += float(price_result["severity"])
        signal_names.append("price_anomaly")
        explanations.append(price_result["explanation"])

    for name, points, explanation in behavior_signals(listing, existing_descriptions or []):
        score += points
        signal_names.append(name)
        explanations.append(explanation)

    final_score = min(100, round(score))
    return {
        "score": final_score,
        "decision": "review" if final_score >= 60 else "allow",
        "signals": signal_names,
        "explanations": explanations,
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
