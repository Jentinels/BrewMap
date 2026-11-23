import mongoose from "mongoose";
import { config } from "./config.js";
import { createApp } from "./app.js";

if (!config.mongoUri) throw new Error("MONGODB_URI is not set. Copy .env.example to .env and add your MongoDB Atlas connection string.");
if (!config.jwtSecret) throw new Error("JWT_SECRET is not set.");

await mongoose.connect(config.mongoUri);
// Listen on all interfaces so a phone on the same Wi-Fi can reach the API during development.
createApp().listen(config.port, "0.0.0.0", () => console.log(`BrewMap API listening on port ${config.port}`));
