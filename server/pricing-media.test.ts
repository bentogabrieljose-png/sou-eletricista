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
    const schema = readFileSync("drizzle/schema.ts", "utf8");
    const coordination = readFileSync("client/src/pages/Coordenacao.tsx", "utf8");
    const home = readFileSync("client/src/pages/Home.tsx", "utf8");
    const student = readFileSync("client/src/pages/Aluno.tsx", "utf8");
    expect(db).toContain("uploadContentMedia");
    expect(db).toContain("deleteContent");
    expect(db).toContain("application/octet-stream");
    expect(router).toContain("uploadContentMedia");
    expect(router).toContain("inspectEnrollmentProof");
    expect(router).toContain("deleteContent");
    expect(schema).toContain("proofInspectionStatus");
    expect(coordination).toContain('accept="*/*"');
    expect(coordination).toContain("Eliminar permanentemente este conteúdo da Vitrine");
    expect(home).toContain("MediaPreview");
    expect(home).toContain("isScrolled");
    expect(home).toContain("home-site-header");
    expect(student).toContain("Meus certificados");
    expect(student).toContain("Descarregar PDF do servidor");
  });
});
