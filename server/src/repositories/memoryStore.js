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
    this.conversations = [];
    this.messages = [];
    this.reviews = [];
    this.trades = [];
    this.reports = [];
    this.mlEvents = [];
    this.mlPredictions = [];
    this.mlLabels = [];
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
    const buyer = await this.createUser({
      name: "Buyer One",
      email: "buyer@local.test",
      password: "password123",
      role: "user",
      location: dhakaPoints.dhanmondi,
      reviewCount: 1,
      ratingAverage: 4.8,
      createdAt: new Date(Date.now() - 30 * 86400000).toISOString()
    });
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
        fraud: index === 5 ? { score: 84, decision: "review", signals: ["price_anomaly", "urgent_language"], explanations: ["Showcase suspicious marketplace case"] } : undefined
      });
    }
    const conversation = await this.ensureConversation({
      listingId: this.listings[0].id,
      buyerId: buyer.id,
      sellerId: sellers[0].id
    });
    await this.createMessage({
      conversationId: conversation.id,
      listingId: this.listings[0].id,
      senderId: buyer.id,
      recipientId: sellers[0].id,
      body: "Is this iPhone still available for pickup near Dhanmondi?"
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
    const conversation = this.conversations.find((item) => item.id === message.conversationId);
    if (conversation) conversation.updatedAt = message.createdAt;
    const sender = this.users.find((user) => user.id === message.senderId);
    return { ...message, sender: sender ? this.publicUser(sender) : null };
  }

  async ensureConversation(data) {
    let conversation = this.conversations.find((item) => (
      item.listingId === data.listingId && item.buyerId === data.buyerId && item.sellerId === data.sellerId
    ));
    if (!conversation) {
      const createdAt = nowIso();
      conversation = {
        id: randomUUID(),
        listingId: data.listingId,
        buyerId: data.buyerId,
        sellerId: data.sellerId,
        status: "active",
        createdAt,
        updatedAt: createdAt
      };
      this.conversations.push(conversation);
    }
    return this.withConversationUsers(conversation);
  }

  withConversationUsers(conversation) {
    const buyer = this.users.find((user) => user.id === conversation.buyerId);
    const seller = this.users.find((user) => user.id === conversation.sellerId);
    return {
      ...conversation,
      buyer: buyer ? this.publicUser(buyer) : undefined,
      seller: seller ? this.publicUser(seller) : undefined
    };
  }

  async getConversationById(id) {
    const conversation = this.conversations.find((item) => item.id === id);
    return conversation ? this.withConversationUsers(conversation) : null;
  }

  async listConversationsForListing(listingId, userId = null) {
    return this.conversations
      .filter((conversation) => conversation.listingId === listingId)
      .filter((conversation) => !userId || conversation.buyerId === userId || conversation.sellerId === userId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .map((conversation) => this.withConversationUsers(conversation));
  }

  async listMessages(listingId, filters = {}) {
    return this.messages
      .filter((message) => message.listingId === listingId)
      .filter((message) => !filters.conversationId || message.conversationId === filters.conversationId);
  }

  async createReview(data) {
    const trade = this.trades.find((item) => item.id === data.tradeId);
    if (!trade) throw new Error("Trade not found");
    if (trade.status !== "completed") throw new Error("Trade must be completed before review");
    if (![trade.buyerId, trade.sellerId].includes(data.reviewerId)) throw new Error("Reviewer is not a trade participant");
    const revieweeId = trade.buyerId === data.reviewerId ? trade.sellerId : trade.buyerId;
    if (data.listingId && data.listingId !== trade.listingId) throw new Error("Review listing does not match trade");
    if (data.revieweeId && data.revieweeId !== revieweeId) throw new Error("Reviewee does not match trade counterparty");
    if (this.reviews.some((review) => review.tradeId === data.tradeId && review.reviewerId === data.reviewerId)) {
      throw new Error("Review already exists for this trade");
    }
    const review = {
      id: randomUUID(),
      tradeId: trade.id,
      listingId: trade.listingId,
      reviewerId: data.reviewerId,
      revieweeId,
      rating: Number(data.rating),
      comment: data.comment ?? "",
      createdAt: nowIso()
    };
    this.reviews.push(review);
    const reviewee = this.users.find((user) => user.id === revieweeId);
    if (reviewee) {
      const total = reviewee.ratingAverage * reviewee.reviewCount + review.rating;
      reviewee.reviewCount += 1;
      reviewee.ratingAverage = Number((total / reviewee.reviewCount).toFixed(2));
    }
    return review;
  }

  async createTrade(data) {
    if (this.trades.some((trade) => (
      trade.listingId === data.listingId
      && trade.buyerId === data.buyerId
      && ["requested", "accepted"].includes(trade.status)
    ))) {
      throw new Error("You already have an open trade for this listing");
    }
    const trade = {
      id: randomUUID(),
      listingId: data.listingId,
      buyerId: data.buyerId,
      sellerId: data.sellerId,
      price: Number(data.price),
      status: data.status ?? "requested",
      note: data.note ?? "",
      createdAt: nowIso(),
      updatedAt: nowIso()
    };
    this.trades.push(trade);
    return trade;
  }

  async getTradeById(id) {
    return this.trades.find((trade) => trade.id === id) ?? null;
  }

  async updateTradeStatus(id, status) {
    const allowed = {
      accepted: ["requested"],
      rejected: ["requested"],
      cancelled: ["requested", "accepted"],
      completed: ["accepted"]
    };
    if (!allowed[status]) throw new Error("Unsupported trade transition");
    const trade = this.trades.find((item) => item.id === id);
    if (!trade) throw new Error("Trade not found");
    if (!allowed[status].includes(trade.status)) {
      throw new Error(`Cannot move trade from ${trade.status} to ${status}`);
    }
    if (status === "accepted" && this.trades.some((item) => item.listingId === trade.listingId && item.id !== id && ["accepted", "completed"].includes(item.status))) {
      throw new Error("Listing already has an accepted trade");
    }
    const previousStatus = trade.status;
    trade.status = status;
    trade.updatedAt = nowIso();
    const listing = this.listings.find((item) => item.id === trade.listingId);
    if (listing && status === "accepted") listing.status = "reserved";
    if (listing && status === "completed") listing.status = "sold";
    if (listing && status === "cancelled" && previousStatus === "accepted" && !this.trades.some((item) => item.listingId === trade.listingId && ["accepted", "completed"].includes(item.status))) {
      listing.status = "available";
    }
    if (listing) listing.updatedAt = nowIso();
    return { trade, item: listing ? this.withSeller(listing) : null };
  }

  async listTrades() {
    return [...this.trades].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
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

  async createMlEvent(data) {
    const event = { id: randomUUID(), payload: {}, createdAt: nowIso(), ...data };
    this.mlEvents.push(event);
    return event;
  }

  async listMlEvents() {
    return [...this.mlEvents].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async createMlPrediction(data) {
    const prediction = { id: randomUUID(), createdAt: nowIso(), ...data };
    this.mlPredictions.push(prediction);
    return prediction;
  }

  async listMlPredictions() {
    return [...this.mlPredictions].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async createMlLabel(data) {
    const label = { id: randomUUID(), createdAt: nowIso(), ...data };
    this.mlLabels.push(label);
    return label;
  }

  async listMlLabels() {
    return [...this.mlLabels].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
}
