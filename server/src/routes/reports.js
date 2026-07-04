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
  const report = await store.createReport({ ...parsed.data, reporterId: req.user.id });
  await store.createMlEvent?.({
    eventType: "user_report_created",
    listingId: report.listingId,
    actorId: req.user.id,
    payload: { reason: report.reason, reportId: report.id }
  });
  if (report.reason !== "other") {
    await store.createMlLabel?.({
      sourceType: "report",
      sourceId: report.id,
      listingId: report.listingId,
      actorId: req.user.id,
      label: report.reason,
      confidence: 0.35,
      notes: report.details
    });
  }
  res.status(201).json({ item: report });
});

export default router;
