import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COURSE_LESSON_URL, EXAM_QUESTIONS, scoreExam } from "../shared/course";
import { createApplication, createContent, createCourse, createMessage, getApplicationByNumber, getCertificateByToken, getStudentByCode, listApplications, listCertificateRequests, listContent, listCourses, listMessages, startCourse, submitExam, updateApplicationStatus, authorizeCertificate } from "./db";
import { invokeLLM } from "./_core/llm";
import { COOKIE_NAME, COORDINATION_COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { sdk } from "./_core/sdk";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";

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
    getByCode: publicProcedure.input(z.object({ accessCode: z.string().min(5) })).query(({ input }) => getStudentByCode(input.accessCode)),
    startCourse: publicProcedure.input(z.object({ accessCode: z.string().min(5) })).mutation(({ input }) => startCourse(input.accessCode)),
    exam: publicProcedure.input(z.object({ accessCode: z.string().min(5) })).query(async ({ input }) => {
      const student = await getStudentByCode(input.accessCode);
      if (!student) throw new TRPCError({ code: "NOT_FOUND", message: "Aluno não encontrado." });
      return { questions: EXAM_QUESTIONS, courseUrl: COURSE_LESSON_URL };
    }),
    submitExam: publicProcedure.input(z.object({ accessCode: z.string().min(5), answers: z.array(z.number().int().min(0).max(3)).length(10) })).mutation(async ({ input }) => {
      const score = scoreExam(input.answers);
      return submitExam(input.accessCode, score, input.answers);
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
    applications: adminProcedure.query(() => listApplications()),
    approveApplication: adminProcedure.input(z.object({ applicationNumber: z.string(), status: z.enum(["approved", "rejected"]), rejectionReason: z.string().optional() })).mutation(({ input }) => updateApplicationStatus(input.applicationNumber, input.status, input.rejectionReason)),
    certificateRequests: adminProcedure.query(() => listCertificateRequests()),
    authorizeCertificate: adminProcedure.input(z.object({ applicationId: z.number(), approved: z.boolean() })).mutation(({ input }) => authorizeCertificate(input.applicationId, input.approved)),
    messages: adminProcedure.query(() => listMessages()),
    reply: adminProcedure.input(z.object({ applicationId: z.number(), subject: z.string().min(2), body: z.string().min(2) })).mutation(({ input }) => createMessage({ applicationId: input.applicationId, fromRole: "coordination", subject: input.subject, body: input.body })),
    content: adminProcedure.query(() => listContent(false)),
    createContent: adminProcedure.input(z.object({ kind: z.enum(["welcome_video", "course_video", "update"]), title: z.string().min(2), body: z.string().optional(), mediaUrl: z.string().optional() })).mutation(({ input }) => createContent(input)),
    createCourse: adminProcedure.input(z.object({ title: z.string().min(3), slug: z.string().min(3), description: z.string().min(10), hours: z.number().int().positive(), lessonUrl: z.string().url() })).mutation(({ input }) => createCourse(input)),
  }),
});

export type AppRouter = typeof appRouter;
