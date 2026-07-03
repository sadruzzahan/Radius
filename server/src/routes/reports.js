import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { store } from "../repositories/store.js";

const router = Router();

router.post("/", requireAuth, async (req, res) => {
  const parsed = z.object({
    listingId: z.string(),
    reason: z.enum(["fraud", "duplicate", "prohibited", "spam", "other"]),
    details: z.string().max(1000).optional().default("")
  }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid report" });
  res.status(201).json({ item: await store.createReport({ ...parsed.data, reporterId: req.user.id }) });
});

export default router;
