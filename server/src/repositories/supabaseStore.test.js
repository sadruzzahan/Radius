import { describe, expect, it } from "vitest";
import { SupabaseStore } from "./supabaseStore.js";

function makeQuery(result) {
  return {
    select() { return this; },
    insert(payload) { this.payload = payload; return this; },
    update(payload) { this.payload = payload; return this; },
    eq(column, value) { this.filters.push([column, value]); return this; },
    single: async () => result,
    maybeSingle: async () => result,
    order() { return this; },
    limit() { return this; },
    filters: [],
    payload: null
  };
}

describe("SupabaseStore", () => {
  it("uses the nearby_listings PostGIS RPC for geofenced browsing", async () => {
    const calls = [];
    const client = {
      rpc: async (name, args) => {
        calls.push([name, args]);
        return {
          data: [{
            id: "listing-1",
            seller_id: "seller-1",
            title: "Phone",
            category: "phone",
            brand: "Apple",
            condition: "good",
            price: 42000,
            description: "Clean phone",
            lat: 23.75,
            lng: 90.38,
            distance_km: 1.2,
            status: "available",
            fraud_score: 0,
            fraud_decision: "allow",
            fraud_signals: [],
            fraud_explanations: [],
            seller_name: "Seller",
            seller_rating_average: 4.5,
            seller_review_count: 3,
            photo_urls: ["/phone.jpg"],
            photo_hashes: ["abcd"]
          }],
          error: null
        };
      }
    };

    const store = new SupabaseStore(client);
    const items = await store.listListings({ origin: { lat: 23.7465, lng: 90.376 }, radiusKm: 6, category: "phone" });

    expect(calls[0]).toEqual(["nearby_listings", expect.objectContaining({ p_lat: 23.7465, p_lng: 90.376, p_radius_km: 6, p_category: "phone" })]);
    expect(items[0]).toMatchObject({ id: "listing-1", sellerId: "seller-1", distanceKm: 1.2, photos: [{ url: "/phone.jpg", hash: "abcd" }] });
  });

  it("creates listing rows with Postgres column names and nested photo rows", async () => {
    const inserted = {};
    const client = {
      from(table) {
        const query = makeQuery({
          data: table === "listings"
            ? { id: "listing-1", seller_id: "seller-1", title: "Phone", category: "phone", brand: "Apple", condition: "good", price: 42000, description: "Clean phone", lat: 23.75, lng: 90.38, status: "available", fraud_score: 12, fraud_decision: "allow", fraud_signals: [], fraud_explanations: [] }
            : null,
          error: null
        });
        const originalInsert = query.insert.bind(query);
        query.insert = (payload) => {
          inserted[table] = payload;
          return originalInsert(payload);
        };
        return query;
      }
    };
    const store = new SupabaseStore(client);

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

    expect(inserted.listings[0]).toMatchObject({ seller_id: "seller-1", lat: 23.75, lng: 90.38, fraud_score: 12 });
    expect(inserted.listing_photos[0]).toMatchObject({ listing_id: "listing-1", url: "/phone.jpg", hash: "abcd" });
  });
});
