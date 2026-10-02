import { describe, expect, it } from "vitest";
import {
  CERTIFICATE_CENTER_NAME,
  CERTIFICATE_DIRECTOR_NAME,
  CERTIFICATE_DURATION_HOURS,
  CERTIFICATE_DURATION_LABEL,
  CERTIFICATE_TEMPLATE_ASSET,
  CERTIFICATE_TEMPLATE_VERSION,
  formatCertificateRegistration,
} from "../shared/certificate";
import { buildCertificateFallbackReport, certificatePreflightInput } from "./db";

describe("certificate model", () => {
  it("uses the official 72-hour duration and director-only signature", () => {
    expect(CERTIFICATE_DURATION_HOURS).toBe(72);
    expect(CERTIFICATE_DURATION_LABEL).toBe("72 horas (3 dias)");
    expect(CERTIFICATE_DIRECTOR_NAME).toBe("Gabriel Carlos Cambinza");
    expect(CERTIFICATE_CENTER_NAME).toBe("Sou Eletricista");
    expect(CERTIFICATE_TEMPLATE_ASSET).toContain("certificate-official-unsigned");
    expect(CERTIFICATE_TEMPLATE_VERSION).toContain("official-unsigned-pdf");
  });

  it("preflight input contains every official certificate field", () => {
    const input = certificatePreflightInput({ application: { fullName: "Ana Silva", courseTitle: "Electricidade de Construção Civil" }, progress: { latestScore: 100 } }, 100);
    expect(input.requiredFields).toEqual(expect.arrayContaining(["nome completo", "curso", "data de conclusão", "duração", "nota final", "QR Code", "site de validação", "assinatura do diretor"]));
    expect(input.duration).toBe("72 horas (3 dias)");
  });

  it("creates a conforming fallback report for a passed student with complete data", () => {
    const report = buildCertificateFallbackReport({ application: { fullName: "Ana Silva", courseTitle: "Electricidade de Construção Civil" } }, 100);
    expect(report.conforming).toBe(true);
    expect(report.issues).toEqual([]);
  });

  it("formats a unique sequential registration number", () => {
    expect(formatCertificateRegistration(42)).toMatch(/^SE-REG-\d{4}-000042$/);
    expect(formatCertificateRegistration(42, "SE-CERT-2026-00042")).toBe("SE-REG-2026-00042");
  });
});
