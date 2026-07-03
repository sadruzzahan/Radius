"""
Research data collector template.

Run only against pages whose robots.txt and terms allow collection. The project
ships with `data/market_prices.csv` so the ML service works offline; this script
documents and automates the planned collection path for public listing pages.
"""
from __future__ import annotations

import csv
import sys
import time
from pathlib import Path

import requests
from bs4 import BeautifulSoup

HEADERS = {"User-Agent": "hyperlocal-marketplace-research/0.1"}


def scrape_listing_cards(url: str) -> list[dict]:
    response = requests.get(url, headers=HEADERS, timeout=20)
    response.raise_for_status()
    soup = BeautifulSoup(response.text, "lxml")
    rows: list[dict] = []
    for card in soup.select("[class*=listing], [class*=card]"):
        text = card.get_text(" ", strip=True)
        if not text:
            continue
        rows.append({"raw_text": text, "source_url": url})
    return rows


def main() -> None:
    if len(sys.argv) < 3:
        print("Usage: python scripts/collect_bikroy_sample.py <url> <output.csv>")
        raise SystemExit(2)
    rows = scrape_listing_cards(sys.argv[1])
    time.sleep(1)
    output = Path(sys.argv[2])
    output.parent.mkdir(parents=True, exist_ok=True)
    with output.open("w", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=["raw_text", "source_url"])
        writer.writeheader()
        writer.writerows(rows)
    print(f"wrote {len(rows)} rows to {output}")


if __name__ == "__main__":
    main()
