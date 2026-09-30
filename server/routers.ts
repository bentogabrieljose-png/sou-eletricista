import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COURSE_LESSON_URL, EXAM_QUESTIONS, scoreExam } from "../shared/course";
import { addNotebookPage, authorizeCertificate, buildCertificateFallbackReport, clearNotebookPage, createApplication, createContent, createCourse, createMessage, deleteApplicationPermanently, deleteStudentDataPermanently, ensureCertificatePending, getApplicationByNumber, getCertificateByToken, getNotebook, getStudentByCode, listApplications, listCertificateRequests, listContent, listCourses, listMessages, listMaterialProgress, listNotebookVersions, listIssuedCertificates, markMaterialViewed, restoreNotebookVersion, saveCertificatePreflight, certificatePreflightInput, saveNotebookPage, startCourse, submitExam, updateApplicationStatus, uploadNotebookImage } from "./db";
import { invokeLLM } from "./_core/llm";
import { COOKIE_NAME, COORDINATION_COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { sdk } from "./_core/sdk";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { getRequestMetrics } from "./metrics";

const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin" && ctx.user.email?.toLowerCase() !== "souelectricista@gmail.com") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Acesso reservado à Coordenação." });
  }
  return next({ ctx });
});

const applicationInput = z.object({
  fullName: z.string().min(3), email: z.string().email(), nif: z.string().min(3), phone: z.string().min(6),
  courseTitle: z.string().min(3), paymentMethod: z.string().min(2), proofData: z.string().optional(), proofName: z.string().optional(), proofType: z.string().optional(),
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    coordinationLogin: publicProcedure.input(z.object({ email: z.string().email(), pin: z.string().min(3).max(32) })).mutation(async ({ ctx, input }) => {
      if (input.email.toLowerCase() !== "souelectricista@gmail.com" || input.pin !== "123") {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "E-mail ou PIN da Coordenação inválido." });
      }
      const token = await sdk.signSession({ openId: "coordination-admin", appId: "sou-eletricista-coordination", name: "Gabriel Carlos Cambinza" }, { expiresInMs: 1000 * 60 * 60 * 24 * 30 });
      ctx.res.cookie(COORDINATION_COOKIE_NAME, token, { ...getSessionCookieOptions(ctx.req), maxAge: 1000 * 60 * 60 * 24 * 30 });
      return { success: true } as const;
    }),
    coordinationLogout: publicProcedure.mutation(({ ctx }) => {
      ctx.res.clearCookie(COORDINATION_COOKIE_NAME, { ...getSessionCookieOptions(ctx.req), maxAge: -1 });
      return { success: true } as const;
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  public: router({
    courses: publicProcedure.query(() => listCourses()),
    content: publicProcedure.query(() => listContent(true)),
    applicationStatus: publicProcedure.input(z.object({ applicationNumber: z.string().min(4) })).query(({ input }) => getApplicationByNumber(input.applicationNumber)),
    certificate: publicProcedure.input(z.object({ token: z.string().min(8) })).query(({ input }) => getCertificateByToken(input.token)),
    createApplication: publicProcedure.input(applicationInput).mutation(({ input }) => createApplication(input)),
  }),
  student: router({
    getByCode: publicProcedure.input(z.object({ accessCode: z.string().min(5) })).query(async ({ input }) => {
      const student = await getStudentByCode(input.accessCode);
      if (!student) return undefined;
      await ensureCertificatePending(student.application.id);
      return (await getStudentByCode(input.accessCode)) || student;
    }),
    login: publicProcedure.input(z.object({ accessCode: z.string().min(5) })).mutation(async ({ input }) => {
      const student = await getStudentByCode(input.accessCode);
      if (!student) throw new TRPCError({ code: "UNAUTHORIZED", message: "Código inválido ou candidatura ainda não aprovada." });
      await ensureCertificatePending(student.application.id);
      return (await getStudentByCode(input.accessCode)) || student;
    }),
    startCourse: publicProcedure.input(z.object({ accessCode: z.string().min(5) })).mutation(({ input }) => startCourse(input.accessCode)),
    materialProgress: publicProcedure.input(z.object({ accessCode: z.string().min(5) })).query(({ input }) => listMaterialProgress(input.accessCode)),
    markMaterialViewed: publicProcedure.input(z.object({ accessCode: z.string().min(5), materialKey: z.string().min(2).max(120), materialTitle: z.string().min(2).max(255), resourceUrl: z.string().url().optional() })).mutation(({ input }) => markMaterialViewed(input.accessCode, input)),
    notebook: publicProcedure.input(z.object({ accessCode: z.string().min(5) })).query(({ input }) => getNotebook(input.accessCode)),
    saveNotebookPage: publicProcedure.input(z.object({ accessCode: z.string().min(5), pageNumber: z.number().int().min(1).max(50), contentHtml: z.string().max(900000) })).mutation(({ input }) => saveNotebookPage(input.accessCode, input.pageNumber, input.contentHtml)),
    addNotebookPage: publicProcedure.input(z.object({ accessCode: z.string().min(5) })).mutation(({ input }) => addNotebookPage(input.accessCode)),
    notebookVersions: publicProcedure.input(z.object({ accessCode: z.string().min(5), pageNumber: z.number().int().min(1).max(50) })).query(({ input }) => listNotebookVersions(input.accessCode, input.pageNumber)),
    restoreNotebookVersion: publicProcedure.input(z.object({ accessCode: z.string().min(5), pageNumber: z.number().int().min(1).max(50), versionId: z.number().int().positive() })).mutation(({ input }) => restoreNotebookVersion(input.accessCode, input.pageNumber, input.versionId)),
    clearNotebookPage: publicProcedure.input(z.object({ accessCode: z.string().min(5), pageNumber: z.number().int().min(1).max(50) })).mutation(({ input }) => clearNotebookPage(input.accessCode, input.pageNumber)),
    uploadNotebookImage: publicProcedure.input(z.object({ accessCode: z.string().min(5), fileName: z.string().min(1).max(255), contentType: z.string().min(3).max(100), data: z.string().min(20).max(12000000) })).mutation(({ input }) => uploadNotebookImage(input.accessCode, input)),
    exam: publicProcedure.input(z.object({ accessCode: z.string().min(5) })).query(async ({ input }) => {
      const student = await getStudentByCode(input.accessCode);
      if (!student) throw new TRPCError({ code: "NOT_FOUND", message: "Aluno não encontrado." });
      return { questions: EXAM_QUESTIONS, courseUrl: COURSE_LESSON_URL };
    }),
    submitExam: publicProcedure.input(z.object({ accessCode: z.string().min(5), answers: z.array(z.number().int().min(0).max(3)).length(10) })).mutation(async ({ input }) => {
      const score = scoreExam(input.answers);
      const student = await getStudentByCode(input.accessCode);
      const result = await submitExam(input.accessCode, score, input.answers);
      if (!student || score < 50) return result;
      let report = { conforming: false, score, checks: [] as string[], issues: ["A inspeção automática não foi concluída."] };
      try {
        const inspection = await invokeLLM({
          model: "gpt-5-nano",
          messages: [
            { role: "system", content: "Você é o inspetor oficial de certificados do centro Sou Eletricista. Verifique estritamente se os dados fornecidos preenchem todos os campos obrigatórios do modelo oficial, sem inventar dados. O certificado só pode ficar pendente quando conforming=true, score é exatamente o resultado recebido, e não há issues." },
            { role: "user", content: JSON.stringify(certificatePreflightInput(student, score)) },
          ],
          response_format: { type: "json_schema", json_schema: { name: "certificate_preflight", strict: true, schema: { type: "object", properties: { conforming: { type: "boolean" }, score: { type: "integer" }, checks: { type: "array", items: { type: "string" } }, issues: { type: "array", items: { type: "string" } } }, required: ["conforming", "score", "checks", "issues"], additionalProperties: false } } },
        });
        const content = inspection.choices?.[0]?.message?.content;
        if (typeof content === "string") report = { ...JSON.parse(content), score };
      } catch (error) {
        console.warn("[Certificate] AI preflight unavailable:", error);
      }
      const allFieldsPresent = Boolean(student.application.fullName && student.application.courseTitle && score >= 50);
      report.conforming = Boolean(report.conforming && report.issues.length === 0 && allFieldsPresent);
      if (!report.conforming) {
        const fallback = buildCertificateFallbackReport(student, score);
        if (fallback.conforming) report = fallback;
      }
      await saveCertificatePreflight(student.application.id, report);
      return getStudentByCode(input.accessCode);
    }),
    messages: publicProcedure.input(z.object({ accessCode: z.string().min(5) })).query(async ({ input }) => {
      const student = await getStudentByCode(input.accessCode);
      return student ? listMessages(student.application.id) : [];
    }),
    sendMessage: publicProcedure.input(z.object({ accessCode: z.string().min(5), subject: z.string().min(2), body: z.string().min(2) })).mutation(async ({ input }) => {
      const student = await getStudentByCode(input.accessCode);
      if (!student) throw new TRPCError({ code: "NOT_FOUND", message: "Aluno não encontrado." });
      return createMessage({ applicationId: student.application.id, fromRole: "student", subject: input.subject, body: input.body });
    }),
    assistant: publicProcedure.input(z.object({ question: z.string().min(2), history: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() })).default([]) })).mutation(async ({ input }) => {
      const response = await invokeLLM({
        messages: [
          { role: "system", content: "Você é Sou Eletricista, um assistente didático de eletricidade básica e instalações residenciais de baixa tensão. Responda em português claro, com passos práticos, destaque segurança e nunca incentive trabalho energizado ou improvisações perigosas." },
          ...input.history.map(message => ({ role: message.role as "user" | "assistant", content: message.content })),
          { role: "user", content: input.question },
        ],
      });
      const content = response.choices?.[0]?.message?.content;
      return { answer: typeof content === "string" ? content : "Não consegui responder agora. Tente novamente." };
    }),
  }),
  coordination: router({
    monitoring: adminProcedure.query(() => getRequestMetrics()),
    applications: adminProcedure.query(() => listApplications()),
    approveApplication: adminProcedure.input(z.object({ applicationNumber: z.string(), status: z.enum(["approved", "rejected"]), rejectionReason: z.string().optional() })).mutation(({ input }) => updateApplicationStatus(input.applicationNumber, input.status, input.rejectionReason)),
    deleteApplicationPermanently: adminProcedure.input(z.object({ applicationNumber: z.string() })).mutation(({ input }) => deleteApplicationPermanently(input.applicationNumber)),
    certificateRequests: adminProcedure.query(() => listCertificateRequests()),
    issuedCertificates: adminProcedure.query(() => listIssuedCertificates()),
    deleteStudentDataPermanently: adminProcedure.input(z.object({ applicationId: z.number().int().positive() })).mutation(({ input }) => deleteStudentDataPermanently(input.applicationId)),
    authorizeCertificate: adminProcedure.input(z.object({ applicationId: z.number(), approved: z.boolean() })).mutation(({ input }) => authorizeCertificate(input.applicationId, input.approved)),
    messages: adminProcedure.query(() => listMessages()),
    reply: adminProcedure.input(z.object({ applicationId: z.number(), subject: z.string().min(2), body: z.string().min(2) })).mutation(({ input }) => createMessage({ applicationId: input.applicationId, fromRole: "coordination", subject: input.subject, body: input.body })),
    content: adminProcedure.query(() => listContent(false)),
    createContent: adminProcedure.input(z.object({ kind: z.enum(["welcome_video", "course_video", "update"]), title: z.string().min(2), body: z.string().optional(), mediaUrl: z.string().optional() })).mutation(({ input }) => createContent(input)),
    createCourse: adminProcedure.input(z.object({ title: z.string().min(3), slug: z.string().min(3), description: z.string().min(10), hours: z.number().int().positive(), lessonUrl: z.string().url() })).mutation(({ input }) => createCourse(input)),
  }),
});

export type AppRouter = typeof appRouter;
