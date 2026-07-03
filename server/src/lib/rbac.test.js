import { describe, expect, it } from "vitest";
import { canAccess } from "./rbac.js";

describe("role-based access", () => {
  it("keeps guests read-only", () => {
    expect(canAccess("guest", "listings:read")).toBe(true);
    expect(canAccess("guest", "chat:create")).toBe(false);
    expect(canAccess("guest", "admin:review")).toBe(false);
  });

  it("lets registered users trade but not moderate", () => {
    expect(canAccess("user", "listing:create")).toBe(true);
    expect(canAccess("user", "review:create")).toBe(true);
    expect(canAccess("user", "admin:review")).toBe(false);
  });

  it("lets admins manage fraud queues and accounts", () => {
    expect(canAccess("admin", "admin:review")).toBe(true);
    expect(canAccess("admin", "user:suspend")).toBe(true);
  });
});
