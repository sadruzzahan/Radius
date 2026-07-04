import request from "supertest";
import { beforeAll, describe, expect, it, vi } from "vitest";

async function makeApp() {
  vi.resetModules();
  process.env.USE_MEMORY_STORE = "true";
  process.env.DATABASE_URL = "";
  process.env.SUPABASE_URL = "";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "";
  const { createApp } = await import("../app.js");
  return createApp();
}

async function login(app, email = "seller1@local.test", password = "password123") {
  const response = await request(app).post("/api/auth/login").send({ email, password });
  expect(response.status).toBe(200);
  return response.body.token;
}

describe("premium marketplace flows", () => {
  let app;
  let sellerToken;
  let seller2Token;
  let buyerToken;
  let outsiderToken;
  let adminToken;

  beforeAll(async () => {
    app = await makeApp();
    sellerToken = await login(app);
    seller2Token = await login(app, "seller2@local.test", "password123");
    buyerToken = await login(app, "buyer@local.test", "password123");
    outsiderToken = await login(app, "seller3@local.test", "password123");
    adminToken = await login(app, "admin@local.test", "admin12345");
  });

  it("rejects arbitrary browser-supplied listing photo hashes", async () => {
    const response = await request(app)
      .post("/api/listings")
      .set("Authorization", `Bearer ${sellerToken}`)
      .send({
        title: "Uploaded camera kit",
        category: "camera",
        brand: "Canon",
        condition: "good",
        price: 22000,
        description: "Clean camera kit with lens and charger included.",
        location: { lat: 23.7505, lng: 90.384 },
        photos: [{ url: "/uploads/fake.jpg", hash: "ff00ff00ff00ff00" }]
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/server-issued/i);
  });

  it("requires auth and configured Supabase credentials for real listing photo uploads", async () => {
    const unauthenticated = await request(app)
      .post("/api/uploads/listing-photo")
      .attach("photo", Buffer.from("not really an image"), { filename: "note.txt", contentType: "text/plain" });
    expect(unauthenticated.status).toBe(401);

    const configured = await request(app)
      .post("/api/uploads/listing-photo")
      .set("Authorization", `Bearer ${sellerToken}`)
      .attach("photo", Buffer.from([0xff, 0xd8, 0xff, 0xd9]), { filename: "tiny.jpg", contentType: "image/jpeg" });

    expect(configured.status).toBe(503);
    expect(configured.body.error).toMatch(/storage/i);
  });

  it("lets listing owners update status through the status endpoint", async () => {
    const listings = await request(app).get("/api/listings?radiusKm=999").set("Authorization", `Bearer ${sellerToken}`);
    const ownListing = listings.body.items.find((item) => item.seller.email === "seller1@local.test");

    const response = await request(app)
      .patch(`/api/listings/${ownListing.id}/status`)
      .set("Authorization", `Bearer ${sellerToken}`)
      .send({ status: "reserved" });

    expect(response.status).toBe(200);
    expect(response.body.item.status).toBe("reserved");
  });

  it("lets admins inspect and resolve reports", async () => {
    const listings = await request(app).get("/api/listings?radiusKm=999").set("Authorization", `Bearer ${sellerToken}`);

    const report = await request(app)
      .post("/api/reports")
      .set("Authorization", `Bearer ${sellerToken}`)
      .send({ listingId: listings.body.items[0].id, reason: "fraud", details: "Duplicate photos and pressure language." });
    expect(report.status).toBe(201);

    const reports = await request(app).get("/api/admin/reports").set("Authorization", `Bearer ${adminToken}`);
    expect(reports.status).toBe(200);
    expect(reports.body.items[0]).toMatchObject({ status: "open", reason: "fraud" });

    const resolved = await request(app)
      .patch(`/api/admin/reports/${reports.body.items[0].id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "resolved" });

    expect(resolved.status).toBe(200);
    expect(resolved.body.item.status).toBe("resolved");

    const { store } = await import("../repositories/store.js");
    const events = await store.listMlEvents();
    expect(events.some((event) => event.eventType === "user_report_created" && event.listingId === report.body.item.listingId)).toBe(true);
    const labels = await store.listMlLabels();
    expect(labels.some((label) => label.sourceType === "report" && label.label === "fraud" && label.listingId === report.body.item.listingId)).toBe(true);
  });

  it("records admin fraud queue decisions as strong ML labels", async () => {
    const flagged = await request(app).get("/api/admin/fraud-queue").set("Authorization", `Bearer ${adminToken}`);
    const listing = flagged.body.items[0];
    expect(listing).toBeTruthy();

    const response = await request(app)
      .post(`/api/admin/fraud-queue/${listing.id}/decision`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ decision: "remove" });

    expect(response.status).toBe(200);
    const { store } = await import("../repositories/store.js");
    const labels = await store.listMlLabels();
    expect(labels).toContainEqual(expect.objectContaining({
      sourceType: "admin",
      label: "fraud",
      listingId: listing.id,
      actorId: expect.any(String)
    }));
  });

  it("lets a buyer message the iPhone seller without supplying a recipient id", async () => {
    const listings = await request(app).get("/api/listings?radiusKm=999").set("Authorization", `Bearer ${buyerToken}`);
    const iphone = listings.body.items.find((item) => item.title === "iPhone 13 128GB");

    const response = await request(app)
      .post(`/api/chat/${iphone.id}`)
      .set("Authorization", `Bearer ${buyerToken}`)
      .send({ body: "I can pick up the iPhone today." });

    expect(response.status).toBe(201);
    expect(response.body.item).toMatchObject({
      listingId: iphone.id,
      senderId: expect.any(String),
      recipientId: iphone.sellerId,
      body: "I can pick up the iPhone today."
    });
  });

  it("returns a proper inbox of conversations for the current user", async () => {
    const response = await request(app).get("/api/chat").set("Authorization", `Bearer ${buyerToken}`);

    expect(response.status).toBe(200);
    expect(response.body.items.length).toBeGreaterThan(0);
    expect(response.body.items[0]).toMatchObject({
      id: expect.any(String),
      listing: expect.objectContaining({ title: expect.any(String), price: expect.any(Number) }),
      lastMessage: expect.objectContaining({ body: expect.any(String) })
    });
  });

  it("keeps listing chat scoped to the buyer-seller conversation", async () => {
    const listings = await request(app).get("/api/listings?radiusKm=999").set("Authorization", `Bearer ${buyerToken}`);
    const samsung = listings.body.items.find((item) => item.title === "Samsung Galaxy S22");

    const sent = await request(app)
      .post(`/api/chat/${samsung.id}`)
      .set("Authorization", `Bearer ${buyerToken}`)
      .send({ body: "Is the Samsung available today?" });
    expect(sent.status).toBe(201);

    const outsiderChat = await request(app).get(`/api/chat/${samsung.id}?conversationId=${sent.body.conversation.id}`).set("Authorization", `Bearer ${outsiderToken}`);
    expect(outsiderChat.status).toBe(200);
    expect(outsiderChat.body.items).toHaveLength(0);
  });

  it("uses requested, accepted, and completed trade states before reviews", async () => {
    const listings = await request(app).get("/api/listings?radiusKm=999").set("Authorization", `Bearer ${buyerToken}`);
    const samsung = listings.body.items.find((item) => item.title === "Samsung Galaxy S22");

    const requestTrade = await request(app)
      .post(`/api/chat/${samsung.id}/buy`)
      .set("Authorization", `Bearer ${buyerToken}`)
      .send({ note: "Requested after chat." });

    expect(requestTrade.status).toBe(201);
    expect(requestTrade.body.trade).toMatchObject({
      listingId: samsung.id,
      buyerId: expect.any(String),
      sellerId: samsung.sellerId,
      status: "requested",
      price: samsung.price
    });
    expect(requestTrade.body.item.status).toBe("available");

    const earlyReview = await request(app)
      .post("/api/reviews")
      .set("Authorization", `Bearer ${buyerToken}`)
      .send({ tradeId: requestTrade.body.trade.id, rating: 5, comment: "Too early." });
    expect(earlyReview.status).toBe(409);

    const accepted = await request(app)
      .post(`/api/chat/${samsung.id}/trades/${requestTrade.body.trade.id}/accept`)
      .set("Authorization", `Bearer ${seller2Token}`);
    expect(accepted.status).toBe(200);
    expect(accepted.body.trade.status).toBe("accepted");
    expect(accepted.body.item.status).toBe("reserved");

    const completed = await request(app)
      .post(`/api/chat/${samsung.id}/trades/${requestTrade.body.trade.id}/complete`)
      .set("Authorization", `Bearer ${buyerToken}`);
    expect(completed.status).toBe(200);
    expect(completed.body.trade.status).toBe("completed");
    expect(completed.body.item.status).toBe("sold");

    const review = await request(app)
      .post("/api/reviews")
      .set("Authorization", `Bearer ${buyerToken}`)
      .send({ tradeId: requestTrade.body.trade.id, rating: 5, comment: "Smooth local pickup." });
    expect(review.status).toBe(201);
    expect(review.body.item).toMatchObject({
      tradeId: requestTrade.body.trade.id,
      listingId: samsung.id,
      rating: 5
    });
  });
});
