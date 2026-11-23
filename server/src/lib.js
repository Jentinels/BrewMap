import mongoose from "mongoose";
import { Cafe, Review } from "./models.js";
import { isOpenNow } from "./hours.js";

export const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
export const toGeo = ({ lat, lng }) => ({ type: "Point", coordinates: [lng, lat] });

// Card shown in lists and on the map. `c` is a plain object (lean query or aggregate result).
export const cafeSummary = (c, platforms = [], distanceMeters = null) => ({
  id: String(c._id),
  name: c.name,
  address: c.address,
  location: { lat: c.location.coordinates[1], lng: c.location.coordinates[0] },
  priceRange: c.priceRange ?? null,
  amenities: { wifi: c.amenities?.wifi ?? null, outlets: c.amenities?.outlets ?? null, quietSpace: c.amenities?.quietSpace ?? null },
  attributesSource: c.attributesSource,
  isOpenNow: isOpenNow(c.openingHours),
  ratingAvg: c.ratingAvg,
  ratingCount: c.ratingCount,
  deliveryPlatforms: platforms,
  distanceKm: distanceMeters == null ? null : Math.round(distanceMeters / 10) / 100,
});

export const isStaffOf = (user, cafe) => !!user && (user.role === "admin" || (cafe.owner && String(cafe.owner) === String(user._id)));

export async function refreshRating(cafeId) {
  const [r] = await Review.aggregate([
    { $match: { cafe: new mongoose.Types.ObjectId(String(cafeId)), status: "approved" } },
    { $group: { _id: null, avg: { $avg: "$rating" }, n: { $sum: 1 } } },
  ]);
  await Cafe.updateOne({ _id: cafeId }, { ratingAvg: r ? Math.round(r.avg * 10) / 10 : 0, ratingCount: r ? r.n : 0 });
}
