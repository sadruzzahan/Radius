from functools import lru_cache
from pathlib import Path

import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder

DATA_DIR = Path(__file__).resolve().parents[2] / "data"
EXPANDED_DATA_PATH = DATA_DIR / "market_prices_expanded.csv"
DATA_PATH = EXPANDED_DATA_PATH if EXPANDED_DATA_PATH.exists() else DATA_DIR / "market_prices.csv"


@lru_cache(maxsize=1)
def load_dataset() -> pd.DataFrame:
    return pd.read_csv(DATA_PATH)


@lru_cache(maxsize=1)
def category_stats() -> dict:
    df = load_dataset()
    grouped = df.groupby(["category", "condition"])["price"].agg(["mean", "median", "std", "count"]).reset_index()
    stats: dict[tuple[str, str], dict] = {}
    for row in grouped.to_dict("records"):
        stats[(row["category"], row["condition"])] = {
            "mean": float(row["mean"]),
            "median": float(row["median"]),
            "std": float(row["std"] or max(row["mean"] * 0.18, 1)),
            "count": int(row["count"]),
        }
    return stats


def price_anomaly(category: str, condition: str, price: float) -> dict:
    stats = category_stats().get((category, condition))
    if not stats:
        return {"is_anomaly": False, "severity": 0, "explanation": "No baseline for category-condition pair."}
    z_score = (float(price) - stats["median"]) / max(stats["std"], 1)
    if z_score < -1.8:
        severity = min(40, abs(z_score) * 12)
        return {
            "is_anomaly": True,
            "severity": round(severity, 1),
            "z_score": round(z_score, 2),
            "explanation": f"Price is far below {category}/{condition} median BDT {stats['median']:.0f}.",
        }
    return {"is_anomaly": False, "severity": 0, "z_score": round(z_score, 2), "explanation": "Price is within baseline range."}


@lru_cache(maxsize=1)
def trained_model() -> tuple[Pipeline, float]:
    df = load_dataset()
    features = ["category", "condition", "brand"]
    x_train, x_test, y_train, y_test = train_test_split(
        df[features],
        df["price"],
        test_size=0.2,
        random_state=42,
    )
    model = Pipeline(
        steps=[
            ("prep", ColumnTransformer([("cat", OneHotEncoder(handle_unknown="ignore"), features)])),
            ("rf", RandomForestRegressor(n_estimators=80, random_state=42, min_samples_leaf=2)),
        ]
    )
    model.fit(x_train, y_train)
    predictions = model.predict(x_test)
    return model, float(mean_absolute_error(y_test, predictions))


def suggest_price(category: str, condition: str, brand: str = "") -> dict:
    model, mae = trained_model()
    prediction = float(model.predict(pd.DataFrame([{"category": category, "condition": condition, "brand": brand or "generic"}]))[0])
    return {
        "suggested_price": round(prediction),
        "low": round(max(0, prediction - mae)),
        "high": round(prediction + mae),
        "mae": round(mae, 2),
        "currency": "BDT",
    }
