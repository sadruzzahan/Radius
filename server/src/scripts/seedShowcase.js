import { createHash } from "node:crypto";
import { store } from "../repositories/store.js";
import { CATEGORY_VISUALS } from "../../../client/src/visualManifest.js";

const TARGET_EMAIL = "istykhan.ik@gmail.com";
const DEMO_PASSWORD = "password123";
const origin = { lat: 23.7465, lng: 90.376 };

const areas = [
  ["Dhanmondi", 23.7465, 90.3760],
  ["Kalabagan", 23.7505, 90.3840],
  ["Lalmatia", 23.7551, 90.3688],
  ["Mohammadpur", 23.7639, 90.3588],
  ["Farmgate", 23.7588, 90.3897],
  ["Banani", 23.7937, 90.4066],
  ["Gulshan", 23.7925, 90.4078],
  ["Mirpur", 23.8103, 90.3654],
  ["Uttara", 23.8759, 90.3795],
  ["Bashundhara", 23.8195, 90.4527],
  ["Wari", 23.7117, 90.4135],
  ["Badda", 23.7806, 90.4265]
];

const cleanTemplates = [
  ["Apple iPhone 14 Pro 256GB", "phone", "Apple", "excellent", 93000, "Battery health 91 percent, Face ID working, original box and charger cable included."],
  ["Samsung Galaxy S23 Ultra", "phone", "Samsung", "good", 76000, "Carefully used phone with S Pen, box, and purchase memo. Inspection welcome."],
  ["Dell XPS 13 9310", "laptop", "Dell", "excellent", 82000, "Core i7, 16GB RAM, 512GB SSD. Office used, no repair history."],
  ["MacBook Air M1", "laptop", "Apple", "good", 69000, "8GB RAM, 256GB SSD, cycle count under 250. Selling after upgrade."],
  ["Canon EOS 80D Body", "camera", "Canon", "good", 54000, "Original strap, battery, charger, and clean sensor. Test before purchase."],
  ["Sony WH-1000XM4 Headphones", "accessories", "Sony", "excellent", 16500, "Noise cancellation working perfectly, soft case included."],
  ["Nintendo Switch OLED", "gaming", "Nintendo", "excellent", 31500, "Dock, Joy-Con, adapter, and two game cards included."],
  ["Walton 8kg Washing Machine", "appliance", "Walton", "good", 18500, "Family used washing machine, moving sale, pickup from apartment."],
  ["Hatil Study Desk", "furniture", "Hatil", "good", 8500, "Solid desk with drawer, ideal for student room or home office."],
  ["Giant Escape 3 Bicycle", "bicycle", "Giant", "good", 23500, "Recently serviced city bike, smooth gear shifting and fresh brake pads."],
  ["Aarong Panjabi Set", "fashion", "Aarong", "new", 3200, "Unused gift item with tag, size medium."],
  ["OReilly JavaScript Books Bundle", "books", "OReilly", "good", 2800, "Four programming books for frontend and backend learning."],
  ["Logitech MX Master 3S", "accessories", "Logitech", "excellent", 7200, "Silent clicks, USB receiver, and box included."],
  ["Sony PlayStation 5 Controller", "gaming", "Sony", "good", 5600, "Original DualSense controller, no drift issue."]
];

const fraudTemplates = [
  {
    title: "iPhone 15 Pro urgent token first",
    category: "phone",
    brand: "Apple",
    condition: "excellent",
    price: 14500,
    description: "Urgent sale inbox fast. Pay token money first on bKash, no inspection before booking.",
    score: 92,
    signals: ["price_anomaly", "urgent_language", "off_platform_contact", "new_seller_high_value"],
    label: "fraud"
  },
  {
    title: "MacBook Pro M2 sealed half price",
    category: "laptop",
    brand: "Apple",
    condition: "new",
    price: 28000,
    description: "Sealed MacBook Pro M2. Direct call outside app only, final price today.",
    score: 88,
    signals: ["price_anomaly", "off_platform_contact", "urgent_language"],
    label: "fraud"
  },
  {
    title: "Samsung Galaxy S24 Ultra duplicate photo",
    category: "phone",
    brand: "Samsung",
    condition: "excellent",
    price: 30000,
    description: "Same stock photo used, urgent pickup, inbox fast for payment advance.",
    score: 86,
    signals: ["duplicate_image", "price_anomaly", "urgent_language"],
    label: "duplicate"
  },
  {
    title: "Fresh NID card service",
    category: "books",
    brand: "",
    condition: "new",
    price: 2500,
    description: "NID card and driving license available. WhatsApp for direct deal outside app.",
    score: 96,
    signals: ["prohibited_item_language", "off_platform_contact"],
    label: "prohibited"
  },
  {
    title: "Canon EOS R6 impossible discount",
    category: "camera",
    brand: "Canon",
    condition: "excellent",
    price: 22000,
    description: "Urgent advance payment required, no inspection, cash first only.",
    score: 81,
    signals: ["price_anomaly", "urgent_language", "off_platform_contact"],
    label: "fraud"
  },
  {
    title: "Apple Galaxy S22 brand mismatch",
    category: "phone",
    brand: "Apple",
    condition: "good",
    price: 24000,
    description: "Samsung Galaxy phone listed under Apple brand, inbox fast, advance needed.",
    score: 68,
    signals: ["brand_title_mismatch", "urgent_language"],
    label: "spam"
  },
  {
    title: "Gaming laptop 90 percent off",
    category: "laptop",
    brand: "Asus",
    condition: "excellent",
    price: 15500,
    description: "Asus ROG urgent sale. Telegram only, pay deposit before seeing product.",
    score: 91,
    signals: ["price_anomaly", "off_platform_contact", "urgent_language"],
    label: "fraud"
  },
  {
    title: "Bank account ready package",
    category: "accessories",
    brand: "Generic",
    condition: "new",
    price: 4000,
    description: "Bank account and sim card package ready. Direct call outside app.",
    score: 98,
    signals: ["prohibited_item_language", "off_platform_contact"],
    label: "prohibited"
  }
];

