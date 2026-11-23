import { Router } from "express";
import { Announcement, Cafe, DeliveryLink, Event, Favorite, Review, User } from "../models.js";
import { publicUser, requireAuth, requireRole, validId } from "../middleware.js";
import { cafeDecisionSchema, linkVerifySchema, reviewDecisionSchema, userPatchSchema } from "../schemas.js";
import { refreshRating } from "../lib.js";

const router = Router();
router.use(requireAuth, requireRole("admin"));

router.get("/overview", async (_req, res) => {
  const [byStatus, users, owners, pendingReviews, pending, clicks] = await Promise.all([
    Cafe.aggregate([{ $group: { _id: "$status", n: { $sum: 1 } } }]),
    User.countDocuments({ role: "user" }),
    User.countDocuments({ role: "owner" }),
    Review.countDocuments({ status: "pending" }),
    Cafe.find({ status: "pending" }).sort({ createdAt: -1 }).limit(10).populate("owner", "name").lean(),
    Event.aggregate([{ $match: { type: "link_click" } }, { $group: { _id: { cafe: "$cafe", platform: "$platform" }, n: { $sum: 1 } } }]),
  ]);
  const count = (s) => byStatus.find((x) => x._id === s)?.n ?? 0;

  const perCafe = new Map();
  for (const c of clicks) {
    const key = String(c._id.cafe);
    const row = perCafe.get(key) ?? { cafeId: key, grab: 0, foodpanda: 0 };
    row[c._id.platform] += c.n;
    perCafe.set(key, row);
  }
  const top = [...perCafe.values()].sort((a, b) => b.grab + b.foodpanda - (a.grab + a.foodpanda)).slice(0, 5);
  const names = new Map((await Cafe.find({ _id: { $in: top.map((t) => t.cafeId) } }, "name").lean()).map((c) => [String(c._id), c.name]));

  res.json({
    cafes: { approved: count("approved"), pending: count("pending"), rejected: count("rejected"), changesRequested: count("changes_requested") },
    users, owners, pendingReviews,
    mostClicked: top.map((t) => ({ ...t, name: names.get(t.cafeId) ?? "Removed cafe", total: t.grab + t.foodpanda })),
    pendingCafes: pending.map((c) => ({ id: String(c._id), name: c.name, address: c.address, ownerName: c.owner?.name ?? "", createdAt: c.createdAt })),
  });
});

router.get("/cafes", async (req, res) => {
  const status = ["pending", "approved", "rejected", "changes_requested"].includes(req.query.status) ? req.query.status : "pending";
  const cafes = await Cafe.find({ status }).sort({ createdAt: -1 }).populate("owner", "name email").lean();
  res.json({ cafes: cafes.map((c) => ({ id: String(c._id), name: c.name, address: c.address, status: c.status, ownerName: c.owner?.name ?? "", createdAt: c.createdAt })) });
});

router.post("/cafes/:id/decision", validId, async (req, res) => {
  const d = cafeDecisionSchema.parse(req.body);
  const status = { approve: "approved", reject: "rejected", changes: "changes_requested" }[d.decision];
  const cafe = await Cafe.findByIdAndUpdate(req.params.id, { status, adminNote: d.decision === "approve" ? "" : d.note }, { returnDocument: "after" });
  if (!cafe) return res.status(404).json({ error: "Cafe not found" });
  res.json({ id: String(cafe._id), status: cafe.status });
});

// Remove a listing together with everything attached to it.
router.delete("/cafes/:id", validId, async (req, res) => {
  const cafe = await Cafe.findByIdAndDelete(req.params.id);
  if (!cafe) return res.status(404).json({ error: "Cafe not found" });
  await Promise.all([DeliveryLink, Announcement, Review, Favorite, Event].map((m) => m.deleteMany({ cafe: cafe._id })));
  res.status(204).end();
});

router.post("/delivery-links/:id/verify", validId, async (req, res) => {
  const d = linkVerifySchema.parse(req.body);
  const link = await DeliveryLink.findByIdAndUpdate(req.params.id, { verified: d.verified, verifiedAt: d.verified ? new Date() : null, note: d.note }, { returnDocument: "after" });
  if (!link) return res.status(404).json({ error: "Link not found" });
  res.json({ id: String(link._id), verified: link.verified });
});

router.get("/reviews", async (req, res) => {
  const status = ["pending", "approved", "rejected"].includes(req.query.status) ? req.query.status : "pending";
  const reviews = await Review.find({ status }).sort({ createdAt: -1 }).limit(50).populate("user", "name").populate("cafe", "name").lean();
  res.json({ reviews: reviews.map((r) => ({ id: String(r._id), rating: r.rating, comment: r.comment, status: r.status, userName: r.user?.name ?? "", cafeName: r.cafe?.name ?? "", createdAt: r.createdAt })) });
});

router.post("/reviews/:id/decision", validId, async (req, res) => {
  const d = reviewDecisionSchema.parse(req.body);
  const review = await Review.findByIdAndUpdate(req.params.id, { status: d.decision === "approve" ? "approved" : "rejected" }, { returnDocument: "after" });
  if (!review) return res.status(404).json({ error: "Review not found" });
  await refreshRating(review.cafe);
  res.json({ id: String(review._id), status: review.status });
});

router.get("/users", async (_req, res) => {
  const users = await User.find().sort({ createdAt: -1 }).limit(200);
  res.json({ users: users.map(publicUser) });
});

router.patch("/users/:id", validId, async (req, res) => {
  const d = userPatchSchema.parse(req.body);
  if (String(req.user._id) === req.params.id) return res.status(400).json({ error: "You cannot disable your own account" });
  const user = await User.findByIdAndUpdate(req.params.id, { disabled: d.disabled }, { returnDocument: "after" });
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ user: publicUser(user) });
});

export default router;
