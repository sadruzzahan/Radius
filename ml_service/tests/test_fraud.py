from app.services.fraud import score_listing


def test_score_listing_combines_duplicate_price_and_behavior_signals():
    result = score_listing(
        listing={
            "title": "iPhone 13 urgent sale",
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
    assert result["model_version"] == "rules-risk-v2"
    assert result["threshold_band"] == "high_priority_review"
    assert len(result["feature_snapshot_hash"]) == 64


def test_score_listing_flags_prohibited_and_off_platform_contact():
    result = score_listing(
        listing={
            "title": "Fresh NID card available",
            "category": "books",
            "condition": "new",
            "price": 2500,
            "brand": "",
            "description": "WhatsApp 01712345678 for direct deal outside app.",
            "photo_hashes": ["abcdefabcdefabcd"],
            "seller": {"account_age_days": 14, "review_count": 1},
        },
        existing_hashes=[],
        existing_descriptions=[],
    )

    assert result["decision"] == "review"
    assert "prohibited_item_language" in result["signals"]
    assert "off_platform_contact" in result["signals"]
    assert result["component_scores"]["prohibited_item_language"] == 46


def test_score_listing_detects_brand_title_mismatch():
    result = score_listing(
        listing={
            "title": "Samsung Galaxy S22",
            "category": "Phone",
            "condition": "excellent",
            "price": 38000,
            "brand": "Apple",
            "description": "Galaxy phone with original charger.",
            "photo_hashes": ["1234567812345678"],
            "seller": {"account_age_days": 20, "review_count": 0},
        },
        existing_hashes=[],
        existing_descriptions=[],
    )

    assert "brand_title_mismatch" in result["signals"]
    assert result["component_scores"]["brand_title_mismatch"] == 18


def test_score_listing_rewards_trusted_seller_history_without_hiding_features():
    result = score_listing(
        listing={
            "title": "Samsung Galaxy S22 with box",
            "category": "Phone",
            "condition": "good",
            "price": 39000,
            "brand": "Samsung",
            "description": "Used Samsung phone with box, receipt, and charger.",
            "photo_hashes": ["1111222233334444"],
            "seller": {"account_age_days": 120, "review_count": 8, "rating_average": 4.7},
        },
        existing_hashes=[],
        existing_descriptions=[],
    )

    assert result["decision"] == "allow"
    assert "trusted_seller_history" not in result["signals"]
    assert result["component_scores"]["trusted_seller_history"] == -10
