import hashlib
import json

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics import f1_score, precision_score, recall_score
from sklearn.naive_bayes import MultinomialNB
from sklearn.pipeline import Pipeline


BAD_LABELS = {"fraud", "duplicate", "prohibited", "spam"}


def _binary_label(label: str) -> int:
    return 1 if label in BAD_LABELS else 0


def _feature_text(record: dict) -> str:
    features = record.get("features", {})
    parts = [
        features.get("title", ""),
        features.get("description", ""),
        features.get("category", ""),
        features.get("condition", ""),
        features.get("brand", ""),
        str(features.get("price", "")),
    ]
    return " ".join(str(part).lower() for part in parts if part is not None)


def _model_version(records: list[dict]) -> str:
    payload = json.dumps(records, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return f"trust-fraud-{hashlib.sha256(payload).hexdigest()[:12]}"


def train_candidate(records: list[dict], minimum_recall: float = 0.7, maximum_false_positive_rate: float = 0.25) -> dict:
    usable = [record for record in records if record.get("label") in BAD_LABELS | {"clean"}]
    if len(usable) < 2 or len({_binary_label(record["label"]) for record in usable}) < 2:
        return {
            "model_name": "trust_fraud_classifier",
            "model_version": _model_version(usable),
            "promotion_status": "rejected",
            "metrics": {
                "training_rows": len(usable),
                "precision": 0,
                "recall": 0,
                "f1": 0,
                "false_positive_rate": 0,
            },
            "rejection_reason": "requires_at_least_one_clean_and_one_risky_label",
        }

    x_train = [_feature_text(record) for record in usable]
    y_train = [_binary_label(record["label"]) for record in usable]
    model = Pipeline([
        ("tfidf", TfidfVectorizer(ngram_range=(1, 2), min_df=1)),
        ("classifier", MultinomialNB()),
    ])
    model.fit(x_train, y_train)
    predictions = model.predict(x_train)
    tp = sum(1 for actual, predicted in zip(y_train, predictions) if actual == 1 and predicted == 1)
    fp = sum(1 for actual, predicted in zip(y_train, predictions) if actual == 0 and predicted == 1)
    tn = sum(1 for actual, predicted in zip(y_train, predictions) if actual == 0 and predicted == 0)
    fn = sum(1 for actual, predicted in zip(y_train, predictions) if actual == 1 and predicted == 0)
    false_positive_rate = fp / max(fp + tn, 1)
    recall = recall_score(y_train, predictions, zero_division=0)
    metrics = {
        "training_rows": len(usable),
        "precision": round(precision_score(y_train, predictions, zero_division=0), 3),
        "recall": round(recall, 3),
        "f1": round(f1_score(y_train, predictions, zero_division=0), 3),
        "false_positive_rate": round(false_positive_rate, 3),
        "true_positive": tp,
        "false_positive": fp,
        "true_negative": tn,
        "false_negative": fn,
    }
    promoted = recall >= minimum_recall and false_positive_rate <= maximum_false_positive_rate
    return {
        "model_name": "trust_fraud_classifier",
        "model_version": _model_version(usable),
        "promotion_status": "candidate" if promoted else "rejected",
        "metrics": metrics,
    }
