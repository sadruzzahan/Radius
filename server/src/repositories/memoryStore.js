import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { DHAKA_DEFAULT_LOCATION, filterListingsByRadius } from "../lib/geo.js";

const nowIso = () => new Date().toISOString();

const dhakaPoints = {
  dhanmondi: { lat: 23.7465, lng: 90.376 },
  kalabagan: { lat: 23.7505, lng: 90.384 },
  banani: { lat: 23.7937, lng: 90.4066 },
  mirpur: { lat: 23.8103, lng: 90.3654 },
  gulshan: { lat: 23.7925, lng: 90.4078 },
  mohammadpur: { lat: 23.7639, lng: 90.3588 }
};

export class MemoryStore {
  constructor() {
    this.users = [];
    this.listings = [];
    this.messages = [];
    this.reviews = [];
    this.reports = [];
  }

  async seed() {
    if (this.users.length) return;
    const admin = await this.createUser({
      name: "Admin",
      email: "admin@local.test",
      password: "admin12345",
      role: "admin",
      location: dhakaPoints.dhanmondi
    });
    const sellers = [];
    for (const [idx, area] of ["kalabagan", "banani", "mirpur", "gulshan", "mohammadpur"].entries()) {
      sellers.push(
        await this.createUser({
          name: `Seller ${idx + 1}`,
          email: `seller${idx + 1}@local.test`,
          password: "password123",
          role: "user",
          location: dhakaPoints[area],
          reviewCount: idx,
          ratingAverage: idx ? 4.2 + idx / 10 : 0,
          createdAt: new Date(Date.now() - (idx + 2) * 86400000).toISOString()
        })
      );
    }
    const rows = [
      ["iPhone 13 128GB", "phone", "Apple", "excellent", 52000, "Clean phone, Face ID ok, battery 88%.", "kalabagan"],
      ["Samsung Galaxy S22", "phone", "Samsung", "good", 42000, "Box included, minor scratches.", "banani"],
      ["Dell XPS 13", "laptop", "Dell", "excellent", 74000, "Core i7, 16GB RAM, urgent sell.", "gulshan"],
      ["Study Table", "furniture", "Regal", "good", 4500, "Solid wood table for student room.", "mohammadpur"],
      ["Canon EOS 700D", "camera", "Canon", "fair", 28000, "Lens included, works fine.", "mirpur"],
      ["iPhone 13 urgent sale", "phone", "Apple", "excellent", 12000, "iPhone 13 urgent sale inbox fast", "kalabagan"]
    ];
    for (const [index, row] of rows.entries()) {
      await this.createListing({
        sellerId: sellers[index % sellers.length].id,
        title: row[0],
        category: row[1],
        brand: row[2],
        condition: row[3],
        price: row[4],
        description: row[5],
        location: dhakaPoints[row[6]],
        photos: [{ url: `/uploads/demo-${index + 1}.jpg`, hash: index === 5 ? "ff00ff00ff00ff00" : randomUUID().replaceAll("-", "").slice(0, 16) }],
        fraud: index === 5 ? { score: 84, decision: "review", signals: ["price_anomaly", "urgent_language"], explanations: ["Demo suspicious listing"] } : undefined
      });
    }
    await this.createMessage({
      listingId: this.listings[0].id,
      senderId: admin.id,
      recipientId: sellers[0].id,
      body: "Is this available for pickup near Dhanmondi?"
    });
  }

  async createUser(data) {
    const createdAt = data.createdAt ?? nowIso();
    const user = {
      id: randomUUID(),
      name: data.name,
      email: data.email.toLowerCase(),
      passwordHash: data.passwordHash ?? (await bcrypt.hash(data.password, 10)),
      role: data.role ?? "user",
      status: data.status ?? "active",
      location: data.location ?? DHAKA_DEFAULT_LOCATION,
      reviewCount: data.reviewCount ?? 0,
      ratingAverage: data.ratingAverage ?? 0,
      createdAt,
      updatedAt: createdAt
    };
    this.users.push(user);
    return this.publicUser(user);
  }

  publicUser(user) {
    const { passwordHash, ...safe } = user;
    return safe;
  }

  async findUserByEmail(email) {
    return this.users.find((user) => user.email === email.toLowerCase());
  }

  async findUserById(id) {
    return this.users.find((user) => user.id === id);
  }

  async listUsers() {
    return this.users.map((user) => this.publicUser(user));
  }

  async updateUser(id, patch) {
    const user = this.users.find((item) => item.id === id);
    if (!user) return null;
    Object.assign(user, patch, { updatedAt: nowIso() });
    return this.publicUser(user);
  }

