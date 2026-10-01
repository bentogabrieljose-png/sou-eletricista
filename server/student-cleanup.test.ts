import { describe, expect, it } from "vitest";
import { certificateArchiveUpdate } from "./db";

describe("permanent student cleanup", () => {
  it("archives only certificate-safe data and resets operational fields", () => {
    expect(certificateArchiveUpdate()).toEqual({
      studentEmail: null,
      studentNif: null,
      startedAt: null,
      accessUnlockAt: null,
      accessExpiresAt: null,
      examStatus: "not_started",
      attempts: 0,
    });
  });
});
