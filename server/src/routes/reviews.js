import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { store } from "../repositories/store.js";

const router = Router();

router.post("/", requireAuth, async (req, res) => {
  const parsed = z.object({
    tradeId: z.string().min(3),
    listingId: z.string(),
    revieweeId: z.string(),
    rating: z.coerce.number().min(1).max(5),
    comment: z.string().max(600).optional().default("")
  }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid review", details: parsed.error.issues });
  res.status(201).json({ item: await store.createReview({ ...parsed.data, reviewerId: req.user.id }) });
});

export default router;
