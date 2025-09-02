import {
  agencies, users, clients, contacts, clientUsers, projects, leads, passwordResetTokens, products, quotes, tasks,
  timeEntries, oauthTokens, campaigns, campaignMetrics, projectExpenses, projectRevenue, leadGenCampaigns,
  type Agency, type InsertAgency,
  type User, type InsertUser,
  type Client, type InsertClient,
  type Contact, type InsertContact,
  type ClientUser, type InsertClientUser,
  type Product, type InsertProduct,
  type Quote, type InsertQuote,
  type Task, type InsertTask,
  type UpsertUser,
  type Project, type InsertProject,
  type Lead, type InsertLead,
  type TimeEntry, type InsertTimeEntry,
  type OAuthToken, type InsertOAuthToken,
  type Campaign, type InsertCampaign,
  type CampaignMetrics, type InsertCampaignMetrics,
  type ProjectExpense, type InsertProjectExpense,
  type ProjectRevenue, type InsertProjectRevenue,
  type LeadGenCampaign, type InsertLeadGenCampaign,
} from "@shared/schema-sqlite";
import { db } from "./db";
import { eq, and, desc, asc, like, gte, lte, isNull, or, sql, gt } from "drizzle-orm";
import bcrypt from "bcrypt";

export interface IStorage {
  // Auth
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  validatePassword(password: string, hash: string): Promise<boolean>;
  hashPassword(password: string): Promise<string>;

  // Agencies
  getAgency(id: string): Promise<Agency | undefined>;
  getAgencyById(id: string): Promise<Agency | undefined>;
  getAgencyBySlug(slug: string): Promise<Agency | undefined>;
  createAgency(agency: InsertAgency): Promise<Agency>;
  updateAgency(id: string, agency: Partial<InsertAgency>): Promise<Agency>;

  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserById(id: string): Promise<User | undefined>;
  getUsersByAgency(agencyId: string): Promise<User[]>;
  updateUser(id: string, user: Partial<InsertUser>): Promise<User>;
  getUserByResetToken(token: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

  // Clients
  getClient(id: string): Promise<Client | undefined>;
  getClientsByAgency(agencyId: string): Promise<Client[]>;
  createClient(client: InsertClient, userId: string): Promise<Client>;
  updateClient(id: string, client: Partial<InsertClient>): Promise<Client>;
  deleteClient(id: string): Promise<void>;

  // Contacts
  getContact(id: string): Promise<Contact | undefined>;
  getContactsByAgency(agencyId: string): Promise<Contact[]>;
  createContact(contact: InsertContact): Promise<Contact>;

  // Projects
  getProject(id: string): Promise<Project | undefined>;
  getProjectsByAgency(agencyId: string): Promise<Project[]>;
  getProjectsByClient(clientId: string): Promise<Project[]>;
  getProjectsByAssignedUser(userId: string): Promise<Project[]>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: string, project: Partial<InsertProject>): Promise<Project>;
  deleteProject(id: string): Promise<void>;

  // Leads
  getLead(id: string): Promise<Lead | undefined>;
  getLeadsByAgency(agencyId: string, filters?: {
    status?: string;
    source?: string;
  }): Promise<Lead[]>;
  getLeadsByClient(clientId: string): Promise<Lead[]>;
  createLead(lead: InsertLead): Promise<Lead>;
  updateLead(id: string, lead: Partial<InsertLead>): Promise<Lead>;
  deleteLead(id: string): Promise<void>;

  // Dashboard Stats
  getDashboardStats(agencyId: string): Promise<{
    activeProjects: number;
    activeClients: number;
    totalLeads: number;
    totalProducts: number;
  }>;

  // Password Reset Tokens
  createPasswordResetToken(userId: string, token: string): Promise<void>;
  validatePasswordResetToken(token: string): Promise<string | null>;
  markPasswordResetTokenAsUsed(token: string): Promise<void>;
  updateUserPassword(userId: string, hashedPassword: string): Promise<void>;

