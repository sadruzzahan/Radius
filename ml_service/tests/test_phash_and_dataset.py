from io import BytesIO
from pathlib import Path

from fastapi.testclient import TestClient
from PIL import Image

from app.main import app


def image_bytes(color: tuple[int, int, int]) -> bytes:
    buffer = BytesIO()
    Image.new("RGB", (64, 64), color=color).save(buffer, format="PNG")
    return buffer.getvalue()


def test_phash_endpoint_returns_stable_16_char_hex_hash():
    client = TestClient(app)
    image = image_bytes((12, 120, 82))

    first = client.post("/image/phash", files={"image": ("fixture.png", image, "image/png")})
    second = client.post("/image/phash", files={"image": ("fixture.png", image, "image/png")})

    assert first.status_code == 200
    assert first.json()["hash"] == second.json()["hash"]
    assert len(first.json()["hash"]) == 16
    int(first.json()["hash"], 16)


def test_expanded_market_dataset_has_at_least_500_rows():
    dataset = Path(__file__).resolve().parents[1] / "data" / "market_prices_expanded.csv"
    assert dataset.exists()
    assert sum(1 for _ in dataset.open()) >= 501
