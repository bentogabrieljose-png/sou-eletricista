import { and, desc, eq, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { nanoid } from "nanoid";
import { InsertUser, applications, contentItems, courses, examAttempts, messages, studentProgress, users } from "../drizzle/schema";
import { COURSE_LESSON_URL } from "../shared/course";
import { ENV } from "./_core/env";
import { readTtlCache, writeTtlCache, type TtlCacheEntry } from "./cache";

let _db: ReturnType<typeof drizzle> | null = null;
const PUBLIC_CACHE_MS = 30_000;
let defaultCoursePromise: Promise<void> | null = null;
type CourseRow = typeof courses.$inferSelect;
type ContentRow = typeof contentItems.$inferSelect;
let coursesCache: TtlCacheEntry<CourseRow[]> | null = null;
let publicContentCache: TtlCacheEntry<ContentRow[]> | null = null;

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

export async function listCourses(): Promise<CourseRow[]> {
  const cached = readTtlCache(coursesCache);
  if (cached) return cached;
  const db = await getDb();
  if (!db) return [];
  await ensureDefaultCourse();
  const value = await db.select().from(courses).where(eq(courses.active, 1)).orderBy(desc(courses.createdAt));
  coursesCache = writeTtlCache(value, PUBLIC_CACHE_MS);
  return value;
}

export async function createCourse(input: { title: string; slug: string; description: string; hours: number; lessonUrl: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.insert(courses).values({ ...input, active: 1 });
  coursesCache = null;
  return (await db.select().from(courses).where(eq(courses.slug, input.slug)).limit(1))[0];
}

export async function createApplication(input: {
  fullName: string; email: string; nif: string; phone: string; courseTitle: string; paymentMethod: string;
  proofData?: string; proofName?: string; proofType?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
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
  const accessCode = status === "approved" ? (applicationBeforeApproval.accessCode || applicationBeforeApproval.applicationNumber) : undefined;
  await db.update(applications).set({ status, accessCode, approvedAt: status === "approved" ? new Date() : null, rejectionReason: rejectionReason || null }).where(eq(applications.applicationNumber, applicationNumber));
  if (status === "approved") {
    const application = await getApplicationByNumber(applicationNumber);
    if (application) {
      const existingProgress = (await db.select({ id: studentProgress.id }).from(studentProgress).where(eq(studentProgress.applicationId, application.id)).limit(1))[0];
      const snapshot = { studentName: application.fullName, studentEmail: application.email, studentNif: application.nif, courseTitle: application.courseTitle };
      if (existingProgress) await db.update(studentProgress).set(snapshot).where(eq(studentProgress.id, existingProgress.id));
      else await db.insert(studentProgress).values({ applicationId: application.id, ...snapshot });
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

export async function getStudentByCode(accessCode: string) {
  const db = await getDb();
  if (!db) return undefined;
  const normalizedCode = accessCode.trim().toUpperCase();
  const application = (await db.select().from(applications).where(and(or(eq(applications.accessCode, normalizedCode), eq(applications.applicationNumber, normalizedCode)), eq(applications.status, "approved"))).limit(1))[0];
  if (!application) return undefined;
  const progress = (await db.select().from(studentProgress).where(eq(studentProgress.applicationId, application.id)).limit(1))[0];
  return { application, progress };
}

export async function startCourse(accessCode: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const student = await getStudentByCode(accessCode);
  if (!student) return undefined;
  if (!student.progress?.startedAt) {
    const startedAt = new Date();
    const accessUnlockAt = new Date(startedAt.getTime() + 12 * 60 * 60 * 1000);
    await db.update(studentProgress).set({ startedAt, accessUnlockAt, examStatus: "not_started" }).where(eq(studentProgress.applicationId, student.application.id));
  }
  return getStudentByCode(accessCode);
}

export async function submitExam(accessCode: string, score: number, answers: number[]) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const student = await getStudentByCode(accessCode);
  if (!student) return undefined;
  const passed = score >= 50;
  await db.insert(examAttempts).values({ applicationId: student.application.id, score, passed: passed ? 1 : 0, answers: JSON.stringify(answers) });
  const currentAttempts = (student.progress?.attempts ?? 0) + 1;
  await db.update(studentProgress).set({ latestScore: score, examStatus: passed ? "passed" : "retry", certificateStatus: passed ? "pending" : "not_eligible", completedAt: passed ? new Date() : null, attempts: currentAttempts }).where(eq(studentProgress.applicationId, student.application.id));
  return getStudentByCode(accessCode);
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
  const certificateNumber = `SE-CERT-${new Date().getFullYear()}-${String(applicationId).padStart(5, "0")}`;
  const qrToken = nanoid(20);
  await db.update(studentProgress).set({ certificateStatus: approved ? "approved" : "rejected", certificateNumber: approved ? certificateNumber : null, qrToken: approved ? qrToken : null, certificateUrl: approved ? `/student/certificate/${qrToken}` : null }).where(eq(studentProgress.applicationId, applicationId));
  return certificateNumber;
}

export async function getCertificateByToken(qrToken: string) {
  const db = await getDb();
  if (!db) return undefined;
  const row = (await db.select({ progress: studentProgress, application: applications }).from(studentProgress).leftJoin(applications, eq(studentProgress.applicationId, applications.id)).where(and(eq(studentProgress.qrToken, qrToken), eq(studentProgress.certificateStatus, "approved"))).limit(1))[0];
  if (!row) return undefined;
  return { progress: row.progress, application: row.application ?? { id: row.progress.applicationId, fullName: row.progress.studentName || "Aluno", email: row.progress.studentEmail, nif: row.progress.studentNif, courseTitle: row.progress.courseTitle || "Curso", status: "approved" as const } };
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

export async function createContent(input: { kind: "welcome_video" | "course_video" | "update"; title: string; body?: string; mediaUrl?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.insert(contentItems).values(input);
  publicContentCache = null;
  return (await db.select().from(contentItems).orderBy(desc(contentItems.createdAt)).limit(1))[0];
}
