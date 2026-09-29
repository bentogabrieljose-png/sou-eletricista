import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("director page", () => {
  it("keeps the public route, managed portrait, and navigation copy wired", () => {
    const page = readFileSync(new URL("../client/src/pages/SobreDiretor.tsx", import.meta.url), "utf8");
    const app = readFileSync(new URL("../client/src/App.tsx", import.meta.url), "utf8");
    const home = readFileSync(new URL("../client/src/pages/Home.tsx", import.meta.url), "utf8");
    expect(app).toContain('path="/diretor"');
    expect(page).toContain("director-gabriel-cambinza_4bb10d33.png");
    expect(page).toContain("Gabriel José Carlos Cambinza");
    expect(home).toContain("Sobre o Diretor");
  });
});
