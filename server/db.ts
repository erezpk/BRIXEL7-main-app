import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from "@shared/schema-sqlite";

// Use SQLite database
if (!process.env.DATABASE_URL) {
  console.warn("WARNING: DATABASE_URL not set. Using default SQLite database.");
  process.env.DATABASE_URL = "file:./app.db";
}

console.log("Using SQLite database");
const dbPath = process.env.DATABASE_URL.replace('file:', '');
const sqlite = new Database(dbPath);

export const db = drizzle({ client: sqlite, schema });
export const pool = null; // SQLite doesn't use connection pools