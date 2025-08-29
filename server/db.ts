import dotenv from 'dotenv';
import path from 'path';

// Load environment variables before anything else
const envPath = path.resolve(process.cwd(), '.env');
dotenv.config({ path: envPath });

import { drizzle } from 'drizzle-orm/node-postgres';
import { drizzle as drizzleSqlite } from 'drizzle-orm/better-sqlite3';
import { Pool } from 'pg';
import Database from 'better-sqlite3';
import * as schema from "@shared/schema";
import * as schemaSqlite from "@shared/schema-sqlite";
let db: any;
let pool: any;
let useLocalDb = false;

// Check if we're using SQLite (file: protocol) or PostgreSQL
if (!process.env.DATABASE_URL) {
  if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
    console.log("No DATABASE_URL set, using SQLite for local development");
    useLocalDb = true;
    const sqlite = new Database('./database.db');
    db = drizzleSqlite(sqlite, { schema: schemaSqlite });
  } else {
    throw new Error("DATABASE_URL not set");
  }
} else if (process.env.DATABASE_URL.startsWith('file:')) {
  console.log("Using SQLite database");
  useLocalDb = true;
  const dbPath = process.env.DATABASE_URL.replace('file:', '');
  const sqlite = new Database(dbPath);
  db = drizzleSqlite(sqlite, { schema: schemaSqlite });
} else {
  console.log("Using PostgreSQL database");
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });
  db = drizzle(pool, { schema });
}

export { db, pool, useLocalDb };
export { schemaSqlite as sqliteSchema, schema as pgSchema };
