import { and, asc, count, desc, eq, gte, isNotNull, isNull, like, lt, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { nanoid } from "nanoid";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { promisify } from "node:util";
import { InsertUser, applications, certificateReprintRequests, contentItems, courses, examAttempts, materialProgress, messages, notebookPages, notebookVersions, notebooks, studentProgress, users } from "../drizzle/schema";
import { COURSE_LESSON_URL, EXAM_QUESTIONS, ANSWER_KEY, examUnlockAt, type CourseExamQuestion } from "../shared/course";
import { CERTIFICATE_CENTER_NAME, CERTIFICATE_DIRECTOR_NAME, CERTIFICATE_DURATION_LABEL, CERTIFICATE_REGISTRATION_PREFIX, CERTIFICATE_TEMPLATE_VERSION, isValidCertificateRegistration } from "../shared/certificate";
import { CERTIFICATE_REPRINT_FEES } from "../shared/payments";
import { getTrainingPrice } from "../shared/pricing";
import { ENV } from "./_core/env";
import { readTtlCache, writeTtlCache, type TtlCacheEntry } from "./cache";

let _db: ReturnType<typeof drizzle> | null = null;
const PUBLIC_CACHE_MS = 30_000;
let defaultCoursePromise: Promise<void> | null = null;
type CourseRow = typeof courses.$inferSelect;
type PublicCourseRow = Omit<CourseRow, "examQuestions">;
type ContentRow = typeof contentItems.$inferSelect;
let coursesCache: TtlCacheEntry<PublicCourseRow[]> | null = null;
let publicContentCache: TtlCacheEntry<ContentRow[]> | null = null;
const execFileAsync = promisify(execFile);

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const coordinator = user.email?.toLowerCase() === "souelectricista@gmail.com";
  const values: InsertUser = { openId: user.openId, lastSignedIn: user.lastSignedIn ?? new Date() };
  const updateSet: Record<string, unknown> = { lastSignedIn: values.lastSignedIn };
  for (const field of ["name", "email", "loginMethod"] as const) {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = values[field];
    }
  }
  if (user.role !== undefined || coordinator || user.openId === ENV.ownerOpenId) {
    values.role = user.role ?? (coordinator || user.openId === ENV.ownerOpenId ? "admin" : "user");
    updateSet.role = values.role;
  }
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function ensureDefaultCourse() {
  if (defaultCoursePromise) return defaultCoursePromise;
  defaultCoursePromise = ensureDefaultCourseOnce().finally(() => { defaultCoursePromise = null; });
  return defaultCoursePromise;
}

async function ensureDefaultCourseOnce() {
  const db = await getDb();
  if (!db) return;
  const existing = await db.select().from(courses).where(eq(courses.slug, "eletricidade-basica")).limit(1);
  if (existing.length === 0) {
    await db.insert(courses).values({
      title: "Eletricidade Básica para Instalações Residenciais em Baixa Tensão",
      slug: "eletricidade-basica",
      description: "Formação introdutória para compreender circuitos, segurança, ferramentas e instalações residenciais de baixa tensão.",
      hours: 12,
      lessonUrl: COURSE_LESSON_URL,
      active: 1,
    });
  }
}

export async function listCourses(): Promise<PublicCourseRow[]> {
  const cached = readTtlCache(coursesCache);
  if (cached) return cached;
  const db = await getDb();
  if (!db) return [];
  await ensureDefaultCourse();
  const value = await db.select({ id: courses.id, title: courses.title, slug: courses.slug, description: courses.description, hours: courses.hours, lessonUrl: courses.lessonUrl, coverUrl: courses.coverUrl, active: courses.active, createdAt: courses.createdAt, updatedAt: courses.updatedAt }).from(courses).where(eq(courses.active, 1)).orderBy(desc(courses.createdAt));
  coursesCache = writeTtlCache(value, PUBLIC_CACHE_MS);
  return value;
}

export async function listManagedCourses(): Promise<PublicCourseRow[]> {
  const db = await getDb();
  if (!db) return [];
  await ensureDefaultCourse();
  return db.select({ id: courses.id, title: courses.title, slug: courses.slug, description: courses.description, hours: courses.hours, lessonUrl: courses.lessonUrl, coverUrl: courses.coverUrl, active: courses.active, createdAt: courses.createdAt, updatedAt: courses.updatedAt }).from(courses).orderBy(desc(courses.createdAt));
}

export async function updateCourseLessonUrl(id: number, lessonUrl: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.update(courses).set({ lessonUrl }).where(eq(courses.id, id));
  if (!result[0].affectedRows) throw new Error("Curso não encontrado.");
  coursesCache = null;
  return { success: true as const };
}

export async function createCourse(input: { title: string; slug: string; description: string; hours: number; lessonUrl: string; examQuestions: CourseExamQuestion[] }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.transaction(async tx => {
    const active = await tx.select({ id: courses.id }).from(courses).where(eq(courses.active, 1)).limit(3).for("update");
    if (active.length >= 3) throw new Error("Máximo de três cursos ativos em simultâneo.");
    const existingTitle = await tx.select({ id: courses.id }).from(courses).where(eq(courses.title, input.title)).limit(1);
    if (existingTitle.length) throw new Error("Já existe um curso com este nome.");
    const { examQuestions, ...details } = input;
    await tx.insert(courses).values({ ...details, examQuestions: JSON.stringify(examQuestions), active: 1 });
  });
  coursesCache = null;
  return (await db.select().from(courses).where(eq(courses.slug, input.slug)).limit(1))[0];
}

