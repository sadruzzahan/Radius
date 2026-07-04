import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import authRoutes from "./routes/auth.js";
import listingRoutes from "./routes/listings.js";
import chatRoutes from "./routes/chat.js";
import reviewRoutes from "./routes/reviews.js";
import reportRoutes from "./routes/reports.js";
import adminRoutes from "./routes/admin.js";
import uploadRoutes from "./routes/uploads.js";
import { config, validateRuntimeConfig } from "./config.js";
import { optionalAuth } from "./middleware/auth.js";
import { store } from "./repositories/store.js";

export async function createApp() {
  validateRuntimeConfig();
  await store.seed();
  const app = express();
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors({ origin: config.clientOrigin, credentials: true }));
  app.use(express.json({ limit: "2mb" }));
  app.use(cookieParser());
  app.use(rateLimit({ windowMs: 60_000, limit: 180 }));
  app.use(optionalAuth);
  app.get("/healthz", (_req, res) => res.json({ ok: true, store: store.kind ?? "memory" }));
  app.use("/api/auth", authRoutes);
  app.use("/api/listings", listingRoutes);
  app.use("/api/chat", chatRoutes);
  app.use("/api/reviews", reviewRoutes);
  app.use("/api/reports", reportRoutes);
  app.use("/api/admin", adminRoutes);
  app.use("/api/uploads", uploadRoutes);
  app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  });
  return app;
}
