import { describe, expect, it } from "vitest";
import { readTtlCache, writeTtlCache } from "./cache";

describe("TTL cache", () => {
  it("returns a cached value before expiration", () => {
    const entry = writeTtlCache({ count: 1 }, 1000, 10_000);
    expect(readTtlCache(entry, 10_999)).toEqual({ count: 1 });
  });

  it("misses after expiration", () => {
    const entry = writeTtlCache("catalog", 1000, 10_000);
    expect(readTtlCache(entry, 11_000)).toBeNull();
    expect(readTtlCache(null, 11_000)).toBeNull();
  });
});
