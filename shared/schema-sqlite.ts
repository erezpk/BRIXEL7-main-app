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
  // Business fields
  businessNumber: text("business_number"), // מספר עוסק
  businessName: text("business_name"), // שם העסק
  accountManager: text("account_manager").references(() => users.id), // מנהל לקוח
  logo: text("logo"), // לוגו החברה או תמונת פרופיל
  // Social media fields
  website: text("website"),
  instagram: text("instagram"),
  facebook: text("facebook"),
  tiktok: text("tiktok"),
  linkedin: text("linkedin"),
  whatsapp: text("whatsapp"),
  twitter: text("twitter"),
  youtube: text("youtube"),
  customFields: text("custom_fields", { mode: 'json' }).default('{}'),
  createdAt: integer("created_at").$defaultFn(() => Date.now()).notNull(),
  updatedAt: integer("updated_at").$defaultFn(() => Date.now()).notNull(),
});

// Contacts
export const contacts = sqliteTable("contacts", {
  id: text("id").primaryKey().$defaultFn(() => globalThis.crypto?.randomUUID() || Math.random().toString(36)),
  agencyId: text("agency_id").notNull().references(() => agencies.id),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  company: text("company"),
  notes: text("notes"),
  createdAt: integer("created_at").$defaultFn(() => Date.now()).notNull(),
  updatedAt: integer("updated_at").$defaultFn(() => Date.now()).notNull(),
});

