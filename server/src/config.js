import dotenv from "dotenv";
import { fileURLToPath } from "node:url";

export const projectEnvPath = fileURLToPath(new URL("../../.env", import.meta.url));

dotenv.config({ path: projectEnvPath, override: false });

export const config = {
  port: Number(process.env.PORT ?? 4000),
  clientOrigin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173",
  jwtSecret: process.env.JWT_SECRET ?? "dev-only-change-me",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
  databaseUrl: process.env.DATABASE_URL ?? "",
  supabaseUrl: process.env.SUPABASE_URL ?? "",
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  supabaseStorageBucket: process.env.SUPABASE_STORAGE_BUCKET ?? "listing-photos",
  mlServiceUrl: process.env.ML_SERVICE_URL ?? "http://127.0.0.1:8001",
  defaultRadiusKm: Number(process.env.DEFAULT_RADIUS_KM ?? 6),
  useMemoryStore: process.env.USE_MEMORY_STORE === "true"
};

export function validateRuntimeConfig(runtime = config) {
  const usingDbStore = !runtime.useMemoryStore && Boolean(runtime.databaseUrl || (runtime.supabaseUrl && runtime.supabaseServiceRoleKey));
  if (!usingDbStore || process.env.NODE_ENV === "test") return;
  if (runtime.jwtSecret === "dev-only-change-me" || runtime.jwtSecret.length < 32) {
    throw new Error("JWT_SECRET must be set to a strong value before running with a persistent database store.");
  }
}