  // Products
  getProduct(id: string): Promise<Product | undefined>;
  getProductsByAgency(agencyId: string): Promise<Product[]>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: string, product: Partial<InsertProduct>): Promise<Product>;
  deleteProduct(id: string): Promise<void>;

  // Quotes
  getQuote(id: string): Promise<Quote | undefined>;
  getQuotesByAgency(agencyId: string): Promise<Quote[]>;
  getQuotesByClient(clientId: string): Promise<Quote[]>;
  createQuote(quote: InsertQuote): Promise<Quote>;
  updateQuote(id: string, quote: Partial<InsertQuote>): Promise<Quote>;
  deleteQuote(id: string): Promise<void>;

  // Tasks
  getTask(id: string): Promise<Task | undefined>;
  getTasksByAgency(agencyId: string): Promise<Task[]>;
  getTasksByProject(projectId: string): Promise<Task[]>;
  getTasksByLead(leadId: string): Promise<Task[]>;
  getTasksByAssignedUser(userId: string): Promise<Task[]>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: string, task: Partial<InsertTask>): Promise<Task>;
  deleteTask(id: string): Promise<void>;

  // Client Users
  getClientUser(id: string): Promise<ClientUser | undefined>;
  getClientUserByUsername(username: string): Promise<ClientUser | undefined>;
  getClientUserByEmail(email: string): Promise<ClientUser | undefined>;
  getClientUserByClientId(clientId: string): Promise<ClientUser | undefined>;
  createClientUser(clientUser: InsertClientUser): Promise<ClientUser>;
  updateClientUser(id: string, clientUser: Partial<InsertClientUser>): Promise<ClientUser>;
  deleteClientUser(id: string): Promise<void>;
  validateClientPassword(password: string, hash: string): Promise<boolean>;

  // Analytics - Time Entries
  getTimeEntry(id: string): Promise<TimeEntry | undefined>;
  getTimeEntriesByProject(projectId: string): Promise<TimeEntry[]>;
  getTimeEntriesByUser(userId: string): Promise<TimeEntry[]>;
  createTimeEntry(timeEntry: InsertTimeEntry): Promise<TimeEntry>;
  updateTimeEntry(id: string, timeEntry: Partial<InsertTimeEntry>): Promise<TimeEntry>;
  deleteTimeEntry(id: string): Promise<void>;

  // Analytics - OAuth Tokens
  getOAuthToken(id: string): Promise<OAuthToken | undefined>;
  getOAuthTokens(agencyId: string, platform: string): Promise<OAuthToken[]>;
  createOAuthToken(token: InsertOAuthToken): Promise<OAuthToken>;
  updateOAuthToken(id: string, token: Partial<InsertOAuthToken>): Promise<OAuthToken>;
  deleteOAuthToken(id: string): Promise<void>;

  // Analytics - Campaigns
  getCampaign(id: string): Promise<Campaign | undefined>;
  getCampaignsByProject(projectId: string): Promise<Campaign[]>;
  getCampaignsByAgency(agencyId: string): Promise<Campaign[]>;
  createCampaign(campaign: InsertCampaign): Promise<Campaign>;
  updateCampaign(id: string, campaign: Partial<InsertCampaign>): Promise<Campaign>;
  deleteCampaign(id: string): Promise<void>;

  // Analytics - Campaign Metrics
  getCampaignMetrics(campaignId: string, startDate?: string, endDate?: string): Promise<CampaignMetrics[]>;
  createCampaignMetrics(metrics: InsertCampaignMetrics): Promise<CampaignMetrics>;
  updateCampaignMetrics(id: string, metrics: Partial<InsertCampaignMetrics>): Promise<CampaignMetrics>;

  // Analytics - Project Expenses
  getProjectExpense(id: string): Promise<ProjectExpense | undefined>;
  getProjectExpenses(projectId: string): Promise<ProjectExpense[]>;
  createProjectExpense(expense: InsertProjectExpense): Promise<ProjectExpense>;
  updateProjectExpense(id: string, expense: Partial<InsertProjectExpense>): Promise<ProjectExpense>;
  deleteProjectExpense(id: string): Promise<void>;

  // Analytics - Project Revenue
  getProjectRevenue(projectId: string): Promise<ProjectRevenue[]>;
  createProjectRevenue(revenue: InsertProjectRevenue): Promise<ProjectRevenue>;
  updateProjectRevenue(id: string, revenue: Partial<InsertProjectRevenue>): Promise<ProjectRevenue>;
  deleteProjectRevenue(id: string): Promise<void>;

  // Analytics - Lead Gen Campaigns
  getLeadGenCampaign(id: string): Promise<LeadGenCampaign | undefined>;
  getLeadGenCampaignsByProject(projectId: string): Promise<LeadGenCampaign[]>;
  createLeadGenCampaign(campaign: InsertLeadGenCampaign): Promise<LeadGenCampaign>;
  updateLeadGenCampaign(id: string, campaign: Partial<InsertLeadGenCampaign>): Promise<LeadGenCampaign>;
    deleteLeadGenCampaign(id: string): Promise<void>;

  // Activity Log
  getRecentActivityByAgency(agencyId: string, limit?: number): Promise<any[]>;
}

