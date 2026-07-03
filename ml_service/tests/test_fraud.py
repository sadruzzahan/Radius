from app.services.fraud import score_listing


def test_score_listing_combines_duplicate_price_and_behavior_signals():
    result = score_listing(
        listing={
            "category": "phone",
            "condition": "excellent",
            "price": 12000,
            "description": "iPhone 13 urgent sale inbox fast",
            "photo_hashes": ["ff00ff00ff00ff00"],
            "seller": {"account_age_days": 1, "review_count": 0},
        },
        existing_hashes=["ff00ff00ff00ff01"],
        existing_descriptions=["iPhone 13 urgent sale inbox fast"],
    )

    assert result["score"] >= 70
    assert "duplicate_image" in result["signals"]
    assert "new_seller_high_value" in result["signals"]
    assert result["decision"] == "review"
