import dotenv from "dotenv";
import { fileURLToPath } from "node:url";

export const projectEnvPath = fileURLToPath(new URL("../../.env", import.meta.url));

dotenv.config({ path: projectEnvPath });

export const config = {
  port: Number(process.env.PORT ?? 4000),
  clientOrigin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173",
  jwtSecret: process.env.JWT_SECRET ?? "dev-only-change-me",
  databaseUrl: process.env.DATABASE_URL ?? "",
  supabaseUrl: process.env.SUPABASE_URL ?? "",
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  supabaseStorageBucket: process.env.SUPABASE_STORAGE_BUCKET ?? "listing-photos",
  mlServiceUrl: process.env.ML_SERVICE_URL ?? "http://127.0.0.1:8001",
  defaultRadiusKm: Number(process.env.DEFAULT_RADIUS_KM ?? 6),
  useMemoryStore: process.env.USE_MEMORY_STORE === "true"
};
