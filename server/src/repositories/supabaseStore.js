import bcrypt from "bcryptjs";

function throwIfError(error) {
  if (error) throw new Error(error.message);
}

function toPublicUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    status: row.status,
    location: { lat: Number(row.lat), lng: Number(row.lng) },
    reviewCount: row.review_count ?? 0,
    ratingAverage: Number(row.rating_average ?? 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function toListing(row) {
  if (!row) return null;
  const photoUrls = row.photo_urls ?? [];
  const photoHashes = row.photo_hashes ?? [];
  return {
    id: row.id,
    sellerId: row.seller_id,
    title: row.title,
    category: row.category,
    brand: row.brand ?? "",
    condition: row.condition,
    price: Number(row.price),
    description: row.description,
    location: { lat: Number(row.lat), lng: Number(row.lng) },
    distanceKm: row.distance_km == null ? undefined : Number(row.distance_km),
    photos: photoUrls.map((url, index) => ({ url, hash: photoHashes[index] })),
    status: row.status,
    fraud: {
      score: row.fraud_score ?? 0,
      decision: row.fraud_decision ?? "allow",
      signals: row.fraud_signals ?? [],
      explanations: row.fraud_explanations ?? [],
      reviewedBy: row.fraud_reviewed_by,
      reviewedAt: row.fraud_reviewed_at
    },
    seller: row.seller_id
      ? {
          id: row.seller_id,
          name: row.seller_name,
          ratingAverage: Number(row.seller_rating_average ?? 0),
          reviewCount: row.seller_review_count ?? 0
        }
      : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function toConversation(row) {
  if (!row) return null;
  return {
    id: row.id,
    listingId: row.listing_id,
    buyerId: row.buyer_id,
    sellerId: row.seller_id,
    status: row.status,
    buyer: row.buyer_name ? { id: row.buyer_id, name: row.buyer_name } : row.buyer,
    seller: row.seller_name ? { id: row.seller_id, name: row.seller_name } : row.seller,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function toMessage(row) {
  if (!row) return null;
  return {
    id: row.id,
    conversationId: row.conversation_id,
    listingId: row.listing_id,
    senderId: row.sender_id,
    recipientId: row.recipient_id,
    body: row.body,
    createdAt: row.created_at
  };
}

function toTrade(row) {
  if (!row) return null;
  return {
    id: row.id,
    listingId: row.listing_id,
    buyerId: row.buyer_id,
    sellerId: row.seller_id,
    price: Number(row.price),
    status: row.status,
    note: row.note,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export class SupabaseStore {
  constructor(client) {
    this.client = client;
    this.kind = "supabase";
  }

  async seed() {
    return null;
  }

  publicUser(row) {
    return toPublicUser(row);
  }

  async createUser(data) {
    const passwordHash = data.passwordHash ?? await bcrypt.hash(data.password, 10);
    const { data: row, error } = await this.client
      .from("app_users")
      .insert([{
        name: data.name,
        email: data.email.toLowerCase(),
        password_hash: passwordHash,
        role: data.role ?? "user",
        status: data.status ?? "active",
        lat: data.location?.lat ?? 23.7465,
        lng: data.location?.lng ?? 90.376,
        review_count: data.reviewCount ?? 0,
        rating_average: data.ratingAverage ?? 0
      }])
      .select("*")
      .single();
    throwIfError(error);
    return toPublicUser(row);
  }

  async findUserByEmail(email) {
    const { data, error } = await this.client
      .from("app_users")
      .select("*")
      .eq("email", String(email).toLowerCase())
      .maybeSingle();
    throwIfError(error);
    return data;
  }

  async findUserById(id) {
    const { data, error } = await this.client
      .from("app_users")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    throwIfError(error);
    return data;
  }

  async listUsers() {
    const { data, error } = await this.client
      .from("app_users")
      .select("*")
      .order("created_at", { ascending: false });
    throwIfError(error);
    return data.map(toPublicUser);
  }

  async updateUser(id, patch) {
    const payload = {};
    if (["active", "suspended", "banned"].includes(patch.status)) payload.status = patch.status;
    const { data, error } = await this.client
      .from("app_users")
      .update(payload)
      .eq("id", id)
      .select("*")
      .maybeSingle();
    throwIfError(error);
    return toPublicUser(data);
  }

  async listListings(filters = {}) {
    const { data, error } = await this.client.rpc("nearby_listings", {
      p_lat: Number(filters.origin?.lat ?? 23.7465),
      p_lng: Number(filters.origin?.lng ?? 90.376),
      p_radius_km: Number(filters.radiusKm ?? 6),
      p_category: filters.category || null,
      p_condition: filters.condition || null,
      p_status: filters.status || null,
      p_min_price: filters.minPrice ? Number(filters.minPrice) : null,
      p_max_price: filters.maxPrice ? Number(filters.maxPrice) : null,
      p_query: filters.q || null
    });
    throwIfError(error);
    return data.map(toListing);
  }

  async getListingById(id) {
    const { data, error } = await this.client.rpc("listing_by_id", { p_listing_id: id });
    throwIfError(error);
    return toListing(data?.[0]);
  }

  async createListing(data) {
    const fraud = data.fraud ?? { score: 0, decision: "allow", signals: [], explanations: [] };
    const { data: row, error } = await this.client
      .from("listings")
      .insert([{
        seller_id: data.sellerId,
        title: data.title,
        category: data.category,
        brand: data.brand ?? "",
        condition: data.condition,
        price: Number(data.price),
        description: data.description,
        lat: data.location.lat,
        lng: data.location.lng,
        status: data.status ?? "available",
        fraud_score: fraud.score ?? 0,
        fraud_decision: fraud.decision ?? "allow",
        fraud_signals: fraud.signals ?? [],
        fraud_explanations: fraud.explanations ?? []
      }])
      .select("*")
      .single();
    throwIfError(error);
    if (data.photos?.length) {
      const { error: photoError } = await this.client
        .from("listing_photos")
        .insert(data.photos.map((photo) => ({
          listing_id: row.id,
          url: photo.url,
          hash: photo.hash ?? null,
          storage: photo.storage ?? "supabase"
        })));
      throwIfError(photoError);
    }
    return toListing({ ...row, photo_urls: data.photos?.map((photo) => photo.url) ?? [], photo_hashes: data.photos?.map((photo) => photo.hash) ?? [] });
  }

  async updateListing(id, patch) {
    const payload = {};
    for (const [from, to] of [["title", "title"], ["category", "category"], ["brand", "brand"], ["condition", "condition"], ["price", "price"], ["description", "description"], ["status", "status"]]) {
      if (patch[from] !== undefined) payload[to] = patch[from];
    }
    if (patch.location) {
      payload.lat = patch.location.lat;
      payload.lng = patch.location.lng;
    }
    if (patch.fraud) {
      payload.fraud_score = patch.fraud.score;
      payload.fraud_decision = patch.fraud.decision;
      payload.fraud_signals = patch.fraud.signals;
      payload.fraud_explanations = patch.fraud.explanations;
      payload.fraud_reviewed_by = patch.fraud.reviewedBy;
      payload.fraud_reviewed_at = patch.fraud.reviewedAt;
    }
    const { data, error } = await this.client
      .from("listings")
      .update(payload)
      .eq("id", id)
      .select("*")
      .maybeSingle();
    throwIfError(error);
    return toListing(data);
  }

  async deleteListing(id) {
    const { error } = await this.client.from("listings").delete().eq("id", id);
    throwIfError(error);
    return true;
  }

  async listExistingPhotoHashes() {
    const { data, error } = await this.client.from("listing_photos").select("hash").not("hash", "is", null).limit(5000);
    throwIfError(error);
    return data.map((row) => row.hash).filter(Boolean);
  }

  async listExistingDescriptions() {
    const { data, error } = await this.client.from("listings").select("description").limit(5000);
    throwIfError(error);
    return data.map((row) => row.description).filter(Boolean);
  }

  async ensureConversation(data) {
    const existing = await this.listConversationsForListing(data.listingId, data.buyerId);
    const found = existing.find((conversation) => conversation.buyerId === data.buyerId && conversation.sellerId === data.sellerId);
    if (found) return found;
    const { data: row, error } = await this.client
      .from("conversations")
      .insert([{ listing_id: data.listingId, buyer_id: data.buyerId, seller_id: data.sellerId }])
      .select("*")
      .single();
    throwIfError(error);
    return toConversation(row);
  }

  async getConversationById(id) {
    const { data, error } = await this.client
      .from("conversations")
      .select("*, buyer:app_users!conversations_buyer_id_fkey(id,name), seller:app_users!conversations_seller_id_fkey(id,name)")
      .eq("id", id)
      .maybeSingle();
    throwIfError(error);
    return toConversation(data);
  }

  async listConversationsForListing(listingId, userId = null) {
    let query = this.client
      .from("conversations")
      .select("*, buyer:app_users!conversations_buyer_id_fkey(id,name), seller:app_users!conversations_seller_id_fkey(id,name)")
      .eq("listing_id", listingId)
      .order("updated_at", { ascending: false });
    if (userId) query = query.or(`buyer_id.eq.${userId},seller_id.eq.${userId}`);
    const { data, error } = await query;
    throwIfError(error);
    return data.map(toConversation);
  }

  async createMessage(data) {
    const { data: row, error } = await this.client
      .from("chat_messages")
      .insert([{ conversation_id: data.conversationId, listing_id: data.listingId, sender_id: data.senderId, recipient_id: data.recipientId, body: data.body }])
      .select("*")
      .single();
    throwIfError(error);
    await this.client.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", data.conversationId);
    return toMessage(row);
  }

  async listMessages(listingId, filters = {}) {
    let query = this.client
      .from("chat_messages")
      .select("*")
      .eq("listing_id", listingId)
      .order("created_at", { ascending: true });
    if (filters.conversationId) query = query.eq("conversation_id", filters.conversationId);
    const { data, error } = await query;
    throwIfError(error);
    return data.map(toMessage);
  }

  async createReview(data) {
    const trade = await this.getTradeById(data.tradeId);
    if (!trade) throw new Error("Trade not found");
    if (trade.status !== "completed") throw new Error("Trade must be completed before review");
    if (![trade.buyerId, trade.sellerId].includes(data.reviewerId)) throw new Error("Reviewer is not a trade participant");
    const revieweeId = trade.buyerId === data.reviewerId ? trade.sellerId : trade.buyerId;
    if (data.listingId && data.listingId !== trade.listingId) throw new Error("Review listing does not match trade");
    if (data.revieweeId && data.revieweeId !== revieweeId) throw new Error("Reviewee does not match trade counterparty");
    const { data: row, error } = await this.client
      .from("reviews")
      .insert([{ trade_id: trade.id, listing_id: trade.listingId, reviewer_id: data.reviewerId, reviewee_id: revieweeId, rating: data.rating, comment: data.comment ?? "" }])
      .select("*")
      .single();
    throwIfError(error);
    return { id: row.id, tradeId: row.trade_id, listingId: row.listing_id, reviewerId: row.reviewer_id, revieweeId: row.reviewee_id, rating: row.rating, comment: row.comment, createdAt: row.created_at };
  }

  async createTrade(data) {
    const { data: row, error } = await this.client
      .from("trades")
      .insert([{
        listing_id: data.listingId,
        buyer_id: data.buyerId,
        seller_id: data.sellerId,
        price: Number(data.price),
        status: data.status ?? "requested",
        note: data.note ?? ""
      }])
      .select("*")
      .single();
    throwIfError(error);
    return toTrade(row);
  }

  async getTradeById(id) {
    const { data, error } = await this.client
      .from("trades")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    throwIfError(error);
    return toTrade(data);
  }

  async updateTradeStatus(id, status) {
    const existing = await this.getTradeById(id);
    if (!existing) throw new Error("Trade not found");
    const allowed = {
      accepted: ["requested"],
      rejected: ["requested"],
      cancelled: ["requested", "accepted"],
      completed: ["accepted"]
    };
    if (!allowed[status]?.includes(existing.status)) {
      throw new Error(`Cannot move trade from ${existing.status} to ${status}`);
    }
    const { data: row, error } = await this.client
      .from("trades")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("*")
      .single();
    throwIfError(error);
    if (status === "accepted") await this.updateListing(existing.listingId, { status: "reserved" });
    if (status === "completed") await this.updateListing(existing.listingId, { status: "sold" });
    if (status === "cancelled" && existing.status === "accepted") await this.updateListing(existing.listingId, { status: "available" });
    return { trade: toTrade(row), item: await this.getListingById(existing.listingId) };
  }

  async listTrades() {
    const { data, error } = await this.client
      .from("trades")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    throwIfError(error);
    return data.map(toTrade);
  }

  async createReport(data) {
    const { data: row, error } = await this.client
      .from("reports")
      .insert([{ listing_id: data.listingId, reporter_id: data.reporterId, reason: data.reason, details: data.details ?? "" }])
      .select("*")
      .single();
    throwIfError(error);
    return { id: row.id, listingId: row.listing_id, reporterId: row.reporter_id, reason: row.reason, details: row.details, status: row.status, createdAt: row.created_at };
  }

  async listReports() {
    const { data, error } = await this.client
      .from("reports")
      .select("*, listings(id,title), app_users!reports_reporter_id_fkey(id,name,email)")
      .order("created_at", { ascending: false });
    throwIfError(error);
    return data.map((row) => ({
      id: row.id,
      listingId: row.listing_id,
      reporterId: row.reporter_id,
      reason: row.reason,
      details: row.details,
      status: row.status,
      createdAt: row.created_at,
      listing: row.listings,
      reporter: row.app_users
    }));
  }

  async updateReport(id, patch) {
    const payload = { status: ["open", "resolved"].includes(patch.status) ? patch.status : "open" };
    const { data, error } = await this.client
      .from("reports")
      .update(payload)
      .eq("id", id)
      .select("*")
      .maybeSingle();
    throwIfError(error);
    return data ? { id: data.id, listingId: data.listing_id, reporterId: data.reporter_id, reason: data.reason, details: data.details, status: data.status, createdAt: data.created_at } : null;
  }

  async listFlaggedListings() {
    const { data, error } = await this.client.rpc("flagged_listings");
    throwIfError(error);
    return data.map(toListing);
  }

  async adminStats() {
    const { data, error } = await this.client.rpc("admin_marketplace_stats");
    throwIfError(error);
    return data;
  }

  async createMlEvent(data) {
    const { data: row, error } = await this.client
      .from("ml_events")
      .insert([{
        event_type: data.eventType,
        listing_id: data.listingId ?? null,
        user_id: data.userId ?? null,
        actor_id: data.actorId ?? null,
        payload: data.payload ?? {}
      }])
      .select("*")
      .single();
    throwIfError(error);
    return {
      id: row.id,
      eventType: row.event_type,
      listingId: row.listing_id,
      userId: row.user_id,
      actorId: row.actor_id,
      payload: row.payload,
      createdAt: row.created_at
    };
  }

  async listMlEvents() {
    const { data, error } = await this.client
      .from("ml_events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    throwIfError(error);
    return data.map((row) => ({
      id: row.id,
      eventType: row.event_type,
      listingId: row.listing_id,
      userId: row.user_id,
      actorId: row.actor_id,
      payload: row.payload,
      createdAt: row.created_at
    }));
  }

  async createMlPrediction(data) {
    const { data: row, error } = await this.client
      .from("ml_predictions")
      .insert([{
        listing_id: data.listingId ?? null,
        model_name: data.modelName ?? "trust_fraud_classifier",
        model_version: data.modelVersion,
        score: data.score,
        decision: data.decision,
        threshold_band: data.thresholdBand ?? "allow",
        signals: data.signals ?? [],
        explanations: data.explanations ?? [],
        feature_snapshot_hash: data.featureSnapshotHash ?? null,
        raw_response: data.rawResponse ?? {}
      }])
      .select("*")
      .single();
    throwIfError(error);
    return {
      id: row.id,
      listingId: row.listing_id,
      modelName: row.model_name,
      modelVersion: row.model_version,
      score: row.score,
      decision: row.decision,
      thresholdBand: row.threshold_band,
      signals: row.signals,
      explanations: row.explanations,
      featureSnapshotHash: row.feature_snapshot_hash,
      rawResponse: row.raw_response,
      createdAt: row.created_at
    };
  }

  async listMlPredictions() {
    const { data, error } = await this.client
      .from("ml_predictions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    throwIfError(error);
    return data.map((row) => ({
      id: row.id,
      listingId: row.listing_id,
      modelName: row.model_name,
      modelVersion: row.model_version,
      score: row.score,
      decision: row.decision,
      thresholdBand: row.threshold_band,
      signals: row.signals,
      explanations: row.explanations,
      featureSnapshotHash: row.feature_snapshot_hash,
      rawResponse: row.raw_response,
      createdAt: row.created_at
    }));
  }

  async createMlLabel(data) {
    const { data: row, error } = await this.client
      .from("ml_labels")
      .insert([{
        source_type: data.sourceType,
        source_id: data.sourceId ?? null,
        listing_id: data.listingId ?? null,
        actor_id: data.actorId ?? null,
        label: data.label,
        confidence: data.confidence ?? 1,
        notes: data.notes ?? ""
      }])
      .select("*")
      .single();
    throwIfError(error);
    return {
      id: row.id,
      sourceType: row.source_type,
      sourceId: row.source_id,
      listingId: row.listing_id,
      actorId: row.actor_id,
      label: row.label,
      confidence: Number(row.confidence),
      notes: row.notes,
      createdAt: row.created_at
    };
  }

  async listMlLabels() {
    const { data, error } = await this.client
      .from("ml_labels")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    throwIfError(error);
    return data.map((row) => ({
      id: row.id,
      sourceType: row.source_type,
      sourceId: row.source_id,
      listingId: row.listing_id,
      actorId: row.actor_id,
      label: row.label,
      confidence: Number(row.confidence),
      notes: row.notes,
      createdAt: row.created_at
    }));
  }
}
