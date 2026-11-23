import { Router } from "express";
import { Cafe, DeliveryLink, Event, Favorite } from "../models.js";
import { requireAuth, requireRole, validId } from "../middleware.js";

const router = Router();
router.use(requireAuth, requireRole("owner"));

router.get("/cafes", async (req, res) => {
  const cafes = await Cafe.find({ owner: req.user._id }).sort({ createdAt: -1 }).lean();
  const links = await DeliveryLink.find({ cafe: { $in: cafes.map((c) => c._id) } }).lean();
  res.json({
    cafes: cafes.map((c) => ({
      id: String(c._id), name: c.name, address: c.address, status: c.status, adminNote: c.adminNote,
      deliveryLinks: links.filter((l) => String(l.cafe) === String(c._id)).map((l) => ({ platform: l.platform, url: l.url, verified: l.verified })),
    })),
  });
});

// Dashboard numbers for one of the owner's cafes: profile views, link taps, favorites, rating, and taps per day for the last 7 days.
router.get("/cafes/:id/dashboard", validId, async (req, res) => {
  const cafe = await Cafe.findOne({ _id: req.params.id, owner: req.user._id }).lean();
  if (!cafe) return res.status(404).json({ error: "Cafe not found" });

  const since = new Date(Date.now() - 7 * 86400000);
  const [views, taps, favorites, perDay] = await Promise.all([
    Event.countDocuments({ cafe: cafe._id, type: "view" }),
    Event.aggregate([{ $match: { cafe: cafe._id, type: "link_click" } }, { $group: { _id: "$platform", n: { $sum: 1 } } }]),
    Favorite.countDocuments({ cafe: cafe._id }),
    Event.aggregate([
      { $match: { cafe: cafe._id, type: "link_click", createdAt: { $gte: since } } },
      { $group: { _id: { day: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "+08:00" } }, platform: "$platform" }, n: { $sum: 1 } } },
    ]),
  ]);
  const tapsBy = (p) => taps.find((t) => t._id === p)?.n ?? 0;
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const day = new Date(Date.now() + 8 * 3600000 - i * 86400000).toISOString().slice(0, 10); // Philippine date
    const n = (p) => perDay.find((x) => x._id.day === day && x._id.platform === p)?.n ?? 0;
    days.push({ day, grab: n("grab"), foodpanda: n("foodpanda") });
  }
  res.json({
    cafe: { id: String(cafe._id), name: cafe.name, status: cafe.status },
    views, linkTaps: { grab: tapsBy("grab"), foodpanda: tapsBy("foodpanda"), total: tapsBy("grab") + tapsBy("foodpanda") },
    favorites, ratingAvg: cafe.ratingAvg, ratingCount: cafe.ratingCount, last7Days: days,
  });
});

export default router;
