import { z } from "zod";
import { DAYS } from "./hours.js";

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM, 24-hour");
const hours = z.object({ open: time, close: time }).nullable();
const tri = z.boolean().nullable().optional(); // true, false, or not declared

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(60),
  email: z.string().trim().toLowerCase().pipe(z.email()),
  password: z.string().min(8).max(100),
  role: z.enum(["user", "owner"]).default("user"), // an administrator is never created through this route
});

export const loginSchema = z.object({ email: z.string().trim().toLowerCase().pipe(z.email()), password: z.string().min(1) });

const cafeFields = {
  name: z.string().trim().min(2).max(80),
  address: z.string().trim().min(3).max(200),
  description: z.string().trim().max(500),
  location: z.object({ lat: z.number(), lng: z.number() }),
  openingHours: z.object(Object.fromEntries(DAYS.map((d) => [d, hours.optional()]))),
  priceRange: z.enum(["low", "mid", "high"]).nullable(),
  amenities: z.object({ wifi: tri, outlets: tri, quietSpace: tri }),
  menuHighlights: z.array(z.string().trim().min(1).max(60)).max(10),
  photos: z.array(z.url()).max(8),
};
export const cafeCreateSchema = z.object({ ...cafeFields }).partial().required({ name: true, address: true, location: true });
export const cafeUpdateSchema = z.object({ ...cafeFields }).partial();

const flagQuery = z.enum(["true", "false"]).optional().transform((v) => (v === undefined ? undefined : v === "true"));
export const cafeQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  radiusKm: z.coerce.number().positive().max(50).default(10),
  q: z.string().trim().max(60).optional(),
  wifi: flagQuery,
  outlets: flagQuery,
  quiet: flagQuery,
  price: z.enum(["low", "mid", "high"]).optional(),
  openNow: flagQuery,
  delivery: z.enum(["grab", "foodpanda", "any"]).optional(),
});

// A delivery link must be an https link on the platform's own domain.
const platformHost = { grab: /(^|\.)grab\.com$/, foodpanda: /(^|\.)foodpanda\.(ph|com)$/ };
const linkUrl = (platform) => z.url().refine((u) => {
  try { const x = new URL(u); return x.protocol === "https:" && platformHost[platform].test(x.hostname); } catch { return false; }
}, `Must be an https link on the ${platform} website`);
export const deliveryLinksSchema = z.object({ grab: linkUrl("grab").nullable().optional(), foodpanda: linkUrl("foodpanda").nullable().optional() });

export const clickSchema = z.object({ platform: z.enum(["grab", "foodpanda"]) });
export const announcementSchema = z.object({ title: z.string().trim().min(2).max(100), body: z.string().trim().max(500).default("") });
export const reviewSchema = z.object({ rating: z.number().int().min(1).max(5), comment: z.string().trim().max(500).default("") });
export const cafeDecisionSchema = z.object({ decision: z.enum(["approve", "reject", "changes"]), note: z.string().trim().max(300).default("") })
  .refine((d) => d.decision === "approve" || d.note.length > 0, { message: "A note is required to reject or request changes", path: ["note"] });
export const reviewDecisionSchema = z.object({ decision: z.enum(["approve", "reject"]) });
export const linkVerifySchema = z.object({ verified: z.boolean(), note: z.string().trim().max(200).default("") });
export const userPatchSchema = z.object({ disabled: z.boolean() });
