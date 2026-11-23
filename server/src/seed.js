// Loads the Indang cafes from OpenStreetMap, plus demo accounts. Add --demo for clearly labeled sample cafes, links, and reviews.
// Run it again at any time: existing records are kept, nothing is overwritten.
import fs from "node:fs";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { config } from "./config.js";
import { Announcement, Cafe, DeliveryLink, Favorite, Review, User } from "./models.js";
import { refreshRating } from "./lib.js";

if (!config.mongoUri) throw new Error("MONGODB_URI is not set (see .env.example).");
const demo = process.argv.includes("--demo");
await mongoose.connect(config.mongoUri);

const password = process.env.SEED_PASSWORD || "brewmap-demo-1234";
const passwordHash = await bcrypt.hash(password, 10);
const account = async (name, email, role) =>
  (await User.findOneAndUpdate({ email }, { $setOnInsert: { name, email, role, passwordHash } }, { upsert: true, returnDocument: "after" }));
const admin = await account("BrewMap Admin", "admin@brewmap.test", "admin");
const owner = await account("Demo Cafe Owner", "owner@brewmap.test", "owner");
const user = await account("Demo User", "user@brewmap.test", "user");

// 1. Real Indang cafes: name and location only. Nothing about their Wi-Fi, hours, or prices is invented.
const { cafes } = JSON.parse(fs.readFileSync(new URL("../data/indang-cafes.json", import.meta.url), "utf8"));
for (const c of cafes) {
  await Cafe.updateOne(
    { osmId: c.osmId },
    { $setOnInsert: { osmId: c.osmId, name: c.name, address: "Indang, Cavite", location: { type: "Point", coordinates: [c.lng, c.lat] }, status: "approved", attributesSource: "unset" } },
    { upsert: true },
  );
}
console.log(`Indang cafes from OpenStreetMap: ${cafes.length}`);

// 2. Demo-only listings. Their names say "demo" and their values are made up so the filters and links can be shown.
if (demo) {
  const everyDay = { mon: { open: "08:00", close: "21:00" }, tue: { open: "08:00", close: "21:00" }, wed: { open: "08:00", close: "21:00" }, thu: { open: "08:00", close: "21:00" }, fri: { open: "08:00", close: "22:00" }, sat: { open: "09:00", close: "22:00" }, sun: null };
  const samples = [
    { osmId: "demo:a", name: "Sample Cafe A (demo)", lat: 14.1962, lng: 120.8795, price: "mid", amenities: { wifi: true, outlets: true, quietSpace: true }, hours: everyDay, links: true, status: "approved" },
    { osmId: "demo:b", name: "Sample Cafe B (demo)", lat: 14.194, lng: 120.8815, price: "low", amenities: { wifi: true, outlets: false, quietSpace: false }, hours: { ...everyDay, mon: { open: "14:00", close: "02:00" } }, links: true, status: "approved" },
    { osmId: "demo:c", name: "Sample Cafe C (demo, waiting for approval)", lat: 14.198, lng: 120.877, price: "high", amenities: { wifi: false, outlets: true, quietSpace: true }, hours: everyDay, links: false, status: "pending" },
  ];
  for (const s of samples) {
    const cafe = await Cafe.findOneAndUpdate({ osmId: s.osmId }, { $setOnInsert: {
      osmId: s.osmId, name: s.name, address: "Demo address, Indang, Cavite", description: "Sample listing for the BrewMap demo. Not a real cafe.",
      location: { type: "Point", coordinates: [s.lng, s.lat] }, priceRange: s.price, amenities: s.amenities, openingHours: s.hours,
      menuHighlights: ["Sample latte", "Sample pastry"], owner: owner._id, status: s.status, attributesSource: "demo",
    } }, { upsert: true, returnDocument: "after" });
    if (s.links) {
      // These point to the platforms' home pages, not to a real cafe page.
      await DeliveryLink.updateOne({ cafe: cafe._id, platform: "grab" }, { $setOnInsert: { url: "https://food.grab.com/ph/en/", verified: true, verifiedAt: new Date() } }, { upsert: true });
      await DeliveryLink.updateOne({ cafe: cafe._id, platform: "foodpanda" }, { $setOnInsert: { url: "https://www.foodpanda.ph/", verified: false } }, { upsert: true });
    }
    if (s.status === "approved") {
      await Announcement.updateOne({ cafe: cafe._id, title: "Demo announcement" }, { $setOnInsert: { body: "Sample promo for the demo." } }, { upsert: true });
      await Review.updateOne({ cafe: cafe._id, user: user._id }, { $setOnInsert: { rating: 5, comment: "Sample review for the demo.", status: "approved" } }, { upsert: true });
      await Favorite.updateOne({ user: user._id, cafe: cafe._id }, {}, { upsert: true });
      await refreshRating(cafe._id);
    }
  }
  console.log(`Demo listings: ${samples.length}`);
}

console.log(`Accounts: ${admin.email}, ${owner.email}, ${user.email}`);
await mongoose.disconnect();
