import {
  agencies, users, clients, projects, leads, passwordResetTokens, products, quotes,
  type Agency, type InsertAgency,
  type User, type InsertUser,
  type Client, type InsertClient,
  type Product, type InsertProduct,
  type Quote, type InsertQuote,
  type UpsertUser,
  type Project, type InsertProject,
  type Lead, type InsertLead,
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
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: string, client: Partial<InsertClient>): Promise<Client>;
  deleteClient(id: string): Promise<void>;

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
    const updateData: any = { ...updateAgency, updatedAt: new Date() };

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
      .set({ ...updateUser, updatedAt: new Date() })
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
          updatedAt: new Date(),
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

  async createClient(insertClient: InsertClient): Promise<Client> {
    const [client] = await this.db
      .insert(clients)
      .values(insertClient)
      .returning();
    return client;
  }

  async updateClient(id: string, updateClient: Partial<InsertClient>): Promise<Client> {
    const [client] = await this.db
      .update(clients)
      .set({ ...updateClient, updatedAt: new Date() })
      .where(eq(clients.id, id))
      .returning();
    return client;
  }

  async deleteClient(id: string): Promise<void> {
    await this.db.delete(clients).where(eq(clients.id, id));
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
      .set({ ...updateProject, updatedAt: new Date() })
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
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

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
        gt(passwordResetTokens.expiresAt, new Date())
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
      .set({ ...updateLead, updatedAt: new Date() })
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
      .set({ ...updateProduct, updatedAt: new Date() } as any)
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
      .set({ ...updateQuote, updatedAt: new Date() } as any)
      .where(eq(quotes.id, id))
      .returning();
    return quote;
  }

  async deleteQuote(id: string): Promise<void> {
    await this.db.delete(quotes).where(eq(quotes.id, id));
  }
}

export const storage = new DatabaseStorage(db);