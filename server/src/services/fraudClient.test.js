import { afterEach, describe, expect, it, vi } from "vitest";
import { scoreListingWithMl } from "./fraudClient.js";

describe("scoreListingWithMl fallback", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses deterministic trust signals when the ML service is unavailable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("down")));

    const result = await scoreListingWithMl(
      {
        title: "iPhone 13 urgent sale",
        category: "Phone",
        condition: "excellent",
        price: 900,
        brand: "Apple",
        description: "Urgent sale. WhatsApp 01712345678 and pay token money first.",
        photos: [{ hash: "ff00ff00ff00ff00" }]
      },
      {
        seller: {
          account_age_days: 1,
          review_count: 0,
          rating_average: 0,
          active_listing_count: 4,
          prior_flagged_listings: 1
        },
        existingHashes: ["ff00ff00ff00ff01"],
        existingDescriptions: ["iPhone 13 urgent sale Urgent sale. WhatsApp 01712345678 and pay token money first."]
      }
    );

    expect(result.model_version).toBe("node-fallback-v2");
    expect(result.decision).toBe("review");
    expect(result.score).toBeGreaterThanOrEqual(70);
    expect(result.signals).toEqual(expect.arrayContaining([
      "ml_service_unavailable",
      "duplicate_image",
      "price_anomaly",
      "new_seller_many_listings",
      "off_platform_contact"
    ]));
    expect(result.component_scores.duplicate_image).toBe(35);
    expect(result.feature_snapshot_hash).toHaveLength(64);
  });
});
