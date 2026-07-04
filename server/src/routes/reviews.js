import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { store } from "../repositories/store.js";

const router = Router();

router.post("/", requireAuth, async (req, res) => {
  const parsed = z.object({
    tradeId: z.string().uuid(),
    listingId: z.string().uuid().optional(),
    revieweeId: z.string().uuid().optional(),
    rating: z.coerce.number().min(1).max(5),
    comment: z.string().max(600).optional().default("")
  }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid review", details: parsed.error.issues });
  try {
    res.status(201).json({ item: await store.createReview({ ...parsed.data, reviewerId: req.user.id }) });
  } catch (err) {
    const status = /not found/i.test(err.message) ? 404 : 409;
    res.status(status).json({ error: err.message });
  }
});

export default router;
