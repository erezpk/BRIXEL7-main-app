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

// Clients
export const clients = sqliteTable("clients", {
  id: text("id").primaryKey().$defaultFn(() => globalThis.crypto?.randomUUID() || Math.random().toString(36)),
  agencyId: text("agency_id").notNull().references(() => agencies.id),
  name: text("name").notNull(),
  contact_name: text("contact_name"),
  email: text("email"),
  phone: text("phone"),
  industry: text("industry"),
  status: text("status").default("active").notNull(),
  notes: text("notes"),
  customFields: text("custom_fields", { mode: 'json' }).default('{}'),
  createdAt: integer("created_at").$defaultFn(() => Date.now()).notNull(),
  updatedAt: integer("updated_at").$defaultFn(() => Date.now()).notNull(),
});

// Projects
export const projects = sqliteTable("projects", {
  id: text("id").primaryKey().$defaultFn(() => globalThis.crypto?.randomUUID() || Math.random().toString(36)),
  agencyId: text("agency_id").notNull().references(() => agencies.id),
  clientId: text("client_id").references(() => clients.id),
  name: text("name").notNull(),
  description: text("description"),
  type: text("type"),
  status: text("status").default("planning").notNull(),
  priority: text("priority").default("medium").notNull(),
  startDate: text("start_date"), // ISO date string
  endDate: text("end_date"), // ISO date string
  budget: integer("budget"),
  assignedTo: text("assigned_to").references(() => users.id),
  createdBy: text("created_by").notNull().references(() => users.id),
  createdAt: integer("created_at").$defaultFn(() => Date.now()).notNull(),
  updatedAt: integer("updated_at").$defaultFn(() => Date.now()).notNull(),
});

// Leads
export const leads = sqliteTable("leads", {
  id: text("id").primaryKey().$defaultFn(() => globalThis.crypto?.randomUUID() || Math.random().toString(36)),
  agencyId: text("agency_id").notNull().references(() => agencies.id),
  clientId: text("client_id"),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  industry: text("industry"),
  source: text("source").notNull(),
  campaign_id: text("campaign_id"), // campaign ID from ads platform
  campaignName: text("campaign_name"), // campaign name
  adSetId: text("ad_set_id"), // ad set ID (Facebook) or ad group ID (Google)
  adSetName: text("ad_set_name"), // ad set/group name
  status: text("status").default("new").notNull(),
  priority: text("priority").default("medium").notNull(),
  budget: integer("budget"), // potential project budget in agorot
  assignedTo: text("assigned_to").references(() => users.id),
  notes: text("notes"),
  customFields: text("custom_fields", { mode: 'json' }).default('{}'),
  convertedToClientId: text("converted_to_client_id").references(() => clients.id),
  convertedToProjectId: text("converted_to_project_id").references(() => projects.id),
  createdAt: integer("created_at").$defaultFn(() => Date.now()).notNull(),
  updatedAt: integer("updated_at").$defaultFn(() => Date.now()).notNull(),
});

// Products
export const products = sqliteTable("products", {
  id: text("id").primaryKey().$defaultFn(() => globalThis.crypto?.randomUUID() || Math.random().toString(36)),
  agencyId: text("agency_id").notNull().references(() => agencies.id),
  name: text("name").notNull(),
  description: text("description"),
  price: integer("price"),
  category: text("category"),
  isActive: integer("is_active", { mode: 'boolean' }).default(true).notNull(),
  createdAt: integer("created_at").$defaultFn(() => Date.now()).notNull(),
  updatedAt: integer("updated_at").$defaultFn(() => Date.now()).notNull(),
});

// Quotes
export const quotes = sqliteTable("quotes", {
  id: text("id").primaryKey().$defaultFn(() => globalThis.crypto?.randomUUID() || Math.random().toString(36)),
  agencyId: text("agency_id").notNull().references(() => agencies.id),
  clientId: text("client_id").references(() => clients.id),
  quoteNumber: text("quote_number").notNull(),
  status: text("status").default("draft").notNull(),
  total: integer("total").notNull(),
  validUntil: text("valid_until"), // ISO date string
  notes: text("notes"),
  createdBy: text("created_by").notNull().references(() => users.id),
  createdAt: integer("created_at").$defaultFn(() => Date.now()).notNull(),
  updatedAt: integer("updated_at").$defaultFn(() => Date.now()).notNull(),
});

// Tasks
export const tasks = sqliteTable("tasks", {
  id: text("id").primaryKey().$defaultFn(() => globalThis.crypto?.randomUUID() || Math.random().toString(36)),
  agencyId: text("agency_id").notNull().references(() => agencies.id),
  projectId: text("project_id").references(() => projects.id),
  leadId: text("lead_id").references(() => leads.id),
  clientId: text("client_id").references(() => clients.id),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").default("todo").notNull(), // todo, in_progress, review, completed
  priority: text("priority").default("medium").notNull(), // low, medium, high, urgent
  type: text("type").default("task").notNull(), // task, meeting, call, email, etc.
  assignedTo: text("assigned_to").references(() => users.id),
  createdBy: text("created_by").notNull().references(() => users.id),
  dueDate: text("due_date"), // ISO date string
  startTime: text("start_time"), // ISO datetime string for meetings/calls
  endTime: text("end_time"), // ISO datetime string for meetings/calls
  location: text("location"), // for meetings
  notes: text("notes"),
  tags: text("tags"), // JSON array of strings
  estimatedHours: integer("estimated_hours"),
  actualHours: integer("actual_hours"),
  completedAt: integer("completed_at"), // Unix timestamp
  createdAt: integer("created_at").$defaultFn(() => Date.now()).notNull(),
  updatedAt: integer("updated_at").$defaultFn(() => Date.now()).notNull(),
});

// Export all types
export type Agency = typeof agencies.$inferSelect;
export type InsertAgency = typeof agencies.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type UpsertUser = Partial<InsertUser> & { id?: string };

export type Client = typeof clients.$inferSelect;
export type InsertClient = typeof clients.$inferInsert;
export type Project = typeof projects.$inferSelect;
export type InsertProject = typeof projects.$inferInsert;
export type Lead = typeof leads.$inferSelect;
export type InsertLead = typeof leads.$inferInsert;
export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;
export type Quote = typeof quotes.$inferSelect;
export type InsertQuote = typeof quotes.$inferInsert;
export type Task = typeof tasks.$inferSelect;
export type InsertTask = typeof tasks.$inferInsert;