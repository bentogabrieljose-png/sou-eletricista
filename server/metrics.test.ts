import { beforeEach, describe, expect, it } from "vitest";
import { getRequestMetrics, recordRequest } from "./metrics";

describe("request metrics", () => {
  beforeEach(() => {
    // Use timestamps outside the one-minute window so each test starts empty.
    recordRequest({ at: 0, path: "/test/reset", status: 200, durationMs: 1 });
  });

  it("counts requests and separates server/client errors", () => {
    const now = Date.now();
    recordRequest({ at: now, path: "/api/trpc/public.courses", status: 200, durationMs: 8 });
    recordRequest({ at: now, path: "/api/trpc/public.courses", status: 500, durationMs: 24 });
    recordRequest({ at: now, path: "/api/trpc/public.content", status: 404, durationMs: 12 });
    const snapshot = getRequestMetrics(now);
    expect(snapshot.requests).toBe(3);
    expect(snapshot.errors).toBe(1);
    expect(snapshot.clientErrors).toBe(1);
    expect(snapshot.topPaths[0]).toEqual({ path: "/api/trpc/public.courses", count: 2 });
    expect(snapshot.p95LatencyMs).toBe(24);
  });
});
