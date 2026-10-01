import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";
import { ANSWER_KEY, PRACTICAL_LESSONS_URL, examUnlockAt } from "../shared/course";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { StudentCertificatePanel } from "../client/src/components/StudentCertificatePanel";

const fixture = vi.hoisted(() => {
  const state = { application: null as any, progress: null as any, proofReviewed: false };
  return { state };
});

vi.mock("./_core/llm", () => ({ invokeLLM: vi.fn(async () => ({ choices: [{ message: { content: JSON.stringify({ conforming: true, score: 100, checks: ["Nome e curso completos", "Nota verificada"], issues: [] }) } }] })) }));
vi.mock("./db", async importOriginal => {
  const actual = await importOriginal<typeof import("./db")>();
  const { state } = fixture;
  const student = () => state.application?.status === "approved" ? { application: state.application, progress: state.progress } : undefined;
  return {
    ...actual,
    listCourses: vi.fn(async () => [{ id: 1, title: "Eletricidade Básica", slug: "eletricidade-basica", description: "Formação básica em segurança elétrica", hours: 12, lessonUrl: "https://example.org/aulas-eletricidade", coverUrl: null, active: 1, createdAt: new Date(), updatedAt: new Date() }]),
    listManagedCourses: vi.fn(async () => [{ id: 1, title: "Eletricidade Básica", slug: "eletricidade-basica", description: "Formação básica em segurança elétrica", hours: 12, lessonUrl: "https://example.org/aulas-eletricidade", coverUrl: null, active: 1, createdAt: new Date(), updatedAt: new Date() }]),
    updateCourseLessonUrl: vi.fn(async () => ({ success: true })),
    createApplication: vi.fn(async (input: any) => {
      state.proofReviewed = input.proofInspectionStatus === "review";
      state.application = { ...input, id: 404001, applicationNumber: "SE-TESTE-404001", accessCode: "SE-TESTE-404001", status: "pending", approvedAt: null, createdAt: new Date() };
      return state.application;
    }),
    getStudentByCode: vi.fn(async (code: string) => code === state.application?.accessCode ? student() : undefined),
    updateApplicationStatus: vi.fn(async (_code: string, status: string) => {
      state.application.status = status;
      state.application.approvedAt = new Date();
      state.progress = { applicationId: state.application.id, accessUnlockAt: examUnlockAt(state.application.approvedAt), examStatus: "not_started", certificateStatus: "not_eligible", latestScore: null, startedAt: null, completedAt: null, qrToken: null };
      return state.application;
    }),
    getStudentCourse: vi.fn(async () => ({ title: "Eletricidade Básica", hours: 12, lessonUrl: "https://example.org/aulas-eletricidade" })),
    startCourse: vi.fn(async () => { state.progress.startedAt = new Date(); return student(); }),
    getCourseAssessment: vi.fn(async () => ({ questions: Array.from({ length: 10 }, (_, index) => ({ id: index + 1, question: `Pergunta ${index + 1}`, options: ["A", "B", "C", "D"] })), answerKey: [...ANSWER_KEY], lessonUrl: "https://example.org/aulas-eletricidade" })),
    submitExam: vi.fn(async (_code: string, score: number) => { state.progress.latestScore = score; state.progress.examStatus = score > 50 ? "passed" : "retry"; state.progress.completedAt = new Date(); return student(); }),
    saveCertificatePreflight: vi.fn(async (_id: number, report: any) => { state.progress.certificateStatus = report.conforming ? "pending" : "not_eligible"; state.progress.certificateAiReport = JSON.stringify(report); return report; }),
    listCertificateRequests: vi.fn(async () => state.progress?.certificateStatus === "pending" ? [{ application: state.application, progress: state.progress }] : []),
    authorizeCertificate: vi.fn(async (_id: number, approved: boolean) => { state.progress.certificateStatus = approved ? "approved" : "rejected"; state.progress.qrToken = approved ? "test-certificate-token-404001" : null; return "SE-CERT-404001"; }),
    listIssuedCertificates: vi.fn(async () => state.progress?.certificateStatus === "approved" ? [{ application: state.application, progress: state.progress }] : []),
    getCertificateByToken: vi.fn(async (token: string) => token === state.progress?.qrToken ? { application: state.application, progress: state.progress } : undefined),
    getStudentRanking: vi.fn(async () => ({ courseTitle: state.application.courseTitle, cohort: "10/2026", yourScore: state.progress?.latestScore, students: state.progress?.examStatus === "passed" ? [{ position: 1, displayName: "Você", score: state.progress.latestScore, isMe: true }] : [] })),
    listMaterialProgress: vi.fn(async () => []),
  };
});

import { appRouter } from "./routers";

