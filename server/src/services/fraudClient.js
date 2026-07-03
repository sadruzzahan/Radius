import { config } from "../config.js";

export async function scoreListingWithMl(listing, context) {
  try {
    const response = await fetch(`${config.mlServiceUrl}/score`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        listing: {
          category: listing.category,
          condition: listing.condition,
          price: Number(listing.price),
          brand: listing.brand,
          description: listing.description,
          photo_hashes: listing.photos?.map((photo) => photo.hash).filter(Boolean) ?? [],
          seller: context.seller
        },
        existing_hashes: context.existingHashes,
        existing_descriptions: context.existingDescriptions
      })
    });
    if (!response.ok) throw new Error(`ML service ${response.status}`);
    return await response.json();
  } catch {
    return {
      score: Number(listing.price) > 50000 ? 35 : 0,
      decision: "allow",
      signals: ["ml_service_unavailable"],
      explanations: ["FastAPI service was unavailable; used conservative fallback."]
    };
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
