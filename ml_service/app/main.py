from io import BytesIO

import imagehash
from fastapi import FastAPI, File, HTTPException, UploadFile
from PIL import Image
from pydantic import BaseModel, Field

from app.services.fraud import evaluate_fixture, score_listing
from app.services.pricing import suggest_price


class ScoreRequest(BaseModel):
    listing: dict
    existing_hashes: list[str] = Field(default_factory=list)
    existing_descriptions: list[str] = Field(default_factory=list)


class PriceRequest(BaseModel):
    category: str
    condition: str
    brand: str = ""


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


@app.get("/evaluate")
def evaluate() -> dict:
    return evaluate_fixture()
