import { Router } from "express";
import bcrypt from "bcryptjs";
import { User } from "../models.js";
import { loginSchema, registerSchema } from "../schemas.js";
import { publicUser, requireAuth, signToken } from "../middleware.js";

const router = Router();

router.post("/register", async (req, res) => {
  const body = registerSchema.parse(req.body);
  if (await User.exists({ email: body.email })) return res.status(409).json({ error: "That email is already registered" });
  const user = await User.create({ name: body.name, email: body.email, role: body.role, passwordHash: await bcrypt.hash(body.password, 10) });
  res.status(201).json({ token: signToken(user), user: publicUser(user) });
});

router.post("/login", async (req, res) => {
  const body = loginSchema.parse(req.body);
  const user = await User.findOne({ email: body.email });
  const ok = user && !user.disabled && (await bcrypt.compare(body.password, user.passwordHash));
  if (!ok) return res.status(401).json({ error: "Wrong email or password" });
  res.json({ token: signToken(user), user: publicUser(user) });
});

router.get("/me", requireAuth, (req, res) => res.json({ user: publicUser(req.user) }));

export default router;
