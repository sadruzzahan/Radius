import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { store } from "../repositories/store.js";

const router = Router();

router.get("/:listingId", requireAuth, async (req, res) => {
  res.json({ items: await store.listMessages(req.params.listingId) });
});

router.post("/:listingId", requireAuth, async (req, res) => {
  const parsed = z.object({ recipientId: z.string(), body: z.string().min(1).max(1000) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid message" });
  const message = await store.createMessage({ listingId: req.params.listingId, senderId: req.user.id, ...parsed.data });
  req.app.get("io").to(req.params.listingId).emit("chat:message", message);
  res.status(201).json({ item: message });
});

export default router;
