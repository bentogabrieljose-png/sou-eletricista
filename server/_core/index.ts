import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { serveStatic, setupVite } from "./vite";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { createContext } from "./context";
import { appRouter } from "../routers";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { ensureDefaultCourse } from "../db";

const app = express();
const server = createServer(app);
app.use(express.json({ limit: "12mb" }));
app.use(express.urlencoded({ extended: true, limit: "12mb" }));

registerOAuthRoutes(app);
registerStorageProxy(app);
app.use("/api/trpc", createExpressMiddleware({ router: appRouter, createContext }));

async function startServer() {
  await ensureDefaultCourse();
  if (process.env.NODE_ENV === "development") await setupVite(app, server);
  else serveStatic(app);
  const port = Number(process.env.PORT || 3000);
  server.listen(port, "0.0.0.0", () => console.log(`Server ready on port ${port}`));
}

startServer().catch(error => {
  console.error(error);
  process.exit(1);
});
