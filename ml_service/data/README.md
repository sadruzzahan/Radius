# ML Data Files

This folder contains local datasets used by the Radius ML service.

## Files

- `market_prices.csv` - small baseline price dataset.
- `market_prices_expanded.csv` - generated marketplace price dataset used by the price model when present.
- `fraud_listings_synthetic.csv` - generated labeled fraud dataset for experimentation and reports.

## Regenerate Large Datasets

From the project root:

```bash
npm run dataset:large
```

This generates:

- 15,000 price rows in `market_prices_expanded.csv`.
- 20,000 labeled fraud rows in `fraud_listings_synthetic.csv`.

The generated fraud labels are synthetic and intended for academic experimentation, feature testing, and demo model training. For production, replace or augment them with ethically collected and manually verified data.

