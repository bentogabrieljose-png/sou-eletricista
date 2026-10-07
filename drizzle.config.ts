import { defineConfig } from "drizzle-kit";

// `drizzle-kit generate` só lê o schema; a ligação à base de dados apenas é
// necessária para comandos como `migrate`, por isso não é obrigatória aqui.
const connectionString = process.env.DATABASE_URL;

export default defineConfig({
  schema: "./drizzle/schema.ts",
  out: "./drizzle",
  dialect: "mysql",
  ...(connectionString ? { dbCredentials: { url: connectionString } } : {}),
});
