export function toPublicUser(row) {
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

export function toListing(row) {
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
