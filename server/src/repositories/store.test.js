import { describe, expect, it } from "vitest";
import { postgresSslConfig } from "./store.js";

describe("postgresSslConfig", () => {
  it("allows Supabase direct and pooler TLS chains", () => {
    expect(postgresSslConfig("postgresql://postgres:pass@db.example.supabase.co:5432/postgres")).toEqual({ rejectUnauthorized: false });
    expect(postgresSslConfig("postgresql://postgres.project:pass@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres")).toEqual({ rejectUnauthorized: false });
  });

  it("leaves non-Supabase database URLs on default pg TLS behavior", () => {
    expect(postgresSslConfig("postgresql://postgres:pass@localhost:5432/postgres")).toBeUndefined();
  });
});
