import { createClient } from "@supabase/supabase-js";
import pg from "pg";
import { config } from "../config.js";
import { MemoryStore } from "./memoryStore.js";
import { PostgresStore } from "./postgresStore.js";
import { SupabaseStore } from "./supabaseStore.js";

export function postgresSslConfig(databaseUrl) {
  return databaseUrl.includes("supabase.co") || databaseUrl.includes("supabase.com")
    ? { rejectUnauthorized: false }
    : undefined;
}

function createStore() {
  if (config.databaseUrl && !config.useMemoryStore) {
    return new PostgresStore(new pg.Pool({
      connectionString: config.databaseUrl,
      ssl: postgresSslConfig(config.databaseUrl)
    }));
  }
  if (config.supabaseUrl && config.supabaseServiceRoleKey && !config.useMemoryStore) {
    const client = createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
    return new SupabaseStore(client);
  }
  return new MemoryStore();
}

export const store = createStore();
