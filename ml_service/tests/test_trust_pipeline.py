from io import StringIO

from app.services.training import train_candidate
from app.services.trust_data import normalize_label, parse_manual_csv


def test_normalize_label_maps_admin_report_and_manual_sources():
    assert normalize_label("remove", source="admin") == "fraud"
    assert normalize_label("duplicate", source="report") == "duplicate"
    assert normalize_label("legit", source="manual_csv") == "clean"
    assert normalize_label("not sure", source="manual_csv") == "unknown"


def test_parse_manual_csv_accepts_valid_rows_and_rejects_invalid_rows():
    csv_data = StringIO(
        "title,description,category,price,condition,source,label,label_reason\n"
        "Cheap iPhone,urgent inbox fast,phone,12000,excellent,example.com,scam,pressure language\n"
        "Broken row,missing label,phone,15000,good,example.com,,\n"
    )

    accepted, rejected = parse_manual_csv(csv_data)

    assert len(accepted) == 1
    assert accepted[0]["label"] == "fraud"
    assert accepted[0]["source_type"] == "manual_csv"
    assert accepted[0]["features"]["category"] == "phone"
    assert rejected[0]["row_number"] == 3


def test_train_candidate_returns_versioned_metrics_and_guardrail_status():
    records = [
        {"label": "fraud", "features": {"category": "phone", "condition": "excellent", "price": 12000, "description": "urgent inbox fast"}},
        {"label": "fraud", "features": {"category": "laptop", "condition": "excellent", "price": 21000, "description": "advance payment only"}},
        {"label": "duplicate", "features": {"category": "phone", "condition": "good", "price": 13000, "description": "same photo duplicate listing"}},
        {"label": "clean", "features": {"category": "furniture", "condition": "good", "price": 5200, "description": "desk pickup only"}},
        {"label": "clean", "features": {"category": "books", "condition": "fair", "price": 600, "description": "used textbooks"}},
        {"label": "clean", "features": {"category": "camera", "condition": "good", "price": 28000, "description": "lens included works fine"}},
    ]

    run = train_candidate(records, minimum_recall=0.5, maximum_false_positive_rate=0.75)

    assert run["model_name"] == "trust_fraud_classifier"
    assert run["model_version"].startswith("trust-fraud-")
    assert run["metrics"]["training_rows"] == 6
    assert 0 <= run["metrics"]["recall"] <= 1
    assert run["promotion_status"] in {"candidate", "rejected"}
