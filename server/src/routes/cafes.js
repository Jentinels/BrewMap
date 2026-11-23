import { Router } from "express";
import { Announcement, Cafe, DeliveryLink, Event, Favorite, Review } from "../models.js";
import { optionalAuth, requireAuth, requireRole, validId } from "../middleware.js";
import { announcementSchema, cafeCreateSchema, cafeQuerySchema, cafeUpdateSchema, clickSchema, deliveryLinksSchema, reviewSchema } from "../schemas.js";
import { inIndang } from "../config.js";
import { cafeSummary, escapeRegex, isStaffOf, toGeo } from "../lib.js";

const router = Router();
const OUTSIDE = { error: "BrewMap only lists cafes in Indang, Cavite" };

// Map and list search: approved cafes only, nearest first when a location is sent.
router.get("/", async (req, res) => {
  const q = cafeQuerySchema.parse(req.query);
  const filter = { status: "approved" };
  if (q.wifi !== undefined) filter["amenities.wifi"] = q.wifi;
  if (q.outlets !== undefined) filter["amenities.outlets"] = q.outlets;
  if (q.quiet !== undefined) filter["amenities.quietSpace"] = q.quiet;
  if (q.price) filter.priceRange = q.price;
  if (q.q) { const rx = new RegExp(escapeRegex(q.q), "i"); filter.$or = [{ name: rx }, { address: rx }]; }

  const nearby = q.lat !== undefined && q.lng !== undefined;
  const cafes = nearby
    ? await Cafe.aggregate([{ $geoNear: { near: { type: "Point", coordinates: [q.lng, q.lat] }, distanceField: "distanceMeters", maxDistance: q.radiusKm * 1000, spherical: true, query: filter } }])
    : await Cafe.find(filter).sort({ name: 1 }).lean();

  const links = await DeliveryLink.find({ cafe: { $in: cafes.map((c) => c._id) } }).lean();
  const platformsOf = (id) => links.filter((l) => String(l.cafe) === String(id)).map((l) => l.platform);

  let out = cafes.map((c) => cafeSummary(c, platformsOf(c._id), c.distanceMeters ?? null));
  if (q.openNow !== undefined) out = out.filter((c) => c.isOpenNow === q.openNow);
  if (q.delivery) out = out.filter((c) => (q.delivery === "any" ? c.deliveryPlatforms.length > 0 : c.deliveryPlatforms.includes(q.delivery)));
  res.json({ cafes: out });
});

router.get("/:id", validId, optionalAuth, async (req, res) => {
  const cafe = await Cafe.findById(req.params.id).lean();
  const staff = cafe && isStaffOf(req.user, cafe);
  if (!cafe || (cafe.status !== "approved" && !staff)) return res.status(404).json({ error: "Cafe not found" });

  const [links, announcements, reviews, fav] = await Promise.all([
    DeliveryLink.find({ cafe: cafe._id }).lean(),
    Announcement.find({ cafe: cafe._id }).sort({ createdAt: -1 }).limit(5).lean(),
    Review.find({ cafe: cafe._id, status: "approved" }).sort({ createdAt: -1 }).limit(20).populate("user", "name").lean(),
    req.user ? Favorite.exists({ user: req.user._id, cafe: cafe._id }) : null,
  ]);
  if (!staff) await Event.create({ type: "view", cafe: cafe._id, user: req.user?._id ?? null });

  res.json({
    ...cafeSummary(cafe, links.map((l) => l.platform)),
    description: cafe.description,
    openingHours: cafe.openingHours,
    menuHighlights: cafe.menuHighlights,
    photos: cafe.photos,
    status: cafe.status,
    adminNote: staff ? cafe.adminNote : undefined,
    deliveryLinks: links.map((l) => ({ id: String(l._id), platform: l.platform, url: l.url, verified: l.verified })),
    announcements: announcements.map((a) => ({ id: String(a._id), title: a.title, body: a.body, createdAt: a.createdAt })),
    reviews: reviews.map((r) => ({ id: String(r._id), rating: r.rating, comment: r.comment, userName: r.user?.name ?? "User", createdAt: r.createdAt })),
    isFavorite: !!fav,
  });
});

// A cafe owner registers a cafe; it stays pending until the administrator approves it.
router.post("/", requireAuth, requireRole("owner"), async (req, res) => {
  const d = cafeCreateSchema.parse(req.body);
  if (!inIndang(d.location)) return res.status(400).json(OUTSIDE);
  const cafe = await Cafe.create({
    name: d.name, address: d.address, description: d.description ?? "", location: toGeo(d.location),
    openingHours: d.openingHours ?? {}, priceRange: d.priceRange ?? null, amenities: d.amenities ?? {},
    menuHighlights: d.menuHighlights ?? [], photos: d.photos ?? [],
    owner: req.user._id, status: "pending", attributesSource: "owner",
  });
  res.status(201).json({ id: String(cafe._id), status: cafe.status });
});

