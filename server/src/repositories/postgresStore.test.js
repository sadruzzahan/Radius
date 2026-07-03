import { describe, expect, it } from "vitest";
import { PostgresStore } from "./postgresStore.js";

function makePool(results = []) {
  const calls = [];
  const queue = [...results];
  return {
    calls,
    async query(text, values = []) {
      calls.push({ text, values });
      return queue.shift() ?? { rows: [] };
    },
    async connect() {
      const client = {
        calls,
        async query(text, values = []) {
          calls.push({ text, values });
          return queue.shift() ?? { rows: [] };
        },
        release() {
          calls.push({ text: "release", values: [] });
        }
      };
      return client;
    }
  };
}

describe("PostgresStore", () => {
  it("uses nearby_listings RPC for geofenced browsing", async () => {
    const pool = makePool([{ rows: [{
      id: "listing-1",
      seller_id: "seller-1",
      title: "Phone",
      category: "phone",
      brand: "Apple",
      condition: "good",
      price: "42000",
      description: "Clean phone",
      lat: "23.750000",
      lng: "90.380000",
      distance_km: 1.2,
      status: "available",
      fraud_score: 0,
      fraud_decision: "allow",
      fraud_signals: [],
      fraud_explanations: [],
      seller_name: "Seller",
      seller_rating_average: "4.50",
      seller_review_count: 3,
      photo_urls: ["/phone.jpg"],
      photo_hashes: ["abcd"]
    }] }]);
    const store = new PostgresStore(pool);

    const items = await store.listListings({ origin: { lat: 23.7465, lng: 90.376 }, radiusKm: 6, category: "phone" });

    expect(pool.calls[0].text).toContain("nearby_listings");
    expect(pool.calls[0].values).toEqual([23.7465, 90.376, 6, "phone", null, null, null, null, null]);
    expect(items[0]).toMatchObject({ id: "listing-1", sellerId: "seller-1", price: 42000, photos: [{ url: "/phone.jpg", hash: "abcd" }] });
  });

  it("creates listings and photos inside one transaction", async () => {
    const pool = makePool([
      { rows: [] },
      { rows: [{ id: "listing-1", seller_id: "seller-1", title: "Phone", category: "phone", brand: "Apple", condition: "good", price: "42000", description: "Clean phone", lat: "23.750000", lng: "90.380000", status: "available", fraud_score: 12, fraud_decision: "allow", fraud_signals: [], fraud_explanations: [] }] },
      { rows: [] },
      { rows: [] }
    ]);
    const store = new PostgresStore(pool);

    await store.createListing({
      sellerId: "seller-1",
      title: "Phone",
      category: "phone",
      brand: "Apple",
      condition: "good",
      price: 42000,
      description: "Clean phone",
      location: { lat: 23.75, lng: 90.38 },
      photos: [{ url: "/phone.jpg", hash: "abcd" }],
      fraud: { score: 12, decision: "allow", signals: [], explanations: [] }
    });

    expect(pool.calls.map((call) => call.text)).toEqual(expect.arrayContaining(["BEGIN", "COMMIT", "release"]));
    expect(pool.calls.some((call) => call.text.includes("insert into public.listings"))).toBe(true);
    expect(pool.calls.some((call) => call.text.includes("insert into public.listing_photos"))).toBe(true);
  });
});
