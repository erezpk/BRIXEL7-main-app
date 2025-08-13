import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, uuid, timestamp, integer, boolean, json, date, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Agencies (multi-tenant support)
export const agencies = pgTable("agencies", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  industry: text("industry"), // marketing, design, video, therapy, etc.
  logo: text("logo"), // URL to agency logo
  settings: json("settings").$type<{
    timezone?: string;
    language?: string;
    currency?: string;
  }>().default({}),
  pdfTemplate: text("pdf_template").default("modern"), // PDF template choice
  pdfColor: text("pdf_color").default("#0066cc"), // Primary color for PDF
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// User storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const users = pgTable("users", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  password: text("password"),
  fullName: text("full_name"),
  role: text("role").notNull().default("agency_admin"), // super_admin, agency_admin, team_member, client
  agencyId: uuid("agency_id").references(() => agencies.id),
  phone: text("phone"),
  company: text("company"),
  bio: text("bio"),
  avatar: text("avatar"),
  isActive: boolean("is_active").default(true).notNull(),
  lastLogin: timestamp("last_login"),
  resetToken: text("reset_token"), // For password reset
  resetTokenExpiry: timestamp("reset_token_expiry"), // When reset token expires
  googleCalendarTokens: json("google_calendar_tokens").$type<{
    access_token?: string;
    refresh_token?: string;
    scope?: string;
    token_type?: string;
    expiry_date?: number;
  }>(),
  googleCalendarConnected: boolean("google_calendar_connected").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Clients
export const clients = pgTable("clients", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  agencyId: uuid("agency_id").notNull().references(() => agencies.id),
  name: text("name").notNull(),
  contactName: text("contact_name"),
  email: text("email"),
  phone: text("phone"),
  industry: text("industry"),
  status: text("status").default("active").notNull(), // active, inactive, pending
  notes: text("notes"),
  customFields: json("custom_fields").$type<Record<string, any>>().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Projects
export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  agencyId: uuid("agency_id").notNull().references(() => agencies.id),
  clientId: uuid("client_id").references(() => clients.id),
  name: text("name").notNull(),
  description: text("description"),
  type: text("type"), // website, mobile-app, web-app, ecommerce, social-media, video-editing, graphic-design, other
  status: text("status").default("planning").notNull(), // planning, in_progress, completed, on_hold, cancelled
  priority: text("priority").default("medium").notNull(), // low, medium, high, urgent
  startDate: date("start_date"),
  endDate: date("end_date"),
  budget: integer("budget"), // in agorot (Israeli currency cents)
  assignedTo: uuid("assigned_to").references(() => users.id),
  createdBy: uuid("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Tasks
export const tasks = pgTable("tasks", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  agencyId: uuid("agency_id").notNull().references(() => agencies.id),
  projectId: uuid("project_id").references(() => projects.id),
  clientId: uuid("client_id").references(() => clients.id),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").default("new").notNull(), // new, in_progress, completed, cancelled
  priority: text("priority").default("medium").notNull(),
  assignedTo: uuid("assigned_to").references(() => users.id),
  dueDate: date("due_date"),
  estimatedHours: integer("estimated_hours"),
  actualHours: integer("actual_hours"),
  tags: json("tags").$type<string[]>().default([]),
  createdBy: uuid("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Task Comments
export const taskComments = pgTable("task_comments", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  taskId: uuid("task_id").notNull().references(() => tasks.id),
  userId: uuid("user_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Client Settings - Individual client configurations
export const clientSettings = pgTable("client_settings", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: uuid("client_id").notNull().references(() => clients.id).unique(),
  vatPercentage: integer("vat_percentage").default(18).notNull(), // VAT percentage for this client
  currency: text("currency").default("ILS").notNull(), // Currency (ILS, USD, EUR, etc.)
  paymentTerms: integer("payment_terms").default(30).notNull(), // Payment terms in days
  settings: json("settings").$type<{
    timezone?: string;
    invoicePrefix?: string;
    autoReminders?: boolean;
    reminderDays?: number[];
    defaultNotes?: string;
  }>().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Products and Services
export const products = pgTable("products", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  agencyId: uuid("agency_id").notNull().references(() => agencies.id),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category"), // website, design, marketing, video, etc.
  price: integer("price").notNull(), // in agorot
  priceType: text("price_type").default("fixed").notNull(), // fixed, hourly, monthly
  unit: text("unit").default("project").notNull(), // project, hour, month, etc.
  isActive: boolean("is_active").default(true).notNull(),
  predefinedTasks: json("predefined_tasks").$type<{
    id: string;
    title: string;
    description?: string;
    estimatedHours?: number;
    order: number;
  }[]>().default([]),
  createdBy: uuid("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Quotes/Proposals
export const quotes = pgTable("quotes", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  agencyId: uuid("agency_id").notNull().references(() => agencies.id),
  clientId: uuid("client_id").notNull(), // can reference clients.id or leads.id
  clientType: text("client_type").default("client").notNull(), // 'client' or 'lead'
  contractTemplateId: uuid("contract_template_id").references(() => contractTemplates.id),
  quoteNumber: text("quote_number").notNull().unique(),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").default("draft").notNull(), // draft, sent, approved, rejected, expired
  validUntil: date("valid_until"),
  subtotal: integer("subtotal").notNull(), // in agorot
  vatAmount: integer("vat_amount").notNull(),
  totalAmount: integer("total_amount").notNull(),
  items: json("items").$type<{
    id: string;
    productId?: string;
    name: string;
    description?: string;
    quantity: number;
    unitPrice: number; // in agorot
    priceType: 'fixed' | 'hourly' | 'monthly'; // סוג התמחור
    total: number; // in agorot
  }[]>().default([]),
  terms: text("terms"),
  notes: text("notes"),
  sentAt: timestamp("sent_at"),
  approvedAt: timestamp("approved_at"),
  rejectedAt: timestamp("rejected_at"),
  viewedAt: timestamp("viewed_at"),
  viewCount: integer("view_count").default(0).notNull(),
  signedAt: timestamp("signed_at"),
  signatureData: json("signature_data").$type<{
    signature?: string; // base64 signature image
    ipAddress?: string;
    userAgent?: string;
    timestamp?: string;
  }>(),
  createdBy: uuid("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Contract Templates
export const contractTemplates = pgTable("contract_templates", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  agencyId: uuid("agency_id").notNull().references(() => agencies.id),
  name: text("name").notNull(),
  description: text("description"),
  type: text("type", { enum: ['service_agreement', 'work_contract', 'nda', 'terms_of_service', 'consulting', 'maintenance', 'other'] }).default('service_agreement'),
  fileUrl: text("file_url"), // PDF file URL in object storage
  fileName: text("file_name"),
  fileSize: integer("file_size"),
  isActive: boolean("is_active").default(true),
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Contracts
export const contracts = pgTable("contracts", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  agencyId: uuid("agency_id").notNull().references(() => agencies.id),
  clientId: uuid("client_id").notNull().references(() => clients.id),
  projectId: uuid("project_id").references(() => projects.id),
  quoteId: uuid("quote_id").references(() => quotes.id),
  templateId: uuid("template_id").references(() => contractTemplates.id),
  contractNumber: text("contract_number").notNull().unique(),
  title: text("title").notNull(),
  status: text("status").default("draft").notNull(), // draft, sent, signed, active, completed, cancelled
  contractFile: text("contract_file"), // path to uploaded contract file
  signatureFields: json("signature_fields").$type<{
    id: string;
    page: number;
    x: number;
    y: number;
    width: number;
    height: number;
    signerRole: string; // client, agency
  }[]>().default([]),
  clientSignature: json("client_signature").$type<{
    signature?: string; // base64 signature image
    signedAt?: string;
    ipAddress?: string;
    userAgent?: string;
  }>(),
  agencySignature: json("agency_signature").$type<{
    signature?: string;
    signedAt?: string;
    signedBy?: string; // user ID
  }>(),
  startDate: date("start_date"),
  endDate: date("end_date"),
  totalValue: integer("total_value"), // in agorot
  paymentSchedule: json("payment_schedule").$type<{
    id: string;
    amount: number; // in agorot
    dueDate: string;
    description?: string;
    status: 'pending' | 'paid' | 'overdue';
  }[]>().default([]),
  terms: text("terms"),
  notes: text("notes"),
  createdBy: uuid("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Invoices
export const invoices = pgTable("invoices", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  agencyId: uuid("agency_id").notNull().references(() => agencies.id),
  clientId: uuid("client_id").notNull().references(() => clients.id),
  projectId: uuid("project_id").references(() => projects.id),
  contractId: uuid("contract_id").references(() => contracts.id),
  invoiceNumber: text("invoice_number").notNull().unique(),
  status: text("status").default("draft").notNull(), // draft, sent, paid, overdue, cancelled
  issueDate: date("issue_date").notNull(),
  dueDate: date("due_date").notNull(),
  subtotal: integer("subtotal").notNull(), // in agorot
  vatAmount: integer("vat_amount").notNull(),
  totalAmount: integer("total_amount").notNull(),
  paidAmount: integer("paid_amount").default(0).notNull(),
  items: json("items").$type<{
    id: string;
    description: string;
    quantity: number;
    unitPrice: number; // in agorot
    priceType: 'fixed' | 'hourly' | 'monthly'; // סוג התמחור
    total: number; // in agorot
  }[]>().default([]),
  paymentMethod: text("payment_method"), // bank_transfer, credit_card, check, cash
  paymentReference: text("payment_reference"), // transaction ID, check number, etc.
  paidAt: timestamp("paid_at"),
  notes: text("notes"),
  createdBy: uuid("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Payments
export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  agencyId: uuid("agency_id").notNull().references(() => agencies.id),
  clientId: uuid("client_id").notNull().references(() => clients.id),
  invoiceId: uuid("invoice_id").references(() => invoices.id),
  contractId: uuid("contract_id").references(() => contracts.id),
  projectId: uuid("project_id").references(() => projects.id),
  amount: integer("amount").notNull(), // in agorot
  paymentDate: date("payment_date").notNull(),
  paymentMethod: text("payment_method").notNull(), // bank_transfer, credit_card, check, cash
  reference: text("reference"), // transaction ID, check number, etc.
  status: text("status").default("completed").notNull(), // pending, completed, failed, cancelled
  isRecurring: boolean("is_recurring").default(false).notNull(),
  recurringSchedule: json("recurring_schedule").$type<{
    frequency: 'monthly' | 'quarterly' | 'yearly';
    nextPaymentDate?: string;
    endDate?: string;
  }>(),
  notes: text("notes"),
  createdBy: uuid("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Digital Assets
export const digitalAssets = pgTable("digital_assets", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  agencyId: uuid("agency_id").notNull().references(() => agencies.id),
  clientId: uuid("client_id").notNull().references(() => clients.id),
  type: text("type").notNull(), // domain, hosting, ssl, email, etc.
  name: text("name").notNull(),
  provider: text("provider"),
  renewalDate: date("renewal_date"),
  cost: integer("cost"), // in agorot
  loginUrl: text("login_url"),
  username: text("username"),
  password: text("password"), // encrypted
  notes: text("notes"),
  reminderSent: boolean("reminder_sent").default(false).notNull(),
  autoRenew: boolean("auto_renew").default(false).notNull(),
  status: text("status").default("active").notNull(), // active, expired, cancelled
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Agency Templates
export const agencyTemplates = pgTable("agency_templates", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  agencyId: uuid("agency_id").references(() => agencies.id),
  name: text("name").notNull(),
  industry: text("industry").notNull(),
  description: text("description"),
  isPublic: boolean("is_public").default(false).notNull(),
  template: json("template").$type<{
    clientFields?: any[];
    projectFields?: any[];
    taskFields?: any[];
    workflows?: any[];
  }>().notNull(),
  createdBy: uuid("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Client Card Templates - for drag & drop builder
export const clientCardTemplates = pgTable("client_card_templates", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  agencyId: uuid("agency_id").notNull().references(() => agencies.id),
  name: text("name").notNull(),
  description: text("description"),
  industry: text("industry"), // 'marketing', 'design', 'video', 'therapy', etc.
  fields: json("fields").$type<ClientCardField[]>().default([]),
  isDefault: boolean("is_default").default(false).notNull(),
  createdBy: uuid("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Leads (Facebook Ads & Google Ads Integration)
export const leads = pgTable("leads", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  agencyId: uuid("agency_id").notNull().references(() => agencies.id),
  clientId: uuid("client_id"),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  source: text("source").notNull(), // facebook_ads, google_ads, manual, website, referral
  campaignId: text("campaign_id"), // campaign ID from ads platform
  campaignName: text("campaign_name"), // campaign name
  adSetId: text("ad_set_id"), // ad set ID (Facebook) or ad group ID (Google)
  adSetName: text("ad_set_name"), // ad set/group name
  status: text("status").default("new").notNull(), // new, contacted, qualified, converted, lost
  priority: text("priority").default("medium").notNull(), // low, medium, high
  budget: integer("budget"), // potential project budget in agorot
  assignedTo: uuid("assigned_to").references(() => users.id),
  notes: text("notes"),
  customFields: json("custom_fields").$type<Record<string, any>>().default({}),
  convertedToClientId: uuid("converted_to_client_id").references(() => clients.id),
  convertedToProjectId: uuid("converted_to_project_id").references(() => projects.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Activity Log
export const activityLog = pgTable("activity_log", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  agencyId: uuid("agency_id").notNull().references(() => agencies.id),
  userId: uuid("user_id").notNull().references(() => users.id),
  action: text("action").notNull(), // created, updated, deleted, commented, etc.
  entityType: text("entity_type").notNull(), // client, project, task, lead, etc.
  entityId: uuid("entity_id"),
  details: json("details").$type<Record<string, any>>().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Payment Settings - Agency-level payment configurations
export const paymentSettings = pgTable("payment_settings", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  agencyId: uuid("agency_id").notNull().references(() => agencies.id).unique(),
  provider: text("provider").notNull(), // meshulam, stripe, paypal, bluesnap, payoneer, greeninvoice, etc.
  isEnabled: boolean("is_enabled").default(false).notNull(),
  apiKey: text("api_key"), // Encrypted API key
  secretKey: text("secret_key"), // Encrypted secret key
  webhookSecret: text("webhook_secret"), // Encrypted webhook secret
  settings: json("settings").$type<{
    currency?: string;
    testMode?: boolean;
    autoCapture?: boolean;
    retentionDays?: number;
    defaultDescription?: string;
  }>().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Client Payment Methods - Stored payment methods for clients
export const clientPaymentMethods = pgTable("client_payment_methods", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: uuid("client_id").notNull().references(() => clients.id),
  agencyId: uuid("agency_id").notNull().references(() => agencies.id),
  provider: text("provider").notNull(), // meshulam, stripe, etc.
  providerCustomerId: text("provider_customer_id"), // Customer ID in payment provider
  providerPaymentMethodId: text("provider_payment_method_id"), // Payment method ID in provider
  type: text("type").notNull(), // card, bank_transfer, etc.
  cardBrand: text("card_brand"), // visa, mastercard, etc.
  cardLastFour: text("card_last_four"), // Last 4 digits
  cardExpMonth: integer("card_exp_month"),
  cardExpYear: integer("card_exp_year"),
  cardHolderName: text("card_holder_name"),
  isDefault: boolean("is_default").default(false).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  metadata: json("metadata").$type<Record<string, any>>().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Free lead collection forms table - אלטרנטיבה חינמית לאיסוף לידים
export const leadCollectionForms = pgTable("lead_collection_forms", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  agencyId: uuid("agency_id").notNull().references(() => agencies.id),
  name: text("name").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  fields: json("fields").notNull(), // Form field configuration
  styling: json("styling"), // Form appearance settings
  isActive: boolean("is_active").default(true),
  embedCode: text("embed_code"),
  publicUrl: text("public_url"),
  redirectUrl: text("redirect_url"),
  submissionCount: integer("submission_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Form submissions table
export const formSubmissions = pgTable("form_submissions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  formId: uuid("form_id").notNull().references(() => leadCollectionForms.id),
  agencyId: uuid("agency_id").notNull().references(() => agencies.id),
  submissionData: json("submission_data").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  referrer: text("referrer"),
  isProcessed: boolean("is_processed").default(false),
  createdLead: uuid("created_lead").references(() => leads.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Retainers - Recurring payment agreements
export const retainers = pgTable("retainers", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: uuid("client_id").notNull().references(() => clients.id),
  agencyId: uuid("agency_id").notNull().references(() => agencies.id),
  paymentMethodId: uuid("payment_method_id").references(() => clientPaymentMethods.id),
  title: text("title").notNull(),
  description: text("description"),
  amount: integer("amount").notNull(), // Amount in agorot
  currency: text("currency").default("ILS").notNull(),
  frequency: text("frequency").notNull(), // monthly, quarterly, yearly
  startDate: date("start_date").notNull(),
  endDate: date("end_date"), // Optional end date
  status: text("status").default("active").notNull(), // active, paused, cancelled, completed
  nextChargeDate: date("next_charge_date"),
  totalCharges: integer("total_charges").default(0).notNull(),
  failedCharges: integer("failed_charges").default(0).notNull(),
  lastChargeDate: date("last_charge_date"),
  settings: json("settings").$type<{
    autoRenew?: boolean;
    gracePeriodDays?: number;
    maxFailedAttempts?: number;
    emailNotifications?: boolean;
  }>().default({}),
  createdBy: uuid("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Retainer Transactions - Individual charges for retainers
export const retainerTransactions = pgTable("retainer_transactions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  retainerId: uuid("retainer_id").notNull().references(() => retainers.id),
  agencyId: uuid("agency_id").notNull().references(() => agencies.id),
  amount: integer("amount").notNull(),
  currency: text("currency").default("ILS").notNull(),
  status: text("status").notNull(), // pending, processing, completed, failed, refunded
  providerTransactionId: text("provider_transaction_id"), // Transaction ID from payment provider
  chargeDate: date("charge_date").notNull(),
  completedAt: timestamp("completed_at"),
  failureReason: text("failure_reason"),
  metadata: json("metadata").$type<Record<string, any>>().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// One-time Payments - Individual payment transactions
export const oneTimePayments = pgTable("one_time_payments", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: uuid("client_id").references(() => clients.id),
  agencyId: uuid("agency_id").notNull().references(() => agencies.id),
  invoiceId: uuid("invoice_id").references(() => invoices.id), // Optional link to invoice
  quoteId: uuid("quote_id").references(() => quotes.id), // Optional link to quote
  paymentMethodId: uuid("payment_method_id").references(() => clientPaymentMethods.id),
  amount: integer("amount").notNull(),
  currency: text("currency").default("ILS").notNull(),
  description: text("description"),
  status: text("status").notNull(), // pending, processing, completed, failed, refunded
  providerTransactionId: text("provider_transaction_id"),
  providerPaymentIntentId: text("provider_payment_intent_id"),
  paymentDate: timestamp("payment_date"),
  failureReason: text("failure_reason"),
  refundAmount: integer("refund_amount").default(0),
  refundDate: timestamp("refund_date"),
  metadata: json("metadata").$type<Record<string, any>>().default({}),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Password Reset Tokens
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Chat Conversations
export const chatConversations = pgTable("chat_conversations", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  agencyId: uuid("agency_id").notNull().references(() => agencies.id),
  type: text("type").notNull(), // direct, group, support, ai_assistant
  title: text("title"),
  participants: json("participants").$type<string[]>().notNull().default([]),
  createdBy: uuid("created_by").notNull().references(() => users.id),
  lastMessageAt: timestamp("last_message_at"),
  isActive: boolean("is_active").default(true).notNull(),
  settings: json("settings").$type<{
    allowFileUploads?: boolean;
    notificationsEnabled?: boolean;
    retentionDays?: number;
  }>().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Chat Messages
export const chatMessages = pgTable("chat_messages", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: uuid("conversation_id").notNull().references(() => chatConversations.id),
  senderId: uuid("sender_id").references(() => users.id),
  content: text("content").notNull(),
  type: text("type").notNull(), // text, file, system, bot, ai_response
  metadata: json("metadata").$type<{
    fileUrl?: string;
    fileName?: string;
    fileSize?: number;
    replyTo?: string;
    aiModel?: string;
    processingTime?: number;
  }>().default({}),
  readBy: json("read_by").$type<Record<string, string>>().default({}), // userId -> timestamp
  isEdited: boolean("is_edited").default(false),
  isDeleted: boolean("is_deleted").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  editedAt: timestamp("edited_at"),
});

// Chat Settings per Agency
export const chatSettings = pgTable("chat_settings", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  agencyId: uuid("agency_id").notNull().references(() => agencies.id).unique(),
  botConfig: json("bot_config").$type<{
    enabled: boolean;
    name: string;
    avatar?: string;
    welcomeMessage: string;
    tone: "professional" | "friendly" | "casual";
    autoRespond: boolean;
    workingHours?: {
      enabled: boolean;
      timezone: string;
      schedule: Record<string, { start: string; end: string; }>;
    };
  }>().default({
    enabled: true,
    name: "עוזר הסוכנות",
    welcomeMessage: "שלום! איך אוכל לעזור לכם היום?",
    tone: "professional",
    autoRespond: true
  }),
  allowedTopics: json("allowed_topics").$type<string[]>().default([]),
  forbiddenTopics: json("forbidden_topics").$type<string[]>().default([]),
  cannedReplies: json("canned_replies").$type<Array<{
    id: string;
    title: string;
    content: string;
    category: string;
  }>>().default([]),
  branding: json("branding").$type<{
    primaryColor?: string;
    chatTitle?: string;
    logoUrl?: string;
    customCss?: string;
  }>().default({}),
  aiAssistantConfig: json("ai_assistant_config").$type<{
    enabled: boolean;
    model: string;
    temperature: number;
    maxTokens: number;
    systemPrompt: string;
    ragEnabled: boolean;
  }>().default({
    enabled: true,
    model: "gpt-4",
    temperature: 0.7,
    maxTokens: 1000,
    systemPrompt: "אתה עוזר וירטואלי של סוכנות דיגיטלית. עזור ללקוחות באופן מקצועי ובעברית.",
    ragEnabled: true
  }),
  rateLimits: json("rate_limits").$type<{
    messagesPerMinute: number;
    messagesPerHour: number;
    fileUploadsPerHour: number;
  }>().default({
    messagesPerMinute: 20,
    messagesPerHour: 100,
    fileUploadsPerHour: 10
  }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Chat Audit Log
export const chatAuditLog = pgTable("chat_audit_log", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  agencyId: uuid("agency_id").notNull().references(() => agencies.id),
  userId: uuid("user_id").references(() => users.id),
  conversationId: uuid("conversation_id").references(() => chatConversations.id),
  messageId: uuid("message_id").references(() => chatMessages.id),
  action: text("action").notNull(), // send, read, edit, delete, join, leave
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  metadata: json("metadata").$type<Record<string, any>>().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Custom field interface for client card builder
export interface ClientCardField {
  id: string;
  type: 'text' | 'textarea' | 'select' | 'date' | 'status' | 'number' | 'email' | 'phone';
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[]; // for select fields
  defaultValue?: string;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
}


// Relations
export const agenciesRelations = relations(agencies, ({ many }) => ({
  users: many(users),
  clients: many(clients),
  products: many(products),
  projects: many(projects),
  tasks: many(tasks),
  leads: many(leads),
  digitalAssets: many(digitalAssets),
  quotes: many(quotes),
  contracts: many(contracts),
  invoices: many(invoices),
  payments: many(payments),
  templates: many(agencyTemplates),
  clientCardTemplates: many(clientCardTemplates),
  contractTemplates: many(contractTemplates),
  activityLog: many(activityLog),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  agency: one(agencies, {
    fields: [users.agencyId],
    references: [agencies.id],
  }),
  assignedProjects: many(projects),
  assignedTasks: many(tasks),
  createdTasks: many(tasks),
  comments: many(taskComments),
  createdTemplates: many(agencyTemplates),
  activityLog: many(activityLog),
}));

export const clientsRelations = relations(clients, ({ one, many }) => ({
  agency: one(agencies, {
    fields: [clients.agencyId],
    references: [agencies.id],
  }),
  settings: one(clientSettings, {
    fields: [clients.id],
    references: [clientSettings.clientId],
  }),
  projects: many(projects),
  tasks: many(tasks),
  leads: many(leads),
  digitalAssets: many(digitalAssets),
  quotes: many(quotes),
  contracts: many(contracts),
  invoices: many(invoices),
  payments: many(payments),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  agency: one(agencies, {
    fields: [projects.agencyId],
    references: [agencies.id],
  }),
  client: one(clients, {
    fields: [projects.clientId],
    references: [clients.id],
  }),
  assignedUser: one(users, {
    fields: [projects.assignedTo],
    references: [users.id],
  }),
  createdBy: one(users, {
    fields: [projects.createdBy],
    references: [users.id],
  }),
  tasks: many(tasks),
}));

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  agency: one(agencies, {
    fields: [tasks.agencyId],
    references: [agencies.id],
  }),
  project: one(projects, {
    fields: [tasks.projectId],
    references: [projects.id],
  }),
  client: one(clients, {
    fields: [tasks.clientId],
    references: [clients.id],
  }),
  assignedUser: one(users, {
    fields: [tasks.assignedTo],
    references: [users.id],
  }),
  createdBy: one(users, {
    fields: [tasks.createdBy],
    references: [users.id],
  }),
  comments: many(taskComments),
}));

export const taskCommentsRelations = relations(taskComments, ({ one }) => ({
  task: one(tasks, {
    fields: [taskComments.taskId],
    references: [tasks.id],
  }),
  user: one(users, {
    fields: [taskComments.userId],
    references: [users.id],
  }),
}));

export const digitalAssetsRelations = relations(digitalAssets, ({ one }) => ({
  agency: one(agencies, {
    fields: [digitalAssets.agencyId],
    references: [agencies.id],
  }),
  client: one(clients, {
    fields: [digitalAssets.clientId],
    references: [clients.id],
  }),
}));

export const agencyTemplatesRelations = relations(agencyTemplates, ({ one }) => ({
  agency: one(agencies, {
    fields: [agencyTemplates.agencyId],
    references: [agencies.id],
  }),
  createdBy: one(users, {
    fields: [agencyTemplates.createdBy],
    references: [users.id],
  }),
}));

export const clientCardTemplatesRelations = relations(clientCardTemplates, ({ one }) => ({
  agency: one(agencies, {
    fields: [clientCardTemplates.agencyId],
    references: [agencies.id],
  }),
  createdBy: one(users, {
    fields: [clientCardTemplates.createdBy],
    references: [users.id],
  }),
}));

export const leadsRelations = relations(leads, ({ one }) => ({
  agency: one(agencies, {
    fields: [leads.agencyId],
    references: [agencies.id],
  }),
  client: one(clients, {
    fields: [leads.clientId],
    references: [clients.id],
  }),
  assignedUser: one(users, {
    fields: [leads.assignedTo],
    references: [users.id],
  }),
  convertedToClient: one(clients, {
    fields: [leads.convertedToClientId],
    references: [clients.id],
  }),
  convertedToProject: one(projects, {
    fields: [leads.convertedToProjectId],
    references: [projects.id],
  }),
}));

export const activityLogRelations = relations(activityLog, ({ one }) => ({
  agency: one(agencies, {
    fields: [activityLog.agencyId],
    references: [agencies.id],
  }),
  user: one(users, {
    fields: [activityLog.userId],
    references: [users.id],
  }),
}));

// New Relations
export const clientSettingsRelations = relations(clientSettings, ({ one }) => ({
  client: one(clients, {
    fields: [clientSettings.clientId],
    references: [clients.id],
  }),
}));

export const productsRelations = relations(products, ({ one }) => ({
  agency: one(agencies, {
    fields: [products.agencyId],
    references: [agencies.id],
  }),
  createdBy: one(users, {
    fields: [products.createdBy],
    references: [users.id],
  }),
}));

export const quotesRelations = relations(quotes, ({ one }) => ({
  agency: one(agencies, {
    fields: [quotes.agencyId],
    references: [agencies.id],
  }),
  client: one(clients, {
    fields: [quotes.clientId],
    references: [clients.id],
  }),
  createdBy: one(users, {
    fields: [quotes.createdBy],
    references: [users.id],
  }),
}));

export const contractsRelations = relations(contracts, ({ one }) => ({
  agency: one(agencies, {
    fields: [contracts.agencyId],
    references: [agencies.id],
  }),
  client: one(clients, {
    fields: [contracts.clientId],
    references: [clients.id],
  }),
  project: one(projects, {
    fields: [contracts.projectId],
    references: [projects.id],
  }),
  quote: one(quotes, {
    fields: [contracts.quoteId],
    references: [quotes.id],
  }),
  createdBy: one(users, {
    fields: [contracts.createdBy],
    references: [users.id],
  }),
}));

export const invoicesRelations = relations(invoices, ({ one }) => ({
  agency: one(agencies, {
    fields: [invoices.agencyId],
    references: [agencies.id],
  }),
  client: one(clients, {
    fields: [invoices.clientId],
    references: [clients.id],
  }),
  project: one(projects, {
    fields: [invoices.projectId],
    references: [projects.id],
  }),
  contract: one(contracts, {
    fields: [invoices.contractId],
    references: [contracts.id],
  }),
  createdBy: one(users, {
    fields: [invoices.createdBy],
    references: [users.id],
  }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  agency: one(agencies, {
    fields: [payments.agencyId],
    references: [agencies.id],
  }),
  client: one(clients, {
    fields: [payments.clientId],
    references: [clients.id],
  }),
  invoice: one(invoices, {
    fields: [payments.invoiceId],
    references: [invoices.id],
  }),
  contract: one(contracts, {
    fields: [payments.contractId],
    references: [contracts.id],
  }),
  project: one(projects, {
    fields: [payments.projectId],
    references: [projects.id],
  }),
  createdBy: one(users, {
    fields: [payments.createdBy],
    references: [users.id],
  }),
}));



// Communications (calls, messages, meetings, summaries)
export const communications = pgTable("communications", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  agencyId: uuid("agency_id").notNull().references(() => agencies.id),
  type: text("type").notNull(), // phone_call, email, whatsapp, sms, meeting, summary
  contactType: text("contact_type").notNull(), // lead, client
  contactId: uuid("contact_id").notNull(), // refers to lead or client
  contactName: text("contact_name").notNull(), // cached name for easier queries
  subject: text("subject").notNull(),
  content: text("content").notNull(),
  status: text("status").default("completed").notNull(), // completed, scheduled, failed, cancelled
  scheduledDate: timestamp("scheduled_date"),
  completedDate: timestamp("completed_date"),
  duration: integer("duration"), // in minutes
  outcome: text("outcome"), // results and conclusions
  followUpRequired: boolean("follow_up_required").default(false),
  followUpDate: timestamp("follow_up_date"),
  tags: json("tags").$type<string[]>().default([]),
  metadata: json("metadata").$type<Record<string, any>>().default({}), // additional data like phone numbers, email addresses, etc.
  createdBy: uuid("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Calendar Events (integrated with communications)
export const calendarEvents = pgTable("calendar_events", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  agencyId: uuid("agency_id").notNull().references(() => agencies.id),
  title: text("title").notNull(),
  description: text("description"),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  location: text("location"),
  type: text("type").default("meeting").notNull(), // meeting, task, deadline, reminder
  priority: text("priority").default("medium").notNull(), // low, medium, high
  status: text("status").default("scheduled").notNull(), // scheduled, completed, cancelled
  contactType: text("contact_type"), // lead, client (optional)
  contactId: uuid("contact_id"), // refers to lead or client (optional)
  communicationId: uuid("communication_id").references(() => communications.id), // link to communication if applicable
  attendees: json("attendees").$type<string[]>().default([]), // array of email addresses
  googleEventId: text("google_event_id"), // for Google Calendar integration
  createdBy: uuid("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Insert schemas
export const insertAgencySchema = createInsertSchema(agencies).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserSchema = createInsertSchema(users, {
  email: z.string().email("כתובת אימייל לא תקינה"),
  password: z.string().min(6, "הסיסמה חייבת להכיל לפחות 6 תווים"),
  fullName: z.string().min(2, "השם חייב להכיל לפחות 2 תווים"),
  role: z.enum(["super_admin", "agency_admin", "team_member", "client"]),
  phone: z.string().optional(),
  company: z.string().optional(),
  bio: z.string().optional(),
  avatar: z.string().optional(),
}).omit({ id: true, createdAt: true, updatedAt: true });

export const insertClientSchema = createInsertSchema(clients).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertLeadSchema = createInsertSchema(leads).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTaskCommentSchema = createInsertSchema(taskComments).omit({
  id: true,
  createdAt: true,
});

export const insertDigitalAssetSchema = createInsertSchema(digitalAssets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAgencyTemplateSchema = createInsertSchema(agencyTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertClientCardTemplateSchema = createInsertSchema(clientCardTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const selectClientCardTemplateSchema = createSelectSchema(clientCardTemplates);

export const insertActivityLogSchema = createInsertSchema(activityLog);
export const insertPasswordResetTokenSchema = createInsertSchema(passwordResetTokens);

// New insert schemas
export const insertClientSettingsSchema = createInsertSchema(clientSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertQuoteSchema = createInsertSchema(quotes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertContractSchema = createInsertSchema(contracts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCommunicationSchema = createInsertSchema(communications).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCalendarEventSchema = createInsertSchema(calendarEvents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Relations for new tables
export const communicationsRelations = relations(communications, ({ one }) => ({
  agency: one(agencies, {
    fields: [communications.agencyId],
    references: [agencies.id],
  }),
  createdBy: one(users, {
    fields: [communications.createdBy],
    references: [users.id],
  }),
}));

export const calendarEventsRelations = relations(calendarEvents, ({ one }) => ({
  agency: one(agencies, {
    fields: [calendarEvents.agencyId],
    references: [agencies.id],
  }),
  communication: one(communications, {
    fields: [calendarEvents.communicationId],
    references: [communications.id],
  }),
  createdBy: one(users, {
    fields: [calendarEvents.createdBy],
    references: [users.id],
  }),
}));

export const insertInvoiceSchema = createInsertSchema(invoices).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPaymentSchema = createInsertSchema(payments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Payment related schemas
export const insertPaymentSettingsSchema = createInsertSchema(paymentSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertClientPaymentMethodSchema = createInsertSchema(clientPaymentMethods).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRetainerSchema = createInsertSchema(retainers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRetainerTransactionSchema = createInsertSchema(retainerTransactions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertOneTimePaymentSchema = createInsertSchema(oneTimePayments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Lead collection forms schemas
export const insertLeadCollectionFormSchema = createInsertSchema(leadCollectionForms).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertFormSubmissionSchema = createInsertSchema(formSubmissions).omit({
  id: true,
  createdAt: true,
});

// Chat schemas
export const insertChatConversationSchema = createInsertSchema(chatConversations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({
  id: true,
  createdAt: true,
});

export const insertChatSettingsSchema = createInsertSchema(chatSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertChatAuditLogSchema = createInsertSchema(chatAuditLog).omit({
  id: true,
  createdAt: true,
});

// Types
export type Agency = typeof agencies.$inferSelect;
export type InsertAgency = z.infer<typeof insertAgencySchema>;

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpsertUser = typeof users.$inferInsert;

export type Client = typeof clients.$inferSelect;
export type InsertClient = z.infer<typeof insertClientSchema>;

export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;

export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;

export type Lead = typeof leads.$inferSelect;
export type InsertLead = typeof leads.$inferInsert;

export type TaskComment = typeof taskComments.$inferSelect;
export type InsertTaskComment = z.infer<typeof insertTaskCommentSchema>;

export type DigitalAsset = typeof digitalAssets.$inferSelect;
export type InsertDigitalAsset = z.infer<typeof insertDigitalAssetSchema>;

export type AgencyTemplate = typeof agencyTemplates.$inferSelect;
export type InsertAgencyTemplate = z.infer<typeof insertAgencyTemplateSchema>;

export type ClientCardTemplate = typeof clientCardTemplates.$inferSelect;
export type InsertClientCardTemplate = z.infer<typeof insertClientCardTemplateSchema>;

export type ActivityLog = typeof activityLog.$inferSelect;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type InsertPasswordResetToken = z.infer<typeof insertPasswordResetTokenSchema>;

// New Types
export type ClientSettings = typeof clientSettings.$inferSelect;
export type InsertClientSettings = z.infer<typeof insertClientSettingsSchema>;

export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;

export type Quote = typeof quotes.$inferSelect;
export type InsertQuote = z.infer<typeof insertQuoteSchema>;

export type Contract = typeof contracts.$inferSelect;
export type InsertContract = z.infer<typeof insertContractSchema>;

export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;

// Payment related types
export type PaymentSettings = typeof paymentSettings.$inferSelect;
export type InsertPaymentSettings = z.infer<typeof insertPaymentSettingsSchema>;

export type ClientPaymentMethod = typeof clientPaymentMethods.$inferSelect;
export type InsertClientPaymentMethod = z.infer<typeof insertClientPaymentMethodSchema>;

export type Retainer = typeof retainers.$inferSelect;
export type InsertRetainer = z.infer<typeof insertRetainerSchema>;

export type RetainerTransaction = typeof retainerTransactions.$inferSelect;
export type InsertRetainerTransaction = z.infer<typeof insertRetainerTransactionSchema>;

export type OneTimePayment = typeof oneTimePayments.$inferSelect;
export type InsertOneTimePayment = z.infer<typeof insertOneTimePaymentSchema>;

export type Communication = typeof communications.$inferSelect;
export type InsertCommunication = z.infer<typeof insertCommunicationSchema>;

export type CalendarEvent = typeof calendarEvents.$inferSelect;
export type InsertCalendarEvent = z.infer<typeof insertCalendarEventSchema>;

// Lead forms types
export type LeadCollectionForm = typeof leadCollectionForms.$inferSelect;
export type InsertLeadCollectionForm = z.infer<typeof insertLeadCollectionFormSchema>;

export type FormSubmission = typeof formSubmissions.$inferSelect;
export type InsertFormSubmission = z.infer<typeof insertFormSubmissionSchema>;

// Chat types
export type ChatConversation = typeof chatConversations.$inferSelect;
export type InsertChatConversation = z.infer<typeof insertChatConversationSchema>;

export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;

export type ChatSettings = typeof chatSettings.$inferSelect;
export type InsertChatSettings = z.infer<typeof insertChatSettingsSchema>;

export type ChatAuditLog = typeof chatAuditLog.$inferSelect;
export type InsertChatAuditLog = z.infer<typeof insertChatAuditLogSchema>;