export async function createApplication(input: {
  fullName: string; email: string; nif: string; phone: string; courseTitle: string; paymentMethod: string;
  proofData?: string; proofName?: string; proofType?: string;
  proofInspectionStatus?: "not_checked" | "consistent" | "review" | "inconsistent";
  proofInspectionReport?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const course = (await db.select({ id: courses.id }).from(courses).where(and(eq(courses.title, input.courseTitle), eq(courses.active, 1))).limit(1))[0];
  if (!course) throw new Error("Selecione um curso ativo válido antes de enviar a inscrição.");
  const applicationNumber = `SE-${new Date().getFullYear()}-${nanoid(6).toUpperCase()}`;
  let proofUrl: string | undefined;
  let proofKey: string | undefined;
  if (input.proofData && input.proofName) {
    const { storagePut } = await import("./storage");
    const raw = input.proofData.replace(/^data:[^;]+;base64,/, "");
    const stored = await storagePut(`applications/${applicationNumber}/${input.proofName}`, Buffer.from(raw, "base64"), input.proofType || "application/octet-stream");
    proofUrl = stored.url;
    proofKey = stored.key;
  }
  const { proofData: _proofData, proofType: _proofType, ...applicationFields } = input;
  await db.insert(applications).values({ ...applicationFields, proofUrl, proofKey, applicationNumber, accessCode: applicationNumber });
  return (await db.select().from(applications).where(eq(applications.applicationNumber, applicationNumber)).limit(1))[0];
}

export async function getApplicationByNumber(applicationNumber: string) {
  const db = await getDb();
  if (!db) return undefined;
  return (await db.select().from(applications).where(eq(applications.applicationNumber, applicationNumber)).limit(1))[0];
}

export async function listApplications() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(applications).orderBy(desc(applications.createdAt));
}

export type ApplicationFilters = { page: number; pageSize: number; courseTitle?: string; status?: "pending" | "approved" | "rejected"; from?: Date; to?: Date; search?: string; proofStatus?: "consistent" | "review" | "inconsistent" };
export async function listApplicationsPage(filters: ApplicationFilters) {
  const db = await getDb();
  if (!db) return { items: [], total: 0, page: filters.page, pageSize: filters.pageSize };
  const conditions = [
    filters.courseTitle ? eq(applications.courseTitle, filters.courseTitle) : undefined,
    filters.status ? eq(applications.status, filters.status) : undefined,
    filters.from ? gte(applications.createdAt, filters.from) : undefined,
    filters.to ? lt(applications.createdAt, filters.to) : undefined,
    filters.proofStatus === "review" ? or(eq(applications.proofInspectionStatus, "review"), eq(applications.proofInspectionStatus, "not_checked")) : filters.proofStatus ? eq(applications.proofInspectionStatus, filters.proofStatus) : undefined,
    filters.search ? or(like(applications.fullName, `%${filters.search.replace(/[\\%_]/g, "\\$&")}%`), like(applications.email, `%${filters.search.replace(/[\\%_]/g, "\\$&")}%`), like(applications.applicationNumber, `%${filters.search.replace(/[\\%_]/g, "\\$&")}%`)) : undefined,
  ].filter((value): value is NonNullable<typeof value> => Boolean(value));
  const where = conditions.length ? and(...conditions) : undefined;
  const [items, totals] = await Promise.all([
    db.select().from(applications).where(where).orderBy(desc(applications.createdAt)).limit(filters.pageSize).offset((filters.page - 1) * filters.pageSize),
    db.select({ value: count() }).from(applications).where(where),
  ]);
  return { items, total: totals[0]?.value ?? 0, page: filters.page, pageSize: filters.pageSize };
}

export async function getApplicationStats() {
  const db = await getDb();
  if (!db) return { pending: 0, studying: 0 };
  const [pending, studying] = await Promise.all([
    db.select({ value: count() }).from(applications).where(eq(applications.status, "pending")),
    db.select({ value: count() }).from(applications).where(eq(applications.status, "approved")),
  ]);
  return { pending: pending[0]?.value ?? 0, studying: studying[0]?.value ?? 0 };
}

export async function getCourseAssessment(courseTitle: string) {
  const db = await getDb();
  if (!db) throw new Error("Base de dados indisponível.");
  const course = (await db.select().from(courses).where(eq(courses.title, courseTitle)).limit(1))[0];
  if (!course) throw new Error("O curso deste aluno não está disponível.");
  if (!course.examQuestions) {
    if (course.slug !== "eletricidade-basica") throw new Error("A Coordenação ainda não configurou o teste deste curso.");
    return { questions: EXAM_QUESTIONS, answerKey: ANSWER_KEY, lessonUrl: course.lessonUrl };
  }
  const questions = JSON.parse(course.examQuestions) as CourseExamQuestion[];
  if (questions.length !== 10 || questions.some(item => !Array.isArray(item.options) || item.options.length !== 4 || !Number.isInteger(item.correctIndex) || item.correctIndex < 0 || item.correctIndex > 3)) throw new Error("O teste do curso está incompleto. Contacte a Coordenação.");
  return { questions: questions.map((item, index) => ({ id: index + 1, question: item.question, options: item.options })), answerKey: questions.map(item => item.correctIndex), lessonUrl: course.lessonUrl };
}

export async function getStudentCourse(accessCode: string) {
  const student = await getStudentByCode(accessCode);
  if (!student) return undefined;
  const db = await getDb();
  if (!db) return undefined;
  return (await db.select({ title: courses.title, lessonUrl: courses.lessonUrl, hours: courses.hours }).from(courses).where(eq(courses.title, student.application.courseTitle)).limit(1))[0];
}

