import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { z } from "zod";
import { config } from "./config.js";
import { User } from "./models.js";

export const signToken = (user) => jwt.sign({ sub: String(user._id), role: user.role }, config.jwtSecret, { expiresIn: config.jwtExpires });

export const publicUser = (u) => ({ id: String(u._id), name: u.name, email: u.email, role: u.role, disabled: !!u.disabled });

async function userFromRequest(req) {
  const m = /^Bearer (.+)$/.exec(req.headers.authorization || "");
  if (!m) return null;
  let payload;
  try { payload = jwt.verify(m[1], config.jwtSecret); } catch { return null; }
  const user = await User.findById(payload.sub);
  return user && !user.disabled ? user : null;
}

// Token required. The role is read from the database, not from the token, so a role change or a disabled account takes effect at once.
export async function requireAuth(req, res, next) {
  const user = await userFromRequest(req);
  if (!user) return res.status(401).json({ error: "Login required" });
  req.user = user;
  next();
}

// Token optional: fills req.user when a valid token is sent.
export async function optionalAuth(req, _res, next) {
  req.user = await userFromRequest(req);
  next();
}

export const requireRole = (...roles) => (req, res, next) =>
  roles.includes(req.user?.role) ? next() : res.status(403).json({ error: "You do not have access to this" });

export const validId = (req, res, next) => {
  for (const v of Object.values(req.params)) if (!mongoose.isValidObjectId(v)) return res.status(400).json({ error: "Invalid id" });
  next();
};

export const notFound = (_req, res) => res.status(404).json({ error: "Not found" });

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  if (err instanceof z.ZodError) {
    return res.status(400).json({ error: "Validation failed", issues: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })) });
  }
  if (err?.code === 11000) return res.status(409).json({ error: "Already exists" });
  console.error(err);
  res.status(500).json({ error: "Something went wrong on the server" });
}
