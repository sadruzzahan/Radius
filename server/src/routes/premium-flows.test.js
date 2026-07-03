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
  let adminToken;

  beforeAll(async () => {
    app = await makeApp();
    sellerToken = await login(app);
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
  });
});
