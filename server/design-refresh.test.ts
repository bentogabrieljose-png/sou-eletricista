import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("../client/src/index.css", import.meta.url), "utf8");
const aluno = readFileSync(new URL("../client/src/pages/Aluno.tsx", import.meta.url), "utf8");
const pdf = readFileSync(new URL("./pdf.ts", import.meta.url), "utf8");

describe("direção visual profissional", () => {
  it("mantém o cabeçalho branco e aplica superfícies roxas", () => {
    expect(css).toContain(".home-site-header");
    expect(css).toContain("#5b21b6");
    expect(css).toContain("#como-funciona");
    expect(css).toContain(".student-shell .tab-button.tab-active");
    expect(css).toContain(".student-shell .text-slate-600");
    expect(css).toContain(".dark .student-shell h1");
    expect(css).toContain("--metal-gold");
    expect(css).toContain("metallic-shimmer");
    expect(css).toContain("prefers-reduced-motion: reduce");
    expect(css).toContain(".effects-soft");
    expect(css).toContain(".effects-off");
    expect(css).toContain(".site-lightning-bg { background-color: #071f51");
    expect(css).toContain(".site-lightning-bg .home-hero p");
    expect(css).toContain("power-grid-sunset_2ecb2782.jpg");
    expect(css).toContain("eco-lightbulb_a3841562.jpg");
    expect(css).toContain(".internal-photo-bg");
  });

  it("protege a navegação intuitiva da área do aluno", () => {
    expect(aluno).toContain('className="student-shell');
    expect(aluno).toContain('role="tablist"');
    expect(aluno).toContain("Meus certificados");
    expect(aluno).toContain("Ranking da turma");
    expect(aluno).toContain("internal-photo-bg");
  });

  it("oferece o controlo de intensidade no cabeçalho", () => {
    const home = readFileSync(new URL("../client/src/pages/Home.tsx", import.meta.url), "utf8");
    expect(home).toContain('aria-label="Intensidade dos efeitos visuais"');
    expect(home).toContain('localStorage.setItem("sou-effects"');
    expect(home).toContain('value="off"');
    expect(home).toContain('id="galeria"');
    expect(home).toContain('role="tablist"');
    expect(home).toContain("Rotação automática");
    expect(css).toContain(".home-gallery-dot.is-active");
    expect(css).toContain("-webkit-text-fill-color: currentColor");
  });

  it("usa a paleta institucional no PDF nativo", () => {
    expect(pdf).toContain("const blue = rgb(0.36, 0.12, 0.67)");
    expect(pdf).toContain("const navy = rgb(0.14, 0.04, 0.28)");
    expect(pdf).toContain("formatCertificateRegistration");
  });
});