// Client Users for login
export const clientUsers = sqliteTable("client_users", {
  id: text("id").primaryKey().$defaultFn(() => globalThis.crypto?.randomUUID() || Math.random().toString(36)),
  clientId: text("client_id").notNull().references(() => clients.id),
  username: text("username").notNull().unique(),
  email: text("email").notNull(),
  password: text("password").notNull(), // hashed password
  role: text("role").default("client").notNull(),
  isActive: integer("is_active", { mode: 'boolean' }).default(true).notNull(),
  lastLogin: integer("last_login"), // Unix timestamp
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
  firstName: text("first_name"),
  lastName: text("last_name"),
  businessName: text("business_name"),
  businessField: text("business_field"),
  email: text("email"),
  phone: text("phone"),
  industry: text("industry"),
  company: text("company"),
  businessNumber: text("business_number"),
  address: text("address"),
  city: text("city"),
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

// Client Transactions
export const clientTransactions = sqliteTable("client_transactions", {
  id: text("id").primaryKey().$defaultFn(() => globalThis.crypto?.randomUUID() || Math.random().toString(36)),
  agencyId: text("agency_id").notNull().references(() => agencies.id),
  clientId: text("client_id").notNull().references(() => clients.id),
  productId: text("product_id").references(() => products.id),
  productName: text("product_name").notNull(), // Store product name for history even if product is deleted
  amount: integer("amount").notNull(), // Amount in agorot
  quantity: integer("quantity").default(1).notNull(),
  totalAmount: integer("total_amount").notNull(), // amount * quantity in agorot
  status: text("status").default("completed").notNull(), // completed, pending, cancelled, refunded
  paymentMethod: text("payment_method"), // credit_card, bank_transfer, cash, etc.
  transactionDate: text("transaction_date").notNull(), // ISO date string
  description: text("description"),
  invoiceNumber: text("invoice_number"),
  receiptUrl: text("receipt_url"),
  notes: text("notes"),
  createdAt: integer("created_at").$defaultFn(() => Date.now()).notNull(),
  updatedAt: integer("updated_at").$defaultFn(() => Date.now()).notNull(),
});

// Quotes
export const quotes = sqliteTable("quotes", {
  id: text("id").primaryKey().$defaultFn(() => globalThis.crypto?.randomUUID() || Math.random().toString(36)),
  agencyId: text("agency_id").notNull().references(() => agencies.id),
  clientId: text("client_id").notNull().references(() => clients.id),
  quoteNumber: text("quote_number"),
  title: text("title").notNull(),
  description: text("description"),
  clientType: text("client_type").default("client"),
  status: text("status").default("draft"),
  validUntil: text("valid_until"), // Date string
  subtotal: integer("subtotal").default(0),
  vatAmount: integer("vat_amount").default(0),
  totalAmount: integer("total_amount").default(0),
  items: text("items").default("[]"), // JSON array
  terms: text("terms"),
  notes: text("notes"),
  sentAt: text("sent_at"), // DateTime string
  approvedAt: text("approved_at"), // DateTime string
  rejectedAt: text("rejected_at"), // DateTime string
  signedAt: text("signed_at"), // DateTime string
  lastSentAt: text("last_sent_at"), // DateTime string
  contractTemplateId: text("contract_template_id"),
  createdAt: text("created_at").$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at").$defaultFn(() => new Date().toISOString()),
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

// Project Analytics - Time tracking entries
export const timeEntries = sqliteTable("time_entries", {
  id: text("id").primaryKey().$defaultFn(() => globalThis.crypto?.randomUUID() || Math.random().toString(36)),
  agencyId: text("agency_id").notNull().references(() => agencies.id),
  projectId: text("project_id").notNull().references(() => projects.id),
  taskId: text("task_id").references(() => tasks.id),
  userId: text("user_id").notNull().references(() => users.id),
  description: text("description"),
  startTime: integer("start_time").notNull(), // Unix timestamp
  endTime: integer("end_time"), // Unix timestamp, null if still running
  duration: integer("duration"), // Duration in minutes
  hourlyRate: integer("hourly_rate"), // Rate in agorot per hour
  billable: integer("billable", { mode: 'boolean' }).default(true).notNull(),
  approved: integer("approved", { mode: 'boolean' }).default(false).notNull(),
  createdAt: integer("created_at").$defaultFn(() => Date.now()).notNull(),
  updatedAt: integer("updated_at").$defaultFn(() => Date.now()).notNull(),
});

// OAuth tokens for marketing platforms
export const oauthTokens = sqliteTable("oauth_tokens", {
  id: text("id").primaryKey().$defaultFn(() => globalThis.crypto?.randomUUID() || Math.random().toString(36)),
  agencyId: text("agency_id").notNull().references(() => agencies.id),
  userId: text("user_id").notNull().references(() => users.id),
  platform: text("platform").notNull(), // 'meta', 'google_ads', 'google_analytics'
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token"),
  tokenType: text("token_type").default("Bearer"),
  expiresAt: integer("expires_at"), // Unix timestamp
  scope: text("scope"),
  accountId: text("account_id"), // Platform-specific account ID
  accountName: text("account_name"),
  isActive: integer("is_active", { mode: 'boolean' }).default(true).notNull(),
  createdAt: integer("created_at").$defaultFn(() => Date.now()).notNull(),
  updatedAt: integer("updated_at").$defaultFn(() => Date.now()).notNull(),
});

// Marketing Campaigns data
export const campaigns = sqliteTable("campaigns", {
  id: text("id").primaryKey().$defaultFn(() => globalThis.crypto?.randomUUID() || Math.random().toString(36)),
  agencyId: text("agency_id").notNull().references(() => agencies.id),
  projectId: text("project_id").references(() => projects.id),
  clientId: text("client_id").references(() => clients.id),
  platform: text("platform").notNull(), // 'meta', 'google_ads'
  platformCampaignId: text("platform_campaign_id").notNull(), // ID from platform
  name: text("name").notNull(),
  status: text("status").notNull(), // 'active', 'paused', 'completed'
  objective: text("objective"), // Campaign objective
  budget: integer("budget"), // Budget in agorot
  budgetType: text("budget_type"), // 'daily', 'lifetime'
  startDate: text("start_date"), // ISO date string
  endDate: text("end_date"), // ISO date string
  createdAt: integer("created_at").$defaultFn(() => Date.now()).notNull(),
  updatedAt: integer("updated_at").$defaultFn(() => Date.now()).notNull(),
});

// Campaign Performance Metrics
export const campaignMetrics = sqliteTable("campaign_metrics", {
  id: text("id").primaryKey().$defaultFn(() => globalThis.crypto?.randomUUID() || Math.random().toString(36)),
  campaignId: text("campaign_id").notNull().references(() => campaigns.id),
  date: text("date").notNull(), // ISO date string (YYYY-MM-DD)
  impressions: integer("impressions").default(0),
  clicks: integer("clicks").default(0),
  spend: integer("spend").default(0), // Spend in agorot
  conversions: integer("conversions").default(0),
  cpm: integer("cpm").default(0), // Cost per mille in agorot
  cpc: integer("cpc").default(0), // Cost per click in agorot
  ctr: real("ctr").default(0), // Click-through rate as decimal
  conversionRate: real("conversion_rate").default(0), // Conversion rate as decimal
  reach: integer("reach").default(0),
  frequency: real("frequency").default(0),
  createdAt: integer("created_at").$defaultFn(() => Date.now()).notNull(),
  updatedAt: integer("updated_at").$defaultFn(() => Date.now()).notNull(),
});

// Project Expenses for profitability tracking
export const projectExpenses = sqliteTable("project_expenses", {
  id: text("id").primaryKey().$defaultFn(() => globalThis.crypto?.randomUUID() || Math.random().toString(36)),
  agencyId: text("agency_id").notNull().references(() => agencies.id),
  projectId: text("project_id").notNull().references(() => projects.id),
  category: text("category").notNull(), // 'advertising', 'tools', 'resources', 'outsourcing'
  description: text("description").notNull(),
  amount: integer("amount").notNull(), // Amount in agorot
  date: text("date").notNull(), // ISO date string
  receipt: text("receipt"), // URL to receipt file
  approved: integer("approved", { mode: 'boolean' }).default(false).notNull(),
  createdBy: text("created_by").notNull().references(() => users.id),
  createdAt: integer("created_at").$defaultFn(() => Date.now()).notNull(),
  updatedAt: integer("updated_at").$defaultFn(() => Date.now()).notNull(),
});

// Project Revenue tracking
export const projectRevenue = sqliteTable("project_revenue", {
  id: text("id").primaryKey().$defaultFn(() => globalThis.crypto?.randomUUID() || Math.random().toString(36)),
  agencyId: text("agency_id").notNull().references(() => agencies.id),
  projectId: text("project_id").notNull().references(() => projects.id),
  quoteId: text("quote_id").references(() => quotes.id),
  amount: integer("amount").notNull(), // Amount in agorot
  type: text("type").notNull(), // 'one_time', 'monthly', 'milestone'
  description: text("description"),
  invoiceDate: text("invoice_date"), // ISO date string
  paidDate: text("paid_date"), // ISO date string
  status: text("status").default("pending").notNull(), // 'pending', 'paid', 'overdue'
  createdAt: integer("created_at").$defaultFn(() => Date.now()).notNull(),
  updatedAt: integer("updated_at").$defaultFn(() => Date.now()).notNull(),
});

// Lead Generation Campaign tracking
export const leadGenCampaigns = sqliteTable("lead_gen_campaigns", {
  id: text("id").primaryKey().$defaultFn(() => globalThis.crypto?.randomUUID() || Math.random().toString(36)),
  agencyId: text("agency_id").notNull().references(() => agencies.id),
  projectId: text("project_id").notNull().references(() => projects.id),
  campaignId: text("campaign_id").references(() => campaigns.id),
  name: text("name").notNull(),
  targetAudience: text("target_audience"),
  leadForm: text("lead_form", { mode: 'json' }).default('{}'), // Form configuration
  costPerLead: integer("cost_per_lead"), // Target cost per lead in agorot
  conversionGoals: text("conversion_goals", { mode: 'json' }).default('{}'),
  status: text("status").default("active").notNull(),
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
export type Contact = typeof contacts.$inferSelect;
export type InsertContact = typeof contacts.$inferInsert;
export type ClientUser = typeof clientUsers.$inferSelect;
export type InsertClientUser = typeof clientUsers.$inferInsert;
export type Project = typeof projects.$inferSelect;
export type InsertProject = typeof projects.$inferInsert;
export type Lead = typeof leads.$inferSelect;
export type InsertLead = typeof leads.$inferInsert;
export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;
export type ClientTransaction = typeof clientTransactions.$inferSelect;
export type InsertClientTransaction = typeof clientTransactions.$inferInsert;
export type Quote = typeof quotes.$inferSelect;
export type InsertQuote = typeof quotes.$inferInsert;
export type Task = typeof tasks.$inferSelect;
export type InsertTask = typeof tasks.$inferInsert;

// New analytics types
export type TimeEntry = typeof timeEntries.$inferSelect;
export type InsertTimeEntry = typeof timeEntries.$inferInsert;
export type OAuthToken = typeof oauthTokens.$inferSelect;
export type InsertOAuthToken = typeof oauthTokens.$inferInsert;
export type Campaign = typeof campaigns.$inferSelect;
export type InsertCampaign = typeof campaigns.$inferInsert;
export type CampaignMetrics = typeof campaignMetrics.$inferSelect;
export type InsertCampaignMetrics = typeof campaignMetrics.$inferInsert;
export type ProjectExpense = typeof projectExpenses.$inferSelect;
export type InsertProjectExpense = typeof projectExpenses.$inferInsert;
export type ProjectRevenue = typeof projectRevenue.$inferSelect;
export type InsertProjectRevenue = typeof projectRevenue.$inferInsert;
export type LeadGenCampaign = typeof leadGenCampaigns.$inferSelect;
export type InsertLeadGenCampaign = typeof leadGenCampaigns.$inferInsert;