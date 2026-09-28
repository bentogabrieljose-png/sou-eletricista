import { describe, expect, it } from "vitest";
import {
  CERTIFICATE_CENTER_NAME,
  CERTIFICATE_DIRECTOR_NAME,
  CERTIFICATE_DURATION_HOURS,
  CERTIFICATE_DURATION_LABEL,
  CERTIFICATE_TEMPLATE_ASSET,
  CERTIFICATE_TEMPLATE_VERSION,
} from "../shared/certificate";
import { certificatePreflightInput } from "./db";

describe("certificate model", () => {
  it("uses the official 72-hour duration and director-only signature", () => {
    expect(CERTIFICATE_DURATION_HOURS).toBe(72);
    expect(CERTIFICATE_DURATION_LABEL).toBe("72 horas (3 dias)");
    expect(CERTIFICATE_DIRECTOR_NAME).toBe("Gabriel Carlos Cambinza");
    expect(CERTIFICATE_CENTER_NAME).toBe("Sou Eletricista");
    expect(CERTIFICATE_TEMPLATE_ASSET).toContain("certificate-official-template");
    expect(CERTIFICATE_TEMPLATE_VERSION).toContain("official-pdf");
  });

  it("preflight input contains every official certificate field", () => {
    const input = certificatePreflightInput({ application: { fullName: "Ana Silva", courseTitle: "Electricidade de Construção Civil" }, progress: { latestScore: 100 } }, 100);
    expect(input.requiredFields).toEqual(expect.arrayContaining(["nome completo", "curso", "data de conclusão", "duração", "nota final", "QR Code", "site de validação", "assinatura do diretor"]));
    expect(input.duration).toBe("72 horas (3 dias)");
  });
});
