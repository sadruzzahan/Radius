import bcrypt from "bcryptjs";
import { Router } from "express";
import { z } from "zod";
import { signToken } from "../middleware/auth.js";
import { store } from "../repositories/store.js";

const router = Router();

const registerSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(8),
  location: z.object({ lat: z.coerce.number(), lng: z.coerce.number() }).optional()
});

router.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid registration", details: parsed.error.issues });
  if (await store.findUserByEmail(parsed.data.email)) return res.status(409).json({ error: "Email already registered" });
  const user = await store.createUser(parsed.data);
  res.status(201).json({ user, token: signToken(user) });
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await store.findUserByEmail(email ?? "");
  if (!user || !(await bcrypt.compare(password ?? "", user.passwordHash ?? user.password_hash))) {
    return res.status(401).json({ error: "Invalid credentials" });
  }
  if (user.status !== "active") return res.status(403).json({ error: "Account is not active" });
  res.json({ user: store.publicUser(user), token: signToken(user) });
});

router.get("/me", (req, res) => {
  res.json({ user: req.user ?? { role: "guest" } });
});

export default router;
