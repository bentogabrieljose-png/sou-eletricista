import { describe, expect, it } from "vitest";
import { CERTIFICATE_REPRINT_FEES, PAYMENT_OPTIONS } from "../shared/payments";
import { readFileSync } from "node:fs";

describe("second certificate workflow", () => {
  it("keeps the requested reprint fee choices and existing payment coordinates", () => {
    expect(CERTIFICATE_REPRINT_FEES).toEqual([
      { amount: 2000, currency: "Kz", label: "2.000 Kz" },
      { amount: 3, currency: "EUR", label: "3 euros" },
    ]);
    expect(PAYMENT_OPTIONS.some(option => option[0] === "PayPay AO")).toBe(true);
    expect(PAYMENT_OPTIONS.some(option => option[0] === "IBAN Angola")).toBe(true);
  });

  it("keeps second-copy requests separate and limits delivery to a server endpoint", () => {
    const router = readFileSync("server/routers.ts", "utf8");
    const server = readFileSync("server/_core/index.ts", "utf8");
    const schema = readFileSync("drizzle/schema.ts", "utf8");
    expect(router).toContain("certificateReprints");
    expect(router).toContain("authorizeCertificateReprint");
    expect(schema).toContain("certificateReprintRequests");
    expect(server).toContain("/api/download/reprint/:token");
    expect(server).toContain("markCertificateReprintDownloaded");
  });

  it("requires exact payment proof and preserves QR-only archive behavior", () => {
    const db = readFileSync("server/db.ts", "utf8");
    const server = readFileSync("server/_core/index.ts", "utf8");
    const verify = readFileSync("client/src/pages/Verificar.tsx", "utf8");
    expect(db).toContain("A taxa da segunda via deve ser exatamente 2.000 Kz ou 3 euros.");
    expect(db).toContain("O comprovativo de pagamento é obrigatório.");
    expect(server).toContain("certificate.isArchived");
    expect(verify).toContain("segunda via paga");
  });

  it("wires automatic expiration cleanup at startup", () => {
    const server = readFileSync("server/_core/index.ts", "utf8");
    const db = readFileSync("server/db.ts", "utf8");
    expect(db).toContain("purgeExpiredStudentAccess");
    expect(server).toContain("await purgeExpiredStudentAccess()");
  });
});
