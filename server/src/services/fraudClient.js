import crypto from "node:crypto";
import { config } from "../config.js";

const HIGH_VALUE_CATEGORIES = new Set(["phone", "laptop", "camera", "gaming", "appliance"]);
const PRESSURE_TERMS = ["urgent", "inbox fast", "advance", "bkash only", "cash first", "deposit", "token money", "no inspection", "final price today"];
const OFF_PLATFORM_TERMS = ["whatsapp", "imo", "telegram", "direct call", "outside app"];
const PROHIBITED_TERMS = ["passport", "nid card", "national id", "driving license", "weapon", "gun", "exam paper", "sim card", "bank account"];
const BRAND_KEYWORDS = {
  apple: ["iphone", "ipad", "macbook", "airpods"],
  samsung: ["galaxy", "samsung"],
  dell: ["dell", "xps", "inspiron", "latitude"],
  canon: ["canon", "eos"]
};

function normalizeText(...parts) {
  return parts.filter(part => part != null).map(part => String(part).toLowerCase().trim()).join(" ");
}

function hasBangladeshPhone(text) {
  return /(?:\+?88)?01[3-9]\d{8}/.test(text);
}

function hammingDistance(hexA, hexB) {
  if (!/^[0-9a-f]+$/i.test(hexA ?? "") || !/^[0-9a-f]+$/i.test(hexB ?? "")) return 999;
  const a = BigInt(`0x${hexA}`);
  const b = BigInt(`0x${hexB}`);
  let diff = a ^ b;
  let count = 0;
  while (diff > 0n) {
    count += Number(diff & 1n);
    diff >>= 1n;
  }
  return count;
}

function tokenSimilarity(a, b) {
  const left = new Set(normalizeText(a).split(/\W+/).filter(Boolean));
  const right = new Set(normalizeText(b).split(/\W+/).filter(Boolean));
  if (!left.size || !right.size) return 0;
  const intersection = [...left].filter(token => right.has(token)).length;
  const union = new Set([...left, ...right]).size;
  return intersection / union;
}

function brandTitleMismatch(text, brand) {
  const brandKey = normalizeText(brand);
  if (!brandKey) return false;
  const mentioned = Object.entries(BRAND_KEYWORDS)
    .filter(([, keywords]) => keywords.some(keyword => text.includes(keyword)))
    .map(([candidate]) => candidate);
  return mentioned.length > 0 && !mentioned.includes(brandKey);
}

function addSignal(state, name, points, explanation) {
  if (state.signals.includes(name)) return;
  state.score += points;
  state.signals.push(name);
  state.explanations.push(explanation);
  state.componentScores[name] = points;
}

function priceAnomalyFallback(listing) {
  const category = normalizeText(listing.category);
  const price = Number(listing.price) || 0;
  const roughFloor = {
    phone: 18000,
    laptop: 22000,
    camera: 16000,
    gaming: 12000,
    appliance: 9000
  }[category];
  if (!roughFloor || price >= roughFloor * 0.55) return null;
  return {
    points: price < roughFloor * 0.35 ? 28 : 18,
    explanation: `Fallback price check found ${category} price far below the local showcase baseline.`
  };
}

