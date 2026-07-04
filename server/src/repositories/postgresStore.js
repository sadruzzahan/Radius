import bcrypt from "bcryptjs";
import { toListing, toPublicUser } from "./mappers.js";

const nearbySql = `
  select * from public.nearby_listings($1::double precision,$2::double precision,$3::double precision,$4::text,$5::text,$6::text,$7::numeric,$8::numeric,$9::text)
`;

const listingByIdSql = `select * from public.listing_by_id($1)`;

function queryOne(pool, text, values) {
  return pool.query(text, values).then((result) => result.rows[0] ?? null);
}

function toConversation(row) {
  if (!row) return null;
  return {
    id: row.id,
    listingId: row.listing_id,
    buyerId: row.buyer_id,
    sellerId: row.seller_id,
    status: row.status,
    buyer: row.buyer_name ? { id: row.buyer_id, name: row.buyer_name } : undefined,
    seller: row.seller_name ? { id: row.seller_id, name: row.seller_name } : undefined,
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

export class PostgresStore {
  constructor(pool) {
    this.pool = pool;
    this.kind = "supabase-postgres";
  }

  async seed() {
    return null;
  }

  publicUser(row) {
    return toPublicUser(row);
  }

  async createUser(data) {
    const passwordHash = data.passwordHash ?? await bcrypt.hash(data.password, 10);
    const row = await queryOne(
      this.pool,
      `insert into public.app_users
        (name, email, password_hash, role, status, lat, lng, review_count, rating_average)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       returning *`,
      [
        data.name,
        data.email.toLowerCase(),
        passwordHash,
        data.role ?? "user",
        data.status ?? "active",
        data.location?.lat ?? 23.7465,
        data.location?.lng ?? 90.376,
        data.reviewCount ?? 0,
        data.ratingAverage ?? 0
      ]
    );
    return toPublicUser(row);
  }

  async findUserByEmail(email) {
    return queryOne(this.pool, "select * from public.app_users where email = $1", [String(email).toLowerCase()]);
  }

  async findUserById(id) {
    return queryOne(this.pool, "select * from public.app_users where id = $1", [id]);
  }

  async listUsers() {
    const result = await this.pool.query("select * from public.app_users order by created_at desc");
    return result.rows.map(toPublicUser);
  }

  async updateUser(id, patch) {
    if (!["active", "suspended", "banned"].includes(patch.status)) {
      return toPublicUser(await this.findUserById(id));
    }
    const row = await queryOne(
      this.pool,
      "update public.app_users set status = $2, updated_at = now() where id = $1 returning *",
      [id, patch.status]
    );
    return toPublicUser(row);
  }

  async listListings(filters = {}) {
    const result = await this.pool.query(nearbySql, [
      Number(filters.origin?.lat ?? 23.7465),
      Number(filters.origin?.lng ?? 90.376),
      Number(filters.radiusKm ?? 6),
      filters.category || null,
      filters.condition || null,
      filters.status || null,
      filters.minPrice ? Number(filters.minPrice) : null,
      filters.maxPrice ? Number(filters.maxPrice) : null,
      filters.q || null
    ]);
    return result.rows.map(toListing);
  }

  async getListingById(id) {
    const result = await this.pool.query(listingByIdSql, [id]);
    return toListing(result.rows[0]);
  }

  async createListing(data) {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const fraud = data.fraud ?? { score: 0, decision: "allow", signals: [], explanations: [] };
      const listing = await client.query(
        `insert into public.listings
          (seller_id, title, category, brand, condition, price, description, lat, lng, status, fraud_score, fraud_decision, fraud_signals, fraud_explanations)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
         returning *`,
        [
          data.sellerId,
          data.title,
          data.category,
          data.brand ?? "",
          data.condition,
          Number(data.price),
          data.description,
          data.location.lat,
          data.location.lng,
          data.status ?? "available",
          fraud.score ?? 0,
          fraud.decision ?? "allow",
          fraud.signals ?? [],
          fraud.explanations ?? []
        ]
      );
      const row = listing.rows[0];
      for (const photo of data.photos ?? []) {
        await client.query(
          `insert into public.listing_photos (listing_id, url, hash, storage)
           values ($1,$2,$3,$4)`,
          [row.id, photo.url, photo.hash ?? null, photo.storage ?? "local"]
        );
      }
      await client.query("COMMIT");
      return toListing({ ...row, photo_urls: data.photos?.map((photo) => photo.url) ?? [], photo_hashes: data.photos?.map((photo) => photo.hash) ?? [] });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async updateListing(id, patch) {
    const existing = await this.getListingById(id);
    if (!existing) return null;
    const next = {
      title: patch.title ?? existing.title,
      category: patch.category ?? existing.category,
      brand: patch.brand ?? existing.brand,
      condition: patch.condition ?? existing.condition,
      price: patch.price ?? existing.price,
      description: patch.description ?? existing.description,
      lat: patch.location?.lat ?? existing.location.lat,
      lng: patch.location?.lng ?? existing.location.lng,
      status: patch.status ?? existing.status,
      fraud: patch.fraud ?? existing.fraud
    };
    await this.pool.query(
      `update public.listings
       set title=$2, category=$3, brand=$4, condition=$5, price=$6, description=$7,
           lat=$8, lng=$9, status=$10, fraud_score=$11, fraud_decision=$12,
           fraud_signals=$13, fraud_explanations=$14, fraud_reviewed_by=$15,
           fraud_reviewed_at=$16, updated_at=now()
       where id=$1`,
      [
        id,
        next.title,
        next.category,
        next.brand,
        next.condition,
        next.price,
        next.description,
        next.lat,
        next.lng,
        next.status,
        next.fraud.score ?? 0,
        next.fraud.decision ?? "allow",
        next.fraud.signals ?? [],
        next.fraud.explanations ?? [],
        next.fraud.reviewedBy ?? null,
        next.fraud.reviewedAt ?? null
      ]
    );
    return this.getListingById(id);
  }

  async deleteListing(id) {
    await this.pool.query("delete from public.listings where id = $1", [id]);
    return true;
  }

  async listExistingPhotoHashes() {
    const result = await this.pool.query("select hash from public.listing_photos where hash is not null limit 5000");
    return result.rows.map((row) => row.hash).filter(Boolean);
  }

  async listExistingDescriptions() {
    const result = await this.pool.query("select description from public.listings limit 5000");
    return result.rows.map((row) => row.description).filter(Boolean);
  }

  async ensureConversation(data) {
    const row = await queryOne(
      this.pool,
      `insert into public.conversations (listing_id, buyer_id, seller_id)
       values ($1,$2,$3)
       on conflict (listing_id, buyer_id, seller_id)
       do update set updated_at = public.conversations.updated_at
       returning *`,
      [data.listingId, data.buyerId, data.sellerId]
    );
    return toConversation(row);
  }

  async getConversationById(id) {
    const row = await queryOne(
      this.pool,
      `select c.*, buyer.name as buyer_name, seller.name as seller_name
       from public.conversations c
       join public.app_users buyer on buyer.id = c.buyer_id
       join public.app_users seller on seller.id = c.seller_id
       where c.id = $1`,
      [id]
    );
    return toConversation(row);
  }

  async listConversationsForListing(listingId, userId = null) {
    const values = userId ? [listingId, userId] : [listingId];
    const result = await this.pool.query(
      `select c.*, buyer.name as buyer_name, seller.name as seller_name
       from public.conversations c
       join public.app_users buyer on buyer.id = c.buyer_id
       join public.app_users seller on seller.id = c.seller_id
       where c.listing_id = $1
       ${userId ? "and (c.buyer_id = $2 or c.seller_id = $2)" : ""}
       order by c.updated_at desc, c.created_at desc`,
      values
    );
    return result.rows.map(toConversation);
  }

  async createMessage(data) {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const row = await queryOne(
        client,
        `insert into public.chat_messages (conversation_id, listing_id, sender_id, recipient_id, body)
         values ($1,$2,$3,$4,$5)
         returning *`,
        [data.conversationId, data.listingId, data.senderId, data.recipientId, data.body]
      );
      await client.query("update public.conversations set updated_at = now() where id = $1", [data.conversationId]);
      await client.query("COMMIT");
      return toMessage(row);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async listMessages(listingId, filters = {}) {
    const values = filters.conversationId ? [listingId, filters.conversationId] : [listingId];
    const result = await this.pool.query(
      `select * from public.chat_messages
       where listing_id = $1
       ${filters.conversationId ? "and conversation_id = $2" : ""}
       order by created_at asc`,
      values
    );
    return result.rows.map(toMessage);
  }

  async createReview(data) {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const trade = await queryOne(client, "select * from public.trades where id = $1", [data.tradeId]);
      if (!trade) throw new Error("Trade not found");
      if (trade.status !== "completed") throw new Error("Trade must be completed before review");
      if (![trade.buyer_id, trade.seller_id].includes(data.reviewerId)) throw new Error("Reviewer is not a trade participant");
      const revieweeId = trade.buyer_id === data.reviewerId ? trade.seller_id : trade.buyer_id;
      if (data.listingId && data.listingId !== trade.listing_id) throw new Error("Review listing does not match trade");
      if (data.revieweeId && data.revieweeId !== revieweeId) throw new Error("Reviewee does not match trade counterparty");
      const row = await queryOne(
        client,
        `insert into public.reviews (trade_id, listing_id, reviewer_id, reviewee_id, rating, comment)
         values ($1,$2,$3,$4,$5,$6)
         returning *`,
        [trade.id, trade.listing_id, data.reviewerId, revieweeId, data.rating, data.comment ?? ""]
      );
      await client.query(
        `update public.app_users
         set review_count = review_count + 1,
             rating_average = round(((rating_average * review_count + $2::numeric) / (review_count + 1))::numeric, 2),
             updated_at = now()
         where id = $1`,
        [revieweeId, Number(data.rating)]
      );
      await client.query("COMMIT");
      return { id: row.id, tradeId: row.trade_id, listingId: row.listing_id, reviewerId: row.reviewer_id, revieweeId: row.reviewee_id, rating: row.rating, comment: row.comment, createdAt: row.created_at };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async createTrade(data) {
    const row = await queryOne(
      this.pool,
      `insert into public.trades (listing_id, buyer_id, seller_id, price, status, note)
       values ($1,$2,$3,$4,$5,$6)
       returning *`,
      [data.listingId, data.buyerId, data.sellerId, Number(data.price), data.status ?? "requested", data.note ?? ""]
    );
    return toTrade(row);
  }

  async getTradeById(id) {
    const row = await queryOne(this.pool, "select * from public.trades where id = $1", [id]);
    return toTrade(row);
  }

  async updateTradeStatus(id, status) {
    const allowed = {
      accepted: ["requested"],
      rejected: ["requested"],
      cancelled: ["requested", "accepted"],
      completed: ["accepted"]
    };
    if (!allowed[status]) throw new Error("Unsupported trade transition");
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const existing = await queryOne(client, "select * from public.trades where id = $1 for update", [id]);
      if (!existing) throw new Error("Trade not found");
      if (!allowed[status].includes(existing.status)) {
        throw new Error(`Cannot move trade from ${existing.status} to ${status}`);
      }
      const tradeRow = await queryOne(
        client,
        "update public.trades set status = $2, updated_at = now() where id = $1 returning *",
        [id, status]
      );
      let listingRow = null;
      if (status === "accepted") {
        listingRow = await queryOne(client, "update public.listings set status = 'reserved', updated_at = now() where id = $1 returning *", [existing.listing_id]);
      } else if (status === "completed") {
        listingRow = await queryOne(client, "update public.listings set status = 'sold', updated_at = now() where id = $1 returning *", [existing.listing_id]);
      } else if (status === "cancelled" && existing.status === "accepted") {
        listingRow = await queryOne(
          client,
          `update public.listings
           set status = 'available', updated_at = now()
           where id = $1
             and not exists (
               select 1 from public.trades
               where listing_id = $1 and status in ('accepted', 'completed')
             )
           returning *`,
          [existing.listing_id]
        );
      }
      await client.query("COMMIT");
      return { trade: toTrade(tradeRow), item: listingRow ? toListing(listingRow) : await this.getListingById(existing.listing_id) };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async listTrades() {
    const result = await this.pool.query("select * from public.trades order by created_at desc limit 500");
    return result.rows.map(toTrade);
  }

  async createReport(data) {
    const row = await queryOne(
      this.pool,
      `insert into public.reports (listing_id, reporter_id, reason, details)
       values ($1,$2,$3,$4)
       returning *`,
      [data.listingId, data.reporterId, data.reason, data.details ?? ""]
    );
    return { id: row.id, listingId: row.listing_id, reporterId: row.reporter_id, reason: row.reason, details: row.details, status: row.status, createdAt: row.created_at };
  }

  async listReports() {
    const result = await this.pool.query(
      `select r.*, l.title as listing_title, u.name as reporter_name, u.email as reporter_email
       from public.reports r
       join public.listings l on l.id = r.listing_id
       join public.app_users u on u.id = r.reporter_id
       order by r.created_at desc`
    );
    return result.rows.map((row) => ({
      id: row.id,
      listingId: row.listing_id,
      reporterId: row.reporter_id,
      reason: row.reason,
      details: row.details,
      status: row.status,
      createdAt: row.created_at,
      listing: { id: row.listing_id, title: row.listing_title },
      reporter: { id: row.reporter_id, name: row.reporter_name, email: row.reporter_email }
    }));
  }

  async updateReport(id, patch) {
    const row = await queryOne(
      this.pool,
      "update public.reports set status = $2 where id = $1 returning *",
      [id, ["open", "resolved"].includes(patch.status) ? patch.status : "open"]
    );
    return row ? { id: row.id, listingId: row.listing_id, reporterId: row.reporter_id, reason: row.reason, details: row.details, status: row.status, createdAt: row.created_at } : null;
  }

  async listFlaggedListings() {
    const result = await this.pool.query("select * from public.flagged_listings()");
    return result.rows.map(toListing);
  }

  async adminStats() {
    const row = await queryOne(this.pool, "select public.admin_marketplace_stats() as stats", []);
    return row?.stats ?? {};
  }

  async createMlEvent(data) {
    const row = await queryOne(
      this.pool,
      `insert into public.ml_events (event_type, listing_id, user_id, actor_id, payload)
       values ($1,$2,$3,$4,$5)
       returning *`,
      [data.eventType, data.listingId ?? null, data.userId ?? null, data.actorId ?? null, data.payload ?? {}]
    );
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
    const result = await this.pool.query("select * from public.ml_events order by created_at desc limit 500");
    return result.rows.map((row) => ({
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
    const row = await queryOne(
      this.pool,
      `insert into public.ml_predictions
        (listing_id, model_name, model_version, score, decision, threshold_band, signals, explanations, feature_snapshot_hash, raw_response)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       returning *`,
      [
        data.listingId ?? null,
        data.modelName ?? "trust_fraud_classifier",
        data.modelVersion,
        data.score,
        data.decision,
        data.thresholdBand ?? "allow",
        data.signals ?? [],
        data.explanations ?? [],
        data.featureSnapshotHash ?? null,
        data.rawResponse ?? {}
      ]
    );
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
    const result = await this.pool.query("select * from public.ml_predictions order by created_at desc limit 500");
    return result.rows.map((row) => ({
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
    const row = await queryOne(
      this.pool,
      `insert into public.ml_labels (source_type, source_id, listing_id, actor_id, label, confidence, notes)
       values ($1,$2,$3,$4,$5,$6,$7)
       returning *`,
      [data.sourceType, data.sourceId ?? null, data.listingId ?? null, data.actorId ?? null, data.label, data.confidence ?? 1, data.notes ?? ""]
    );
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
    const result = await this.pool.query("select * from public.ml_labels order by created_at desc limit 500");
    return result.rows.map((row) => ({
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
