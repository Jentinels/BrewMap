import { Router } from "express";
import { Cafe, DeliveryLink, Favorite } from "../models.js";
import { requireAuth, validId } from "../middleware.js";
import { cafeSummary } from "../lib.js";

const router = Router();
router.use(requireAuth);

router.get("/", async (req, res) => {
  const favs = await Favorite.find({ user: req.user._id }).sort({ createdAt: -1 }).populate({ path: "cafe", match: { status: "approved" } }).lean();
  const cafes = favs.map((f) => f.cafe).filter(Boolean);
  const links = await DeliveryLink.find({ cafe: { $in: cafes.map((c) => c._id) } }).lean();
  res.json({ cafes: cafes.map((c) => cafeSummary(c, links.filter((l) => String(l.cafe) === String(c._id)).map((l) => l.platform))) });
});

router.put("/:cafeId", validId, async (req, res) => {
  if (!(await Cafe.exists({ _id: req.params.cafeId, status: "approved" }))) return res.status(404).json({ error: "Cafe not found" });
  await Favorite.updateOne({ user: req.user._id, cafe: req.params.cafeId }, {}, { upsert: true });
  res.status(204).end();
});

router.delete("/:cafeId", validId, async (req, res) => {
  await Favorite.deleteOne({ user: req.user._id, cafe: req.params.cafeId });
  res.status(204).end();
});

export default router;