  async createListing(data) {
    const createdAt = nowIso();
    const listing = {
      id: randomUUID(),
      sellerId: data.sellerId,
      title: data.title,
      category: data.category,
      brand: data.brand ?? "",
      condition: data.condition,
      price: Number(data.price),
      description: data.description,
      location: data.location,
      photos: data.photos ?? [],
      status: data.status ?? "available",
      fraud: data.fraud ?? { score: 0, decision: "allow", signals: [], explanations: [] },
      createdAt,
      updatedAt: createdAt
    };
    this.listings.push(listing);
    return this.withSeller(listing);
  }

  withSeller(listing) {
    const seller = this.users.find((user) => user.id === listing.sellerId);
    return { ...listing, seller: seller ? this.publicUser(seller) : null };
  }

  async listListings(filters = {}) {
    const origin = filters.origin ?? DHAKA_DEFAULT_LOCATION;
    const radiusKm = Number(filters.radiusKm ?? 6);
    let listings = filterListingsByRadius(this.listings.map((item) => this.withSeller(item)), origin, radiusKm);
    if (filters.category) listings = listings.filter((item) => item.category === filters.category);
    if (filters.condition) listings = listings.filter((item) => item.condition === filters.condition);
    if (filters.status) listings = listings.filter((item) => item.status === filters.status);
    if (filters.minPrice) listings = listings.filter((item) => item.price >= Number(filters.minPrice));
    if (filters.maxPrice) listings = listings.filter((item) => item.price <= Number(filters.maxPrice));
    if (filters.q) {
      const q = filters.q.toLowerCase();
      listings = listings.filter((item) => `${item.title} ${item.brand} ${item.description}`.toLowerCase().includes(q));
    }
    return listings;
  }

  async getListingById(id) {
    const listing = this.listings.find((item) => item.id === id);
    return listing ? this.withSeller(listing) : null;
  }

  async updateListing(id, patch) {
    const listing = this.listings.find((item) => item.id === id);
    if (!listing) return null;
    Object.assign(listing, patch, { updatedAt: nowIso() });
    return this.withSeller(listing);
  }

  async deleteListing(id) {
    const index = this.listings.findIndex((item) => item.id === id);
    if (index < 0) return false;
    this.listings.splice(index, 1);
    return true;
  }

  async listExistingPhotoHashes() {
    return this.listings.flatMap((listing) => listing.photos.map((photo) => photo.hash).filter(Boolean));
  }

  async listExistingDescriptions() {
    return this.listings.map((listing) => listing.description);
  }

  async createMessage(data) {
    const message = { id: randomUUID(), ...data, createdAt: nowIso() };
    this.messages.push(message);
    const sender = this.users.find((user) => user.id === message.senderId);
    return { ...message, sender: sender ? this.publicUser(sender) : null };
  }

  async listMessages(listingId) {
    return this.messages.filter((message) => message.listingId === listingId);
  }

  async createReview(data) {
    const review = { id: randomUUID(), ...data, rating: Number(data.rating), createdAt: nowIso() };
    this.reviews.push(review);
    const reviewee = this.users.find((user) => user.id === data.revieweeId);
    if (reviewee) {
      const total = reviewee.ratingAverage * reviewee.reviewCount + review.rating;
      reviewee.reviewCount += 1;
      reviewee.ratingAverage = Number((total / reviewee.reviewCount).toFixed(2));
    }
    return review;
  }

  async createReport(data) {
    const report = { id: randomUUID(), ...data, status: "open", createdAt: nowIso() };
    this.reports.push(report);
    return report;
  }

  async listReports() {
    return this.reports
      .map((report) => ({
        ...report,
        listing: this.listings.find((listing) => listing.id === report.listingId) ?? null,
        reporter: this.publicUser(this.users.find((user) => user.id === report.reporterId) ?? {})
      }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async updateReport(id, patch) {
    const report = this.reports.find((item) => item.id === id);
    if (!report) return null;
    if (["open", "resolved"].includes(patch.status)) report.status = patch.status;
    return report;
  }

  async listFlaggedListings() {
    return this.listings.filter((listing) => listing.fraud?.decision === "review").map((listing) => this.withSeller(listing));
  }

  async adminStats() {
    return {
      users: this.users.length,
      listings: this.listings.length,
      openReports: this.reports.filter((report) => report.status === "open").length,
      flaggedListings: this.listings.filter((listing) => listing.fraud?.decision === "review").length,
      soldListings: this.listings.filter((listing) => listing.status === "sold").length
    };
  }
}