export class DatabaseStorage implements IStorage {
  constructor(private db: any) {} // Assuming db is injected or available

  async getUserByEmail(email: string): Promise<User | undefined> {
    return this.db.query.users.findFirst({
      where: eq(users.email, email),
    });
  }

  async getUserById(id: string): Promise<User | undefined> {
    const [user] = await this.db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const userData = { ...insertUser };
    // Password should already be hashed when passed in
    const [user] = await this.db
      .insert(users)
      .values(userData)
      .returning();
    return user;
  }

  async validatePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  async hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return await bcrypt.hash(password, saltRounds);
  }

  async getAgency(id: string): Promise<Agency | undefined> {
    const [agency] = await this.db.select().from(agencies).where(eq(agencies.id, id));
    return agency || undefined;
  }

  async getAgencyById(id: string): Promise<Agency | undefined> {
    const [agency] = await this.db.select().from(agencies).where(eq(agencies.id, id));
    return agency || undefined;
  }

  async getAgencyBySlug(slug: string): Promise<Agency | undefined> {
    const [agency] = await this.db.select().from(agencies).where(eq(agencies.slug, slug));
    return agency || undefined;
  }

  async createAgency(insertAgency: InsertAgency): Promise<Agency> {
    const [agency] = await this.db
      .insert(agencies)
      .values(insertAgency as any)
      .returning();
    return agency;
  }

  async updateAgency(id: string, updateAgency: Partial<InsertAgency>): Promise<Agency> {
    const updateData: any = { ...updateAgency, updatedAt: Date.now() };

    // Handle settings properly
    if (updateAgency.settings) {
      updateData.settings = updateAgency.settings;
    }

    const [agency] = await this.db
      .update(agencies)
      .set(updateData)
      .where(eq(agencies.id, id))
      .returning();
    return agency;
  }

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await this.db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUsersByAgency(agencyId: string): Promise<User[]> {
    return this.db.select().from(users).where(eq(users.agencyId, agencyId)).orderBy(asc(users.fullName));
  }

  async updateUser(id: string, updateUser: Partial<InsertUser>): Promise<User> {
    const [user] = await this.db
      .update(users)
      .set({ ...updateUser, updatedAt: Date.now() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  // (IMPORTANT) these user operations are mandatory for Replit Auth.
  async upsertUser(userData: UpsertUser): Promise<User> {
    // First try to find existing user by email or id
    let existingUser = null;
    if (userData.email) {
      [existingUser] = await this.db.select().from(users).where(eq(users.email, userData.email));
    }
    if (!existingUser && userData.id) {
      [existingUser] = await this.db.select().from(users).where(eq(users.id, userData.id));
    }

    if (existingUser) {
      // Update existing user
      const [user] = await this.db
        .update(users)
        .set({
          ...userData,
          updatedAt: Date.now(),
        })
        .where(eq(users.id, existingUser.id))
        .returning();
      return user;
    } else {
      // Create new user
      const [user] = await this.db
        .insert(users)
        .values(userData)
        .returning();
      return user;
    }
  }

  async getUserByResetToken(token: string): Promise<User | undefined> {
    const [user] = await this.db.select()
      .from(users)
      .where(eq(users.resetToken, token));

    return user || undefined;
  }

  async getClient(id: string): Promise<Client | undefined> {
    const [client] = await this.db.select().from(clients).where(eq(clients.id, id));
    return client || undefined;
  }

  async getClientsByAgency(agencyId: string): Promise<Client[]> {
    return this.db.select().from(clients).where(eq(clients.agencyId, agencyId)).orderBy(asc(clients.name));
  }

  async createClient(insertClient: InsertClient, userId: string): Promise<Client> {
    const [client] = await this.db
      .insert(clients)
      .values(insertClient)
      .returning();

    // Log activity - functionality removed

    return client;
  }

  async updateClient(id: string, updateClient: Partial<InsertClient>): Promise<Client> {
    const [client] = await this.db
      .update(clients)
      .set({ ...updateClient, updatedAt: Date.now() })
      .where(eq(clients.id, id))
      .returning();
    return client;
  }

  async deleteClient(id: string): Promise<void> {
    await this.db.delete(clients).where(eq(clients.id, id));
  }

  // Contacts
  async getContact(id: string): Promise<Contact | undefined> {
    const [contact] = await this.db.select().from(contacts).where(eq(contacts.id, id));
    return contact || undefined;
  }

  async getContactsByAgency(agencyId: string): Promise<Contact[]> {
    return this.db.select().from(contacts).where(eq(contacts.agencyId, agencyId)).orderBy(desc(contacts.createdAt));
  }

  async createContact(insertContact: InsertContact): Promise<Contact> {
    const [contact] = await this.db
      .insert(contacts)
      .values(insertContact)
      .returning();
    return contact;
  }

  async getProject(id: string): Promise<Project | undefined> {
    const [project] = await this.db.select().from(projects).where(eq(projects.id, id));
    return project || undefined;
  }

  async getProjectsByAgency(agencyId: string): Promise<Project[]> {
    return this.db.select().from(projects).where(eq(projects.agencyId, agencyId)).orderBy(desc(projects.createdAt));
  }

  async getProjectsByClient(clientId: string): Promise<Project[]>{
    return this.db.select().from(projects).where(eq(projects.clientId, clientId)).orderBy(desc(projects.createdAt));
  }

  // Get projects by assigned user
  async getProjectsByAssignedUser(userId: string): Promise<Project[]> {
    const result = await this.db
      .select()
      .from(projects)
      .where(eq(projects.assignedTo, userId))
      .orderBy(desc(projects.createdAt));

    return result;
  }

  async createProject(insertProject: InsertProject): Promise<Project> {
    const [project] = await this.db
      .insert(projects)
      .values(insertProject as any)
      .returning();
    return project;
  }

  async updateProject(id: string, updateProject: Partial<InsertProject>): Promise<Project> {
    const [project] = await this.db
      .update(projects)
      .set({ ...updateProject, updatedAt: Date.now() })
      .where(eq(projects.id, id))
      .returning();
    return project;
  }

  async deleteProject(id: string): Promise<void> {
    await this.db.delete(projects).where(eq(projects.id, id));
  }

  async getDashboardStats(agencyId: string): Promise<{
    activeProjects: number;
    activeClients: number;
    totalLeads: number;
    totalProducts: number;
  }> {
    const [activeProjectsResult] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(projects)
      .where(and(eq(projects.agencyId, agencyId), eq(projects.status, 'active')));

    const [activeClientsResult] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(clients)
      .where(and(eq(clients.agencyId, agencyId), eq(clients.status, 'active')));

    const [totalLeadsResult] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(leads)
      .where(eq(leads.agencyId, agencyId));

    const [totalProductsResult] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(products)
      .where(eq(products.agencyId, agencyId));

    return {
      activeProjects: activeProjectsResult?.count || 0,
      activeClients: activeClientsResult?.count || 0,
      totalLeads: totalLeadsResult?.count || 0,
      totalProducts: totalProductsResult?.count || 0,
    };
  }

  // Password reset tokens
  async createPasswordResetToken(userId: string, token: string): Promise<void> {
    // Delete any existing tokens for this user
    await this.db.delete(passwordResetTokens)
      .where(eq(passwordResetTokens.userId, userId));

    // Create new token (expires in 24 hours)
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000;

    await this.db.insert(passwordResetTokens)
      .values({
        userId,
        token,
        expiresAt,
        used: false
      });
  }

  async validatePasswordResetToken(token: string): Promise<string | null> {
    const [tokenRecord] = await this.db.select()
      .from(passwordResetTokens)
      .where(and(
        eq(passwordResetTokens.token, token),
        eq(passwordResetTokens.used, false),
        gt(passwordResetTokens.expiresAt, Date.now())
      ));

    return tokenRecord ? tokenRecord.userId : null;
  }

  async markPasswordResetTokenAsUsed(token: string): Promise<void> {
    await this.db.update(passwordResetTokens)
      .set({ used: true })
      .where(eq(passwordResetTokens.token, token));
  }

  async updateUserPassword(userId: string, hashedPassword: string): Promise<void> {
    await this.db.update(users)
      .set({ password: hashedPassword })
      .where(eq(users.id, userId));
  }

  // Leads methods
  async getLead(id: string): Promise<Lead | undefined> {
    const [lead] = await this.db.select().from(leads).where(eq(leads.id, id));
    return lead || undefined;
  }

  async getLeadsByAgency(agencyId: string, filters?: {
    status?: string;
    source?: string;
  }): Promise<Lead[]> {
    const conditions = [eq(leads.agencyId, agencyId)];

    if (filters?.status) {
      conditions.push(eq(leads.status, filters.status));
    }
    if (filters?.source) {
      conditions.push(eq(leads.source, filters.source));
    }

    return this.db.select().from(leads).where(and(...conditions)).orderBy(desc(leads.createdAt));
  }

  async getLeadsByClient(clientId: string): Promise<Lead[]> {
    return this.db.select().from(leads).where(eq(leads.agencyId, clientId)).orderBy(desc(leads.createdAt));
  }

  async createLead(insertLead: InsertLead): Promise<Lead> {
    const [lead] = await this.db
      .insert(leads)
      .values(insertLead as any)
      .returning();
    return lead;
  }

  async updateLead(id: string, updateLead: Partial<InsertLead>): Promise<Lead> {
    const [lead] = await this.db
      .update(leads)
      .set({ ...updateLead, updatedAt: Date.now() })
      .where(eq(leads.id, id))
      .returning();
    return lead;
  }

  async deleteLead(id: string): Promise<void> {
    await this.db.delete(leads).where(eq(leads.id, id));
  }

  // Products
  async getProduct(id: string): Promise<Product | undefined> {
    const [product] = await this.db.select().from(products).where(eq(products.id, id));
    return product || undefined;
  }

  async getProductsByAgency(agencyId: string): Promise<Product[]> {
    return await this.db.select().from(products)
      .where(and(eq(products.agencyId, agencyId), eq(products.isActive, true)))
      .orderBy(asc(products.name));
  }

  async createProduct(insertProduct: InsertProduct): Promise<Product> {
    const [product] = await this.db
      .insert(products)
      .values(insertProduct as any)
      .returning();
    return product;
  }

  async updateProduct(id: string, updateProduct: Partial<InsertProduct>): Promise<Product> {
    const [product] = await this.db
      .update(products)
      .set({ ...updateProduct, updatedAt: Date.now() } as any)
      .where(eq(products.id, id))
      .returning();
    return product;
  }

  async deleteProduct(id: string): Promise<void> {
    await this.db.delete(products).where(eq(products.id, id));
  }

  // Quotes
  async getQuote(id: string): Promise<Quote | undefined> {
    const [quote] = await this.db.select().from(quotes).where(eq(quotes.id, id));
    return quote || undefined;
  }

  async getQuotesByAgency(agencyId: string): Promise<Quote[]> {
    try {
      const result = await this.db.select()
        .from(quotes)
        .where(eq(quotes.agencyId, agencyId))
        .orderBy(desc(quotes.createdAt));

      return result;
    } catch (error) {
      console.error('Error in getQuotesByAgency:', error);
      throw error;
    }
  }

  async getQuotesByClient(clientId: string): Promise<Quote[]> {
    return await this.db.select().from(quotes)
      .where(eq(quotes.clientId, clientId))
      .orderBy(desc(quotes.createdAt));
  }

  async createQuote(insertQuote: InsertQuote): Promise<Quote> {
    const [quote] = await this.db
      .insert(quotes)
      .values(insertQuote as any)
      .returning();
    return quote;
  }

  async updateQuote(id: string, updateQuote: Partial<InsertQuote>): Promise<Quote> {
    const [quote] = await this.db
      .update(quotes)
      .set({ ...updateQuote, updatedAt: Date.now() } as any)
      .where(eq(quotes.id, id))
      .returning();
    return quote;
  }

  async deleteQuote(id: string): Promise<void> {
    await this.db.delete(quotes).where(eq(quotes.id, id));
  }

  // Tasks methods
  async getTask(id: string): Promise<Task | undefined> {
    const [task] = await this.db.select().from(tasks).where(eq(tasks.id, id));
    return task || undefined;
  }

  async getTasksByAgency(agencyId: string): Promise<Task[]> {
    return await this.db.select().from(tasks)
      .where(eq(tasks.agencyId, agencyId))
      .orderBy(desc(tasks.createdAt));
  }

  async getTasksByProject(projectId: string): Promise<Task[]> {
    return await this.db.select().from(tasks)
      .where(eq(tasks.projectId, projectId))
      .orderBy(desc(tasks.createdAt));
  }

  async getTasksByLead(leadId: string): Promise<Task[]> {
    return await this.db.select().from(tasks)
      .where(eq(tasks.leadId, leadId))
      .orderBy(desc(tasks.createdAt));
  }

  async getTasksByAssignedUser(userId: string): Promise<Task[]> {
    return await this.db.select().from(tasks)
      .where(eq(tasks.assignedTo, userId))
      .orderBy(desc(tasks.createdAt));
  }

  async createTask(insertTask: InsertTask): Promise<Task> {
    const [task] = await this.db
      .insert(tasks)
      .values(insertTask as any)
      .returning();
    return task;
  }

  async updateTask(id: string, updateTask: Partial<InsertTask>): Promise<Task> {
    const [task] = await this.db
      .update(tasks)
      .set({ ...updateTask, updatedAt: Date.now() })
      .where(eq(tasks.id, id))
      .returning();
    return task;
  }

  async deleteTask(id: string): Promise<void> {
    await this.db.delete(tasks).where(eq(tasks.id, id));
  }

  // Client Users methods
  async getClientUser(id: string): Promise<ClientUser | undefined> {
    const [clientUser] = await this.db.select().from(clientUsers).where(eq(clientUsers.id, id));
    return clientUser || undefined;
  }

  async getClientUserByUsername(username: string): Promise<ClientUser | undefined> {
    const [clientUser] = await this.db.select().from(clientUsers).where(eq(clientUsers.username, username));
    return clientUser || undefined;
  }

  async getClientUserByEmail(email: string): Promise<ClientUser | undefined> {
    const [clientUser] = await this.db.select().from(clientUsers).where(eq(clientUsers.email, email));
    return clientUser || undefined;
  }

  async getClientUserByClientId(clientId: string): Promise<ClientUser | undefined> {
    const [clientUser] = await this.db.select().from(clientUsers).where(eq(clientUsers.clientId, clientId));
    return clientUser || undefined;
  }

  async createClientUser(insertClientUser: InsertClientUser): Promise<ClientUser> {
    const [clientUser] = await this.db
      .insert(clientUsers)
      .values(insertClientUser as any)
      .returning();
    return clientUser;
  }

  async updateClientUser(id: string, updateClientUser: Partial<InsertClientUser>): Promise<ClientUser> {
    const [clientUser] = await this.db
      .update(clientUsers)
      .set({ ...updateClientUser, updatedAt: Date.now() })
      .where(eq(clientUsers.id, id))
      .returning();
    return clientUser;
  }

  async deleteClientUser(id: string): Promise<void> {
    await this.db.delete(clientUsers).where(eq(clientUsers.id, id));
  }

  async validateClientPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  // Analytics - Time Entries
  async getTimeEntry(id: string): Promise<TimeEntry | undefined> {
    const timeEntry = await this.db.query.timeEntries.findFirst({
      where: eq(timeEntries.id, id),
    });
    return timeEntry || undefined;
  }

  async getTimeEntriesByProject(projectId: string): Promise<TimeEntry[]> {
    const entries = await this.db.query.timeEntries.findMany({
      where: eq(timeEntries.projectId, projectId),
      orderBy: [desc(timeEntries.createdAt)],
    });
    return entries || [];
  }

  async getTimeEntriesByUser(userId: string): Promise<TimeEntry[]> {
    const entries = await this.db.query.timeEntries.findMany({
      where: eq(timeEntries.userId, userId),
      orderBy: [desc(timeEntries.createdAt)],
    });
    return entries || [];
  }

  async createTimeEntry(insertTimeEntry: InsertTimeEntry): Promise<TimeEntry> {
    const [timeEntry] = await this.db
      .insert(timeEntries)
      .values(insertTimeEntry as any)
      .returning();
    return timeEntry;
  }

  async updateTimeEntry(id: string, updateTimeEntry: Partial<InsertTimeEntry>): Promise<TimeEntry> {
    const [timeEntry] = await this.db
      .update(timeEntries)
      .set({ ...updateTimeEntry, updatedAt: Date.now() })
      .where(eq(timeEntries.id, id))
      .returning();
    return timeEntry;
  }

  async deleteTimeEntry(id: string): Promise<void> {
    await this.db.delete(timeEntries).where(eq(timeEntries.id, id));
  }

  // Analytics - OAuth Tokens
  async getOAuthToken(id: string): Promise<OAuthToken | undefined> {
    const token = await this.db.query.oauthTokens.findFirst({
      where: eq(oauthTokens.id, id),
    });
    return token || undefined;
  }

  async getOAuthTokens(agencyId: string, platform: string): Promise<OAuthToken[]> {
    const tokens = await this.db.query.oauthTokens.findMany({
      where: and(eq(oauthTokens.agencyId, agencyId), eq(oauthTokens.platform, platform)),
      orderBy: [desc(oauthTokens.createdAt)],
    });
    return tokens || [];
  }

  async createOAuthToken(insertToken: InsertOAuthToken): Promise<OAuthToken> {
    const [token] = await this.db
      .insert(oauthTokens)
      .values(insertToken as any)
      .returning();
    return token;
  }

  async updateOAuthToken(id: string, updateToken: Partial<InsertOAuthToken>): Promise<OAuthToken> {
    const [token] = await this.db
      .update(oauthTokens)
      .set({ ...updateToken, updatedAt: Date.now() })
      .where(eq(oauthTokens.id, id))
      .returning();
    return token;
  }

  async deleteOAuthToken(id: string): Promise<void> {
    await this.db.delete(oauthTokens).where(eq(oauthTokens.id, id));
  }

  // Analytics - Campaigns
  async getCampaign(id: string): Promise<Campaign | undefined> {
    const campaign = await this.db.query.campaigns.findFirst({
      where: eq(campaigns.id, id),
    });
    return campaign || undefined;
  }

  async getCampaignsByProject(projectId: string): Promise<Campaign[]> {
    const campaignList = await this.db.query.campaigns.findMany({
      where: eq(campaigns.projectId, projectId),
      orderBy: [desc(campaigns.createdAt)],
    });
    return campaignList || [];
  }

  async getCampaignsByAgency(agencyId: string): Promise<Campaign[]> {
    const campaignList = await this.db.query.campaigns.findMany({
      where: eq(campaigns.agencyId, agencyId),
      orderBy: [desc(campaigns.createdAt)],
    });
    return campaignList || [];
  }

  async createCampaign(insertCampaign: InsertCampaign): Promise<Campaign> {
    const [campaign] = await this.db
      .insert(campaigns)
      .values(insertCampaign as any)
      .returning();
    return campaign;
  }

  async updateCampaign(id: string, updateCampaign: Partial<InsertCampaign>): Promise<Campaign> {
    const [campaign] = await this.db
      .update(campaigns)
      .set({ ...updateCampaign, updatedAt: Date.now() })
      .where(eq(campaigns.id, id))
      .returning();
    return campaign;
  }

  async deleteCampaign(id: string): Promise<void> {
    await this.db.delete(campaigns).where(eq(campaigns.id, id));
  }

  // Analytics - Campaign Metrics
  async getCampaignMetrics(campaignId: string, startDate?: string, endDate?: string): Promise<CampaignMetrics[]> {
    let whereClause = eq(campaignMetrics.campaignId, campaignId);
    
    if (startDate) {
      whereClause = and(whereClause, gte(campaignMetrics.date, startDate));
    }
    if (endDate) {
      whereClause = and(whereClause, lte(campaignMetrics.date, endDate));
    }

    const metrics = await this.db.query.campaignMetrics.findMany({
      where: whereClause,
      orderBy: [asc(campaignMetrics.date)],
    });
    return metrics || [];
  }

  async createCampaignMetrics(insertMetrics: InsertCampaignMetrics): Promise<CampaignMetrics> {
    const [metrics] = await this.db
      .insert(campaignMetrics)
      .values(insertMetrics as any)
      .returning();
    return metrics;
  }

  async updateCampaignMetrics(id: string, updateMetrics: Partial<InsertCampaignMetrics>): Promise<CampaignMetrics> {
    const [metrics] = await this.db
      .update(campaignMetrics)
      .set({ ...updateMetrics, updatedAt: Date.now() })
      .where(eq(campaignMetrics.id, id))
      .returning();
    return metrics;
  }

  // Analytics - Project Expenses
  async getProjectExpense(id: string): Promise<ProjectExpense | undefined> {
    const expense = await this.db.query.projectExpenses.findFirst({
      where: eq(projectExpenses.id, id),
    });
    return expense || undefined;
  }

  async getProjectExpenses(projectId: string): Promise<ProjectExpense[]> {
    const expenses = await this.db.query.projectExpenses.findMany({
      where: eq(projectExpenses.projectId, projectId),
      orderBy: [desc(projectExpenses.createdAt)],
    });
    return expenses || [];
  }

  async createProjectExpense(insertExpense: InsertProjectExpense): Promise<ProjectExpense> {
    const [expense] = await this.db
      .insert(projectExpenses)
      .values(insertExpense as any)
      .returning();
    return expense;
  }

  async updateProjectExpense(id: string, updateExpense: Partial<InsertProjectExpense>): Promise<ProjectExpense> {
    const [expense] = await this.db
      .update(projectExpenses)
      .set({ ...updateExpense, updatedAt: Date.now() })
      .where(eq(projectExpenses.id, id))
      .returning();
    return expense;
  }

  async deleteProjectExpense(id: string): Promise<void> {
    await this.db.delete(projectExpenses).where(eq(projectExpenses.id, id));
  }

  // Analytics - Project Revenue
  async getProjectRevenue(projectId: string): Promise<ProjectRevenue[]> {
    const revenue = await this.db.query.projectRevenue.findMany({
      where: eq(projectRevenue.projectId, projectId),
      orderBy: [desc(projectRevenue.createdAt)],
    });
    return revenue || [];
  }

  async createProjectRevenue(insertRevenue: InsertProjectRevenue): Promise<ProjectRevenue> {
    const [revenue] = await this.db
      .insert(projectRevenue)
      .values(insertRevenue as any)
      .returning();
    return revenue;
  }

  async updateProjectRevenue(id: string, updateRevenue: Partial<InsertProjectRevenue>): Promise<ProjectRevenue> {
    const [revenue] = await this.db
      .update(projectRevenue)
      .set({ ...updateRevenue, updatedAt: Date.now() })
      .where(eq(projectRevenue.id, id))
      .returning();
    return revenue;
  }

  async deleteProjectRevenue(id: string): Promise<void> {
    await this.db.delete(projectRevenue).where(eq(projectRevenue.id, id));
  }

  // Analytics - Lead Gen Campaigns
  async getLeadGenCampaign(id: string): Promise<LeadGenCampaign | undefined> {
    const campaign = await this.db.query.leadGenCampaigns.findFirst({
      where: eq(leadGenCampaigns.id, id),
    });
    return campaign || undefined;
  }

  async getLeadGenCampaignsByProject(projectId: string): Promise<LeadGenCampaign[]> {
    const campaigns = await this.db.query.leadGenCampaigns.findMany({
      where: eq(leadGenCampaigns.projectId, projectId),
      orderBy: [desc(leadGenCampaigns.createdAt)],
    });
    return campaigns || [];
  }

  async createLeadGenCampaign(insertCampaign: InsertLeadGenCampaign): Promise<LeadGenCampaign> {
    const [campaign] = await this.db
      .insert(leadGenCampaigns)
      .values(insertCampaign as any)
      .returning();
    return campaign;
  }

  async updateLeadGenCampaign(id: string, updateCampaign: Partial<InsertLeadGenCampaign>): Promise<LeadGenCampaign> {
    const [campaign] = await this.db
      .update(leadGenCampaigns)
      .set({ ...updateCampaign, updatedAt: Date.now() })
      .where(eq(leadGenCampaigns.id, id))
      .returning();
    return campaign;
  }

  async deleteLeadGenCampaign(id: string): Promise<void> {
    await this.db.delete(leadGenCampaigns).where(eq(leadGenCampaigns.id, id));
  }

  // Activity Log

  async getRecentActivityByAgency(agencyId: string, limit = 20): Promise<any[]> {
    // Activity log functionality is not implemented yet
    return [];
  }
}

export const storage = new DatabaseStorage(db);