import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { serveStatic, setupVite } from "./vite";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { createContext } from "./context";
import { appRouter } from "../routers";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { ensureDefaultCourse, getApplicationByNumber, getCertificateByToken, getCertificateReprintByToken, markCertificateReprintDownloaded, purgeExpiredStudentAccess } from "../db";
import { recordRequest } from "../metrics";
import { generateCertificatePdf, generateEnrollmentReceiptPdf } from "../pdf";

const app = express();
const server = createServer(app);
app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(express.json({ limit: "120mb" }));
app.use(express.urlencoded({ extended: true, limit: "120mb" }));
app.use((req, res, next) => {
  const startedAt = performance.now();
  res.once("finish", () => recordRequest({ at: Date.now(), path: req.path, status: res.statusCode, durationMs: performance.now() - startedAt }));
  if (req.method === "GET" && (req.path === "/api/trpc/public.courses" || req.path === "/api/trpc/public.content")) {
    res.setHeader("Cache-Control", "public, max-age=15, stale-while-revalidate=30");
  }
  next();
});

registerOAuthRoutes(app);
registerStorageProxy(app);
app.get("/api/download/certificate/:token", async (req, res) => {
  try {
    const certificate = await getCertificateByToken(req.params.token);
    if (!certificate) return res.status(404).json({ error: "Certificado não encontrado." });
    const origin = `${req.protocol}://${req.get("host")}`;
    const pdf = await generateCertificatePdf({ fullName: certificate.application.fullName, courseTitle: certificate.application.courseTitle, completedAt: certificate.progress.completedAt, score: certificate.progress.latestScore, qrToken: certificate.progress.qrToken || req.params.token, validationUrl: `${origin}/validar/${certificate.progress.qrToken || req.params.token}` });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="certificado-${(certificate.application.fullName || "aluno").replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.pdf"`);
    res.setHeader("Cache-Control", "private, no-store");
    return res.send(pdf);
  } catch (error) { console.error("[PDF] certificate generation failed", error); return res.status(500).json({ error: "Não foi possível gerar o certificado." }); }
});
app.get("/api/download/receipt/:applicationNumber", async (req, res) => {
  try {
    const application = await getApplicationByNumber(req.params.applicationNumber);
    if (!application) return res.status(404).json({ error: "Inscrição não encontrada." });
    const pdf = await generateEnrollmentReceiptPdf(application);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="comprovativo-inscricao-${application.applicationNumber}.pdf"`);
    res.setHeader("Cache-Control", "private, no-store");
    return res.send(pdf);
  } catch (error) { console.error("[PDF] receipt generation failed", error); return res.status(500).json({ error: "Não foi possível gerar o comprovativo." }); }
});
app.get("/api/download/reprint/:token", async (req, res) => {
  try {
    const item = await getCertificateReprintByToken(req.params.token);
    if (!item) return res.status(404).json({ error: "Segunda via não encontrada, já descarregada ou ainda não autorizada." });
    const origin = `${req.protocol}://${req.get("host")}`;
    const pdf = await generateCertificatePdf({ fullName: item.progress.studentName || "Aluno", courseTitle: item.progress.courseTitle || "Curso", completedAt: item.progress.completedAt, score: item.progress.latestScore, qrToken: item.progress.qrToken || "", validationUrl: `${origin}/validar/${item.progress.qrToken || ""}` });
    await markCertificateReprintDownloaded(item.request.id);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="segunda-via-certificado-${item.request.id}.pdf"`);
    res.setHeader("Cache-Control", "private, no-store");
    return res.send(pdf);
  } catch (error) { console.error("[PDF] second certificate generation failed", error); return res.status(500).json({ error: "Não foi possível gerar a segunda via." }); }
});
app.use("/api/trpc", createExpressMiddleware({ router: appRouter, createContext }));

async function startServer() {
  await ensureDefaultCourse();
  await purgeExpiredStudentAccess();
  if (process.env.NODE_ENV === "development") await setupVite(app, server);
  else serveStatic(app);
  const port = Number(process.env.PORT || 3000);
  server.listen(port, "0.0.0.0", () => console.log(`Server ready on port ${port}`));
}

startServer().catch(error => {
  console.error(error);
  process.exit(1);
});
