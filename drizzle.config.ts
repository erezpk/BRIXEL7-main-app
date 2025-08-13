import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

const isUsingSqlite = process.env.DATABASE_URL.startsWith('file:');

export default defineConfig({
  out: "./migrations",
  schema: isUsingSqlite ? "./shared/schema-sqlite.ts" : "./shared/schema.ts",
  dialect: isUsingSqlite ? "sqlite" : "postgresql",
  dbCredentials: isUsingSqlite 
    ? { url: process.env.DATABASE_URL.replace('file:', '') }
    : { url: process.env.DATABASE_URL },
});
