import { describe, expect, it } from "vitest";
import { generateCertificatePdf, generateCertificateRegisterPdf, generateEnrollmentReceiptPdf } from "./pdf";
import { readFileSync } from "node:fs";

const pdfSource = readFileSync(new URL("./pdf.ts", import.meta.url), "utf8");
const verifierSource = readFileSync(new URL("../client/src/pages/Verificar.tsx", import.meta.url), "utf8");

describe("server PDF downloads", () => {
  it("generates a clean certificate with one digital layer", async () => {
    const pdf = await generateCertificatePdf({
      fullName: "Aluno de Teste",
      courseTitle: "Eletricidade Básica para Instalações Residenciais em Baixa Tensão",
      completedAt: new Date("2026-09-26T00:00:00Z"),
      score: 100,
      qrToken: "TEST-QR-TOKEN",
      validationUrl: "https://example.com/validar/TEST-QR-TOKEN",
      isBestStudent: true,
    });
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(pdf.length).toBeGreaterThan(5000);
    expect(pdfSource).toContain("opacity: .065");
    expect(pdfSource).toContain('page.drawText("VALIDADO"');
    expect(verifierSource).toContain("certificate-watermark");
    expect(verifierSource).toContain("certificate-stamp");
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

  it("generates a sequential validated-certificate register PDF", async () => {
    const pdf = await generateCertificateRegisterPdf([
      { registrationNumber: "SE-REG-2026-000001", fullName: "Ana Silva", courseTitle: "Electricidade Básica", score: 100, completedAt: new Date("2026-09-30T00:00:00Z"), qrToken: "QR-1" },
      { registrationNumber: "SE-REG-2026-000002", fullName: "Bruno Lima", courseTitle: "Instalações Elétricas", score: 78, completedAt: new Date("2026-10-01T00:00:00Z"), qrToken: "QR-2" },
    ]);
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(pdf.length).toBeGreaterThan(2500);
  });
});
