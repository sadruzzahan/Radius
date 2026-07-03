import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { extname } from "node:path";
import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { config } from "../config.js";
import { requireAuth } from "../middleware/auth.js";
import { computeImageHash } from "../services/imageHash.js";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 6 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    if (!file.mimetype?.startsWith("image/")) return cb(new Error("Only image uploads are supported."));
    cb(null, true);
  }
});

function storageClient() {
  if (!config.supabaseUrl || !config.supabaseServiceRoleKey || !config.supabaseStorageBucket) {
    return null;
  }
  return createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

function objectPath(userId, file) {
  const extension = extname(file.originalname || "").toLowerCase() || ".jpg";
  const safeExtension = [".jpg", ".jpeg", ".png", ".webp"].includes(extension) ? extension : ".jpg";
  return `${userId}/${new Date().toISOString().slice(0, 10)}/${randomUUID()}${safeExtension}`;
}

router.post("/listing-photo", requireAuth, (req, res, next) => {
  upload.single("photo")(req, res, (error) => {
    if (error) return res.status(400).json({ error: error.message });
    next();
  });
}, async (req, res) => {
  const parsed = z.object({
    file: z.object({
      buffer: z.instanceof(Buffer),
      mimetype: z.string().regex(/^image\//),
      originalname: z.string().optional()
    }).passthrough()
  }).safeParse({ file: req.file });
  if (!parsed.success) return res.status(400).json({ error: "Image file is required." });

  const supabase = storageClient();
  if (!supabase) return res.status(503).json({ error: "Supabase Storage is not configured." });

  const file = parsed.data.file;
  const path = objectPath(req.user.id, file);
  const hash = await computeImageHash(file.buffer, file.mimetype);
  const { error } = await supabase.storage
    .from(config.supabaseStorageBucket)
    .upload(path, file.buffer, { contentType: file.mimetype, upsert: false });
  if (error) return res.status(502).json({ error: error.message });

  const { data } = supabase.storage.from(config.supabaseStorageBucket).getPublicUrl(path);
  res.status(201).json({
    url: data.publicUrl,
    path,
    hash,
    storage: "supabase"
  });
});

export default router;
