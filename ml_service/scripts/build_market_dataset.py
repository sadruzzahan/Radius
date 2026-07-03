import csv
import random
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASELINE = ROOT / "data" / "market_prices.csv"
OUTPUT = ROOT / "data" / "market_prices_expanded.csv"

CATEGORIES = {
    "phone": {
        "brands": ["Apple", "Samsung", "Xiaomi", "OnePlus", "Google", "Realme"],
        "base": [18000, 120000],
    },
    "laptop": {
        "brands": ["Dell", "HP", "Lenovo", "Apple", "Asus", "Acer"],
        "base": [26000, 165000],
    },
    "camera": {
        "brands": ["Canon", "Nikon", "Sony", "Fujifilm", "Panasonic"],
        "base": [16000, 145000],
    },
    "furniture": {
        "brands": ["Regal", "Otobi", "Hatil", "IKEA", "Local"],
        "base": [1500, 52000],
    },
    "bicycle": {
        "brands": ["Phoenix", "Giant", "Trek", "Duranta", "Hero"],
        "base": [4500, 85000],
    },
    "appliance": {
        "brands": ["Walton", "Samsung", "LG", "Singer", "Whirlpool"],
        "base": [2500, 90000],
    },
    "fashion": {
        "brands": ["Aarong", "Yellow", "Ecstasy", "Sailor", "Generic"],
        "base": [500, 18000],
    },
    "books": {
        "brands": ["Pearson", "OReilly", "Nilkhet", "Penguin", "Cambridge"],
        "base": [150, 6500],
    },
    "gaming": {
        "brands": ["Sony", "Nintendo", "Microsoft", "Logitech", "Razer"],
        "base": [2500, 90000],
    },
    "accessories": {
        "brands": ["Anker", "Baseus", "Apple", "Samsung", "Generic"],
        "base": [250, 22000],
    },
}

CONDITION_MULTIPLIER = {
    "new": 1.0,
    "excellent": 0.82,
    "good": 0.64,
    "fair": 0.44,
    "poor": 0.24,
}


def load_baseline() -> list[dict[str, str]]:
    if not BASELINE.exists():
        return []
    with BASELINE.open(newline="") as source:
        return list(csv.DictReader(source))


def generated_rows(target: int) -> list[dict[str, str]]:
    rng = random.Random(20260702)
    rows: list[dict[str, str]] = []
    categories = list(CATEGORIES.items())
    while len(rows) < target:
        category, spec = categories[len(rows) % len(categories)]
        condition = list(CONDITION_MULTIPLIER)[(len(rows) // len(categories)) % len(CONDITION_MULTIPLIER)]
        brand = rng.choice(spec["brands"])
        low, high = spec["base"]
        anchor = rng.randint(low, high)
        noise = rng.uniform(0.86, 1.14)
        price = max(100, round(anchor * CONDITION_MULTIPLIER[condition] * noise / 50) * 50)
        rows.append({
            "category": category,
            "condition": condition,
            "brand": brand,
            "price": str(price),
        })
    return rows


def build_dataset(total_rows: int = 520) -> list[dict[str, str]]:
    baseline = load_baseline()
    rows = baseline + generated_rows(max(0, total_rows - len(baseline)))
    return rows[:total_rows]


def main() -> None:
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    rows = build_dataset()
    with OUTPUT.open("w", newline="") as target:
        writer = csv.DictWriter(target, fieldnames=["category", "condition", "brand", "price"])
        writer.writeheader()
        writer.writerows(rows)
    print(f"Wrote {len(rows)} rows to {OUTPUT}")


if __name__ == "__main__":
    main()
