import { describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";
import { youtubeEmbedUrl } from "../shared/media";
import { PRACTICAL_LESSONS_URL } from "../shared/course";

const access = vi.hoisted(() => ({ approved: false, expired: false }));
vi.mock("./db", async original => {
  const actual = await original<typeof import("./db")>();
  return { ...actual, getStudentByCode: vi.fn(async (code: string) => code === "SE-APPROVED-TEST" && access.approved && !access.expired ? { application: { status: "approved" }, progress: { accessExpiresAt: new Date(Date.now() + 1000) } } : undefined) };
});
import { appRouter } from "./routers";
const caller = appRouter.createCaller({ user: null, req: { protocol: "https", headers: {} }, res: {} } as unknown as TrpcContext);

describe("Vídeos da Vitrine", () => {
  it("converte o Shorts publicado para um player oficial e aceita links YouTube usuais", () => {
    expect(youtubeEmbedUrl("https://youtube.com/shorts/cUmHpqU_3Jg?feature=share")).toBe("https://www.youtube-nocookie.com/embed/cUmHpqU_3Jg?rel=0");
    expect(youtubeEmbedUrl("https://www.youtube.com/watch?v=cUmHpqU_3Jg")).toContain("/embed/cUmHpqU_3Jg");
    expect(youtubeEmbedUrl("https://youtu.be/cUmHpqU_3Jg")).toContain("/embed/cUmHpqU_3Jg");
    expect(youtubeEmbedUrl("https://youtube.com.evil.example/shorts/cUmHpqU_3Jg")).toBeNull();
    expect(youtubeEmbedUrl("javascript:alert(1)")).toBeNull();
  });
});

describe("Drive Biblioteca", () => {
  it("recusa não aprovados e acessos expirados; só dá URL ao aluno aprovado", async () => {
    access.approved = false; access.expired = false;
    await expect(caller.student.library({ accessCode: "SE-APPROVED-TEST" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    access.approved = true;
    expect(await caller.student.library({ accessCode: "SE-APPROVED-TEST" })).toEqual({ url: PRACTICAL_LESSONS_URL });
    access.expired = true;
    await expect(caller.student.library({ accessCode: "SE-APPROVED-TEST" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
