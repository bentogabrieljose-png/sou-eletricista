import { index, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const courses = mysqlTable("courses", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 180 }).notNull().unique(),
  description: text("description").notNull(),
  hours: int("hours").default(12).notNull(),
  lessonUrl: varchar("lessonUrl", { length: 500 }).notNull(),
  coverUrl: varchar("coverUrl", { length: 500 }),
  active: int("active").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({ activeCreatedAtIdx: index("courses_active_created_at_idx").on(table.active, table.createdAt) }));

export const applications = mysqlTable("applications", {
  id: int("id").autoincrement().primaryKey(),
  applicationNumber: varchar("applicationNumber", { length: 32 }).notNull().unique(),
  fullName: varchar("fullName", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  nif: varchar("nif", { length: 80 }).notNull(),
  phone: varchar("phone", { length: 80 }).notNull(),
  courseTitle: varchar("courseTitle", { length: 255 }).notNull(),
  paymentMethod: varchar("paymentMethod", { length: 120 }).notNull(),
  proofUrl: varchar("proofUrl", { length: 500 }),
  proofKey: varchar("proofKey", { length: 500 }),
  proofName: varchar("proofName", { length: 255 }),
  proofInspectionStatus: mysqlEnum("proofInspectionStatus", ["not_checked", "consistent", "review", "inconsistent"]).default("not_checked").notNull(),
  proofInspectionReport: text("proofInspectionReport"),
  proofInspectionCheckedAt: timestamp("proofInspectionCheckedAt"),
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
  accessCode: varchar("accessCode", { length: 32 }).unique(),
  approvedAt: timestamp("approvedAt"),
  rejectionReason: text("rejectionReason"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({ statusCreatedAtIdx: index("applications_status_created_at_idx").on(table.status, table.createdAt) }));

export const studentProgress = mysqlTable("student_progress", {
  id: int("id").autoincrement().primaryKey(),
  applicationId: int("applicationId").notNull().unique(),
  studentName: varchar("studentName", { length: 255 }),
  studentEmail: varchar("studentEmail", { length: 320 }),
  studentNif: varchar("studentNif", { length: 80 }),
  courseTitle: varchar("courseTitle", { length: 255 }),
  startedAt: timestamp("startedAt"),
  accessUnlockAt: timestamp("accessUnlockAt"),
  accessExpiresAt: timestamp("accessExpiresAt"),
  completedAt: timestamp("completedAt"),
  latestScore: int("latestScore"),
  examStatus: mysqlEnum("examStatus", ["not_started", "available", "passed", "retry"]).default("not_started").notNull(),
  certificateStatus: mysqlEnum("certificateStatus", ["not_eligible", "pending", "approved", "rejected"]).default("not_eligible").notNull(),
  certificateAiReport: text("certificateAiReport"),
  certificateAiCheckedAt: timestamp("certificateAiCheckedAt"),
  certificateUrl: varchar("certificateUrl", { length: 500 }),
  certificateNumber: varchar("certificateNumber", { length: 80 }),
  qrToken: varchar("qrToken", { length: 80 }).unique(),
  attempts: int("attempts").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({ certificateUpdatedAtIdx: index("student_progress_certificate_updated_at_idx").on(table.certificateStatus, table.updatedAt) }));

export const certificateReprintRequests = mysqlTable("certificate_reprint_requests", {
  id: int("id").autoincrement().primaryKey(),
  progressId: int("progressId").notNull(),
  requesterName: varchar("requesterName", { length: 255 }).notNull(),
  requesterEmail: varchar("requesterEmail", { length: 320 }).notNull(),
  paymentMethod: varchar("paymentMethod", { length: 120 }).notNull(),
  feeAmount: int("feeAmount").default(2000).notNull(),
  feeCurrency: varchar("feeCurrency", { length: 8 }).default("Kz").notNull(),
  proofUrl: varchar("proofUrl", { length: 500 }),
  proofKey: varchar("proofKey", { length: 500 }),
  proofName: varchar("proofName", { length: 255 }),
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
  downloadToken: varchar("downloadToken", { length: 80 }).unique(),
  downloadedAt: timestamp("downloadedAt"),
  reviewedAt: timestamp("reviewedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({ statusCreatedAtIdx: index("certificate_reprint_status_created_at_idx").on(table.status, table.createdAt), progressIdx: index("certificate_reprint_progress_idx").on(table.progressId) }));


export const materialProgress = mysqlTable("material_progress", {
  id: int("id").autoincrement().primaryKey(),
  applicationId: int("applicationId").notNull(),
  materialKey: varchar("materialKey", { length: 120 }).notNull(),
  materialTitle: varchar("materialTitle", { length: 255 }).notNull(),
  resourceUrl: varchar("resourceUrl", { length: 500 }),
  viewedAt: timestamp("viewedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({ applicationMaterialIdx: index("material_progress_application_material_idx").on(table.applicationId, table.materialKey) }));

export const notebooks = mysqlTable("notebooks", {
  id: int("id").autoincrement().primaryKey(),
  applicationId: int("applicationId").notNull().unique(),
  title: varchar("title", { length: 255 }).default("Caderno de apontamentos").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const notebookPages = mysqlTable("notebook_pages", {
  id: int("id").autoincrement().primaryKey(),
  notebookId: int("notebookId").notNull(),
  pageNumber: int("pageNumber").notNull(),
  contentHtml: text("contentHtml").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({ notebookPageIdx: index("notebook_pages_notebook_page_idx").on(table.notebookId, table.pageNumber) }));

export const notebookVersions = mysqlTable("notebook_versions", {
  id: int("id").autoincrement().primaryKey(),
  pageId: int("pageId").notNull(),
  contentHtml: text("contentHtml").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => ({ pageCreatedIdx: index("notebook_versions_page_created_idx").on(table.pageId, table.createdAt) }));

export const examAttempts = mysqlTable("exam_attempts", {
  id: int("id").autoincrement().primaryKey(),
  applicationId: int("applicationId").notNull(),
  score: int("score").notNull(),
  passed: int("passed").notNull(),
  answers: text("answers").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => ({ applicationCreatedAtIdx: index("exam_attempts_application_created_at_idx").on(table.applicationId, table.createdAt) }));

export const messages = mysqlTable("messages", {
  id: int("id").autoincrement().primaryKey(),
  applicationId: int("applicationId"),
  fromRole: mysqlEnum("fromRole", ["student", "coordination"]).notNull(),
  subject: varchar("subject", { length: 255 }).notNull(),
  body: text("body").notNull(),
  status: mysqlEnum("messageStatus", ["open", "answered"]).default("open").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => ({ applicationCreatedAtIdx: index("messages_application_created_at_idx").on(table.applicationId, table.createdAt) }));

export const contentItems = mysqlTable("content_items", {
  id: int("id").autoincrement().primaryKey(),
  kind: mysqlEnum("kind", ["welcome_video", "course_video", "update"]).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  body: text("body"),
  mediaUrl: varchar("mediaUrl", { length: 500 }),
  mediaPosterUrl: varchar("mediaPosterUrl", { length: 500 }),
  mediaDurationSeconds: int("mediaDurationSeconds"),
  mediaProcessingStatus: mysqlEnum("mediaProcessingStatus", ["not_applicable", "processed", "original"]).default("not_applicable").notNull(),
  isPublished: int("isPublished").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({ publishedCreatedAtIdx: index("content_published_created_at_idx").on(table.isPublished, table.createdAt) }));

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Application = typeof applications.$inferSelect;
export type Course = typeof courses.$inferSelect;
export type StudentProgress = typeof studentProgress.$inferSelect;
