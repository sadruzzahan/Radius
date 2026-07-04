import csv
import random
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "data" / "fraud_listings_synthetic.csv"

CATEGORIES = {
    "phone": ["Apple", "Samsung", "Xiaomi", "OnePlus", "Google"],
    "laptop": ["Dell", "HP", "Lenovo", "Apple", "Asus"],
    "camera": ["Canon", "Nikon", "Sony", "Fujifilm"],
    "furniture": ["Hatil", "Regal", "Otobi", "Local"],
    "bicycle": ["Giant", "Trek", "Phoenix", "Duranta"],
    "appliance": ["Walton", "Samsung", "LG", "Singer"],
    "fashion": ["Aarong", "Yellow", "Sailor", "Generic"],
    "books": ["Pearson", "OReilly", "Nilkhet", "Cambridge"],
    "gaming": ["Sony", "Nintendo", "Microsoft", "Logitech"],
    "accessories": ["Anker", "Baseus", "Apple", "Generic"],
}

BASE_PRICE = {
    "phone": 52000,
    "laptop": 76000,
    "camera": 48000,
    "furniture": 12500,
    "bicycle": 21000,
    "appliance": 24000,
    "fashion": 4200,
    "books": 1800,
    "gaming": 31000,
    "accessories": 6500,
}

CONDITIONS = ["new", "excellent", "good", "fair", "poor"]
AREAS = ["Dhanmondi", "Banani", "Gulshan", "Mirpur", "Mohammadpur", "Uttara", "Badda", "Wari"]
RISK_TERMS = ["urgent", "inbox fast", "advance", "token money", "bkash only", "no inspection", "final price today"]
OFF_PLATFORM = ["WhatsApp", "Telegram", "direct call", "outside app", "IMO"]
PROHIBITED = ["NID card", "passport", "bank account", "sim card", "driving license"]


def price_for(rng: random.Random, category: str, condition: str, label: str) -> int:
    factor = {"new": 1.0, "excellent": 0.82, "good": 0.64, "fair": 0.44, "poor": 0.25}[condition]
    clean_price = BASE_PRICE[category] * factor * rng.uniform(0.78, 1.22)
    if label in {"fraud", "duplicate"}:
        clean_price *= rng.uniform(0.18, 0.52)
    if label == "prohibited":
        clean_price = rng.uniform(1500, 7000)
    if label == "spam":
        clean_price *= rng.uniform(0.45, 1.4)
    return max(100, round(clean_price / 50) * 50)


def build_row(index: int, rng: random.Random) -> dict[str, str]:
    labels = ["clean"] * 56 + ["fraud"] * 20 + ["duplicate"] * 9 + ["prohibited"] * 7 + ["spam"] * 8
    label = labels[index % len(labels)]
    category = list(CATEGORIES)[index % len(CATEGORIES)]
    condition = CONDITIONS[(index // len(CATEGORIES)) % len(CONDITIONS)]
    brand = rng.choice(CATEGORIES[category])
    area = AREAS[index % len(AREAS)]
    price = price_for(rng, category, condition, label)
    title = f"{brand} {category} {condition} near {area}"
    description = f"{condition} {brand} {category} available near {area}. Inspection welcome before purchase."
    duplicate_photo = "0"
    off_platform_contact = "0"
    prohibited_language = "0"
    urgent_language = "0"
    brand_mismatch = "0"

    if label == "fraud":
        urgent_language = "1"
        off_platform_contact = "1"
        description = f"{rng.choice(RISK_TERMS)} sale. {rng.choice(OFF_PLATFORM)} only, pay deposit first before inspection."
    elif label == "duplicate":
        duplicate_photo = "1"
        urgent_language = "1"
        description = f"Same photo repost. {rng.choice(RISK_TERMS)} pickup near {area}."
    elif label == "prohibited":
        prohibited_language = "1"
        off_platform_contact = "1"
        title = f"{rng.choice(PROHIBITED)} service near {area}"
        description = f"{rng.choice(PROHIBITED)} available. {rng.choice(OFF_PLATFORM)} for direct deal."
    elif label == "spam":
        brand_mismatch = "1"
        other_brand = rng.choice([item for brands in CATEGORIES.values() for item in brands if item != brand])
        title = f"{brand} {other_brand} mixed listing"
        description = f"Brand field and title do not match. {rng.choice(RISK_TERMS)}."
    else:
        if rng.random() < 0.12:
            description += " Original receipt available."

    seller_account_age_days = str(rng.randint(0, 6) if label != "clean" else rng.randint(14, 900))
    seller_review_count = str(rng.randint(0, 1) if label != "clean" else rng.randint(1, 35))
    seller_rating_average = f"{rng.uniform(0, 3.8):.1f}" if label != "clean" else f"{rng.uniform(4.0, 5.0):.1f}"
    prior_flagged_listings = str(rng.randint(0, 4) if label != "clean" else rng.choice([0, 0, 0, 1]))
    active_listing_count = str(rng.randint(3, 12) if label != "clean" else rng.randint(1, 8))

    return {
        "title": title,
        "description": description,
        "category": category,
        "brand": brand,
        "condition": condition,
        "price": str(price),
        "seller_account_age_days": seller_account_age_days,
        "seller_review_count": seller_review_count,
        "seller_rating_average": seller_rating_average,
        "prior_flagged_listings": prior_flagged_listings,
        "active_listing_count": active_listing_count,
        "duplicate_photo": duplicate_photo,
        "urgent_language": urgent_language,
        "off_platform_contact": off_platform_contact,
        "prohibited_language": prohibited_language,
        "brand_mismatch": brand_mismatch,
        "label": label,
        "source": "synthetic_showcase_generator",
    }


def main() -> None:
    total_rows = int(sys.argv[1]) if len(sys.argv) > 1 else 20000
    rng = random.Random(20260705)
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    fieldnames = [
        "title",
        "description",
        "category",
        "brand",
        "condition",
        "price",
        "seller_account_age_days",
        "seller_review_count",
        "seller_rating_average",
        "prior_flagged_listings",
        "active_listing_count",
        "duplicate_photo",
        "urgent_language",
        "off_platform_contact",
        "prohibited_language",
        "brand_mismatch",
        "label",
        "source",
    ]
    with OUTPUT.open("w", newline="") as target:
        writer = csv.DictWriter(target, fieldnames=fieldnames, lineterminator="\n")
        writer.writeheader()
        for index in range(total_rows):
            writer.writerow(build_row(index, rng))
    print(f"Wrote {total_rows} rows to {OUTPUT}")


if __name__ == "__main__":
    main()
