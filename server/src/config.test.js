import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { projectEnvPath } from "./config.js";

describe("config", () => {
  it("loads the project root .env even when server runs from the workspace cwd", () => {
    expect(projectEnvPath.endsWith("/hyperlocal-marketplace/.env")).toBe(true);
    expect(existsSync(projectEnvPath)).toBe(true);
  });
});
