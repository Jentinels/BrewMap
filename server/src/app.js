import express from "express";
import cors from "cors";
import helmet from "helmet";
import auth from "./routes/auth.js";
import cafes from "./routes/cafes.js";
import favorites from "./routes/favorites.js";
import owner from "./routes/owner.js";
import admin from "./routes/admin.js";
import { errorHandler, notFound } from "./middleware.js";

// Built without listening so the tests can call it directly.
export function createApp() {
  const app = express();
  app.use(helmet());
  app.use(cors()); // the mobile app is not a browser, so there is no origin to restrict
  app.use(express.json({ limit: "100kb" }));

  app.get("/health", (_req, res) => res.json({ ok: true }));
  app.use("/api/auth", auth);
  app.use("/api/cafes", cafes);
  app.use("/api/favorites", favorites);
  app.use("/api/owner", owner);
  app.use("/api/admin", admin);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
