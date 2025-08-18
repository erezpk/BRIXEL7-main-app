import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from "@shared/schema-sqlite";

// Use SQLite for local development
const sqlite = new Database('app.db');
export const db = drizzle(sqlite, { schema });

console.log("Using SQLite database for local development");
