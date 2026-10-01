import { describe, expect, it } from "vitest";
import { generateCertificatePdf, generateEnrollmentReceiptPdf } from "./pdf";

describe("server PDF downloads", () => {
  it("generates a clean certificate with one digital layer", async () => {
    const pdf = await generateCertificatePdf({
      fullName: "Aluno de Teste",
      courseTitle: "Eletricidade Básica para Instalações Residenciais em Baixa Tensão",
      completedAt: new Date("2026-09-26T00:00:00Z"),
      score: 86,
      qrToken: "TEST-QR-TOKEN",
      validationUrl: "https://example.com/validar/TEST-QR-TOKEN",
    });
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(pdf.length).toBeGreaterThan(5000);
  });

  it("generates a real enrollment receipt PDF", async () => {
    const pdf = await generateEnrollmentReceiptPdf({
      applicationNumber: "SE-2026-TEST01",
      fullName: "Aluno de Teste",
      email: "aluno@example.com",
      nif: "NIF-123",
      phone: "+244 900 000 000",
      courseTitle: "Eletricidade Básica",
      paymentMethod: "PayPay AO",
    });
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(pdf.length).toBeGreaterThan(1000);
  });
});
