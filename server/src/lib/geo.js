const EARTH_RADIUS_KM = 6371.0088;

const toRadians = (degrees) => (degrees * Math.PI) / 180;

export function distanceKm(a, b) {
  const lat1 = toRadians(Number(a.lat));
  const lat2 = toRadians(Number(b.lat));
  const deltaLat = toRadians(Number(b.lat) - Number(a.lat));
  const deltaLng = toRadians(Number(b.lng) - Number(a.lng));
  const h =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

export function filterListingsByRadius(listings, origin, radiusKm) {
  return listings
    .filter((listing) => listing.status !== "sold")
    .map((listing) => ({
      ...listing,
      distanceKm: Number(distanceKm(origin, listing.location).toFixed(2))
    }))
    .filter((listing) => listing.distanceKm <= Number(radiusKm))
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

export const DHAKA_DEFAULT_LOCATION = { lat: 23.7465, lng: 90.376 };