async function editableCafe(req, res) {
  const cafe = await Cafe.findById(req.params.id);
  if (!cafe || !isStaffOf(req.user, cafe)) { res.status(404).json({ error: "Cafe not found" }); return null; }
  return cafe;
}

router.patch("/:id", validId, requireAuth, async (req, res) => {
  const cafe = await editableCafe(req, res);
  if (!cafe) return;
  const d = cafeUpdateSchema.parse(req.body);
  if (d.location && !inIndang(d.location)) return res.status(400).json(OUTSIDE);
  for (const k of ["name", "address", "description", "priceRange", "menuHighlights", "photos"]) if (d[k] !== undefined) cafe[k] = d[k];
  if (d.location) cafe.location = toGeo(d.location);
  if (d.openingHours) { for (const [k, v] of Object.entries(d.openingHours)) cafe.openingHours[k] = v; cafe.markModified("openingHours"); }
  if (d.amenities) for (const [k, v] of Object.entries(d.amenities)) if (v !== undefined) cafe.amenities[k] = v;
  if (d.priceRange !== undefined || d.openingHours || d.amenities) cafe.attributesSource = "owner";
  if (cafe.status === "changes_requested" && req.user.role === "owner") { cafe.status = "pending"; cafe.adminNote = ""; } // back to the administrator
  await cafe.save();
  res.json({ id: String(cafe._id), status: cafe.status });
});

// Set or clear the Grab and foodpanda links. A changed link must be verified again by the administrator.
router.put("/:id/delivery-links", validId, requireAuth, async (req, res) => {
  const cafe = await editableCafe(req, res);
  if (!cafe) return;
  const d = deliveryLinksSchema.parse(req.body);
  for (const platform of ["grab", "foodpanda"]) {
    if (d[platform] === undefined) continue;
    if (d[platform] === null) await DeliveryLink.deleteOne({ cafe: cafe._id, platform });
    else await DeliveryLink.findOneAndUpdate({ cafe: cafe._id, platform }, { url: d[platform], verified: false, verifiedAt: null, note: "" }, { upsert: true, setDefaultsOnInsert: true });
  }
  const links = await DeliveryLink.find({ cafe: cafe._id }).lean();
  res.json({ deliveryLinks: links.map((l) => ({ id: String(l._id), platform: l.platform, url: l.url, verified: l.verified })) });
});

// Record a tap on a delivery link and return the link to open.
router.post("/:id/click", validId, optionalAuth, async (req, res) => {
  const { platform } = clickSchema.parse(req.body);
  const cafe = await Cafe.findOne({ _id: req.params.id, status: "approved" }).lean();
  const link = cafe && (await DeliveryLink.findOne({ cafe: cafe._id, platform }).lean());
  if (!link) return res.status(404).json({ error: "This cafe has no link for that platform" });
  await Event.create({ type: "link_click", cafe: cafe._id, platform, user: req.user?._id ?? null });
  res.json({ url: link.url });
});

router.post("/:id/announcements", validId, requireAuth, async (req, res) => {
  const cafe = await editableCafe(req, res);
  if (!cafe) return;
  const d = announcementSchema.parse(req.body);
  const a = await Announcement.create({ cafe: cafe._id, ...d });
  res.status(201).json({ id: String(a._id), title: a.title, body: a.body, createdAt: a.createdAt });
});

// A review is saved as pending and only shows after the administrator approves it.
router.post("/:id/reviews", validId, requireAuth, async (req, res) => {
  const d = reviewSchema.parse(req.body);
  const cafe = await Cafe.findOne({ _id: req.params.id, status: "approved" }).lean();
  if (!cafe) return res.status(404).json({ error: "Cafe not found" });
  if (cafe.owner && String(cafe.owner) === String(req.user._id)) return res.status(403).json({ error: "You cannot review your own cafe" });
  const review = await Review.findOneAndUpdate({ cafe: cafe._id, user: req.user._id }, { ...d, status: "pending" }, { upsert: true, returnDocument: "after", setDefaultsOnInsert: true });
  res.status(201).json({ id: String(review._id), status: review.status, message: "Thank you. Your review will appear after the administrator approves it." });
});

export default router;