function buildFallbackScoring(listing, context = {}) {
  const seller = context.seller ?? {};
  const price = Number(listing.price) || 0;
  const category = normalizeText(listing.category);
  const text = normalizeText(listing.title, listing.description);
  const photos = listing.photos?.map(photo => photo.hash).filter(Boolean) ?? [];
  const state = { score: 0, signals: ["ml_service_unavailable"], explanations: ["FastAPI service was unavailable; used deterministic trust fallback."], componentScores: {} };

  let closest = 999;
  for (const hash of photos) {
    for (const existing of context.existingHashes ?? []) closest = Math.min(closest, hammingDistance(hash, existing));
  }
  if (closest <= 4) addSignal(state, "duplicate_image", 35, `Image hash is near-duplicate of an existing listing, Hamming distance ${closest}.`);
  else if (closest <= 8) addSignal(state, "similar_image", 18, `Image hash is visually similar to an existing listing, Hamming distance ${closest}.`);

  const anomaly = priceAnomalyFallback({ ...listing, category });
  if (anomaly) addSignal(state, "price_anomaly", anomaly.points, anomaly.explanation);

  const accountAge = Number(seller.account_age_days ?? 0);
  const reviewCount = Number(seller.review_count ?? 0);
  const rating = Number(seller.rating_average ?? seller.ratingAverage ?? 0);
  const priorFlags = Number(seller.prior_flagged_listings ?? 0);
  const activeListings = Number(seller.active_listing_count ?? 0);
  if (accountAge <= 3 && reviewCount === 0 && (price >= 20000 || (HIGH_VALUE_CATEGORIES.has(category) && price >= 10000))) {
    addSignal(state, "new_seller_high_value", 24, "Brand-new seller with no reviews is posting a high-value item.");
  }
  if (accountAge <= 7 && reviewCount === 0 && activeListings >= 4) {
    addSignal(state, "new_seller_many_listings", 14, "New seller has posted several active listings before building trust.");
  }
  if (priorFlags > 0) addSignal(state, "seller_prior_flags", Math.min(28, 14 + priorFlags * 4), "Seller has prior listings that required fraud review.");
  if (PRESSURE_TERMS.some(term => text.includes(term))) addSignal(state, "urgent_language", 12, "Listing uses urgency, deposit, or payment-pressure wording.");
  if (OFF_PLATFORM_TERMS.some(term => text.includes(term)) || hasBangladeshPhone(text)) addSignal(state, "off_platform_contact", 16, "Listing tries to move negotiation or payment outside Radius.");
  if (PROHIBITED_TERMS.some(term => text.includes(term))) addSignal(state, "prohibited_item_language", 46, "Listing text matches prohibited or regulated item language.");
  if (brandTitleMismatch(text, listing.brand)) addSignal(state, "brand_title_mismatch", 18, "Brand field conflicts with recognizable product terms in the title or description.");
  if ((context.existingDescriptions ?? []).some(existing => tokenSimilarity(text, existing) >= 0.9)) {
    addSignal(state, "reused_description", 18, "Title and description are near-identical to an existing listing.");
  }
  if (reviewCount >= 3 && rating >= 4.3 && accountAge >= 30) {
    state.score -= 10;
    state.componentScores.trusted_seller_history = -10;
  }

  const finalScore = Math.max(0, Math.min(100, Math.round(state.score)));
  const thresholdBand = finalScore >= 70 ? "high_priority_review" : finalScore >= 40 ? "review" : "allow";
  const featureSnapshot = {
    category,
    condition: listing.condition ?? "",
    price,
    brand: listing.brand ?? "",
    title_length: String(listing.title ?? "").length,
    description_length: String(listing.description ?? "").length,
    photo_hash_count: photos.length,
    seller,
    existing_hash_count: (context.existingHashes ?? []).length,
    existing_description_count: (context.existingDescriptions ?? []).length,
    signals: state.signals,
    component_scores: state.componentScores
  };
  return {
    score: finalScore,
    decision: finalScore >= 60 ? "review" : "allow",
    threshold_band: thresholdBand,
    risk_level: thresholdBand,
    signals: state.signals,
    explanations: state.explanations,
    component_scores: state.componentScores,
    feature_snapshot: featureSnapshot,
    model_version: "node-fallback-v2",
    feature_snapshot_hash: crypto.createHash("sha256").update(JSON.stringify(featureSnapshot)).digest("hex")
  };
}

function normalizeMlResponse(response, listing, context) {
  if (!response || typeof response !== "object") return buildFallbackScoring(listing, context);
  const score = Math.max(0, Math.min(100, Math.round(Number(response.score) || 0)));
  const thresholdBand = response.threshold_band ?? response.thresholdBand ?? (score >= 70 ? "high_priority_review" : score >= 40 ? "review" : "allow");
  return {
    ...response,
    score,
    decision: response.decision === "review" || score >= 60 ? "review" : "allow",
    threshold_band: thresholdBand,
    risk_level: response.risk_level ?? thresholdBand,
    signals: Array.isArray(response.signals) ? response.signals : [],
    explanations: Array.isArray(response.explanations) ? response.explanations : [],
    component_scores: response.component_scores ?? response.componentScores ?? {},
    model_version: response.model_version ?? response.modelVersion ?? "unknown"
  };
}

export async function scoreListingWithMl(listing, context) {
  try {
    const response = await fetch(`${config.mlServiceUrl}/score`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        listing: {
          title: listing.title,
          category: listing.category,
          condition: listing.condition,
          price: Number(listing.price),
          brand: listing.brand,
          description: listing.description,
          photo_hashes: listing.photos?.map((photo) => photo.hash).filter(Boolean) ?? [],
          seller: context.seller
        },
        existing_hashes: context.existingHashes ?? [],
        existing_descriptions: context.existingDescriptions ?? []
      })
    });
    if (!response.ok) throw new Error(`ML service ${response.status}`);
    return normalizeMlResponse(await response.json(), listing, context);
  } catch {
    return buildFallbackScoring(listing, context);
  }
}

export async function suggestPrice(input) {
  const response = await fetch(`${config.mlServiceUrl}/suggest-price`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
  if (!response.ok) throw new Error("Price suggestion failed");
  return response.json();
}
