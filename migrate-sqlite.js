import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './shared/schema-sqlite.ts';

console.log('Creating SQLite database with updated schema...');

const sqlite = new Database('./database.db');
const db = drizzle(sqlite, { schema });

// Create tables
console.log('Creating agencies table...');
sqlite.exec(`
CREATE TABLE IF NOT EXISTS "agencies" (
  "id" text PRIMARY KEY,
  "name" text NOT NULL,
  "slug" text NOT NULL UNIQUE,
  "industry" text,
  "logo" text,
  "settings" text DEFAULT '{}',
  "pdf_template" text DEFAULT "modern",
  "pdf_color" text DEFAULT "#0066cc",
  "created_at" integer NOT NULL,
  "updated_at" integer NOT NULL
);
`);

console.log('Creating users table...');
sqlite.exec(`
CREATE TABLE IF NOT EXISTS "users" (
  "id" text PRIMARY KEY,
  "email" text UNIQUE,
  "first_name" text,
  "last_name" text,
  "profile_image_url" text,
  "password" text,
  "full_name" text,
  "role" text NOT NULL DEFAULT "agency_admin",
  "agency_id" text REFERENCES "agencies"("id"),
  "phone" text,
  "company" text,
  "bio" text,
  "avatar" text,
  "is_active" integer DEFAULT 1 NOT NULL,
  "last_login" integer,
  "reset_token" text,
  "reset_token_expiry" integer,
  "google_calendar_tokens" text,
  "google_calendar_connected" integer DEFAULT 0,
  "created_at" integer NOT NULL,
  "updated_at" integer NOT NULL
);
`);

console.log('Creating clients table...');
sqlite.exec(`
CREATE TABLE IF NOT EXISTS "clients" (
  "id" text PRIMARY KEY,
  "agency_id" text NOT NULL REFERENCES "agencies"("id"),
  "name" text NOT NULL,
  "contact_name" text,
  "email" text,
  "phone" text,
  "industry" text,
  "status" text DEFAULT "active" NOT NULL,
  "notes" text,
  "custom_fields" text DEFAULT '{}',
  "created_at" integer NOT NULL,
  "updated_at" integer NOT NULL
);
`);

console.log('Creating projects table...');
sqlite.exec(`
CREATE TABLE IF NOT EXISTS "projects" (
  "id" text PRIMARY KEY,
  "agency_id" text NOT NULL REFERENCES "agencies"("id"),
  "client_id" text REFERENCES "clients"("id"),
  "name" text NOT NULL,
  "description" text,
  "type" text,
  "status" text DEFAULT "planning" NOT NULL,
  "priority" text DEFAULT "medium" NOT NULL,
  "start_date" text,
  "end_date" text,
  "budget" integer,
  "assigned_to" text REFERENCES "users"("id"),
  "created_by" text NOT NULL REFERENCES "users"("id"),
  "created_at" integer NOT NULL,
  "updated_at" integer NOT NULL
);
`);

console.log('Creating leads table...');
sqlite.exec(`
CREATE TABLE IF NOT EXISTS "leads" (
  "id" text PRIMARY KEY,
  "agency_id" text NOT NULL REFERENCES "agencies"("id"),
  "client_id" text,
  "name" text NOT NULL,
  "email" text,
  "phone" text,
  "source" text NOT NULL,
  "campaign_id" text,
  "campaign_name" text,
  "ad_set_id" text,
  "ad_set_name" text,
  "status" text DEFAULT "new" NOT NULL,
  "priority" text DEFAULT "medium" NOT NULL,
  "budget" integer,
  "assigned_to" text REFERENCES "users"("id"),
  "notes" text,
  "custom_fields" text DEFAULT '{}',
  "converted_to_client_id" text REFERENCES "clients"("id"),
  "converted_to_project_id" text REFERENCES "projects"("id"),
  "created_at" integer NOT NULL,
  "updated_at" integer NOT NULL
);
`);

console.log('Creating products table...');
sqlite.exec(`
CREATE TABLE IF NOT EXISTS "products" (
  "id" text PRIMARY KEY,
  "agency_id" text NOT NULL REFERENCES "agencies"("id"),
  "name" text NOT NULL,
  "description" text,
  "price" integer,
  "category" text,
  "is_active" integer DEFAULT 1 NOT NULL,
  "created_at" integer NOT NULL,
  "updated_at" integer NOT NULL
);
`);

console.log('Creating quotes table...');
sqlite.exec(`
CREATE TABLE IF NOT EXISTS "quotes" (
  "id" text PRIMARY KEY,
  "agency_id" text NOT NULL REFERENCES "agencies"("id"),
  "client_id" text REFERENCES "clients"("id"),
  "quote_number" text NOT NULL,
  "status" text DEFAULT "draft" NOT NULL,
  "total" integer NOT NULL,
  "valid_until" text,
  "notes" text,
  "created_by" text NOT NULL REFERENCES "users"("id"),
  "created_at" integer NOT NULL,
  "updated_at" integer NOT NULL
);
`);

console.log('Creating sessions table...');
sqlite.exec(`
CREATE TABLE IF NOT EXISTS "sessions" (
  "sid" text PRIMARY KEY,
  "sess" text NOT NULL,
  "expire" integer NOT NULL
);
CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "sessions"("expire");
`);

console.log('Creating password_reset_tokens table...');
sqlite.exec(`
CREATE TABLE IF NOT EXISTS "password_reset_tokens" (
  "id" text PRIMARY KEY,
  "user_id" text NOT NULL REFERENCES "users"("id"),
  "token" text NOT NULL,
  "expires_at" integer NOT NULL,
  "used" integer DEFAULT 0 NOT NULL,
  "created_at" integer NOT NULL
);
`);

console.log('✅ SQLite database created successfully!');
sqlite.close();