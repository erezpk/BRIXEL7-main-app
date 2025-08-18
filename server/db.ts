import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from "@shared/schema";

let db: any;
let pool: any;
let useLocalDb = false;

// Check if we're in development mode and no DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  if (process.env.NODE_ENV === 'development') {
    console.log("No DATABASE_URL set, using SQLite for local development");
    useLocalDb = true;
    // We'll handle the SQLite import dynamically when needed
    
  } else {
    throw new Error("DATABASE_URL not set");
  }
} else {
  console.log("Using PostgreSQL database");
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });
  db = drizzle(pool, { schema });
}

export { db, pool, useLocalDb };