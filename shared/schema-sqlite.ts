import { sql, relations } from "drizzle-orm";
import { sqliteTable, text, integer, real, blob, index } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table.
export const sessions = sqliteTable(
  "sessions",
  {
    sid: text("sid").primaryKey(),
    sess: text("sess", { mode: 'json' }).notNull(),
    expire: integer("expire").notNull(), // Unix timestamp
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Agencies (multi-tenant support)
export const agencies = sqliteTable("agencies", {
  id: text("id").primaryKey().$defaultFn(() => globalThis.crypto?.randomUUID() || Math.random().toString(36)),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  industry: text("industry"), // marketing, design, video, therapy, etc.
  logo: text("logo"), // URL to agency logo
  settings: text("settings", { mode: 'json' }).$type<{
    timezone?: string;
    language?: string;
    currency?: string;
  }>().default('{}'),
  pdfTemplate: text("pdf_template").default("modern"), // PDF template choice
  pdfColor: text("pdf_color").default("#0066cc"), // Primary color for PDF
  createdAt: integer("created_at").$defaultFn(() => Date.now()).notNull(),
  updatedAt: integer("updated_at").$defaultFn(() => Date.now()).notNull(),
});

// User storage table.
export const users = sqliteTable("users", {
  id: text("id").primaryKey().$defaultFn(() => globalThis.crypto?.randomUUID() || Math.random().toString(36)),
  email: text("email").unique(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  profileImageUrl: text("profile_image_url"),
  password: text("password"),
  fullName: text("full_name"),
  role: text("role").notNull().default("agency_admin"), // super_admin, agency_admin, team_member, client
  agencyId: text("agency_id").references(() => agencies.id),
  phone: text("phone"),
  company: text("company"),
  bio: text("bio"),
  avatar: text("avatar"),
  isActive: integer("is_active", { mode: 'boolean' }).default(true).notNull(),
  lastLogin: integer("last_login"), // Unix timestamp
  resetToken: text("reset_token"), // For password reset
  resetTokenExpiry: integer("reset_token_expiry"), // Unix timestamp
  googleCalendarTokens: text("google_calendar_tokens", { mode: 'json' }).$type<{
    access_token?: string;
    refresh_token?: string;
    scope?: string;
    token_type?: string;
    expiry_date?: number;
  }>(),
  googleCalendarConnected: integer("google_calendar_connected", { mode: 'boolean' }).default(false),
  createdAt: integer("created_at").$defaultFn(() => Date.now()).notNull(),
  updatedAt: integer("updated_at").$defaultFn(() => Date.now()).notNull(),
});

// Password reset tokens
export const passwordResetTokens = sqliteTable("password_reset_tokens", {
  id: text("id").primaryKey().$defaultFn(() => globalThis.crypto?.randomUUID() || Math.random().toString(36)),
  userId: text("user_id").notNull().references(() => users.id),
  token: text("token").notNull(),
  expiresAt: integer("expires_at").notNull(), // Unix timestamp
  used: integer("used", { mode: 'boolean' }).default(false).notNull(),
  createdAt: integer("created_at").$defaultFn(() => Date.now()).notNull(),
});

// Export all types
export type Agency = typeof agencies.$inferSelect;
export type InsertAgency = typeof agencies.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type UpsertUser = Partial<InsertUser> & { id?: string };