const context = (admin = false) => ({
  user: admin ? { id: 1, email: "souelectricista@gmail.com", role: "admin", openId: "test-director" } : null,
  req: { protocol: "https", headers: {} }, res: { cookie: vi.fn(), clearCookie: vi.fn() },
}) as unknown as TrpcContext;

beforeEach(() => { fixture.state.application = null; fixture.state.progress = null; fixture.state.proofReviewed = false; });

describe("Percurso integral isolado — sem alterar inscrições reais", () => {
  it("liga inscrição, Coordenação, curso, biblioteca, teste, ranking, certificado e PDF", async () => {
    const publicCaller = appRouter.createCaller(context());
    const director = appRouter.createCaller(context(true));
    const course = (await publicCaller.public.courses())[0];
    expect(course.lessonUrl).toBe("https://example.org/aulas-eletricidade");
    expect((await director.coordination.managedCourses())).toHaveLength(1);
    await expect(publicCaller.coordination.managedCourses()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(director.coordination.updateCourseLesson({ id: 1, lessonUrl: "javascript:alert(1)" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(PRACTICAL_LESSONS_URL).toContain("drive.google.com/drive/folders/");

    const application = await publicCaller.public.createApplication({ fullName: "Aluno de Teste", email: "teste@example.org", nif: "NIF-TESTE-404001", phone: "900000000", courseTitle: course.title, paymentMethod: "PayPay AO", proofData: "data:application/pdf;base64,VEVTVEU=", proofName: "simulacao-sem-pagamento.pdf", proofType: "application/pdf" });
    expect(application.applicationNumber).toBe(application.accessCode);
    expect(fixture.state.proofReviewed).toBe(true);
    await expect(publicCaller.student.login({ accessCode: application.accessCode })).rejects.toMatchObject({ code: "UNAUTHORIZED" });

    await director.coordination.approveApplication({ applicationNumber: application.applicationNumber, status: "approved" });
    const loggedIn = await publicCaller.student.login({ accessCode: application.accessCode });
    expect(loggedIn.progress?.accessUnlockAt).toEqual(examUnlockAt(loggedIn.application.approvedAt));
    expect((await publicCaller.student.course({ accessCode: application.accessCode }))?.lessonUrl).toBe(course.lessonUrl);
    expect((await publicCaller.student.startCourse({ accessCode: application.accessCode }))?.progress?.startedAt).toBeInstanceOf(Date);
    expect(await publicCaller.student.materialProgress({ accessCode: application.accessCode })).toEqual([]);
    await expect(publicCaller.student.exam({ accessCode: application.accessCode })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(publicCaller.student.submitExam({ accessCode: application.accessCode, answers: [...ANSWER_KEY] })).rejects.toMatchObject({ code: "FORBIDDEN" });

    // Passage of time is simulated in memory; no real student's deadline is modified.
    fixture.state.progress.accessUnlockAt = new Date(Date.now() - 1000);
    const exam = await publicCaller.student.exam({ accessCode: application.accessCode });
    expect(exam.questions).toHaveLength(10);
    expect(JSON.stringify(exam)).not.toContain("answerKey");
    const completed = await publicCaller.student.submitExam({ accessCode: application.accessCode, answers: [...ANSWER_KEY] });
    expect(completed?.progress?.latestScore).toBe(100);
    expect((await publicCaller.student.ranking({ accessCode: application.accessCode }))?.students[0]?.score).toBe(100);

    expect((await director.coordination.certificateRequests()).length).toBe(1);
    expect((await publicCaller.student.getByCode({ accessCode: application.accessCode }))?.progress?.certificateStatus).toBe("pending");
    const pendingHtml = renderToStaticMarkup(createElement(StudentCertificatePanel, { courseTitle: course.title, progress: fixture.state.progress }));
    expect(pendingHtml).toContain("Em análise");
    expect(pendingHtml).not.toContain("/api/download/certificate/");
    await director.coordination.authorizeCertificate({ applicationId: application.id, approved: true });
    expect((await director.coordination.certificateRequests()).length).toBe(0);
    expect((await director.coordination.issuedCertificates()).length).toBe(1);
    const studentAfter = await publicCaller.student.getByCode({ accessCode: application.accessCode });
    expect(studentAfter?.progress?.certificateStatus).toBe("approved");
    const token = studentAfter?.progress?.qrToken;
    expect((await publicCaller.public.certificate({ token }))?.progress?.qrToken).toBe(token);
    const approvedHtml = renderToStaticMarkup(createElement(StudentCertificatePanel, { courseTitle: course.title, progress: fixture.state.progress }));
    expect(approvedHtml).toContain(`/api/download/certificate/${token}`);
    expect(approvedHtml).toContain(`/validar/${token}`);
  });
});
