import { createHash } from "node:crypto";
import { store } from "../repositories/store.js";
import { CATEGORY_VISUALS } from "../../../client/src/visualManifest.js";

const areas = [
  ["Dhanmondi", 23.7465, 90.3760],
  ["Kalabagan", 23.7505, 90.3840],
  ["Banani", 23.7937, 90.4066],
  ["Gulshan", 23.7925, 90.4078],
  ["Mirpur", 23.8103, 90.3654],
  ["Mohammadpur", 23.7639, 90.3588],
  ["Uttara", 23.8759, 90.3795],
  ["Bashundhara", 23.8195, 90.4527],
  ["Wari", 23.7117, 90.4135],
  ["Badda", 23.7806, 90.4265],
  ["Lalmatia", 23.7551, 90.3688],
  ["Farmgate", 23.7588, 90.3897],
];

const catalog = [
  ["phone", ["Apple", "Samsung", "Xiaomi", "OnePlus", "Google"], [11000, 115000]],
  ["laptop", ["Dell", "HP", "Lenovo", "Apple", "Asus"], [22000, 170000]],
  ["camera", ["Canon", "Nikon", "Sony", "Fujifilm"], [16000, 150000]],
  ["furniture", ["Regal", "Hatil", "Otobi", "Local"], [1400, 52000]],
  ["bicycle", ["Phoenix", "Giant", "Trek", "Duranta"], [4500, 85000]],
  ["appliance", ["Walton", "Samsung", "LG", "Singer"], [2500, 90000]],
  ["fashion", ["Aarong", "Yellow", "Sailor", "Generic"], [500, 18000]],
  ["books", ["Pearson", "OReilly", "Nilkhet", "Cambridge"], [150, 6500]],
  ["gaming", ["Sony", "Nintendo", "Microsoft", "Logitech"], [2500, 90000]],
  ["accessories", ["Anker", "Baseus", "Apple", "Generic"], [250, 22000]],
];

const conditions = ["new", "excellent", "good", "fair", "poor"];
const statuses = ["available", "available", "available", "reserved", "sold"];

function hash(input) {
  return createHash("sha256").update(input).digest("hex").slice(0, 16);
}

function priceFor(index, low, high, condition) {
  const conditionFactor = { new: 1, excellent: 0.82, good: 0.64, fair: 0.44, poor: 0.24 }[condition];
  const spread = (index * 7919) % (high - low);
  return Math.max(100, Math.round((low + spread) * conditionFactor / 50) * 50);
}

function photoFor(category, index) {
  const visual = CATEGORY_VISUALS[category] ?? CATEGORY_VISUALS.accessories;
  const image = visual.images[index % visual.images.length];
  return {
    url: image.url,
    path: `unsplash/${category}-${index + 1}.jpg`,
    credit: image.credit,
    href: image.href
  };
}

async function findOrCreateUser(index) {
  const area = areas[index % areas.length];
  const email = `demo-seller-${String(index + 1).padStart(2, "0")}@local.test`;
  const existing = await store.findUserByEmail(email);
  if (existing) return store.publicUser(existing);
  return store.createUser({
    name: `Demo Seller ${index + 1}`,
    email,
    password: "password123",
    role: index === 0 ? "admin" : "user",
    location: { lat: area[1], lng: area[2] },
    reviewCount: index % 17,
    ratingAverage: Number((3.7 + (index % 13) / 10).toFixed(2)),
    createdAt: new Date(Date.now() - (index + 8) * 86400000).toISOString()
  });
}

await store.seed();
const sellers = [];
for (let i = 0; i < 55; i += 1) sellers.push(await findOrCreateUser(i));

const created = [];
for (let i = 0; i < 500; i += 1) {
  const [category, brands, range] = catalog[i % catalog.length];
  const area = areas[(i * 7) % areas.length];
  const condition = conditions[(i * 3) % conditions.length];
  const brand = brands[(i * 5 + 2) % brands.length];
  const suspicious = i % 47 === 0;
  const duplicateHash = i % 83 === 0 ? "ff00ff00ff00ff00" : hash(`${category}-${brand}-${i}`);
  const photo = photoFor(category, i);
  const listing = await store.createListing({
    sellerId: sellers[i % sellers.length].id,
    title: `${brand} ${category} ${area[0]} ${i + 1}`,
    category,
    brand,
    condition,
    price: suspicious ? Math.max(1000, Math.round(priceFor(i, range[0], range[1], condition) * 0.28)) : priceFor(i, range[0], range[1], condition),
    description: suspicious
      ? `${brand} ${category} urgent sale inbox fast, pickup near ${area[0]}.`
      : `${condition} ${brand} ${category} available near ${area[0]} with local pickup and inspection.`,
    location: { lat: area[1] + ((i % 9) - 4) * 0.0012, lng: area[2] + ((i % 7) - 3) * 0.0012 },
    status: statuses[i % statuses.length],
    photos: [{ ...photo, hash: duplicateHash, storage: "remote" }],
    fraud: suspicious
      ? { score: 82, decision: "review", signals: ["price_anomaly", "urgent_language", "duplicate_image"], explanations: ["Seeded suspicious marketplace case."] }
      : { score: i % 19, decision: "allow", signals: [], explanations: [] }
  });
  created.push(listing);
}

for (let i = 0; i < 140; i += 1) {
  const listing = created[i % created.length];
  await store.createReview({
    tradeId: `seed-trade-${i + 1}`,
    listingId: listing.id,
    reviewerId: sellers[(i + 3) % sellers.length].id,
    revieweeId: listing.sellerId,
    rating: 3 + (i % 3),
    comment: "Seeded completed local trade review."
  });
}

for (let i = 0; i < 35; i += 1) {
  const listing = created[(i * 47) % created.length];
  await store.createReport({
    listingId: listing.id,
    reporterId: sellers[(i + 9) % sellers.length].id,
    reason: i % 2 ? "duplicate" : "fraud",
    details: "Seeded admin review workload."
  });
}

console.log(JSON.stringify({ users: sellers.length, listings: created.length, reports: 35, reviews: 140 }, null, 2));
