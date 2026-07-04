import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { projectEnvPath, validateRuntimeConfig } from "./config.js";

describe("config", () => {
  it("loads the project root .env even when server runs from the workspace cwd", () => {
    expect(projectEnvPath.endsWith("/hyperlocal-marketplace/.env")).toBe(true);
    expect(existsSync(projectEnvPath)).toBe(true);
  });

  it("rejects weak JWT secrets when a persistent store is configured", () => {
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    try {
      expect(() => validateRuntimeConfig({
        useMemoryStore: false,
        databaseUrl: "postgresql://example",
        supabaseUrl: "",
        supabaseServiceRoleKey: "",
        jwtSecret: "dev-only-change-me"
      })).toThrow(/JWT_SECRET/);
    } finally {
      process.env.NODE_ENV = originalNodeEnv;
    }
  });
});
