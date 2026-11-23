import "dotenv/config";

export const config = {
  port: Number(process.env.PORT) || 4000,
  mongoUri: process.env.MONGODB_URI || "",
  // A fixed fallback is allowed only outside production so local runs and tests work without setup.
  jwtSecret: process.env.JWT_SECRET || (process.env.NODE_ENV === "production" ? "" : "dev-only-secret-change-me"),
  jwtExpires: process.env.JWT_EXPIRES || "7d",
};

// Bounding box of the Indang municipality boundary (OpenStreetMap relation 1491192). BrewMap only lists cafes in Indang.
export const INDANG_BBOX = { minLat: 14.1220769, maxLat: 14.2464276, minLng: 120.8169037, maxLng: 120.9293018 };

export const inIndang = ({ lat, lng }) =>
  lat >= INDANG_BBOX.minLat && lat <= INDANG_BBOX.maxLat && lng >= INDANG_BBOX.minLng && lng <= INDANG_BBOX.maxLng;
