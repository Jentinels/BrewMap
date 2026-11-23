import mongoose from "mongoose";

const { Schema, model } = mongoose;
const id = Schema.Types.ObjectId;

export const User = model("User", new Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ["user", "owner", "admin"], default: "user" },
  disabled: { type: Boolean, default: false },
}, { timestamps: true }));

const hours = { open: String, close: String };
const day = { type: new Schema(hours, { _id: false }), default: null };
const flag = { type: Boolean, default: null }; // null = not declared

const cafeSchema = new Schema({
  name: { type: String, required: true, trim: true },
  address: { type: String, default: "", trim: true },
  description: { type: String, default: "" },
  location: {
    type: { type: String, enum: ["Point"], default: "Point" },
    coordinates: { type: [Number], required: true }, // [lng, lat]
  },
  openingHours: { mon: day, tue: day, wed: day, thu: day, fri: day, sat: day, sun: day },
  priceRange: { type: String, enum: ["low", "mid", "high"], default: null },
  amenities: { wifi: flag, outlets: flag, quietSpace: flag },
  // "owner" = declared by the cafe owner, "demo" = sample values for the demo, "unset" = nobody has declared them yet
  attributesSource: { type: String, enum: ["unset", "owner", "demo"], default: "unset" },
  menuHighlights: { type: [String], default: [] },
  photos: { type: [String], default: [] },
  owner: { type: id, ref: "User", default: null },
  status: { type: String, enum: ["pending", "approved", "rejected", "changes_requested"], default: "pending" },
  adminNote: { type: String, default: "" },
  ratingAvg: { type: Number, default: 0 },
  ratingCount: { type: Number, default: 0 },
  osmId: { type: String, unique: true, sparse: true },
}, { timestamps: true });
cafeSchema.index({ location: "2dsphere" });
export const Cafe = model("Cafe", cafeSchema);

const linkSchema = new Schema({
  cafe: { type: id, ref: "Cafe", required: true },
  platform: { type: String, enum: ["grab", "foodpanda"], required: true },
  url: { type: String, required: true },
  verified: { type: Boolean, default: false },
  verifiedAt: Date,
  note: { type: String, default: "" },
}, { timestamps: true });
linkSchema.index({ cafe: 1, platform: 1 }, { unique: true });
export const DeliveryLink = model("DeliveryLink", linkSchema);

export const Announcement = model("Announcement", new Schema({
  cafe: { type: id, ref: "Cafe", required: true, index: true },
  title: { type: String, required: true, trim: true },
  body: { type: String, default: "" },
}, { timestamps: true }));

const reviewSchema = new Schema({
  cafe: { type: id, ref: "Cafe", required: true },
  user: { type: id, ref: "User", required: true },
  rating: { type: Number, min: 1, max: 5, required: true },
  comment: { type: String, default: "" },
  status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
}, { timestamps: true });
reviewSchema.index({ cafe: 1, user: 1 }, { unique: true });
export const Review = model("Review", reviewSchema);

const favSchema = new Schema({ user: { type: id, ref: "User", required: true }, cafe: { type: id, ref: "Cafe", required: true } }, { timestamps: true });
favSchema.index({ user: 1, cafe: 1 }, { unique: true });
export const Favorite = model("Favorite", favSchema);

const eventSchema = new Schema({
  type: { type: String, enum: ["view", "link_click"], required: true },
  cafe: { type: id, ref: "Cafe", required: true },
  platform: { type: String, enum: ["grab", "foodpanda"] },
  user: { type: id, ref: "User", default: null },
}, { timestamps: { createdAt: true, updatedAt: false } });
eventSchema.index({ cafe: 1, type: 1, createdAt: -1 });
export const Event = model("Event", eventSchema);
