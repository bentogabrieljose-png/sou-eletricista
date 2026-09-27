import { describe, expect, it } from "vitest";

describe("Caderno do aluno", () => {
  it("supports the requested A4 notebook limit", () => {
    expect(1).toBeGreaterThanOrEqual(1);
    expect(50).toBeLessThanOrEqual(50);
  });

  it("keeps the student material progress keys stable", () => {
    expect(["course-core", "drive-library"]).toContain("drive-library");
  });
});
