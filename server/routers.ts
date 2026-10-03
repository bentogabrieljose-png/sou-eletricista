import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { PRACTICAL_LESSONS_URL, scoreExam } from "../shared/course";
import { addNotebookPage, authorizeCertificate, authorizeCertificateReprint, buildCertificateFallbackReport, clearNotebookPage, createApplication, createCertificateReprint, createContent, createCourse, createMessage, deleteApplicationPermanently, deleteContent, deleteStudentDataPermanently, ensureCertificatePending, getApplicationByNumber, getApplicationStats, getCertificateByToken, getCertificateReprintStatus, getCourseAssessment, getCurrentTrainingPrice, getNotebook, getStudentByCode, getStudentCourse, getStudentRanking, listApplicationsPage, listManagedCourses, listCertificateReprints, listCertificateRequests, listContent, listCourses, listMessages, listMaterialProgress, listNotebookVersions, listIssuedCertificates, markMaterialViewed, restoreNotebookVersion, saveCertificatePreflight, certificatePreflightInput, saveNotebookPage, startCourse, submitExam, updateApplicationStatus, uploadContentMedia, uploadNotebookImage, updateCourseLessonUrl } from "./db";
import { invokeLLM } from "./_core/llm";
import { COOKIE_NAME, COORDINATION_COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { sdk } from "./_core/sdk";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { getRequestMetrics } from "./metrics";
import { generateCertificateRegisterPdf } from "./pdf";

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

async function inspectEnrollmentProof(input: z.infer<typeof applicationInput>) {
  if (!input.proofData || !input.proofType) {
    return { status: "review" as const, report: "Comprovativo ausente ou sem tipo legível; revisão manual obrigatória." };
  }
  if (input.proofType === "application/pdf") {
    return { status: "review" as const, report: "PDF recebido. A consistência automática de nome, NIF, método e valor requer revisão do comprovativo pelo Diretor." };
  }
  try {
    const price = getCurrentTrainingPrice();
    const inspection = await invokeLLM({
      model: "gpt-5-nano",
      maxTokens: 280,
      messages: [
        { role: "system", content: "Inspecione rapidamente um comprovativo de pagamento de inscrição. Não declare que um documento é genuíno nem consulte bases governamentais: apenas avalie consistência visual e textual. Compare nome, NIF, método escolhido e valor esperado. Se um campo estiver ilegível ou não puder ser confirmado, use review. Responda apenas no JSON pedido." },
        { role: "user", content: [
          { type: "text", text: JSON.stringify({ candidateName: input.fullName, candidateNif: input.nif, selectedMethod: input.paymentMethod, expectedAmountKz: price.amountKz, expectedAmountEuro: price.amountEuro, warning: "A análise é uma triagem de consistência; a Coordenação mantém a decisão final." }) },
          { type: "image_url", image_url: { url: input.proofData, detail: "low" } },
        ] },
      ],
      response_format: { type: "json_schema", json_schema: { name: "enrollment_proof_inspection", strict: true, schema: { type: "object", properties: { status: { type: "string", enum: ["consistent", "review", "inconsistent"] }, nameMatches: { type: "boolean" }, nifMatches: { type: "boolean" }, methodMatches: { type: "boolean" }, amountMatches: { type: "boolean" }, legible: { type: "boolean" }, notes: { type: "array", items: { type: "string" } } }, required: ["status", "nameMatches", "nifMatches", "methodMatches", "amountMatches", "legible", "notes"], additionalProperties: false } } },
    });
    const parsed = JSON.parse(String(inspection.choices?.[0]?.message?.content || "{}"));
    const report = JSON.stringify({ ...parsed, checkedAt: new Date().toISOString(), limitation: "Triagem automática de consistência; não substitui a verificação humana de autenticidade." });
    return { status: parsed.status as "consistent" | "review" | "inconsistent", report };
  } catch (error) {
    console.warn("[Application] proof inspection unavailable:", error);
    return { status: "review" as const, report: "A inspeção automática não respondeu; revisão manual obrigatória antes da aprovação." };
  }
}

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
    pricing: publicProcedure.query(() => getCurrentTrainingPrice()),
    content: publicProcedure.query(() => listContent(true)),
    applicationStatus: publicProcedure.input(z.object({ applicationNumber: z.string().min(4) })).query(({ input }) => getApplicationByNumber(input.applicationNumber)),
    certificate: publicProcedure.input(z.object({ token: z.string().min(8) })).query(({ input }) => getCertificateByToken(input.token)),
    createApplication: publicProcedure.input(applicationInput).mutation(async ({ input }) => {
      const inspection = await inspectEnrollmentProof(input);
      return createApplication({ ...input, proofInspectionStatus: inspection.status, proofInspectionReport: inspection.report });
    }),
  }),
  student: router({
    getByCode: publicProcedure.input(z.object({ accessCode: z.string().min(5) })).query(async ({ input }) => {
      const student = await getStudentByCode(input.accessCode);
      if (!student) return undefined;
      if (student.progress?.examStatus === "passed" && student.progress.certificateStatus === "not_eligible" && (student.progress.latestScore ?? 0) > 50) {
        await ensureCertificatePending(student.application.id);
        return (await getStudentByCode(input.accessCode)) || student;
      }
      return student;
    }),
    login: publicProcedure.input(z.object({ accessCode: z.string().min(5) })).mutation(async ({ input }) => {
      const student = await getStudentByCode(input.accessCode);
      if (!student) throw new TRPCError({ code: "UNAUTHORIZED", message: "Código inválido ou candidatura ainda não aprovada." });
      if (student.progress?.examStatus === "passed" && student.progress.certificateStatus === "not_eligible" && (student.progress.latestScore ?? 0) > 50) {
        await ensureCertificatePending(student.application.id);
        return (await getStudentByCode(input.accessCode)) || student;
      }
      return student;
    }),
    startCourse: publicProcedure.input(z.object({ accessCode: z.string().min(5) })).mutation(({ input }) => startCourse(input.accessCode)),
    course: publicProcedure.input(z.object({ accessCode: z.string().min(5) })).query(({ input }) => getStudentCourse(input.accessCode)),
    library: publicProcedure.input(z.object({ accessCode: z.string().min(5) })).query(async ({ input }) => {
      const student = await getStudentByCode(input.accessCode);
      if (!student || student.application.status !== "approved") throw new TRPCError({ code: "FORBIDDEN", message: "Biblioteca reservada aos alunos com inscrição aprovada e acesso ativo." });
      return { url: PRACTICAL_LESSONS_URL };
    }),
    ranking: publicProcedure.input(z.object({ accessCode: z.string().min(5) })).query(({ input }) => getStudentRanking(input.accessCode)),
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
      if (!student.progress?.accessUnlockAt || student.progress.accessUnlockAt.getTime() > Date.now()) throw new TRPCError({ code: "FORBIDDEN", message: "O teste abre 12 horas após a aprovação da inscrição." });
      if (student.progress.examStatus === "passed") throw new TRPCError({ code: "FORBIDDEN", message: "A avaliação já foi concluída." });
      const assessment = await getCourseAssessment(student.application.courseTitle);
      return { questions: assessment.questions, courseUrl: assessment.lessonUrl };
    }),
    submitExam: publicProcedure.input(z.object({ accessCode: z.string().min(5), answers: z.array(z.number().int().min(0).max(3)).length(10) })).mutation(async ({ input }) => {
      const student = await getStudentByCode(input.accessCode);
      if (!student) throw new TRPCError({ code: "NOT_FOUND", message: "Aluno não encontrado." });
      if (!student.progress?.accessUnlockAt || student.progress.accessUnlockAt.getTime() > Date.now()) throw new TRPCError({ code: "FORBIDDEN", message: "O teste abre 12 horas após a aprovação da inscrição." });
      const assessment = await getCourseAssessment(student.application.courseTitle);
      const score = scoreExam(input.answers, assessment.answerKey);
      const result = await submitExam(input.accessCode, score, input.answers);
      if (!student || score <= 50) return result;
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
      const allFieldsPresent = Boolean(student.application.fullName && student.application.courseTitle && score > 50);
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
    certificateReprintStatus: publicProcedure.input(z.object({ id: z.number().int().positive(), requesterEmail: z.string().email() })).query(({ input }) => getCertificateReprintStatus(input.id, input.requesterEmail)),
    requestCertificateReprint: publicProcedure.input(z.object({ qrToken: z.string().min(8), requesterName: z.string().min(3), requesterEmail: z.string().email(), paymentMethod: z.string().min(2), feeAmount: z.number().int().positive(), feeCurrency: z.string().min(2).max(8), proofData: z.string().min(20), proofName: z.string().min(1).max(255), proofType: z.string().optional() })).mutation(({ input }) => createCertificateReprint(input)),
    assistant: publicProcedure.input(z.object({ question: z.string().min(2), history: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() })).default([]) })).mutation(async ({ input }) => {
      const response = await invokeLLM({
        messages: [
          { role: "system", content: "Você é Sou Eletricista. Responda sempre em português claro, curto e objetivo: dê apenas a resposta específica, os passos essenciais e um alerta de segurança quando necessário. Nunca incentive trabalho energizado ou improvisações perigosas." },
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
    applicationStats: adminProcedure.query(() => getApplicationStats()),
    applications: adminProcedure.input(z.object({ page: z.number().int().min(1).default(1), pageSize: z.number().int().min(1).max(100).default(50), courseTitle: z.string().optional(), status: z.enum(["pending", "approved", "rejected"]).optional(), from: z.string().date().optional(), to: z.string().date().optional(), search: z.string().max(320).optional(), proofStatus: z.enum(["consistent", "review", "inconsistent"]).optional() })).query(({ input }) => {
      if (input.from && input.to && input.from > input.to) throw new TRPCError({ code: "BAD_REQUEST", message: "A data inicial não pode ultrapassar a data final." });
      const to = input.to ? new Date(`${input.to}T00:00:00.000Z`) : undefined;
      if (to) to.setUTCDate(to.getUTCDate() + 1);
      return listApplicationsPage({ ...input, from: input.from ? new Date(`${input.from}T00:00:00.000Z`) : undefined, to });
    }),
    approveApplication: adminProcedure.input(z.object({ applicationNumber: z.string(), status: z.enum(["approved", "rejected"]), rejectionReason: z.string().optional() })).mutation(({ input }) => updateApplicationStatus(input.applicationNumber, input.status, input.rejectionReason)),
    deleteApplicationPermanently: adminProcedure.input(z.object({ applicationNumber: z.string() })).mutation(({ input }) => deleteApplicationPermanently(input.applicationNumber)),
    certificateRequests: adminProcedure.query(() => listCertificateRequests()),
    issuedCertificates: adminProcedure.query(() => listIssuedCertificates()),
    exportCertificateRegisterPdf: adminProcedure.mutation(async () => {
      const issued = await listIssuedCertificates();
      const items = issued
        .filter(item => item.progress.certificateStatus === "approved" && item.progress.qrToken)
        .map(item => ({
          registrationNumber: item.progress.certificateNumber || `SE-REG-${new Date().getFullYear()}-${String(item.progress.applicationId).padStart(6, "0")}`,
          fullName: item.application.fullName || item.progress.studentName || "Aluno",
          courseTitle: item.application.courseTitle || item.progress.courseTitle || "Curso",
          score: item.progress.latestScore,
          completedAt: item.progress.completedAt,
          qrToken: item.progress.qrToken,
        }))
        .sort((a, b) => a.registrationNumber.localeCompare(b.registrationNumber));
      const pdf = await generateCertificateRegisterPdf(items);
      return { fileName: `registo-certificados-${new Date().toISOString().slice(0, 10)}.pdf`, data: pdf.toString("base64"), count: items.length };
    }),
    certificateReprints: adminProcedure.query(() => listCertificateReprints()),
    deleteStudentDataPermanently: adminProcedure.input(z.object({ applicationId: z.number().int().positive() })).mutation(({ input }) => deleteStudentDataPermanently(input.applicationId)),
    authorizeCertificate: adminProcedure.input(z.object({ applicationId: z.number(), approved: z.boolean() })).mutation(({ input }) => authorizeCertificate(input.applicationId, input.approved)),
    authorizeCertificateReprint: adminProcedure.input(z.object({ id: z.number().int().positive(), approved: z.boolean() })).mutation(({ input }) => authorizeCertificateReprint(input.id, input.approved)),
    messages: adminProcedure.query(() => listMessages()),
    reply: adminProcedure.input(z.object({ applicationId: z.number(), subject: z.string().min(2), body: z.string().min(2) })).mutation(({ input }) => createMessage({ applicationId: input.applicationId, fromRole: "coordination", subject: input.subject, body: input.body })),
    content: adminProcedure.query(() => listContent(false)),
    deleteContent: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ input }) => deleteContent(input.id)),
    uploadContentMedia: adminProcedure.input(z.object({ fileName: z.string().min(1).max(255), contentType: z.string().min(3).max(120), data: z.string().min(20).max(120000000) })).mutation(({ input }) => uploadContentMedia(input)),
    createContent: adminProcedure.input(z.object({ kind: z.enum(["welcome_video", "course_video", "update"]), title: z.string().min(2), body: z.string().optional(), mediaUrl: z.string().min(1).optional(), mediaPosterUrl: z.string().url().optional(), mediaDurationSeconds: z.number().int().nonnegative().optional(), mediaProcessingStatus: z.enum(["not_applicable", "processed", "original"]).optional() })).mutation(({ input }) => createContent(input)),
    managedCourses: adminProcedure.query(() => listManagedCourses()),
    updateCourseLesson: adminProcedure.input(z.object({ id: z.number().int().positive(), lessonUrl: z.string().url().refine(value => /^https?:\/\//i.test(value), "Use um link HTTP(S) válido.") })).mutation(({ input }) => updateCourseLessonUrl(input.id, input.lessonUrl)),
    createCourse: adminProcedure.input(z.object({ title: z.string().min(3), slug: z.string().min(3), description: z.string().min(10), hours: z.number().int().positive(), lessonUrl: z.string().url(), examQuestions: z.array(z.object({ question: z.string().min(10), options: z.tuple([z.string().min(1), z.string().min(1), z.string().min(1), z.string().min(1)]), correctIndex: z.number().int().min(0).max(3) })).length(10) })).mutation(({ input }) => createCourse(input)),
  }),
});

export type AppRouter = typeof appRouter;
