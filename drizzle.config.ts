import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema-sqlite.ts", // Use SQLite schema for development
  dialect: "sqlite",
  dbCredentials: {
    url: "file:./database.db",
  },
});
