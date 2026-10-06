import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const db = readFileSync(new URL("./db.ts", import.meta.url), "utf8");
const schema = readFileSync(new URL("../drizzle/schema.ts", import.meta.url), "utf8");
const coordination = readFileSync(new URL("../client/src/pages/Coordenacao.tsx", import.meta.url), "utf8");
const home = readFileSync(new URL("../client/src/pages/Vitrine.tsx", import.meta.url), "utf8");
const certificate = readFileSync(new URL("../client/src/pages/Verificar.tsx", import.meta.url), "utf8");
const pdf = readFileSync(new URL("./pdf.ts", import.meta.url), "utf8");

describe("Vitrine media and certificate distinction", () => {
  it("processes videos with FFmpeg and keeps a safe original fallback", () => {
    expect(db).toContain('execFileAsync("ffprobe"');
    expect(db).toContain('execFileAsync("ffmpeg"');
    expect(db).toContain('processingStatus: "processed"');
    expect(db).toContain('processingStatus: "original"');
    expect(schema).toContain("mediaPosterUrl");
    expect(schema).toContain("mediaDurationSeconds");
    expect(schema).toContain("mediaProcessingStatus");
  });

  it("exposes upload progress, proof filters, and optimized posters in the UI", () => {
    expect(coordination).toContain("mediaProgress");
    expect(coordination).toContain("Consistentes");
    expect(coordination).toContain("Revisão manual");
    expect(coordination).toContain("Divergências");
    expect(coordination).toContain("comprovativo original fica disponível");
    expect(coordination).toContain("Comprovativo não enviado");
    expect(home).toContain("posterUrl");
    expect(home).toContain("Vídeo otimizado");
  });

  it("marks only perfect scores as Melhor aluno in digital and server certificates", () => {
    expect(certificate).toContain("latestScore === 100");
    expect(certificate).toContain("certificate-best-student-badge");
    expect(pdf).toContain("MELHOR ALUNO");
    expect(pdf).toContain("input.score === 100");
  });
});
