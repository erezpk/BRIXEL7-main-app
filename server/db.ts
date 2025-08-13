import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

// Use a default SQLite database URL if DATABASE_URL is not set
if (!process.env.DATABASE_URL) {
  console.warn("WARNING: DATABASE_URL not set. Using a memory SQLite database for development.");
  process.env.DATABASE_URL = "postgresql://user:password@localhost:5432/mydatabase";
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle({ client: pool, schema });