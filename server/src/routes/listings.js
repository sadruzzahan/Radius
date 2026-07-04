import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { store } from "../repositories/store.js";
import { scoreListingWithMl, suggestPrice } from "../services/fraudClient.js";

const router = Router();

const listingSchema = z.object({
  title: z.string().min(3).max(120),
  category: z.string().min(2).max(60),
  brand: z.string().max(80).optional().default(""),
  condition: z.enum(["new", "excellent", "good", "fair", "poor"]),
  price: z.coerce.number().nonnegative(),
  description: z.string().min(10).max(2000),
  location: z.object({ lat: z.coerce.number(), lng: z.coerce.number() }),
  photos: z.array(z.object({
    url: z.string().url(),
    path: z.string().min(8),
    hash: z.string().regex(/^[0-9a-f]{16}$/i),
    storage: z.literal("supabase")
  })).min(1, "At least one server-issued photo upload is required.")
});

const statusSchema = z.object({ status: z.enum(["available", "reserved", "sold"]) });
const listingPatchSchema = listingSchema
  .omit({ photos: true })
  .partial()
  .refine((patch) => Object.keys(patch).length > 0, "At least one listing field is required.");

function canMutateListing(listing, user) {
  return listing.sellerId === user.id || user.role === "admin";
}

function userField(user, camelKey, snakeKey, fallback = undefined) {
  return user?.[camelKey] ?? user?.[snakeKey] ?? fallback;
}

function accountAgeDays(user) {
  const createdAt = userField(user, "createdAt", "created_at");
  const createdTime = createdAt ? new Date(createdAt).getTime() : Date.now();
  return Math.max(0, Math.floor((Date.now() - createdTime) / 86400000));
}

async function buildSellerRiskContext(seller, sellerId) {
  const origin = {
    lat: Number(userField(seller, "location", "location")?.lat ?? seller?.lat ?? 23.7465),
    lng: Number(userField(seller, "location", "location")?.lng ?? seller?.lng ?? 90.376)
  };
  let sellerListings = [];
  try {
    sellerListings = (await store.listListings({ origin, radiusKm: 200 })).filter((item) => item.sellerId === sellerId);
  } catch {
    sellerListings = [];
  }
  return {
    account_age_days: accountAgeDays(seller),
    review_count: Number(userField(seller, "reviewCount", "review_count", 0) ?? 0),
    rating_average: Number(userField(seller, "ratingAverage", "rating_average", 0) ?? 0),
    active_listing_count: sellerListings.filter((item) => ["available", "reserved"].includes(item.status)).length,
    prior_flagged_listings: sellerListings.filter((item) => item.fraud?.decision === "review" || Number(item.fraud?.score ?? 0) >= 60).length
  };
}

router.get("/", async (req, res) => {
  const origin = {
    lat: Number(req.query.lat ?? req.user?.location?.lat ?? 23.7465),
    lng: Number(req.query.lng ?? req.user?.location?.lng ?? 90.376)
  };
  res.json({
    items: await store.listListings({
      origin,
      radiusKm: req.query.radiusKm ?? 6,
      category: req.query.category,
      condition: req.query.condition,
      minPrice: req.query.minPrice,
      maxPrice: req.query.maxPrice,
      q: req.query.q,
      status: req.query.status
    })
  });
});

router.post("/", requireAuth, async (req, res) => {
  const parsed = listingSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid listing: photos must be server-issued upload metadata.", details: parsed.error.issues });
  const seller = await store.findUserById(req.user.id);
  const [existingHashes, existingDescriptions, sellerContext] = await Promise.all([
    store.listExistingPhotoHashes(),
    store.listExistingDescriptions(),
    buildSellerRiskContext(seller, req.user.id)
  ]);
  const scoring = await scoreListingWithMl(parsed.data, {
    seller: sellerContext,
    existingHashes,
    existingDescriptions
  });
  const listing = await store.createListing({ ...parsed.data, sellerId: req.user.id, fraud: scoring });
  await store.createMlEvent?.({
    eventType: "listing_submitted",
    listingId: listing.id,
    actorId: req.user.id,
    payload: { category: listing.category, condition: listing.condition, price: listing.price }
  });
  await store.createMlPrediction?.({
    listingId: listing.id,
    modelName: "trust_fraud_classifier",
    modelVersion: scoring.model_version ?? scoring.modelVersion ?? "unknown",
    score: scoring.score ?? 0,
    decision: scoring.decision ?? "allow",
    thresholdBand: scoring.threshold_band ?? scoring.thresholdBand ?? "allow",
    signals: scoring.signals ?? [],
    explanations: scoring.explanations ?? [],
    featureSnapshotHash: scoring.feature_snapshot_hash ?? scoring.featureSnapshotHash ?? null,
    rawResponse: scoring
  });
  res.status(201).json({ item: listing });
});

router.patch("/:id", requireAuth, async (req, res) => {
  const parsed = listingPatchSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid listing update", details: parsed.error.issues });
  const listing = await store.getListingById(req.params.id);
  if (!listing) return res.status(404).json({ error: "Listing not found" });
  if (!canMutateListing(listing, req.user)) return res.status(403).json({ error: "Forbidden" });
  res.json({ item: await store.updateListing(req.params.id, parsed.data) });
});

router.patch("/:id/status", requireAuth, async (req, res) => {
  const parsed = statusSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid status" });
  const listing = await store.getListingById(req.params.id);
  if (!listing) return res.status(404).json({ error: "Listing not found" });
  if (!canMutateListing(listing, req.user)) return res.status(403).json({ error: "Forbidden" });
  res.json({ item: await store.updateListing(req.params.id, { status: parsed.data.status }) });
});

router.delete("/:id", requireAuth, async (req, res) => {
  const listing = await store.getListingById(req.params.id);
  if (!listing) return res.status(404).json({ error: "Listing not found" });
  if (!canMutateListing(listing, req.user)) return res.status(403).json({ error: "Forbidden" });
  await store.deleteListing(req.params.id);
  res.status(204).end();
});

router.post("/suggest-price", requireAuth, async (req, res) => {
  try {
    res.json(await suggestPrice(req.body));
  } catch {
    res.status(503).json({ error: "Price service unavailable" });
  }
});

export default router;
