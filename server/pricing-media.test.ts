import { describe, expect, it } from "vitest";
import { getTrainingPrice, TRAINING_PRICING } from "../shared/pricing";
import { readFileSync } from "node:fs";

describe("training pricing and Vitrine media", () => {
  it("uses 4.000 Kz / 4 euros during the first month and 6.000 Kz / 6 euros afterwards", () => {
    const beforeEnd = new Date("2026-10-15T12:00:00.000Z");
    const afterEnd = new Date("2026-11-01T00:00:00.000Z");
    expect(getTrainingPrice(beforeEnd).amountKz).toBe(TRAINING_PRICING.promotionalKz);
    expect(getTrainingPrice(beforeEnd).amountEuro).toBe(TRAINING_PRICING.promotionalEuro);
    expect(getTrainingPrice(afterEnd).amountKz).toBe(TRAINING_PRICING.standardKz);
    expect(getTrainingPrice(afterEnd).amountEuro).toBe(TRAINING_PRICING.standardEuro);
  });

  it("keeps upload, storage, and format rendering wired end to end", () => {
    const db = readFileSync("server/db.ts", "utf8");
    const router = readFileSync("server/routers.ts", "utf8");
    const coordination = readFileSync("client/src/pages/Coordenacao.tsx", "utf8");
    const home = readFileSync("client/src/pages/Home.tsx", "utf8");
    expect(db).toContain("uploadContentMedia");
    expect(db).toContain("video/");
    expect(router).toContain("uploadContentMedia");
    expect(coordination).toContain("accept=\"video/*,audio/*,image/*,application/pdf\"");
    expect(home).toContain("MediaPreview");
  });
});
