import { describe, expect, it } from "vitest";
import { distanceKm, filterListingsByRadius } from "./geo.js";

describe("geospatial filtering", () => {
  it("computes short Dhaka neighborhood distance in kilometers", () => {
    const dhanmondi = { lat: 23.7465, lng: 90.376 };
    const kalabagan = { lat: 23.7505, lng: 90.384 };

    expect(distanceKm(dhanmondi, kalabagan)).toBeGreaterThan(0.8);
    expect(distanceKm(dhanmondi, kalabagan)).toBeLessThan(1.1);
  });

  it("returns only active nearby listings within the requested radius", () => {
    const origin = { lat: 23.7465, lng: 90.376 };
    const listings = [
      { id: "near", status: "available", location: { lat: 23.7505, lng: 90.384 } },
      { id: "far", status: "available", location: { lat: 23.8103, lng: 90.4125 } },
      { id: "sold-near", status: "sold", location: { lat: 23.747, lng: 90.377 } }
    ];

    const visible = filterListingsByRadius(listings, origin, 2);

    expect(visible.map((listing) => listing.id)).toEqual(["near"]);
    expect(visible[0].distanceKm).toBeLessThan(2);
  });
});
