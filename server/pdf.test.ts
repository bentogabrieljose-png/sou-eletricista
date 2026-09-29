import { describe, expect, it } from "vitest";
import { generateEnrollmentReceiptPdf } from "./pdf";

describe("server PDF downloads", () => {
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