function digest(input, length = 16) {
  return createHash("sha256").update(input).digest("hex").slice(0, length);
}

function featureHash(payload) {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

function photoFor(category, title, index, forceDuplicate = false) {
  const visual = CATEGORY_VISUALS[category] ?? CATEGORY_VISUALS.accessories;
  const image = visual.images[index % visual.images.length];
  return {
    url: image.url,
    path: `showcase/${digest(title, 12)}.jpg`,
    hash: forceDuplicate ? "ff00ff00ff00ff00" : digest(`${category}:${title}`),
    storage: "local",
    credit: image.credit,
    href: image.href
  };
}

function scoringFor(template, seller, index) {
  const signals = template.signals ?? [];
  const explanations = signals.map((signal) => `Showcase ${signal.replaceAll("_", " ")} example.`);
  const thresholdBand = template.score >= 70 ? "high_priority_review" : template.score >= 40 ? "review" : "allow";
  const componentScores = Object.fromEntries(signals.map((signal) => [signal, signal === "duplicate_image" ? 35 : signal === "prohibited_item_language" ? 46 : 18]));
  const featureSnapshot = {
    category: template.category,
    condition: template.condition,
    price: template.price,
    brand: template.brand,
    title_length: template.title.length,
    description_length: template.description.length,
    photo_hash_count: 1,
    seller: {
      account_age_days: 1 + (index % 9),
      review_count: seller.reviewCount ?? 0,
      rating_average: seller.ratingAverage ?? 0
    },
    signals,
    component_scores: componentScores
  };
  return {
    score: template.score ?? (signals.length ? 62 : 6 + (index % 18)),
    decision: (template.score ?? 0) >= 60 ? "review" : "allow",
    threshold_band: thresholdBand,
    risk_level: thresholdBand,
    signals,
    explanations,
    component_scores: componentScores,
    feature_snapshot: featureSnapshot,
    model_version: "showcase-seed-v1",
    feature_snapshot_hash: featureHash(featureSnapshot)
  };
}

async function ensureUser({ email, name, role = "user", areaIndex = 0, reviewCount = 0, ratingAverage = 0 }) {
  const existing = await store.findUserByEmail(email);
  if (existing) return store.publicUser(existing);
  const area = areas[areaIndex % areas.length];
  return store.createUser({
    name,
    email,
    password: DEMO_PASSWORD,
    role,
    location: { lat: area[1], lng: area[2] },
    reviewCount,
    ratingAverage
  });
}

async function currentTitleSet() {
  const items = await store.listListings({ origin, radiusKm: 250 });
  return new Set(items.map((item) => item.title));
}

async function recordMlArtifacts(listing, scoring, actorId, label = null) {
  await store.createMlEvent?.({
    eventType: "showcase_listing_seeded",
    listingId: listing.id,
    actorId,
    payload: { title: listing.title, score: scoring.score, signals: scoring.signals }
  });
  await store.createMlPrediction?.({
    listingId: listing.id,
    modelName: "trust_fraud_classifier",
    modelVersion: scoring.model_version,
    score: scoring.score,
    decision: scoring.decision,
    thresholdBand: scoring.threshold_band,
    signals: scoring.signals,
    explanations: scoring.explanations,
    featureSnapshotHash: scoring.feature_snapshot_hash,
    rawResponse: scoring
  });
  if (label) {
    await store.createMlLabel?.({
      sourceType: "admin",
      sourceId: listing.id,
      listingId: listing.id,
      actorId,
      label,
      confidence: 0.95,
      notes: `Showcase seeded ${label} label for ${listing.title}`
    });
  }
}

async function main() {
  await store.seed();
  const existingTitles = await currentTitleSet();
  const owner = await ensureUser({
    email: TARGET_EMAIL,
    name: "Ifty Khan",
    areaIndex: 0,
    reviewCount: 9,
    ratingAverage: 4.7
  });
  const admin = await ensureUser({
    email: "admin@local.test",
    name: "Admin",
    role: "admin",
    areaIndex: 0
  });
  const reporters = [];
  for (let i = 0; i < 8; i += 1) {
    reporters.push(await ensureUser({
      email: `showcase-buyer-${i + 1}@local.test`,
      name: `Showcase Buyer ${i + 1}`,
      areaIndex: i + 2,
      reviewCount: i % 4,
      ratingAverage: Number((4.0 + (i % 6) / 10).toFixed(1))
    }));
  }
  const extraSellers = [];
  for (let i = 0; i < 12; i += 1) {
    extraSellers.push(await ensureUser({
      email: `showcase-seller-${i + 1}@local.test`,
      name: `Showcase Seller ${i + 1}`,
      areaIndex: i + 1,
      reviewCount: (i * 3) % 13,
      ratingAverage: Number((3.8 + (i % 9) / 10).toFixed(1))
    }));
  }

  const templates = [];
  for (let i = 0; i < cleanTemplates.length; i += 1) {
    const [title, category, brand, condition, price, description] = cleanTemplates[i];
    templates.push({ title, category, brand, condition, price, description, score: 4 + (i % 16), signals: [], label: null, owner: i < 10 });
  }
  for (const template of fraudTemplates) templates.push({ ...template, owner: true });

  const created = [];
  let skipped = 0;
  for (let i = 0; i < templates.length; i += 1) {
    const template = templates[i];
    const title = `Radius Showcase - ${template.title}`;
    if (existingTitles.has(title)) {
      skipped += 1;
      continue;
    }
    const area = areas[i % areas.length];
    const seller = template.owner ? owner : extraSellers[i % extraSellers.length];
    const scoring = scoringFor(template, seller, i);
    const listing = await store.createListing({
      sellerId: seller.id,
      title,
      category: template.category,
      brand: template.brand,
      condition: template.condition,
      price: template.price,
      description: `${template.description} Area: ${area[0]}.`,
      location: { lat: area[1] + ((i % 5) - 2) * 0.001, lng: area[2] + ((i % 7) - 3) * 0.001 },
      status: "available",
      photos: [photoFor(template.category, title, i, template.signals?.includes("duplicate_image"))],
      fraud: scoring
    });
    created.push({ listing, scoring, label: template.label, seller });
    await recordMlArtifacts(listing, scoring, admin.id, template.label);
  }

  const suspicious = created.filter((item) => item.scoring.score >= 60);
  for (let i = 0; i < suspicious.length; i += 1) {
    const item = suspicious[i];
    await store.createReport?.({
      listingId: item.listing.id,
      reporterId: reporters[i % reporters.length].id,
      reason: item.label === "duplicate" ? "duplicate" : item.label === "prohibited" ? "prohibited" : "fraud",
      details: `Showcase report: ${item.scoring.signals.join(", ")}`
    });
  }

  const chatTargets = created.slice(0, 10);
  for (let i = 0; i < chatTargets.length; i += 1) {
    const { listing } = chatTargets[i];
    const buyer = reporters[i % reporters.length];
    const conversation = await store.ensureConversation?.({ listingId: listing.id, buyerId: buyer.id, sellerId: listing.sellerId });
    if (!conversation) continue;
    await store.createMessage?.({
      conversationId: conversation.id,
      listingId: listing.id,
      senderId: buyer.id,
      recipientId: listing.sellerId,
      body: `Hi, is ${listing.title.replace("Radius Showcase - ", "")} available for inspection today?`
    });
    await store.createMessage?.({
      conversationId: conversation.id,
      listingId: listing.id,
      senderId: listing.sellerId,
      recipientId: buyer.id,
      body: "Yes, it is available. You can inspect before deciding."
    });
  }

  for (let i = 0; i < Math.min(6, created.length); i += 1) {
    const { listing } = created[i];
    const buyer = reporters[(i + 2) % reporters.length];
    const trade = await store.createTrade?.({
      listingId: listing.id,
      buyerId: buyer.id,
      sellerId: listing.sellerId,
      price: listing.price,
      status: "completed",
      note: "Showcase completed local trade."
    });
    if (!trade) continue;
    await store.createReview?.({
      tradeId: trade.id,
      listingId: listing.id,
      reviewerId: buyer.id,
      revieweeId: listing.sellerId,
      rating: 4 + (i % 2),
      comment: "Smooth meetup and item matched the listing."
    });
  }

  const stats = await store.adminStats?.();
  console.log(JSON.stringify({
    store: store.kind ?? "unknown",
    ownerEmail: TARGET_EMAIL,
    createdListings: created.length,
    skippedExisting: skipped,
    suspiciousListings: suspicious.length,
    reportsCreated: suspicious.length,
    conversationsCreated: Math.min(10, created.length),
    completedTradesCreated: Math.min(6, created.length),
    adminStats: stats
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
