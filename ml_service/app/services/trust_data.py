import csv
from collections.abc import Iterable
from typing import TextIO


CANONICAL_LABELS = {"clean", "fraud", "duplicate", "prohibited", "spam", "unknown"}

LABEL_ALIASES = {
    "admin": {
        "approve": "clean",
        "allow": "clean",
        "available": "clean",
        "false_positive": "clean",
        "remove": "fraud",
        "removed": "fraud",
        "ban": "fraud",
        "suspend": "fraud",
        "fraud": "fraud",
        "duplicate": "duplicate",
        "prohibited": "prohibited",
        "spam": "spam",
    },
    "report": {
        "fraud": "fraud",
        "duplicate": "duplicate",
        "prohibited": "prohibited",
        "spam": "spam",
        "other": "unknown",
        "resolved": "unknown",
    },
    "manual_csv": {
        "clean": "clean",
        "legit": "clean",
        "legitimate": "clean",
        "safe": "clean",
        "ok": "clean",
        "fraud": "fraud",
        "scam": "fraud",
        "suspicious": "fraud",
        "duplicate": "duplicate",
        "copy": "duplicate",
        "prohibited": "prohibited",
        "banned": "prohibited",
        "spam": "spam",
        "unknown": "unknown",
        "uncertain": "unknown",
    },
}

REQUIRED_MANUAL_COLUMNS = {"title", "description", "category", "price", "condition", "source", "label"}


def normalize_label(raw_label: str, source: str = "manual_csv") -> str:
    key = str(raw_label or "").strip().lower().replace("-", "_").replace(" ", "_")
    if key in CANONICAL_LABELS:
        return key
    return LABEL_ALIASES.get(source, LABEL_ALIASES["manual_csv"]).get(key, "unknown")


def _missing_required(row: dict) -> list[str]:
    return sorted(column for column in REQUIRED_MANUAL_COLUMNS if not str(row.get(column) or "").strip())


def parse_manual_csv(file_obj: TextIO | Iterable[str]) -> tuple[list[dict], list[dict]]:
    accepted: list[dict] = []
    rejected: list[dict] = []
    reader = csv.DictReader(file_obj)
    for row_number, row in enumerate(reader, start=2):
        missing = _missing_required(row)
        label = normalize_label(row.get("label", ""), source="manual_csv")
        if missing or label == "unknown":
            rejected.append({
                "row_number": row_number,
                "missing": missing,
                "label": row.get("label", ""),
                "reason": "missing_required_fields" if missing else "unknown_label",
            })
            continue
        try:
            price = float(row["price"])
        except ValueError:
            rejected.append({
                "row_number": row_number,
                "missing": [],
                "label": row.get("label", ""),
                "reason": "invalid_price",
            })
            continue
        accepted.append({
            "source_type": "manual_csv",
            "source": row["source"].strip(),
            "label": label,
            "label_reason": (row.get("label_reason") or "").strip(),
            "features": {
                "title": row["title"].strip(),
                "description": row["description"].strip(),
                "category": row["category"].strip(),
                "condition": row["condition"].strip(),
                "brand": (row.get("brand") or "").strip(),
                "price": price,
            },
        })
    return accepted, rejected
