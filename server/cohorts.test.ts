import { describe, expect, it } from "vitest";
import { ANSWER_KEY, examUnlockAt, formatExamCountdown, scoreExam } from "../shared/course";
import { buildCertificateFallbackReport, cohortWindow, rankingDisplayName } from "./db";
import { readFileSync } from "node:fs";
import { blankCourseExam } from "../client/src/components/CourseExamEditor";

const server = readFileSync(new URL("./routers.ts", import.meta.url), "utf8");
const db = readFileSync(new URL("./db.ts", import.meta.url), "utf8");
const studentPage = readFileSync(new URL("../client/src/pages/Aluno.tsx", import.meta.url), "utf8");
const coordinationPage = readFileSync(new URL("../client/src/pages/Coordenacao.tsx", import.meta.url), "utf8");
const homePage = readFileSync(new URL("../client/src/pages/Home.tsx", import.meta.url), "utf8");

const student = { application: { fullName: "Ana Silva", courseTitle: "Curso de teste" } };

describe("turmas e avaliação", () => {
  it("separa turmas do mesmo curso por mês UTC, incluindo viragem de ano", () => {
    expect(cohortWindow(new Date("2026-12-31T23:59:59Z"))).toEqual({ start: new Date("2026-12-01T00:00:00.000Z"), end: new Date("2027-01-01T00:00:00.000Z"), label: "12/2026" });
    expect(cohortWindow(new Date("2027-01-01T00:00:00Z")).label).toBe("01/2027");
  });
  it("abrevia os nomes de colegas no ranking", () => {
    expect(rankingDisplayName("Ana Maria da Silva")).toBe("Ana S.");
    expect(rankingDisplayName("Beatriz")).toBe("Beatriz");
  });
  it("usa gabarito específico por curso e exige mais de 50%", () => {
    const custom = [3, 3, 3, 3, 3, 3, 3, 3, 3, 3];
    expect(scoreExam(custom, custom)).toBe(100);
    expect(scoreExam([...ANSWER_KEY], custom)).toBeLessThan(100);
    expect(buildCertificateFallbackReport(student, 50).conforming).toBe(false);
    expect(buildCertificateFallbackReport(student, 60).conforming).toBe(true);
  });
  it("exige um gabarito próprio e 10 perguntas para um novo curso", () => {
    expect(blankCourseExam()).toHaveLength(10);
    expect(blankCourseExam().every(item => item.correctIndex === -1)).toBe(true);
    expect(server).toContain('correctIndex: z.number().int().min(0).max(3)');
  });
  it("desbloqueia o teste exatamente doze horas após a aprovação, sem depender da aula", () => {
    const approvedAt = new Date("2026-10-01T06:00:00.000Z");
    expect(examUnlockAt(approvedAt)).toEqual(new Date("2026-10-01T18:00:00.000Z"));
    expect(examUnlockAt(approvedAt).getTime()).toBeGreaterThan(new Date("2026-10-01T17:59:59.999Z").getTime());
    expect(formatExamCountdown(12 * 60 * 60 * 1000)).toBe("12:00:00");
    expect(formatExamCountdown(1000)).toBe("00:00:01");
    expect(formatExamCountdown(0)).toBe("00:00:00");
    expect(studentPage).toContain('Já Sou Eletricista · ${remainingText}');
  });
  it("confere a elegibilidade no servidor, antes de consultar ou gravar o teste", () => {
    expect(server).toContain('student.progress.accessUnlockAt.getTime() > Date.now()');
    expect(db).toContain('examUnlockAt(approvedAt)');
    expect(db).toContain('progress.examStatus === "passed"');
    expect(server).toContain('getCourseAssessment(student.application.courseTitle)');
    expect(db).toContain('if (course.slug !== "eletricidade-basica")');
  });
  it("consulta até 50 candidatos por página e filtra por curso e período no servidor", () => {
    expect(server).toContain('pageSize: z.number().int().min(1).max(100).default(50)');
    expect(db).toContain('.limit(filters.pageSize).offset((filters.page - 1) * filters.pageSize)');
    expect(coordinationPage).toContain('Filtrar por curso');
    expect(coordinationPage).toContain('Data inicial');
    expect(coordinationPage).toContain('Data final');
    expect(studentPage).toContain('Ranking da turma');
  });
  it("não expõe gabaritos no catálogo público", () => {
    expect(db).toContain('type PublicCourseRow = Omit<CourseRow, "examQuestions">');
    expect(db).toContain('db.select({ id: courses.id, title: courses.title');
    expect(server).toContain('course: publicProcedure.input');
    expect(homePage).toContain('Formações disponíveis');
    expect(homePage).toContain('.map(item => <article');
  });
});
