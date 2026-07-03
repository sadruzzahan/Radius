import bcrypt from "bcryptjs";
import { toListing, toPublicUser } from "./mappers.js";

const nearbySql = `
  select * from public.nearby_listings($1,$2,$3,$4,$5,$6,$7,$8,$9)
`;

const listingByIdSql = `select * from public.listing_by_id($1)`;

function queryOne(pool, text, values) {
  return pool.query(text, values).then((result) => result.rows[0] ?? null);
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

  async createMessage(data) {
    const row = await queryOne(
      this.pool,
      `insert into public.chat_messages (listing_id, sender_id, recipient_id, body)
       values ($1,$2,$3,$4)
       returning *`,
      [data.listingId, data.senderId, data.recipientId, data.body]
    );
    return { id: row.id, listingId: row.listing_id, senderId: row.sender_id, recipientId: row.recipient_id, body: row.body, createdAt: row.created_at };
  }

  async listMessages(listingId) {
    const result = await this.pool.query(
      "select * from public.chat_messages where listing_id = $1 order by created_at asc",
      [listingId]
    );
    return result.rows.map((row) => ({ id: row.id, listingId: row.listing_id, senderId: row.sender_id, recipientId: row.recipient_id, body: row.body, createdAt: row.created_at }));
  }

  async createReview(data) {
    const row = await queryOne(
      this.pool,
      `insert into public.reviews (trade_id, listing_id, reviewer_id, reviewee_id, rating, comment)
       values ($1,$2,$3,$4,$5,$6)
       returning *`,
      [data.tradeId, data.listingId, data.reviewerId, data.revieweeId, data.rating, data.comment ?? ""]
    );
    return { id: row.id, tradeId: row.trade_id, listingId: row.listing_id, reviewerId: row.reviewer_id, revieweeId: row.reviewee_id, rating: row.rating, comment: row.comment, createdAt: row.created_at };
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
}
