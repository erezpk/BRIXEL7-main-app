import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL not set, ensure the database is configured");
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts", // Use PostgreSQL schema for Render
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