export function cohortWindow(approvedAt: Date) {
  const year = approvedAt.getUTCFullYear();
  const month = approvedAt.getUTCMonth();
  return { start: new Date(Date.UTC(year, month, 1)), end: new Date(Date.UTC(year, month + 1, 1)), label: `${String(month + 1).padStart(2, "0")}/${year}` };
}

export function rankingDisplayName(fullName: string) {
  const parts = fullName.trim().split(/\s+/);
  return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0]}.` : parts[0];
}

export async function getStudentRanking(accessCode: string) {
  const student = await getStudentByCode(accessCode);
  if (!student?.application.approvedAt) return undefined;
  const db = await getDb();
  if (!db) return undefined;
  const window = cohortWindow(student.application.approvedAt);
  const rows = await db.select({ id: applications.id, name: applications.fullName, score: studentProgress.latestScore, completedAt: studentProgress.completedAt })
    .from(applications).innerJoin(studentProgress, eq(studentProgress.applicationId, applications.id))
    .where(and(eq(applications.courseTitle, student.application.courseTitle), eq(applications.status, "approved"), gte(applications.approvedAt, window.start), lt(applications.approvedAt, window.end), eq(studentProgress.examStatus, "passed"), gte(studentProgress.accessExpiresAt, new Date())))
    .orderBy(desc(studentProgress.latestScore), asc(studentProgress.completedAt)).limit(10);
  return { courseTitle: student.application.courseTitle, cohort: window.label, yourScore: student.progress?.latestScore ?? null, students: rows.map((row, index) => ({ position: index + 1, displayName: row.id === student.application.id ? "Você" : rankingDisplayName(row.name), score: row.score, isMe: row.id === student.application.id })) };
}

export async function updateApplicationStatus(applicationNumber: string, status: "approved" | "rejected", rejectionReason?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  if (status === "rejected") {
    return db.transaction(async tx => {
      const application = (await tx.select().from(applications).where(eq(applications.applicationNumber, applicationNumber)).limit(1))[0];
      if (!application) return undefined;
      await tx.delete(messages).where(eq(messages.applicationId, application.id));
      await tx.delete(examAttempts).where(eq(examAttempts.applicationId, application.id));
      await tx.delete(studentProgress).where(eq(studentProgress.applicationId, application.id));
      // Removing the database reference makes the uploaded proof inaccessible through the site.
      // The managed storage layer intentionally has no object-delete endpoint.
      await tx.delete(applications).where(eq(applications.id, application.id));
      return undefined;
    });
  }
  const applicationBeforeApproval = await getApplicationByNumber(applicationNumber);
  if (!applicationBeforeApproval) return undefined;
  if (applicationBeforeApproval.status === "approved") return applicationBeforeApproval;
  const accessCode = status === "approved" ? (applicationBeforeApproval.accessCode || applicationBeforeApproval.applicationNumber) : undefined;
  const approvedAt = new Date();
  await db.update(applications).set({ status, accessCode, approvedAt, rejectionReason: rejectionReason || null }).where(eq(applications.applicationNumber, applicationNumber));
  if (status === "approved") {
    const application = await getApplicationByNumber(applicationNumber);
    if (application) {
      const existingProgress = (await db.select({ id: studentProgress.id }).from(studentProgress).where(eq(studentProgress.applicationId, application.id)).limit(1))[0];
      const snapshot = { studentName: application.fullName, studentEmail: application.email, studentNif: application.nif, courseTitle: application.courseTitle };
      const accessExpiresAt = new Date(approvedAt.getTime() + 10 * 24 * 60 * 60 * 1000);
      const accessUnlockAt = examUnlockAt(approvedAt);
      if (existingProgress) await db.update(studentProgress).set({ ...snapshot, accessExpiresAt, accessUnlockAt }).where(eq(studentProgress.id, existingProgress.id));
      else await db.insert(studentProgress).values({ applicationId: application.id, ...snapshot, accessExpiresAt, accessUnlockAt });
    }
  }
  return getApplicationByNumber(applicationNumber);
}

export async function deleteApplicationPermanently(applicationNumber: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return db.transaction(async tx => {
    const application = (await tx.select().from(applications).where(eq(applications.applicationNumber, applicationNumber)).limit(1))[0];
    if (!application) return { success: false as const, reason: "not_found" as const };
    if (application.status !== "approved") {
      await tx.delete(studentProgress).where(eq(studentProgress.applicationId, application.id));
    }
    await tx.delete(messages).where(eq(messages.applicationId, application.id));
    await tx.delete(examAttempts).where(eq(examAttempts.applicationId, application.id));
    await tx.delete(applications).where(eq(applications.id, application.id));
    return { success: true as const, applicationNumber };
  });
}

export async function listIssuedCertificates() {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select({ progress: studentProgress, application: applications })
    .from(studentProgress)
    .leftJoin(applications, eq(studentProgress.applicationId, applications.id))
    .where(eq(studentProgress.certificateStatus, "approved"))
    .orderBy(desc(studentProgress.updatedAt));
  return rows.map(row => ({
    progress: row.progress,
    application: row.application ?? {
      id: row.progress.applicationId,
      fullName: row.progress.studentName || "Formando",
      email: row.progress.studentEmail,
      nif: row.progress.studentNif,
      courseTitle: row.progress.courseTitle || "Curso",
      status: "approved" as const,
    },
  }));
}

export function certificateArchiveUpdate() {
  return {
    studentEmail: null,
    studentNif: null,
    startedAt: null,
    accessUnlockAt: null,
    examStatus: "not_started" as const,
    attempts: 0,
    accessExpiresAt: null,
  };
}

export async function deleteStudentDataPermanently(applicationId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return db.transaction(async tx => {
    const progress = (await tx.select().from(studentProgress).where(eq(studentProgress.applicationId, applicationId)).limit(1))[0];
    if (!progress) return { success: false as const, reason: "not_found" as const };
    if (progress.certificateStatus !== "approved" || !progress.qrToken) {
      return { success: false as const, reason: "certificate_not_issued" as const };
    }
    const notebook = (await tx.select({ id: notebooks.id }).from(notebooks).where(eq(notebooks.applicationId, applicationId)).limit(1))[0];
    if (notebook) {
      const pages = await tx.select({ id: notebookPages.id }).from(notebookPages).where(eq(notebookPages.notebookId, notebook.id));
      for (const page of pages) await tx.delete(notebookVersions).where(eq(notebookVersions.pageId, page.id));
      await tx.delete(notebookPages).where(eq(notebookPages.notebookId, notebook.id));
      await tx.delete(notebooks).where(eq(notebooks.id, notebook.id));
    }
    await tx.delete(materialProgress).where(eq(materialProgress.applicationId, applicationId));
    await tx.delete(examAttempts).where(eq(examAttempts.applicationId, applicationId));
    await tx.delete(messages).where(eq(messages.applicationId, applicationId));
    await tx.delete(applications).where(eq(applications.id, applicationId));
    await tx.update(studentProgress).set(certificateArchiveUpdate()).where(eq(studentProgress.id, progress.id));
    return { success: true as const, qrToken: progress.qrToken };
  });
}

export async function getStudentByCode(accessCode: string) {
  const db = await getDb();
  if (!db) return undefined;
  const normalizedCode = accessCode.trim().toUpperCase();
  const application = (await db.select().from(applications).where(and(or(eq(applications.accessCode, normalizedCode), eq(applications.applicationNumber, normalizedCode)), eq(applications.status, "approved"))).limit(1))[0];
  if (!application) return undefined;
  let progress = (await db.select().from(studentProgress).where(eq(studentProgress.applicationId, application.id)).limit(1))[0];
  if (progress && !progress.accessExpiresAt) {
    const accessExpiresAt = new Date((application.approvedAt ?? new Date()).getTime() + 10 * 24 * 60 * 60 * 1000);
    await db.update(studentProgress).set({ accessExpiresAt }).where(eq(studentProgress.id, progress.id));
    progress = { ...progress, accessExpiresAt };
  }
  if (progress && application.approvedAt && progress.accessUnlockAt?.getTime() !== examUnlockAt(application.approvedAt).getTime()) {
    const accessUnlockAt = examUnlockAt(application.approvedAt);
    await db.update(studentProgress).set({ accessUnlockAt }).where(eq(studentProgress.id, progress.id));
    progress = { ...progress, accessUnlockAt };
  }
  if (progress?.accessExpiresAt && progress.accessExpiresAt.getTime() <= Date.now()) {
    await expireStudentAccess(application.id, progress.id);
    return undefined;
  }
  return { application, progress };
}

export async function expireStudentAccess(applicationId: number, progressId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return db.transaction(async tx => {
    const progress = (await tx.select().from(studentProgress).where(progressId ? eq(studentProgress.id, progressId) : eq(studentProgress.applicationId, applicationId)).limit(1))[0];
    if (!progress) return { success: false as const, reason: "not_found" as const };
    const notebook = (await tx.select({ id: notebooks.id }).from(notebooks).where(eq(notebooks.applicationId, applicationId)).limit(1))[0];
    if (notebook) {
      const pages = await tx.select({ id: notebookPages.id }).from(notebookPages).where(eq(notebookPages.notebookId, notebook.id));
      for (const page of pages) await tx.delete(notebookVersions).where(eq(notebookVersions.pageId, page.id));
      await tx.delete(notebookPages).where(eq(notebookPages.notebookId, notebook.id));
      await tx.delete(notebooks).where(eq(notebooks.id, notebook.id));
    }
    await tx.delete(materialProgress).where(eq(materialProgress.applicationId, applicationId));
    await tx.delete(examAttempts).where(eq(examAttempts.applicationId, applicationId));
    await tx.delete(messages).where(eq(messages.applicationId, applicationId));
    await tx.delete(applications).where(eq(applications.id, applicationId));
    await tx.update(studentProgress).set(certificateArchiveUpdate()).where(eq(studentProgress.id, progress.id));
    return { success: true as const, qrToken: progress.qrToken };
  });
}

export async function purgeExpiredStudentAccess() {
  const db = await getDb();
  if (!db) return 0;
  const expired = await db.select({ applicationId: studentProgress.applicationId, progressId: studentProgress.id }).from(studentProgress).where(and(isNotNull(studentProgress.accessExpiresAt), lt(studentProgress.accessExpiresAt, new Date()), eq(studentProgress.certificateStatus, "approved")));
  for (const row of expired) await expireStudentAccess(row.applicationId, row.progressId);
  return expired.length;
}

export async function listMaterialProgress(accessCode: string) {
  const db = await getDb();
  if (!db) return [];
  const student = await getStudentByCode(accessCode);
  if (!student) return [];
  return db.select().from(materialProgress).where(eq(materialProgress.applicationId, student.application.id)).orderBy(desc(materialProgress.updatedAt));
}

export async function markMaterialViewed(accessCode: string, input: { materialKey: string; materialTitle: string; resourceUrl?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const student = await getStudentByCode(accessCode);
  if (!student) return undefined;
  const existing = (await db.select().from(materialProgress).where(and(eq(materialProgress.applicationId, student.application.id), eq(materialProgress.materialKey, input.materialKey))).limit(1))[0];
  const now = new Date();
  if (existing) {
    await db.update(materialProgress).set({ materialTitle: input.materialTitle, resourceUrl: input.resourceUrl ?? null, viewedAt: now }).where(eq(materialProgress.id, existing.id));
  } else {
    await db.insert(materialProgress).values({ applicationId: student.application.id, materialKey: input.materialKey, materialTitle: input.materialTitle, resourceUrl: input.resourceUrl ?? null, viewedAt: now });
  }
  return listMaterialProgress(accessCode);
}

async function getOrCreateNotebook(accessCode: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const student = await getStudentByCode(accessCode);
  if (!student) return undefined;
  let notebook = (await db.select().from(notebooks).where(eq(notebooks.applicationId, student.application.id)).limit(1))[0];
  if (!notebook) {
    const inserted = await db.insert(notebooks).values({ applicationId: student.application.id });
    const notebookId = Number(inserted[0].insertId);
    notebook = (await db.select().from(notebooks).where(eq(notebooks.id, notebookId)).limit(1))[0];
  }
  if (!notebook) throw new Error("Não foi possível abrir o caderno");
  const firstPage = (await db.select().from(notebookPages).where(and(eq(notebookPages.notebookId, notebook.id), eq(notebookPages.pageNumber, 1))).limit(1))[0];
  if (!firstPage) await db.insert(notebookPages).values({ notebookId: notebook.id, pageNumber: 1, contentHtml: "" });
  return notebook;
}

export async function getNotebook(accessCode: string) {
  const db = await getDb();
  if (!db) return undefined;
  const notebook = await getOrCreateNotebook(accessCode);
  if (!notebook) return undefined;
  const pages = await db.select().from(notebookPages).where(eq(notebookPages.notebookId, notebook.id)).orderBy(notebookPages.pageNumber);
  return { notebook, pages };
}

function sanitizeNotebookHtml(contentHtml: string) {
  return contentHtml
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/javascript:/gi, "");
}

export async function saveNotebookPage(accessCode: string, pageNumber: number, contentHtml: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  if (pageNumber < 1 || pageNumber > 50) throw new Error("O caderno pode ter entre 1 e 50 folhas.");
  if (contentHtml.length > 900_000) throw new Error("Esta página ultrapassa o tamanho permitido.");
  const safeContentHtml = sanitizeNotebookHtml(contentHtml);
  const notebook = await getOrCreateNotebook(accessCode);
  if (!notebook) return undefined;
  const existing = (await db.select().from(notebookPages).where(and(eq(notebookPages.notebookId, notebook.id), eq(notebookPages.pageNumber, pageNumber))).limit(1))[0];
  if (existing) {
    if (existing.contentHtml !== safeContentHtml) {
      await db.insert(notebookVersions).values({ pageId: existing.id, contentHtml: existing.contentHtml });
      await db.update(notebookPages).set({ contentHtml: safeContentHtml }).where(eq(notebookPages.id, existing.id));
    }
  } else {
    await db.insert(notebookPages).values({ notebookId: notebook.id, pageNumber, contentHtml: safeContentHtml });
  }
  return getNotebook(accessCode);
}

export async function addNotebookPage(accessCode: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const notebook = await getOrCreateNotebook(accessCode);
  if (!notebook) return undefined;
  const pages = await db.select().from(notebookPages).where(eq(notebookPages.notebookId, notebook.id)).orderBy(desc(notebookPages.pageNumber));
  const nextPage = (pages[0]?.pageNumber ?? 0) + 1;
  if (nextPage > 50) throw new Error("O caderno já atingiu o limite de 50 folhas.");
  await db.insert(notebookPages).values({ notebookId: notebook.id, pageNumber: nextPage, contentHtml: "" });
  return getNotebook(accessCode);
}

export async function listNotebookVersions(accessCode: string, pageNumber: number) {
  const db = await getDb();
  if (!db) return [];
  const notebook = await getOrCreateNotebook(accessCode);
  if (!notebook) return [];
  const page = (await db.select().from(notebookPages).where(and(eq(notebookPages.notebookId, notebook.id), eq(notebookPages.pageNumber, pageNumber))).limit(1))[0];
  if (!page) return [];
  return db.select({ id: notebookVersions.id, createdAt: notebookVersions.createdAt }).from(notebookVersions).where(eq(notebookVersions.pageId, page.id)).orderBy(desc(notebookVersions.createdAt)).limit(20);
}

export async function restoreNotebookVersion(accessCode: string, pageNumber: number, versionId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const notebook = await getOrCreateNotebook(accessCode);
  if (!notebook) return undefined;
  const page = (await db.select().from(notebookPages).where(and(eq(notebookPages.notebookId, notebook.id), eq(notebookPages.pageNumber, pageNumber))).limit(1))[0];
  if (!page) return undefined;
  const version = (await db.select().from(notebookVersions).where(and(eq(notebookVersions.id, versionId), eq(notebookVersions.pageId, page.id))).limit(1))[0];
  if (!version) return undefined;
  await db.insert(notebookVersions).values({ pageId: page.id, contentHtml: page.contentHtml });
  await db.update(notebookPages).set({ contentHtml: version.contentHtml }).where(eq(notebookPages.id, page.id));
  return getNotebook(accessCode);
}

export async function clearNotebookPage(accessCode: string, pageNumber: number) {
  return saveNotebookPage(accessCode, pageNumber, "");
}

export async function uploadNotebookImage(accessCode: string, input: { fileName: string; contentType: string; data: string }) {
  const student = await getStudentByCode(accessCode);
  if (!student) return undefined;
  const raw = input.data.replace(/^data:[^;]+;base64,/, "");
  const bytes = Buffer.from(raw, "base64");
  if (bytes.length > 8 * 1024 * 1024) throw new Error("A imagem deve ter no máximo 8 MB.");
  if (!input.contentType.startsWith("image/")) throw new Error("Use uma imagem JPG, PNG ou WEBP.");
  const { storagePut } = await import("./storage");
  const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120) || "imagem.png";
  return storagePut(`notebooks/${student.application.id}/${safeName}`, bytes, input.contentType);
}

export async function startCourse(accessCode: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const student = await getStudentByCode(accessCode);
  if (!student) return undefined;
  if (!student.progress?.startedAt) {
    const startedAt = new Date();
    const accessUnlockAt = student.progress?.accessUnlockAt ?? examUnlockAt(student.application.approvedAt ?? startedAt);
    await db.update(studentProgress).set({ startedAt, accessUnlockAt }).where(eq(studentProgress.applicationId, student.application.id));
  }
  return getStudentByCode(accessCode);
}

export async function submitExam(accessCode: string, score: number, answers: number[]) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const student = await getStudentByCode(accessCode);
  if (!student) return undefined;
  await db.transaction(async tx => {
    const progress = (await tx.select().from(studentProgress).where(eq(studentProgress.applicationId, student.application.id)).limit(1).for("update"))[0];
    if (!progress?.accessUnlockAt || progress.accessUnlockAt.getTime() > Date.now()) throw new Error("O teste só abre 12 horas após a aprovação da inscrição.");
    if (progress.examStatus === "passed") throw new Error("A avaliação já foi concluída.");
    const passed = score > 50;
    await tx.insert(examAttempts).values({ applicationId: student.application.id, score, passed: passed ? 1 : 0, answers: JSON.stringify(answers) });
    await tx.update(studentProgress).set({ latestScore: score, examStatus: passed ? "passed" : "retry", certificateStatus: "not_eligible", completedAt: passed ? new Date() : null, attempts: progress.attempts + 1 }).where(eq(studentProgress.applicationId, student.application.id));
  });
  return getStudentByCode(accessCode);
}

export async function saveCertificatePreflight(applicationId: number, report: { conforming: boolean; score: number; checks: string[]; issues: string[] }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(studentProgress).set({
    certificateStatus: report.conforming ? "pending" : "not_eligible",
    certificateAiReport: JSON.stringify({ ...report, template: CERTIFICATE_TEMPLATE_VERSION, checkedAt: new Date().toISOString() }),
    certificateAiCheckedAt: new Date(),
  }).where(eq(studentProgress.applicationId, applicationId));
  return report;
}

export function certificatePreflightInput(student: { application: { fullName: string; courseTitle: string }; progress?: { latestScore: number | null } | null }, score: number) {
  return {
    learnerName: student.application.fullName,
    courseTitle: student.application.courseTitle,
    score,
    duration: CERTIFICATE_DURATION_LABEL,
    center: CERTIFICATE_CENTER_NAME,
    director: CERTIFICATE_DIRECTOR_NAME,
    template: CERTIFICATE_TEMPLATE_VERSION,
    requiredFields: ["nome completo", "curso", "data de conclusão", "duração", "nota final", "QR Code", "site de validação", "assinatura do diretor"],
  };
}

export function buildCertificateFallbackReport(student: { application: { fullName: string; courseTitle: string } }, score: number) {
  const checks = ["Nome completo confirmado", "Curso confirmado", "Nota final confirmada", "Duração de 72 horas definida", "QR Code, site de validação e assinatura da Direção previstos"];
  const issues = [
    !student.application.fullName ? "Nome completo em falta." : null,
    !student.application.courseTitle ? "Curso em falta." : null,
    score <= 50 ? "A nota para certificado deve ser superior a 50%." : null,
  ].filter((issue): issue is string => Boolean(issue));
  return { conforming: issues.length === 0, score, checks, issues };
}

export async function ensureCertificatePending(applicationId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const row = (await db.select({ progress: studentProgress, application: applications }).from(studentProgress).innerJoin(applications, eq(studentProgress.applicationId, applications.id)).where(eq(studentProgress.applicationId, applicationId)).limit(1))[0];
  if (!row || row.application.status !== "approved" || (row.progress.latestScore ?? 0) <= 50 || row.progress.certificateStatus === "approved") return row?.progress;
  if (row.progress.certificateStatus !== "pending") {
    const report = buildCertificateFallbackReport({ application: row.application }, row.progress.latestScore ?? 0);
    await db.update(studentProgress).set({ certificateStatus: report.conforming ? "pending" : "not_eligible", certificateAiReport: JSON.stringify({ ...report, source: "automatic-fallback", template: CERTIFICATE_TEMPLATE_VERSION, checkedAt: new Date().toISOString() }), certificateAiCheckedAt: new Date() }).where(eq(studentProgress.applicationId, applicationId));
  }
  return (await db.select().from(studentProgress).where(eq(studentProgress.applicationId, applicationId)).limit(1))[0];
}

export async function listCertificateRequests() {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select({ progress: studentProgress, application: applications }).from(studentProgress).leftJoin(applications, eq(studentProgress.applicationId, applications.id)).where(eq(studentProgress.certificateStatus, "pending")).orderBy(desc(studentProgress.updatedAt));
  return rows.map(row => ({ progress: row.progress, application: row.application ?? { id: row.progress.applicationId, fullName: row.progress.studentName || "Aluno", email: row.progress.studentEmail, nif: row.progress.studentNif, courseTitle: row.progress.courseTitle || "Curso", status: "approved" as const } }));
}

export async function authorizeCertificate(applicationId: number, approved: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const certificateNumber = approved ? `${CERTIFICATE_REGISTRATION_PREFIX}-${new Date().getFullYear()}-${String(applicationId).padStart(6, "0")}` : null;
  if (approved && !isValidCertificateRegistration(certificateNumber, applicationId)) throw new Error("Não foi possível validar o número de registo sequencial.");
  const qrToken = nanoid(20);
  const result = await db.update(studentProgress).set({ certificateStatus: approved ? "approved" : "rejected", certificateNumber, qrToken: approved ? qrToken : null, certificateUrl: approved ? `/student/certificate/${qrToken}` : null }).where(and(eq(studentProgress.applicationId, applicationId), eq(studentProgress.certificateStatus, "pending"), eq(studentProgress.examStatus, "passed"), gte(studentProgress.latestScore, 60)));
  if (!result[0].affectedRows) throw new Error("Só é possível decidir certificados pendentes de alunos com nota superior a 50%.");
  return { certificateNumber, registrationValid: approved && isValidCertificateRegistration(certificateNumber, applicationId) };
}

export async function getCertificateByToken(qrToken: string) {
  const db = await getDb();
  if (!db) return undefined;
  const row = (await db.select({ progress: studentProgress, application: applications }).from(studentProgress).leftJoin(applications, eq(studentProgress.applicationId, applications.id)).where(and(eq(studentProgress.qrToken, qrToken), eq(studentProgress.certificateStatus, "approved"))).limit(1))[0];
  if (!row) return undefined;
  return {
    isArchived: !row.application,
    progress: { id: row.progress.id, qrToken: row.progress.qrToken, latestScore: row.progress.latestScore, startedAt: row.progress.startedAt, completedAt: row.progress.completedAt, certificateNumber: row.progress.certificateNumber },
    application: { id: row.progress.applicationId, fullName: row.application?.fullName || row.progress.studentName || "Aluno", courseTitle: row.application?.courseTitle || row.progress.courseTitle || "Curso", approvedAt: row.application?.approvedAt ?? null },
  };
}

export async function createCertificateReprint(input: { qrToken: string; requesterName: string; requesterEmail: string; paymentMethod: string; feeAmount: number; feeCurrency: string; proofData: string; proofName: string; proofType?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const fee = CERTIFICATE_REPRINT_FEES.find(item => item.currency === input.feeCurrency && item.amount === input.feeAmount);
  if (!fee) throw new Error("A taxa da segunda via deve ser exatamente 2.000 Kz ou 3 euros.");
  if (!input.proofData || !input.proofName) throw new Error("O comprovativo de pagamento é obrigatório.");
  const row = (await db.select().from(studentProgress).where(and(eq(studentProgress.qrToken, input.qrToken), eq(studentProgress.certificateStatus, "approved"))).limit(1))[0];
  if (!row) return undefined;
  const existing = (await db.select().from(certificateReprintRequests).where(and(eq(certificateReprintRequests.progressId, row.id), or(eq(certificateReprintRequests.status, "pending"), eq(certificateReprintRequests.status, "approved")))).limit(1))[0];
  if (existing) return existing;
  const { storagePut } = await import("./storage");
  const raw = input.proofData.replace(/^data:[^;]+;base64,/, "");
  const stored = await storagePut(`certificate-reprints/${row.id}/${input.proofName}`, Buffer.from(raw, "base64"), input.proofType || "application/octet-stream");
  await db.insert(certificateReprintRequests).values({ progressId: row.id, requesterName: input.requesterName, requesterEmail: input.requesterEmail, paymentMethod: input.paymentMethod, feeAmount: input.feeAmount, feeCurrency: input.feeCurrency, proofUrl: stored.url, proofKey: stored.key, proofName: input.proofName });
  return (await db.select().from(certificateReprintRequests).where(eq(certificateReprintRequests.progressId, row.id)).orderBy(desc(certificateReprintRequests.createdAt)).limit(1))[0];
}

export async function listCertificateReprints() {
  const db = await getDb();
  if (!db) return [];
  return db.select({ request: certificateReprintRequests, progress: studentProgress }).from(certificateReprintRequests).innerJoin(studentProgress, eq(certificateReprintRequests.progressId, studentProgress.id)).where(eq(certificateReprintRequests.status, "pending")).orderBy(desc(certificateReprintRequests.createdAt));
}

export async function authorizeCertificateReprint(id: number, approved: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const downloadToken = approved ? nanoid(24) : null;
  await db.update(certificateReprintRequests).set({ status: approved ? "approved" : "rejected", downloadToken, reviewedAt: new Date() }).where(eq(certificateReprintRequests.id, id));
  return { success: true as const, downloadToken };
}

export async function getCertificateReprintByToken(downloadToken: string) {
  const db = await getDb();
  if (!db) return undefined;
  return (await db.select({ request: certificateReprintRequests, progress: studentProgress }).from(certificateReprintRequests).innerJoin(studentProgress, eq(certificateReprintRequests.progressId, studentProgress.id)).where(and(eq(certificateReprintRequests.downloadToken, downloadToken), eq(certificateReprintRequests.status, "approved"), isNull(certificateReprintRequests.downloadedAt))).limit(1))[0];
}

export async function markCertificateReprintDownloaded(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(certificateReprintRequests).set({ downloadedAt: new Date() }).where(and(eq(certificateReprintRequests.id, id), isNull(certificateReprintRequests.downloadedAt)));
}

export async function getCertificateReprintStatus(id: number, requesterEmail: string) {
  const db = await getDb();
  if (!db) return undefined;
  const request = (await db.select({ id: certificateReprintRequests.id, status: certificateReprintRequests.status, downloadToken: certificateReprintRequests.downloadToken, downloadedAt: certificateReprintRequests.downloadedAt }).from(certificateReprintRequests).where(and(eq(certificateReprintRequests.id, id), eq(certificateReprintRequests.requesterEmail, requesterEmail))).limit(1))[0];
  if (!request) return undefined;
  return { id: request.id, status: request.status, downloadToken: request.status === "approved" ? request.downloadToken : null, downloadedAt: request.downloadedAt };
}

export async function listMessages(applicationId?: number) {
  const db = await getDb();
  if (!db) return [];
  return applicationId ? db.select().from(messages).where(eq(messages.applicationId, applicationId)).orderBy(desc(messages.createdAt)) : db.select().from(messages).orderBy(desc(messages.createdAt));
}

export async function createMessage(input: { applicationId?: number; fromRole: "student" | "coordination"; subject: string; body: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.insert(messages).values(input);
  return (await db.select().from(messages).orderBy(desc(messages.createdAt)).limit(1))[0];
}

export async function listContent(publicOnly = true): Promise<ContentRow[]> {
  const db = await getDb();
  if (!db) return [];
  const cached = publicOnly ? readTtlCache(publicContentCache) : null;
  if (cached) return cached;
  const value = publicOnly ? await db.select().from(contentItems).where(eq(contentItems.isPublished, 1)).orderBy(desc(contentItems.createdAt)) : await db.select().from(contentItems).orderBy(desc(contentItems.createdAt));
  if (publicOnly) publicContentCache = writeTtlCache(value, PUBLIC_CACHE_MS);
  return value;
}

export async function createContent(input: { kind: "welcome_video" | "course_video" | "update"; title: string; body?: string; mediaUrl?: string; mediaPosterUrl?: string; mediaDurationSeconds?: number; mediaProcessingStatus?: "not_applicable" | "processed" | "original" }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.insert(contentItems).values(input);
  publicContentCache = null;
  return (await db.select().from(contentItems).orderBy(desc(contentItems.createdAt)).limit(1))[0];
}

export async function deleteContent(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.delete(contentItems).where(eq(contentItems.id, id));
  publicContentCache = null;
  return { success: true } as const;
}

export function getCurrentTrainingPrice() {
  return getTrainingPrice();
}

export async function uploadContentMedia(input: { fileName: string; contentType: string; data: string }) {
  const raw = input.data.replace(/^data:[^;]+;base64,/, "");
  const bytes = Buffer.from(raw, "base64");
  if (bytes.length > 80 * 1024 * 1024) throw new Error("O ficheiro deve ter no máximo 80 MB.");
  const { storagePut } = await import("./storage");
  const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-140) || "conteudo-media";
  const isVideo = input.contentType.startsWith("video/") || /\.(mp4|mov|mkv|avi|webm|m4v|mpeg|mpg|3gp)$/i.test(input.fileName);
  if (!isVideo) return { ...(await storagePut(`content/${Date.now()}-${safeName}`, bytes, input.contentType || "application/octet-stream")), processingStatus: "original" as const, durationSeconds: null, posterUrl: null };
  const workDir = await mkdtemp(`${tmpdir()}/sou-eletricista-video-`);
  const sourcePath = `${workDir}/${safeName}`;
  const optimizedPath = `${workDir}/optimized.mp4`;
  const posterPath = `${workDir}/poster.jpg`;
  try {
    await writeFile(sourcePath, bytes);
    const { stdout } = await execFileAsync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", sourcePath], { timeout: 30_000 });
    const durationSeconds = Math.max(0, Math.round(Number.parseFloat(stdout.trim()) || 0));
    await execFileAsync("ffmpeg", ["-y", "-i", sourcePath, "-vf", "scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black", "-c:v", "libx264", "-preset", "veryfast", "-crf", "28", "-c:a", "aac", "-b:a", "96k", "-movflags", "+faststart", optimizedPath], { timeout: 120_000 });
    await execFileAsync("ffmpeg", ["-y", "-ss", "0", "-i", sourcePath, "-frames:v", "1", "-vf", "scale=w=640:h=360:force_original_aspect_ratio=decrease,pad=640:360:(ow-iw)/2:(oh-ih)/2:color=black", "-q:v", "5", posterPath], { timeout: 30_000 });
    const [optimizedBytes, posterBytes] = await Promise.all([readFile(optimizedPath), readFile(posterPath)]);
    const stamp = Date.now();
    const optimized = await storagePut(`content/${stamp}-${safeName.replace(/\.[^.]+$/, "")}.mp4`, optimizedBytes, "video/mp4");
    const poster = await storagePut(`content/${stamp}-${safeName.replace(/\.[^.]+$/, "")}-poster.jpg`, posterBytes, "image/jpeg");
    return { ...optimized, processingStatus: "processed" as const, durationSeconds, posterUrl: poster.url };
  } catch (error) {
    console.warn("[Vitrine] video processing fallback:", error);
    return { ...(await storagePut(`content/${Date.now()}-${safeName}`, bytes, input.contentType || "application/octet-stream")), processingStatus: "original" as const, durationSeconds: null, posterUrl: null };
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}
