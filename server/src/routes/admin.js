import { Router } from "express";
import { requireAdmin, requireAuth } from "../middleware/auth.js";
import { store } from "../repositories/store.js";

const router = Router();

router.use(requireAuth, requireAdmin);

router.get("/analytics", async (_req, res) => {
  res.json(await store.adminStats());
});

router.get("/fraud-queue", async (_req, res) => {
  res.json({ items: await store.listFlaggedListings() });
});

router.get("/reports", async (_req, res) => {
  res.json({ items: await store.listReports() });
});

router.patch("/reports/:id", async (req, res) => {
  const status = req.body.status === "resolved" ? "resolved" : "open";
  const report = await store.updateReport(req.params.id, { status });
  if (!report) return res.status(404).json({ error: "Report not found" });
  res.json({ item: report });
});

router.post("/fraud-queue/:id/decision", async (req, res) => {
  const decision = req.body.decision === "remove" ? "removed" : "available";
  const label = req.body.decision === "remove" ? "fraud" : "clean";
  const existing = await store.getListingById(req.params.id);
  const item = await store.updateListing(req.params.id, {
    status: decision,
    fraud: {
      ...(existing?.fraud ?? {}),
      decision: "allow",
      reviewedBy: req.user.id,
      reviewedAt: new Date().toISOString()
    }
  });
  if (!item) return res.status(404).json({ error: "Listing not found" });
  await store.createMlEvent?.({
    eventType: "admin_fraud_decision",
    listingId: req.params.id,
    actorId: req.user.id,
    payload: { decision: req.body.decision === "remove" ? "remove" : "approve" }
  });
  await store.createMlLabel?.({
    sourceType: "admin",
    sourceId: req.params.id,
    listingId: req.params.id,
    actorId: req.user.id,
    label,
    confidence: 1,
    notes: `Admin fraud queue decision: ${req.body.decision === "remove" ? "remove" : "approve"}`
  });
  res.json({ item });
});

router.get("/users", async (_req, res) => {
  res.json({ items: await store.listUsers() });
});

router.patch("/users/:id", async (req, res) => {
  const user = await store.updateUser(req.params.id, { status: req.body.status });
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ item: user });
});

export default router;
