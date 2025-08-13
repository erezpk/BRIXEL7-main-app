import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-serverless';
import { drizzle as drizzleSqlite } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import ws from "ws";
import * as pgSchema from "@shared/schema";
import * as sqliteSchema from "@shared/schema-sqlite";

neonConfig.webSocketConstructor = ws;

// Use SQLite as fallback if DATABASE_URL is not set or is a file URL
if (!process.env.DATABASE_URL) {
  console.warn("WARNING: DATABASE_URL not set. Using SQLite database for development.");
  process.env.DATABASE_URL = "file:./dev.db";
}

// Determine database type and create appropriate connection
let db;
let pool;
let isUsingSqlite = false;

if (process.env.DATABASE_URL.startsWith('file:')) {
  // SQLite
  console.log("Using SQLite database");
  isUsingSqlite = true;
  const dbPath = process.env.DATABASE_URL.replace('file:', '');
  const sqlite = new Database(dbPath);
  db = drizzleSqlite({ client: sqlite, schema: sqliteSchema });
  pool = null; // SQLite doesn't use pools
} else {
  // PostgreSQL/Neon
  console.log("Using PostgreSQL/Neon database");
  pool = new Pool({ connectionString: process.env.DATABASE_URL });
  db = drizzleNeon({ client: pool, schema: pgSchema });
}

export { db, pool, isUsingSqlite };