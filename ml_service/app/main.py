from io import BytesIO, StringIO

import imagehash
from fastapi import FastAPI, File, HTTPException, UploadFile
from PIL import Image
from pydantic import BaseModel, Field

from app.services.fraud import evaluate_fixture, score_listing
from app.services.pricing import suggest_price
from app.services.training import train_candidate
from app.services.trust_data import parse_manual_csv


class ScoreRequest(BaseModel):
    listing: dict
    existing_hashes: list[str] = Field(default_factory=list)
    existing_descriptions: list[str] = Field(default_factory=list)


class PriceRequest(BaseModel):
    category: str
    condition: str
    brand: str = ""


class TrainRequest(BaseModel):
    records: list[dict]
    minimum_recall: float = 0.7
    maximum_false_positive_rate: float = 0.25


app = FastAPI(title="Hyperlocal Marketplace Fraud ML Service", version="0.1.0")


@app.get("/health")
def health() -> dict:
    return {"ok": True}


@app.post("/image/phash")
async def image_phash(image: UploadFile = File(...)) -> dict:
    if image.content_type and not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image uploads are supported.")
    contents = await image.read()
    try:
        with Image.open(BytesIO(contents)) as opened:
            digest = imagehash.phash(opened.convert("RGB"))
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Invalid image file.") from exc
    return {"hash": str(digest)}


@app.post("/score")
def score(payload: ScoreRequest) -> dict:
    return score_listing(payload.listing, payload.existing_hashes, payload.existing_descriptions)


@app.post("/suggest-price")
def suggest(payload: PriceRequest) -> dict:
    return suggest_price(payload.category, payload.condition, payload.brand)


@app.post("/datasets/manual-csv")
async def import_manual_csv(file: UploadFile = File(...)) -> dict:
    if file.content_type and file.content_type not in {"text/csv", "application/vnd.ms-excel", "application/octet-stream"}:
        raise HTTPException(status_code=400, detail="Only CSV uploads are supported.")
    contents = (await file.read()).decode("utf-8-sig")
    accepted, rejected = parse_manual_csv(StringIO(contents))
    return {"accepted": accepted, "rejected": rejected, "accepted_count": len(accepted), "rejected_count": len(rejected)}


@app.post("/train/candidate")
def train(payload: TrainRequest) -> dict:
    return train_candidate(payload.records, payload.minimum_recall, payload.maximum_false_positive_rate)


@app.get("/evaluate")
def evaluate() -> dict:
    return evaluate_fixture()
