import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupWebSocketServer } from "./websocket";
import express from "express";
import { emailService } from "./email-service.js";
import crypto from 'crypto';
// import { setupAuth } from "./replitAuth"; // Removed REPLIT auth
import bcrypt from 'bcrypt';
import { verifyGoogleToken } from "./google-auth";
import { oauthService } from "./oauth-service";
import './types';

// Placeholder for generateId function
function generateId(): string {
  return crypto.randomBytes(16).toString('hex');
}

// Helper function to generate a random password
function generatePassword(length = 8): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

// Helper function to generate username from client name
function generateUsername(clientName: string): string {
  return clientName
    .replace(/[^a-zA-Z0-9\u0590-\u05FF]/g, '') // Remove special chars, keep Hebrew
    .substring(0, 10) + Math.floor(Math.random() * 999);
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware - REPLIT auth removed, using session-based auth
  console.log('Using session-based authentication (REPLIT auth removed)');

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Test login endpoint for debugging
  app.post('/api/auth/test-login', async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: 'Email required for test login' });
      }

      // Find existing user
      let user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ message: 'User not found in database' });
      }

      // Set session
      req.session.userId = user.id;

      res.json({ 
        success: true, 
        message: 'Test login successful',
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          agencyId: user.agencyId,
          avatar: user.avatar
        }
      });
    } catch (error) {
      console.error('Test login error:', error);
      res.status(500).json({ message: 'Test login failed: ' + error.message });
    }
  });

  // Simple authentication routes for development
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password, rememberMe } = req.body;
      
      console.log('🔐 Login attempt for email:', email);
      
      if (!email || !password) {
        return res.status(400).json({ message: 'אימייל וסיסמה נדרשים' });
      }

      const user = await storage.getUserByEmail(email);
      console.log('👤 User lookup result:', user ? 'Found' : 'Not found');
      
      if (!user) {
        console.log('❌ User not found for email:', email);
        return res.status(401).json({ message: 'אימייל לא נמצא' });
      }

      if (!user.password) {
        console.log('❌ User has no password set:', email);
        return res.status(401).json({ message: 'חשבון זה לא מוגדר עם סיסמה' });
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      console.log('🔑 Password validation result:', isValidPassword);
      
      if (!isValidPassword) {
        console.log('❌ Invalid password for user:', email);
        return res.status(401).json({ message: 'אימייל או סיסמה שגויים' });
      }

      // Set session (only store userId)
      req.session.userId = user.id;
      console.log('✅ Session set for user:', user.id);

      // Respect remember-me option by extending cookie lifetime (30 days)
      if (rememberMe) {
        const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
        req.session.cookie.maxAge = thirtyDaysMs;
        console.log('⏰ Remember me enabled, cookie extended to 30 days');
      }

      res.json({ 
        success: true, 
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          agencyId: user.agencyId,
          avatar: user.avatar
        }
      });
    } catch (error) {
      console.error('💥 Login error:', error);
      res.status(500).json({ message: 'שגיאה בהתחברות' });
    }
  });

  // Google OAuth (client-side gets ID token via Firebase/Google and posts here)
  app.post('/api/auth/google', async (req, res) => {
    try {
      const { idToken } = req.body as { idToken?: string };

      if (!idToken) {
        return res.status(400).json({ message: 'חסר טוקן התחברות של גוגל' });
      }

      const googleUser = await verifyGoogleToken(idToken);

      // Ensure verified email
      if (!googleUser.email_verified) {
        return res.status(401).json({ message: 'האימייל של גוגל לא מאומת' });
      }

      // Find or create user by email
      let user = await storage.getUserByEmail(googleUser.email);
      if (!user) {
        // Create default agency for new Google user
        const defaultAgencyName = googleUser.name || googleUser.email.split('@')[0];
        const agency = await storage.createAgency({
          name: defaultAgencyName,
          slug: defaultAgencyName.toLowerCase().replace(/\s+/g, '-'),
          industry: 'other',
        });

        user = await storage.createUser({
          email: googleUser.email,
          fullName: googleUser.name || googleUser.email,
          role: 'agency_admin',
          agencyId: agency.id,
          avatar: googleUser.picture,
        } as any);
      }

      // Set session (only userId)
      req.session.userId = user.id;

      res.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          agencyId: user.agencyId,
          avatar: user.avatar,
        },
      });
    } catch (error) {
      console.error('Google login error:', error);
      res.status(401).json({ message: 'שגיאה בהתחברות עם Google' });
    }
  });

  app.post('/api/auth/signup', async (req, res) => {
    try {
      const { email, password, fullName, agencyName, industry } = req.body;
      
      if (!email || !password || !fullName || !agencyName) {
        return res.status(400).json({ message: 'כל השדות נדרשים' });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: 'משתמש עם אימייל זה כבר קיים' });
      }

      // Create agency first
      const agency = await storage.createAgency({
        name: agencyName,
        slug: agencyName.toLowerCase().replace(/\s+/g, '-'),
        industry: industry || 'other'
      });

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      const user = await storage.createUser({
        email,
        password: hashedPassword,
        fullName,
        role: 'agency_admin',
        agencyId: agency.id
      });

      // Set session (only store userId)
      req.session.userId = user.id;

      res.json({ 
        success: true, 
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          agencyId: user.agencyId,
          avatar: user.avatar
        }
      });
    } catch (error) {
      console.error('Signup error:', error);
      res.status(500).json({ message: 'שגיאה ביצירת החשבון' });
    }
  });

  app.post('/api/auth/forgot-password', async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: 'אימייל נדרש' });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ message: 'משתמש לא רשום' });
      }

      // Generate reset token and store via password_reset_tokens table
      const resetToken = crypto.randomBytes(32).toString('hex');
      await storage.createPasswordResetToken(user.id, resetToken);

      // Send email using helper (will fail gracefully if not configured)
      const emailSent = await emailService.sendPasswordReset(email, resetToken);

      // Always log the link in server logs for development
      const resetLink = `${req.protocol}://${req.get('host')}/reset-password?token=${resetToken}`;
      console.log(`Password reset link for ${email}: ${resetLink}`);

      if (emailSent) {
        res.json({ message: 'אם האימייל קיים במערכת, תקבל הוראות לאיפוס סיסמה' });
      } else {
        // Still return generic success to avoid leaking user existence
        res.json({ message: 'אם האימייל קיים במערכת, תקבל הוראות לאיפוס סיסמה' });
      }
    } catch (error) {
      console.error('Forgot password error:', error);
      res.status(500).json({ message: 'שגיאה בעיבוד הבקשה' });
    }
  });

  app.post('/api/auth/reset-password', async (req, res) => {
    try {
      const { token, password } = req.body;
      
      if (!token || !password) {
        return res.status(400).json({ message: 'טוקן וסיסמה נדרשים' });
      }

      // Validate token from table
      const userId = await storage.validatePasswordResetToken(token);
      if (!userId) {
        return res.status(400).json({ message: 'טוקן לא תקין או פג תוקף' });
      }

      // Check if token is expired
      // Hash new password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Update user password and mark token used
      await storage.updateUserPassword(userId, hashedPassword);
      await storage.markPasswordResetTokenAsUsed(token);

      res.json({ message: 'הסיסמה שונתה בהצלחה' });
    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({ message: 'שגיאה באיפוס הסיסמה' });
    }
  });

  app.post('/api/auth/logout', (req, res) => {
    if (req.session) {
      req.session.destroy((err: any) => {
        if (err) {
          return res.status(500).json({ message: 'שגיאה בהתנתקות' });
        }
        res.clearCookie('connect.sid');
        return res.json({ message: 'התנתקת בהצלחה' });
      });
    } else {
      res.json({ message: 'התנתקת בהצלחה' });
    }
  });

  // User routes with session-based authentication
  app.get('/api/auth/user', async (req: any, res) => {
    try {
      if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: 'לא מחובר' });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(401).json({ message: 'משתמש לא נמצא' });
      }

      res.json({
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          agencyId: user.agencyId,
          avatar: user.avatar
        }
      });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Alias used by the client: /api/auth/me
  app.get('/api/auth/me', async (req: any, res) => {
    try {
      if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: 'לא מחובר' });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(401).json({ message: 'משתמש לא נמצא' });
      }

      res.json({
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          agencyId: user.agencyId,
          avatar: user.avatar
        }
      });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Dashboard API endpoints
    app.get('/api/dashboard/activity', async (req: any, res) => {
    try {
      if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: 'לא מחובר' });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user || !user.agencyId) {
        return res.status(401).json({ message: 'משתמש לא נמצא' });
      }

      const activities = await storage.getRecentActivityByAgency(user.agencyId);
      res.json(activities);
    } catch (error) {
      console.error("Error fetching activity:", error);
      res.status(500).json({ message: "Failed to fetch activity" });
    }
  });

  app.get('/api/dashboard/stats', async (req: any, res) => {
    try {
      if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: 'לא מחובר' });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user || !user.agencyId) {
        return res.status(401).json({ message: 'משתמש לא נמצא' });
      }

      // Return basic stats (you can expand this based on your needs)
      const stats = {
        totalClients: 0,
        totalProjects: 0,
        totalTasks: 0,
        totalLeads: 0
      };

      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // Basic CRUD endpoints
  app.get('/api/projects', async (req: any, res) => {
    try {
      if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: 'לא מחובר' });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user || !user.agencyId) {
        return res.status(401).json({ message: 'משתמש לא נמצא' });
      }

      const projects = await storage.getProjectsByAgency(user.agencyId);
      res.json(projects);
    } catch (error) {
      console.error("Error fetching projects:", error);
      res.status(500).json([]);
    }
  });

  app.get('/api/clients', async (req: any, res) => {
    try {
      if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: 'לא מחובר' });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user || !user.agencyId) {
        return res.status(401).json({ message: 'משתמש לא נמצא' });
      }

      const clients = await storage.getClientsByAgency(user.agencyId);
      res.json(clients);
    } catch (error) {
      console.error("Error fetching clients:", error);
      res.status(500).json([]);
    }
  });

  app.post('/api/clients', async (req: any, res) => {
    try {
      if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: 'לא מחובר' });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user || !user.agencyId) {
        return res.status(401).json({ message: 'משתמש לא נמצא' });
      }

      const clientData = {
        ...req.body,
        agencyId: user.agencyId
      };

      const client = await storage.createClient(clientData, user.id);
      res.json(client);
    } catch (error) {
      console.error("Error creating client:", error);
      res.status(500).json({ message: "Failed to create client" });
    }
  });

  // Get single client by ID
  app.get('/api/clients/:id', async (req: any, res) => {
    try {
      if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: 'לא מחובר' });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user || !user.agencyId) {
        return res.status(401).json({ message: 'משתמש לא נמצא' });
      }

      const client = await storage.getClient(req.params.id);
      if (!client || client.agencyId !== user.agencyId) {
        return res.status(404).json({ message: 'לקוח לא נמצא' });
      }

      res.json(client);
    } catch (error) {
      console.error("Error fetching client:", error);
      res.status(500).json({ message: "Failed to fetch client" });
    }
  });

  // Update client by ID
  app.put('/api/clients/:id', async (req: any, res) => {
    try {
      if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: 'לא מחובר' });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user || !user.agencyId) {
        return res.status(401).json({ message: 'משתמש לא נמצא' });
      }

      const client = await storage.getClient(req.params.id);
      if (!client || client.agencyId !== user.agencyId) {
        return res.status(404).json({ message: 'לקוח לא נמצא' });
      }

      const updatedClient = await storage.updateClient(req.params.id, req.body);
      res.json(updatedClient);
    } catch (error) {
      console.error("Error updating client:", error);
      res.status(500).json({ message: "Failed to update client" });
    }
  });

  // Contacts routes
  app.get('/api/contacts', async (req: any, res) => {
    try {
      if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: 'לא מחובר' });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user || !user.agencyId) {
        return res.status(401).json({ message: 'משתמש לא נמצא' });
      }

      const contacts = await storage.getContactsByAgency(user.agencyId);
      res.json(contacts);
    } catch (error) {
      console.error("Error fetching contacts:", error);
      res.status(500).json([]);
    }
  });

  app.post('/api/contacts', async (req: any, res) => {
    try {
      if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: 'לא מחובר' });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user || !user.agencyId) {
        return res.status(401).json({ message: 'משתמש לא נמצא' });
      }

      const contactData = { ...req.body, agencyId: user.agencyId };
      const contact = await storage.createContact(contactData);
      res.json(contact);
    } catch (error) {
      console.error("Error creating contact:", error);
      res.status(500).json({ message: "Failed to create contact" });
    }
  });

  app.get('/api/leads', async (req: any, res) => {
    try {
      if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: 'לא מחובר' });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user || !user.agencyId) {
        return res.status(401).json({ message: 'משתמש לא נמצא' });
      }

      const leads = await storage.getLeadsByAgency(user.agencyId);
      res.json(leads);
    } catch (error) {
      console.error("Error fetching leads:", error);
      res.status(500).json([]);
    }
  });

  // Get single lead by ID
  app.get('/api/leads/:id', async (req: any, res) => {
    try {
      if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: 'לא מחובר' });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user || !user.agencyId) {
        return res.status(401).json({ message: 'משתמש לא נמצא' });
      }

      const lead = await storage.getLead(req.params.id);
      if (!lead || lead.agencyId !== user.agencyId) {
        return res.status(404).json({ message: 'ליד לא נמצא' });
      }

      res.json(lead);
    } catch (error) {
      console.error("Error fetching lead:", error);
      res.status(500).json({ message: 'שגיאה בטעינת הליד' });
    }
  });

  // Update lead by ID
  app.put('/api/leads/:id', async (req: any, res) => {
    try {
      console.log('PUT /api/leads/:id called with ID:', req.params.id);
      console.log('Request body:', req.body);
      console.log('Session:', req.session?.userId ? 'exists' : 'missing');
      
      if (!req.session || !req.session.userId) {
        console.log('No session or userId');
        return res.status(401).json({ message: 'לא מחובר' });
      }

      const user = await storage.getUser(req.session.userId);
      console.log('User found:', user ? 'yes' : 'no');
      if (!user || !user.agencyId) {
        console.log('No user or agencyId');
        return res.status(401).json({ message: 'משתמש לא נמצא' });
      }

      const leadId = req.params.id;
      const updatedData = req.body;
      console.log('Updating lead:', leadId, 'with data:', updatedData);

      // Check if lead exists and belongs to user's agency
      const existingLead = await storage.getLead(leadId);
      console.log('Existing lead found:', existingLead ? 'yes' : 'no');
      if (!existingLead || existingLead.agencyId !== user.agencyId) {
        console.log('Lead not found or agency mismatch');
        return res.status(404).json({ message: 'ליד לא נמצא' });
      }

      // Update the lead - remove updatedAt as it's handled by storage
      const dataToUpdate = updatedData;
      console.log('Raw data to update:', dataToUpdate);
      console.log('Data types check:');
      Object.entries(dataToUpdate).forEach(([key, value]) => {
        console.log(`  ${key}: ${value} (${typeof value}) ${value instanceof Date ? '- IS DATE OBJECT!' : ''}`);
      });
      
      const updatedLead = await storage.updateLead(leadId, dataToUpdate);
      console.log('Update result:', updatedLead ? 'success' : 'failed');

      if (!updatedLead) {
        console.log('Update failed - no result from storage');
        return res.status(500).json({ message: 'שגיאה בעדכון הליד' });
      }

      console.log('Sending success response');
      res.json(updatedLead);
    } catch (error) {
      console.error("Error updating lead:", error);
      res.status(500).json({ message: 'שגיאה בעדכון הליד' });
    }
  });

  // Create meeting for lead
  app.post('/api/leads/:id/meetings', async (req: any, res) => {
    try {
      if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: 'לא מחובר' });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user || !user.agencyId) {
        return res.status(401).json({ message: 'משתמש לא נמצא' });
      }

      const leadId = req.params.id;
      const { title, date, time, duration, location, notes } = req.body;

      // Check if lead exists and belongs to user's agency
      const existingLead = await storage.getLead(leadId);
      if (!existingLead || existingLead.agencyId !== user.agencyId) {
        return res.status(404).json({ message: 'ליד לא נמצא' });
      }

      // Create meeting record
      const meeting = {
        id: generateId(),
        leadId,
        title,
        date,
        time,
        duration: parseInt(duration),
        location,
        notes,
        createdBy: user.id,
        createdAt: new Date().toISOString(),
        status: 'scheduled'
      };

      // Store meeting in lead's notes for backward compatibility
      const meetingNote = `[פגישה - ${date} ${time}] ${title}${location ? ` (${location})` : ''}${notes ? `\nהערות: ${notes}` : ''}`;
      const currentNotes = existingLead.notes || '';
      const updatedNotes = currentNotes ? `${currentNotes}\n\n${meetingNote}` : meetingNote;
      
      await storage.updateLead(leadId, {
        notes: updatedNotes
      });

      // Also create a task for this meeting
      const meetingDateTime = new Date(`${date}T${time}`);
      const endDateTime = new Date(meetingDateTime.getTime() + parseInt(duration) * 60000);
      
      await storage.createTask({
        agencyId: user.agencyId,
        leadId,
        title: `פגישה: ${title}`,
        description: notes || `פגישה עם ${existingLead.name}`,
        type: 'meeting',
        status: 'todo',
        priority: 'medium',
        createdBy: user.id,
        dueDate: date,
        startTime: meetingDateTime.toISOString(),
        endTime: endDateTime.toISOString(),
        location: location || undefined,
        assignedTo: user.id
      });

      res.json({ meeting, success: true });
    } catch (error) {
      console.error("Error creating meeting:", error);
      res.status(500).json({ message: 'שגיאה ביצירת הפגישה' });
    }
  });

  app.get('/api/products', async (req: any, res) => {
    try {
      if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: 'לא מחובר' });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user || !user.agencyId) {
        return res.status(401).json({ message: 'משתמש לא נמצא' });
      }

      const products = await storage.getProductsByAgency(user.agencyId);
      res.json(products);
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json([]);
    }
  });

  app.get('/api/quotes', async (req: any, res) => {
    try {
      if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: 'לא מחובר' });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user || !user.agencyId) {
        return res.status(401).json({ message: 'משתמש לא נמצא' });
      }

      const quotes = await storage.getQuotesByAgency(user.agencyId);
      res.json(quotes);
    } catch (error) {
      console.error("Error fetching quotes:", error);
      res.status(500).json([]);
    }
  });

  app.get('/api/users', async (req: any, res) => {
    try {
      if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: 'לא מחובר' });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user || !user.agencyId) {
        return res.status(401).json({ message: 'משתמש לא נמצא' });
      }

      const users = await storage.getUsersByAgency(user.agencyId);
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json([]);
    }
  });

  // Get current agency details
  app.get('/api/agencies/current', async (req: any, res) => {
    try {
      if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: 'לא מחובר' });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user || !user.agencyId) {
        return res.status(404).json({ message: 'סוכנות לא נמצאה' });
      }

      const agency = await storage.getAgency(user.agencyId);
      if (!agency) {
        return res.status(404).json({ message: 'סוכנות לא נמצאה' });
      }

      res.json(agency);
    } catch (error) {
      console.error('Get current agency error:', error);
      res.status(500).json({ message: 'שגיאה בקבלת פרטי הסוכנות' });
    }
  });

  // Update current agency details
  app.put('/api/agencies/current', async (req: any, res) => {
    try {
      if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: 'לא מחובר' });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user || !user.agencyId) {
        return res.status(404).json({ message: 'סוכנות לא נמצאה' });
      }

      // Check if user has permission to update agency
      if (user.role !== 'agency_admin' && user.role !== 'owner') {
        return res.status(403).json({ message: 'אין הרשאה לעדכן פרטי הסוכנות' });
      }

      const updateData = { ...req.body };
      // Create slug from name if provided
      if (updateData.name) {
        updateData.slug = updateData.name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w\-]/g, '');
      }

      const updatedAgency = await storage.updateAgency(user.agencyId, updateData);
      res.json(updatedAgency);
    } catch (error) {
      console.error('Update current agency error:', error);
      res.status(500).json({ message: 'שגיאה בעדכון פרטי הסוכנות' });
    }
  });

  // Setup Agency wizard endpoint
  app.post('/api/setup-agency', async (req: any, res) => {
    try {
      if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: 'לא מחובר' });
      }

      const { business, team, profile } = req.body;

      if (!business || !business.name || !business.industry) {
        return res.status(400).json({ message: 'פרטי העסק נדרשים' });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(404).json({ message: 'משתמש לא נמצא' });
      }

      let agency;

      // If user already has agency, update it
      if (user.agencyId) {
        agency = await storage.updateAgency(user.agencyId, {
          name: business.name,
          slug: business.name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w\-]/g, ''),
          industry: business.industry,
          website: business.website || null,
          phone: business.phone || null,
          email: business.email || null,
          address: business.address || null,
          description: business.description || null
        });
      } else {
        // Create new agency
        agency = await storage.createAgency({
          name: business.name,
          slug: business.name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w\-]/g, ''),
          industry: business.industry,
          website: business.website || null,
          phone: business.phone || null,
          email: business.email || null,
          address: business.address || null,
          description: business.description || null
        });

        // Update user with agency ID
        await storage.updateUser(user.id, { agencyId: agency.id });
      }

      // Update user profile
      if (profile && profile.fullName) {
        await storage.updateUser(user.id, {
          fullName: profile.fullName,
          phone: profile.phone || null,
          // Add any additional profile fields as needed
        });
      }

      // Create team members if provided
      if (team && team.length > 0) {
        for (const member of team) {
          // Check if team member already exists
          const existingMember = await storage.getUserByEmail(member.email);
          if (!existingMember) {
            // Create invitation or placeholder user
            // For now, we'll create a basic user record that will need to be activated
            const tempPassword = crypto.randomBytes(12).toString('hex');
            const hashedPassword = await bcrypt.hash(tempPassword, 10);
            
            await storage.createUser({
              email: member.email,
              fullName: member.fullName,
              password: hashedPassword,
              role: member.role === 'admin' ? 'agency_admin' : 'team_member',
              agencyId: agency.id,
              isActive: false // Mark as inactive until they set their own password
            });

            // TODO: Send invitation email with setup link
            console.log(`Team member invitation needed for: ${member.email}`);
          }
        }
      }

      res.json({ 
        success: true,
        agency: {
          id: agency.id,
          name: agency.name,
          slug: agency.slug
        }
      });

    } catch (error) {
      console.error('Setup agency error:', error);
      res.status(500).json({ message: 'שגיאה בהגדרת העסק' });
    }
  });

  // Tasks API endpoints
  app.get('/api/tasks', async (req: any, res) => {
    try {
      if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: 'לא מחובר' });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user || !user.agencyId) {
        return res.status(401).json({ message: 'משתמש לא נמצא' });
      }

      const tasks = await storage.getTasksByAgency(user.agencyId);
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      res.status(500).json([]);
    }
  });

  app.post('/api/tasks', async (req: any, res) => {
    try {
      if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: 'לא מחובר' });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user || !user.agencyId) {
        return res.status(401).json({ message: 'משתמש לא נמצא' });
      }

      const taskData = {
        ...req.body,
        agencyId: user.agencyId,
        createdBy: user.id
      };

      const task = await storage.createTask(taskData);
      res.json(task);
    } catch (error) {
      console.error("Error creating task:", error);
      res.status(500).json({ message: "Failed to create task" });
    }
  });

  app.put('/api/tasks/:id', async (req: any, res) => {
    try {
      if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: 'לא מחובר' });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user || !user.agencyId) {
        return res.status(401).json({ message: 'משתמש לא נמצא' });
      }

      const taskId = req.params.id;
      const updatedData = req.body;

      // Check if task exists and belongs to user's agency
      const existingTask = await storage.getTask(taskId);
      if (!existingTask || existingTask.agencyId !== user.agencyId) {
        return res.status(404).json({ message: 'משימה לא נמצאה' });
      }

      const updatedTask = await storage.updateTask(taskId, updatedData);
      res.json(updatedTask);
    } catch (error) {
      console.error("Error updating task:", error);
      res.status(500).json({ message: 'שגיאה בעדכון המשימה' });
    }
  });

  app.delete('/api/tasks/:id', async (req: any, res) => {
    try {
      if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: 'לא מחובר' });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user || !user.agencyId) {
        return res.status(401).json({ message: 'משתמש לא נמצא' });
      }

      const taskId = req.params.id;

      // Check if task exists and belongs to user's agency
      const existingTask = await storage.getTask(taskId);
      if (!existingTask || existingTask.agencyId !== user.agencyId) {
        return res.status(404).json({ message: 'משימה לא נמצאה' });
      }

      await storage.deleteTask(taskId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting task:", error);
      res.status(500).json({ message: 'שגיאה במחיקת המשימה' });
    }
  });

  app.post('/api/tasks/delete-multiple', async (req: any, res) => {
    try {
      if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: 'לא מחובר' });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user || !user.agencyId) {
        return res.status(401).json({ message: 'משתמש לא נמצא' });
      }

      const { taskIds } = req.body;
      
      // Verify all tasks belong to user's agency
      for (const taskId of taskIds) {
        const task = await storage.getTask(taskId);
        if (!task || task.agencyId !== user.agencyId) {
          return res.status(404).json({ message: 'משימה לא נמצאה' });
        }
        await storage.deleteTask(taskId);
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting tasks:", error);
      res.status(500).json({ message: 'שגיאה במחיקת המשימות' });
    }
  });

  // Get tasks for specific lead
  app.get('/api/leads/:id/tasks', async (req: any, res) => {
    try {
      if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: 'לא מחובר' });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user || !user.agencyId) {
        return res.status(401).json({ message: 'משתמש לא נמצא' });
      }

      const leadId = req.params.id;
      const tasks = await storage.getTasksByLead(leadId);
      
      // Filter by agency for security
      const agencyTasks = tasks.filter(task => task.agencyId === user.agencyId);
      res.json(agencyTasks);
    } catch (error) {
      console.error("Error fetching lead tasks:", error);
      res.status(500).json([]);
    }
  });

  // Get lead activities/communications
  app.get('/api/leads/:id/activities', async (req: any, res) => {
    try {
      if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: 'לא מחובר' });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user || !user.agencyId) {
        return res.status(401).json({ message: 'משתמש לא נמצא' });
      }

      const leadId = req.params.id;
      
      // For now, return mock data. Later we can create an activities table
      const mockActivities = [
        {
          id: '1',
          leadId: leadId,
          type: 'email',
          subject: 'הצעת מחיר לפרויקט דיגיטלי',
          content: `שלום, מצורף הצעת מחיר מפורטת לפרויקט הדיגיטלי שלכם. אשמח לשמוע חזרה ולענות על שאלות נוספות.`,
          status: 'read',
          sentAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          createdBy: user.id
        },
        {
          id: '2',
          leadId: leadId,
          type: 'call',
          subject: 'שיחת פתיחה',
          content: 'דיון ראשוני על הצרכים והמטרות של הלקוח. הלקוח מעוניין בפיתוח אתר חדש וחנות מקוונת.',
          duration: 25,
          sentAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          createdBy: user.id
        },
        {
          id: '3',
          leadId: leadId,
          type: 'meeting',
          subject: 'פגישת המשך',
          content: 'פגישה זמינה ביום שני הקרוב בשעה 10:00',
          location: 'משרד הלקוח',
          scheduledFor: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          sentAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
          createdBy: user.id
        }
      ];
      
      res.json(mockActivities);
    } catch (error) {
      console.error("Error fetching lead activities:", error);
      res.status(500).json([]);
    }
  });

  // Send email endpoint
  app.post('/api/send-email', async (req: any, res) => {
    try {
      if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: 'לא מחובר' });
      }

      const { to, subject, body, leadId } = req.body;

      // Basic validation
      if (!to || !subject || !body) {
        return res.status(400).json({ message: 'חסרים שדות חובה' });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(to)) {
        return res.status(400).json({ message: 'כתובת אימייל לא תקינה' });
      }

      // Send email via email service
      const success = await emailService.sendEmail({
        to: to,
        subject: subject,
        text: body,
        html: body.replace(/\n/g, '<br>')
      });

      if (success) {
        res.json({ success: true, message: 'אימייל נשלח בהצלחה' });
      } else {
        res.status(500).json({ success: false, message: 'שגיאה בשליחת אימייל' });
      }
    } catch (error) {
      console.error("Error sending email:", error);
      res.status(500).json({ success: false, message: 'שגיאה בשליחת אימייל' });
    }
  });

  // Send credentials endpoint
  app.post('/api/send-credentials', async (req: any, res) => {
    try {
      if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: 'לא מחובר' });
      }

      const { to, name, clientId } = req.body;

      if (!to || !name) {
        return res.status(400).json({ message: 'חסרים שדות חובה' });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(to)) {
        return res.status(400).json({ message: 'כתובת אימייל לא תקינה' });
      }

      const loginUrl = `${process.env.BASE_URL || 'http://localhost:5000'}/client-portal?clientId=${clientId}`;
      
      const subject = 'פרטי גישה למערכת CRM';
      const body = `שלום ${name},

ברוכים הבאים למערכת הניהול שלנו!

להלן פרטי הגישה שלכם:

🔗 קישור לדאשבורד הלקוח:
${loginUrl}

באמצעות הקישור תוכלו:
• לעקוב אחר סטטוס הפרויקט
• לצפות בהצעות מחיר
• לתאם פגישות
• לקבל עדכונים בזמן אמת

צוות התמיכה זמין עבורכם בכל עת.

בברכה,
צוות AgencyCRM`;

      const success = await emailService.sendEmail({
        to: to,
        subject: subject,
        text: body,
        html: body.replace(/\n/g, '<br>')
      });

      if (success) {
        res.json({ success: true, message: 'פרטי התחברות נשלחו בהצלחה' });
      } else {
        res.status(500).json({ success: false, message: 'שגיאה בשליחת פרטי התחברות' });
      }
    } catch (error) {
      console.error("Error sending credentials:", error);
      res.status(500).json({ success: false, message: 'שגיאה בשליחת פרטי התחברות' });
    }
  });

  // Send credentials to specific client endpoint
  app.post('/api/clients/:id/send-credentials', async (req: any, res) => {
    try {
      if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: 'לא מחובר' });
      }

      const clientId = req.params.id;

      // Get client from database
      const client = await storage.getClient(clientId);
      if (!client) {
        return res.status(404).json({ message: 'לקוח לא נמצא' });
      }

      if (!client.email) {
        return res.status(400).json({ message: 'ללקוח אין כתובת אימייל' });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(client.email)) {
        return res.status(400).json({ message: 'כתובת אימייל לא תקינה' });
      }

      // Check if client user already exists
      let clientUser = await storage.getClientUserByClientId(clientId);
      let password = '';
      
      if (!clientUser) {
        // Create new client user
        const username = generateUsername(client.name);
        password = generatePassword(10);
        const hashedPassword = await bcrypt.hash(password, 10);

        clientUser = await storage.createClientUser({
          clientId: clientId,
          username: username,
          email: client.email,
          password: hashedPassword,
          role: 'client',
          isActive: true,
          createdAt: Date.now(),
          updatedAt: Date.now()
        });
      } else {
        // Generate new password for existing user
        password = generatePassword(10);
        const hashedPassword = await bcrypt.hash(password, 10);
        
        clientUser = await storage.updateClientUser(clientUser.id, {
          password: hashedPassword,
          updatedAt: Date.now()
        });
      }

      const loginUrl = `${process.env.BASE_URL || 'http://localhost:5000'}/client-login`;
      
      const subject = 'פרטי גישה למערכת ניהול הלקוחות';
      
      // Create Gmail-compatible Hebrew email template
      const htmlBody = `
<div dir="rtl" style="font-family: Arial, Helvetica, sans-serif; direction: rtl; text-align: right; max-width: 600px; margin: 0 auto; background: #ffffff;">
  
  <div style="background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="margin: 0; font-size: 24px;">🏢 BRIXEL7</h1>
    <p style="margin: 10px 0 0 0; font-size: 16px;">ברוכים הבאים למערכת ניהול הלקוחות</p>
  </div>
  
  <div style="padding: 30px; background: #ffffff;">
    <div style="font-size: 16px; color: #374151; margin-bottom: 20px; text-align: right;">
      שלום ${client.name},<br><br>
      אנו שמחים לקבל אתכם למערכת ניהול הלקוחות החדשנית שלנו!
    </div>
    
    <div style="background: #f8fafc; border: 2px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
      <h3 style="color: #2563eb; margin-top: 0; text-align: center;">פרטי ההתחברות שלכם</h3>
      
      <div style="background: white; padding: 15px; margin: 10px 0; border-radius: 6px; border-right: 4px solid #2563eb; text-align: right;">
        <div style="color: #6b7280; font-size: 14px; font-weight: bold;">שם משתמש:</div>
        <div style="color: #1f2937; font-size: 18px; font-weight: bold; margin-top: 5px; font-family: Courier, monospace;">${clientUser.username}</div>
      </div>
      
      <div style="background: white; padding: 15px; margin: 10px 0; border-radius: 6px; border-right: 4px solid #2563eb; text-align: right;">
        <div style="color: #6b7280; font-size: 14px; font-weight: bold;">סיסמה:</div>
        <div style="color: #1f2937; font-size: 18px; font-weight: bold; margin-top: 5px; font-family: Courier, monospace;">${password}</div>
      </div>
      
      <div style="margin: 20px 0;">
        <a href="${loginUrl}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
          🔑 התחברות למערכת
        </a>
      </div>
    </div>
    
    <div style="background: #f1f5f9; padding: 15px; border-radius: 6px; margin: 20px 0; text-align: right;">
      <h4 style="color: #2563eb; margin-top: 0;">במערכת תוכלו:</h4>
      <ul style="text-align: right; padding-right: 20px;">
        <li style="margin: 8px 0;">לעקוב אחר סטטוס הפרויקטים שלכם בזמן אמת</li>
        <li style="margin: 8px 0;">לצפות ולהוריד הצעות מחיר</li>
        <li style="margin: 8px 0;">לתאם פגישות עם הצוות</li>
        <li style="margin: 8px 0;">לקבל עדכונים והתראות</li>
        <li style="margin: 8px 0;">לנהל את פרטי החשבון שלכם</li>
      </ul>
    </div>
    
    <div style="color: #6b7280; font-size: 14px; text-align: right; margin: 20px 0;">
      💡 <strong>טיפ חשוב:</strong> שמרו את פרטי ההתחברות במקום בטוח. תוכלו לשנות את הסיסמה לאחר ההתחברות הראשונה.
    </div>
  </div>
  
  <div style="background: #f8fafc; text-align: center; padding: 15px; color: #6b7280; border-radius: 0 0 8px 8px;">
    <p style="margin: 0;">צוות התמיכה זמין עבורכם בכל עת</p>
    <p style="margin: 5px 0 0 0; font-weight: bold;">BRIXEL7 Agency Management System</p>
  </div>
  
</div>`;

      const textBody = `שלום ${client.name},

ברוכים הבאים למערכת ניהול הלקוחות שלנו!

פרטי ההתחברות שלכם:
שם משתמש: ${clientUser.username}
סיסמה: ${password}

🔗 קישור להתחברות: ${loginUrl}

במערכת תוכלו:
• לעקוב אחר סטטוס הפרויקטים בזמן אמת
• לצפות בהצעות מחיר
• לתאם פגישות
• לקבל עדכונים והתראות

צוות התמיכה זמין עבורכם בכל עת.

בברכה,
צוות BRIXEL7`;

      const success = await emailService.sendEmail({
        to: client.email,
        subject: subject,
        text: textBody,
        html: htmlBody
      });

      if (success) {
        res.json({ 
          success: true, 
          message: 'פרטי התחברות נשלחו בהצלחה',
          username: clientUser.username 
        });
      } else {
        res.status(500).json({ success: false, message: 'שגיאה בשליחת פרטי התחברות' });
      }
    } catch (error) {
      console.error("Error sending credentials:", error);
      res.status(500).json({ success: false, message: 'שגיאה בשליחת פרטי התחברות' });
    }
  });

  // Team Management API endpoints
  app.get('/api/team', async (req: any, res) => {
    try {
      if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: 'לא מחובר' });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user || !user.agencyId) {
        return res.status(401).json({ message: 'משתמש לא נמצא' });
      }

      const teamMembers = await storage.getUsersByAgency(user.agencyId);
      res.json(teamMembers);
    } catch (error) {
      console.error("Error fetching team members:", error);
      res.status(500).json([]);
    }
  });

  // Invite team member endpoint
  app.post('/api/team/invite', async (req: any, res) => {
    try {
      if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: 'לא מחובר' });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user || !user.agencyId) {
        return res.status(401).json({ message: 'משתמש לא נמצא' });
      }

      // Only agency admins can invite team members
      if (user.role !== 'agency_admin') {
        return res.status(403).json({ message: 'אין הרשאה להזמין חברי צוות' });
      }

      const { email, fullName, role, permissions } = req.body;

      if (!email || !fullName || !role) {
        return res.status(400).json({ message: 'חסרים שדות חובה' });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: 'משתמש עם אימייל זה כבר קיים' });
      }

      // Generate random password
      const tempPassword = generatePassword(8);
      const hashedPassword = await bcrypt.hash(tempPassword, 10);

      // Create new team member
      const newMember = await storage.createUser({
        email,
        fullName,
        password: hashedPassword,
        role: role,
        agencyId: user.agencyId,
        isActive: true,
        permissions: permissions ? JSON.stringify(permissions) : null
      });

      // Determine dashboard URL based on role
      let dashboardUrl = '';
      if (role === 'team_member') {
        dashboardUrl = `${process.env.BASE_URL || 'http://localhost:5000'}/team-member/dashboard`;
      } else if (role === 'agency_admin') {
        dashboardUrl = `${process.env.BASE_URL || 'http://localhost:5000'}/dashboard`;
      }

      // Send invitation email
      const subject = 'הזמנה להצטרף לצוות';
      const body = `שלום ${fullName},

הוזמנת להצטרף לצוות במערכת AgencyCRM!

פרטי ההתחברות שלך:
📧 אימייל: ${email}
🔑 סיסמה: ${tempPassword}

🔗 קישור למערכת:
${dashboardUrl}

באמצעות המערכת תוכל/י:
• לנהל משימות ופרויקטים
• לעקוב אחר לידים ולקוחות
• לתאם פגישות ופעילויות
• לקבל עדכונים בזמן אמת

אנא שמור/י את פרטי ההתחברות במקום בטוח.
מומלץ לשנות את הסיסמה בכניסה הראשונה.

צוות התמיכה זמין עבורך בכל עת.

בברכה,
צוות AgencyCRM`;

      const emailSent = await emailService.sendEmail({
        to: email,
        subject: subject,
        text: body,
        html: body.replace(/\n/g, '<br>')
      });

      if (emailSent) {
        res.json({ 
          success: true, 
          message: 'הזמנה נשלחה בהצלחה',
          member: {
            id: newMember.id,
            email: newMember.email,
            fullName: newMember.fullName,
            role: newMember.role
          }
        });
      } else {
        // Still return success but mention email issue
        res.json({ 
          success: true, 
          message: 'חבר הצוות נוצר בהצלחה, אך היתה בעיה בשליחת האימייל',
          member: {
            id: newMember.id,
            email: newMember.email,
            fullName: newMember.fullName,
            role: newMember.role
          },
          credentials: {
            email: email,
            password: tempPassword
          }
        });
      }
    } catch (error) {
      console.error('Team member invitation error:', error);
      res.status(500).json({ message: 'שגיאה בהזמנת חבר הצוות' });
    }
  });

  // Update team member
  app.put('/api/team/:id', async (req: any, res) => {
    try {
      if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: 'לא מחובר' });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user || !user.agencyId) {
        return res.status(401).json({ message: 'משתמש לא נמצא' });
      }

      // Only agency admins can update team members
      if (user.role !== 'agency_admin') {
        return res.status(403).json({ message: 'אין הרשאה לעדכן חברי צוות' });
      }

      const memberId = req.params.id;
      const updateData = req.body;

      // Check if member exists and belongs to same agency
      const existingMember = await storage.getUser(memberId);
      if (!existingMember || existingMember.agencyId !== user.agencyId) {
        return res.status(404).json({ message: 'חבר צוות לא נמצא' });
      }

      // Update member
      const updatedMember = await storage.updateUser(memberId, updateData);
      res.json(updatedMember);
    } catch (error) {
      console.error('Update team member error:', error);
      res.status(500).json({ message: 'שגיאה בעדכון חבר הצוות' });
    }
  });

  // Toggle team member active status
  app.put('/api/team/:id/toggle-active', async (req: any, res) => {
    try {
      if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: 'לא מחובר' });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user || !user.agencyId) {
        return res.status(401).json({ message: 'משתמש לא נמצא' });
      }

      // Only agency admins can toggle member status
      if (user.role !== 'agency_admin') {
        return res.status(403).json({ message: 'אין הרשאה לשנות סטטוס חברי צוות' });
      }

      const memberId = req.params.id;

      // Check if member exists and belongs to same agency
      const existingMember = await storage.getUser(memberId);
      if (!existingMember || existingMember.agencyId !== user.agencyId) {
        return res.status(404).json({ message: 'חבר צוות לא נמצא' });
      }

      // Don't allow toggling own status
      if (memberId === user.id) {
        return res.status(400).json({ message: 'לא ניתן לשנות את הסטטוס שלך' });
      }

      // Toggle active status
      const updatedMember = await storage.updateUser(memberId, { 
        isActive: !existingMember.isActive 
      });
      
      res.json(updatedMember);
    } catch (error) {
      console.error('Toggle team member status error:', error);
      res.status(500).json({ message: 'שגיאה בשינוי סטטוס חבר הצוות' });
    }
  });

  // Resend invitation to team member
  app.post('/api/team/:id/resend-invite', async (req: any, res) => {
    try {
      if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: 'לא מחובר' });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user || !user.agencyId) {
        return res.status(401).json({ message: 'משתמש לא נמצא' });
      }

      // Only agency admins can resend invitations
      if (user.role !== 'agency_admin') {
        return res.status(403).json({ message: 'אין הרשאה לשלוח הזמנות' });
      }

      const memberId = req.params.id;
      const member = await storage.getUser(memberId);
      
      if (!member || member.agencyId !== user.agencyId) {
        return res.status(404).json({ message: 'חבר צוות לא נמצא' });
      }

      // Generate new password
      const newPassword = generatePassword(8);
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update password
      await storage.updateUser(memberId, { password: hashedPassword });

      // Determine dashboard URL
      let dashboardUrl = '';
      if (member.role === 'team_member') {
        dashboardUrl = `${process.env.BASE_URL || 'http://localhost:5000'}/team-member/dashboard`;
      } else if (member.role === 'agency_admin') {
        dashboardUrl = `${process.env.BASE_URL || 'http://localhost:5000'}/dashboard`;
      }

      // Send new invitation email
      const subject = 'פרטי גישה מחודשים למערכת';
      const body = `שלום ${member.fullName},

פרטי הגישה שלך למערכת AgencyCRM עודכנו:

📧 אימייל: ${member.email}
🔑 סיסמה חדשה: ${newPassword}

🔗 קישור למערכת:
${dashboardUrl}

אנא שמור/י את פרטי ההתחברות החדשים במקום בטוח.
מומלץ לשנות את הסיסמה בכניסה הראשונה.

בברכה,
צוות AgencyCRM`;

      const emailSent = await emailService.sendEmail({
        to: member.email,
        subject: subject,
        text: body,
        html: body.replace(/\n/g, '<br>')
      });

      if (emailSent) {
        res.json({ success: true, message: 'הזמנה נשלחה מחדש בהצלחה' });
      } else {
        res.json({ 
          success: true, 
          message: 'פרטי הגישה עודכנו, אך היתה בעיה בשליחת האימייל',
          credentials: {
            email: member.email,
            password: newPassword
          }
        });
      }
    } catch (error) {
      console.error('Resend invitation error:', error);
      res.status(500).json({ message: 'שגיאה בשליחת הזמנה מחדש' });
    }
  });

  // Team Member Dashboard API endpoints
  app.get('/api/team-member/my-tasks', async (req: any, res) => {
    try {
      if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: 'לא מחובר' });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user || !user.agencyId) {
        return res.status(401).json({ message: 'משתמש לא נמצא' });
      }

      // Get tasks assigned to this team member
      const allTasks = await storage.getTasksByAgency(user.agencyId);
      const myTasks = allTasks.filter(task => task.assignedTo === user.id);
      
      res.json(myTasks);
    } catch (error) {
      console.error("Error fetching team member tasks:", error);
      res.status(500).json([]);
    }
  });

  app.get('/api/team-member/my-projects', async (req: any, res) => {
    try {
      if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: 'לא מחובר' });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user || !user.agencyId) {
        return res.status(401).json({ message: 'משתמש לא נמצא' });
      }

      // Get projects this team member is assigned to
      const allProjects = await storage.getProjectsByAgency(user.agencyId);
      const myProjects = allProjects.filter(project => project.assignedTo === user.id);
      
      res.json(myProjects);
    } catch (error) {
      console.error("Error fetching team member projects:", error);
      res.status(500).json([]);
    }
  });

  app.get('/api/team-member/my-clients', async (req: any, res) => {
    try {
      if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: 'לא מחובר' });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user || !user.agencyId) {
        return res.status(401).json({ message: 'משתמש לא נמצא' });
      }

      // Get clients related to this team member's projects
      const allProjects = await storage.getProjectsByAgency(user.agencyId);
      const myProjects = allProjects.filter(project => project.assignedTo === user.id);
      
      const clientIds = [...new Set(myProjects.map(p => p.clientId).filter(Boolean))];
      const myClients = [];
      
      for (const clientId of clientIds) {
        const client = await storage.getClient(clientId);
        if (client) {
          myClients.push(client);
        }
      }
      
      res.json(myClients);
    } catch (error) {
      console.error("Error fetching team member clients:", error);
      res.status(500).json([]);
    }
  });

  app.get('/api/team-member/my-activity', async (req: any, res) => {
    try {
      if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: 'לא מחובר' });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user || !user.agencyId) {
        return res.status(401).json({ message: 'משתמש לא נמצא' });
      }

      // Mock activity data - in a real app you'd have an activity log table
      const mockActivity = [
        {
          id: '1',
          userId: user.id,
          action: 'completed',
          entityType: 'task',
          entityId: 'task1',
          description: 'השלים משימה',
          createdAt: new Date(Date.now() - 60 * 60 * 1000).toISOString()
        },
        {
          id: '2',
          userId: user.id,
          action: 'updated',
          entityType: 'project',
          entityId: 'project1',
          description: 'עדכן פרויקט',
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
        }
      ];
      
      res.json(mockActivity);
    } catch (error) {
      console.error("Error fetching team member activity:", error);
      res.status(500).json([]);
    }
  });

  app.get('/api/team-member/stats', async (req: any, res) => {
    try {
      if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: 'לא מחובר' });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user || !user.agencyId) {
        return res.status(401).json({ message: 'משתמש לא נמצא' });
      }

      // Calculate stats for this team member
      const allTasks = await storage.getTasksByAgency(user.agencyId);
      const myTasks = allTasks.filter(task => task.assignedTo === user.id);
      
      const allProjects = await storage.getProjectsByAgency(user.agencyId);
      const myProjects = allProjects.filter(project => project.assignedTo === user.id);
      
      const totalTasks = myTasks.length;
      const completedTasks = myTasks.filter(task => task.status === 'completed').length;
      const pendingTasks = myTasks.filter(task => task.status === 'todo' || task.status === 'in_progress').length;
      const overdueTasks = myTasks.filter(task => {
        if (!task.dueDate) return false;
        return new Date(task.dueDate) < new Date() && task.status !== 'completed';
      }).length;
      
      const activeProjects = myProjects.filter(project => project.status === 'in_progress').length;

      const stats = {
        totalTasks,
        completedTasks,
        pendingTasks,
        overdueTasks,
        activeProjects
      };
      
      res.json(stats);
    } catch (error) {
      console.error("Error fetching team member stats:", error);
      res.status(500).json({ totalTasks: 0, completedTasks: 0, pendingTasks: 0, overdueTasks: 0, activeProjects: 0 });
    }
  });

  // Client login endpoint
  app.post('/api/client-login', async (req: any, res) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ 
          success: false, 
          message: 'נא למלא שם משתמש וסיסמה' 
        });
      }

      // Find client user by username
      const clientUser = await storage.getClientUserByUsername(username);
      if (!clientUser) {
        return res.status(401).json({ 
          success: false, 
          message: 'שם משתמש או סיסמה שגויים' 
        });
      }

      // Check if user is active
      if (!clientUser.isActive) {
        return res.status(401).json({ 
          success: false, 
          message: 'החשבון שלך לא פעיל. אנא צור קשר עם התמיכה' 
        });
      }

      // Validate password
      const isValidPassword = await storage.validateClientPassword(password, clientUser.password);
      if (!isValidPassword) {
        return res.status(401).json({ 
          success: false, 
          message: 'שם משתמש או סיסמה שגויים' 
        });
      }

      // Update last login time
      await storage.updateClientUser(clientUser.id, {
        lastLogin: Date.now()
      });

      // Store client session (simple approach)
      if (!req.session) {
        req.session = {};
      }
      req.session.clientUserId = clientUser.id;
      req.session.clientId = clientUser.clientId;
      req.session.isClient = true;

      res.json({ 
        success: true, 
        message: 'התחברת בהצלחה',
        clientId: clientUser.clientId,
        username: clientUser.username
      });

    } catch (error) {
      console.error("Client login error:", error);
      res.status(500).json({ 
        success: false, 
        message: 'שגיאה בהתחברות' 
      });
    }
  });

  // Client logout endpoint
  app.post('/api/client-logout', async (req: any, res) => {
    try {
      if (req.session) {
        req.session.clientUserId = null;
        req.session.clientId = null;
        req.session.isClient = null;
      }
      
      res.json({ success: true, message: 'התנתקת בהצלחה' });
    } catch (error) {
      console.error("Client logout error:", error);
      res.status(500).json({ success: false, message: 'שגיאה בהתנתקות' });
    }
  });

  // Client portal API endpoints
  app.get('/api/client/stats', async (req: any, res) => {
    try {
      if (!req.session?.clientId) {
        return res.status(401).json({ message: 'לא מחובר' });
      }

      const clientId = req.session.clientId;
      
      // Get client's projects
      const allProjects = await storage.getProjectsByClient(clientId);
      const activeProjects = allProjects.filter(p => p.status === 'in_progress' || p.status === 'active').length;
      
      // Get client's quotes
      const allQuotes = await storage.getQuotesByClient(clientId);
      const pendingQuotes = allQuotes.filter(q => q.status === 'draft' || q.status === 'sent').length;
      
      // Get client's tasks (tasks related to their projects)
      const allTasks = await storage.getTasksByAgency(allProjects[0]?.agencyId || '');
      const clientTasks = allTasks.filter(task => 
        allProjects.some(project => project.id === task.projectId)
      );
      const pendingTasks = clientTasks.filter(task => task.status !== 'completed').length;

      res.json({
        activeProjects,
        totalQuotes: allQuotes.length,
        pendingQuotes,
        totalTasks: clientTasks.length,
        pendingTasks
      });
    } catch (error) {
      console.error("Error fetching client stats:", error);
      res.status(500).json({ 
        activeProjects: 0, 
        totalQuotes: 0, 
        pendingQuotes: 0, 
        totalTasks: 0, 
        pendingTasks: 0 
      });
    }
  });

  // Get client's leads
  app.get('/api/client/leads/:clientId', async (req: any, res) => {
    try {
      const clientId = req.params.clientId;
      
      // Note: Leads are typically converted TO clients, not owned BY clients
      // So we'll return leads that were converted to this client
      const allLeads = await storage.getLeadsByAgency(''); // We need agency ID
      
      // Get client to find their agency
      const client = await storage.getClient(clientId);
      if (!client) {
        return res.status(404).json({ message: 'לקוח לא נמצא' });
      }

      const agencyLeads = await storage.getLeadsByAgency(client.agencyId);
      const clientLeads = agencyLeads.filter(lead => lead.convertedToClientId === clientId);
      
      res.json(clientLeads);
    } catch (error) {
      console.error("Error fetching client leads:", error);
      res.status(500).json([]);
    }
  });

  // Get specific project by ID
  app.get('/api/projects/:id', async (req: any, res) => {
    try {
      const projectId = req.params.id;
      const project = await storage.getProject(projectId);
      
      if (!project) {
        return res.status(404).json({ message: 'פרויקט לא נמצא' });
      }

      res.json(project);
    } catch (error) {
      console.error("Error fetching project:", error);
      res.status(500).json({ message: 'שגיאה בטעינת הפרויקט' });
    }
  });

  // Get project tasks
  app.get('/api/projects/:id/tasks', async (req: any, res) => {
    try {
      if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: 'לא מחובר' });
      }
      
      const projectId = req.params.id;
      const tasks = await storage.getTasksByProject(projectId);
      res.json(tasks || []);
    } catch (error) {
      console.error("Error fetching project tasks:", error);
      res.status(500).json({ message: 'שגיאה בטעינת המשימות' });
    }
  });

  // Get project assets (placeholder for now)
  app.get('/api/projects/:id/assets', async (req: any, res) => {
    try {
      if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: 'לא מחובר' });
      }
      
      // For now, return empty array - can be implemented later with actual asset storage
      res.json([]);
    } catch (error) {
      console.error("Error fetching project assets:", error);
      res.status(500).json({ message: 'שגיאה בטעינת הנכסים' });
    }
  });

  // Get client info for client portal (similar to /api/auth/me but for clients)
  app.get('/api/client/me', async (req: any, res) => {
    try {
      if (!req.session?.clientId) {
        return res.status(401).json({ message: 'לא מחובר' });
      }

      const clientId = req.session.clientId;
      const client = await storage.getClient(clientId);
      
      if (!client) {
        return res.status(404).json({ message: 'לקוח לא נמצא' });
      }

      // Return client info with role 'client' for frontend
      res.json({
        client: {
          id: client.id,
          name: client.name,
          email: client.email,
          phone: client.phone,
          industry: client.industry,
          role: 'client'
        }
      });
    } catch (error) {
      console.error("Error fetching client info:", error);
      res.status(500).json({ message: 'שגיאה בטעינת פרטי הלקוח' });
    }
  });

  // Get client projects
  app.get('/api/client/projects', async (req: any, res) => {
    try {
      if (!req.session?.clientId) {
        return res.status(401).json({ message: 'לא מחובר' });
      }

      const clientId = req.session.clientId;
      const projects = await storage.getProjectsByClient(clientId);
      
      res.json(projects);
    } catch (error) {
      console.error("Error fetching client projects:", error);
      res.status(500).json([]);
    }
  });

  // Get client leads
  app.get('/api/client/leads', async (req: any, res) => {
    try {
      if (!req.session?.clientId) {
        return res.status(401).json({ message: 'לא מחובר' });
      }

      const clientId = req.session.clientId;
      const leads = await storage.getLeadsByClient(clientId);
      
      res.json(leads);
    } catch (error) {
      console.error("Error fetching client leads:", error);
      res.status(500).json([]);
    }
  });

  // Update client profile
  app.put('/api/client/profile', async (req: any, res) => {
    try {
      if (!req.session?.clientId) {
        return res.status(401).json({ message: 'לא מחובר' });
      }

      const clientId = req.session.clientId;
      const { name, email, phone, industry } = req.body;

      const updatedClient = await storage.updateClient(clientId, {
        name,
        email,
        phone,
        industry
      });

      if (!updatedClient) {
        return res.status(404).json({ message: 'לקוח לא נמצא' });
      }

      res.json({ 
        message: 'הפרופיל עודכן בהצלחה',
        client: updatedClient 
      });
    } catch (error) {
      console.error("Error updating client profile:", error);
      res.status(500).json({ message: 'שגיאה בעדכון הפרופיל' });
    }
  });

  // ==================== OAUTH INTEGRATION ENDPOINTS ====================

  // Initiate OAuth flow
  app.get('/oauth/:platform/auth', async (req: any, res) => {
    try {
      if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: 'לא מחובר' });
      }

      const platform = req.params.platform;
      const supportedPlatforms = ['meta', 'google_ads', 'google_analytics'];
      
      if (!supportedPlatforms.includes(platform)) {
        return res.status(400).json({ message: 'פלטפורמה לא נתמכת' });
      }

      // Generate state parameter with user info for CSRF protection
      const state = crypto.randomBytes(32).toString('hex');
      
      // Store state in session for validation
      req.session.oauthState = state;
      req.session.oauthPlatform = platform;

      const authUrl = oauthService.generateAuthUrl(platform, state);
      
      res.json({ authUrl, state });
    } catch (error) {
      console.error('OAuth initiation error:', error);
      res.status(500).json({ message: 'שגיאה בהתחלת תהליך האישור' });
    }
  });

  // OAuth callback handler
  app.get('/oauth/:platform/callback', async (req: any, res) => {
    try {
      const platform = req.params.platform;
      const { code, state, error: oauthError } = req.query;

      // Check for OAuth errors
      if (oauthError) {
        console.error('OAuth error:', oauthError);
        return res.redirect(`/dashboard?oauth_error=${encodeURIComponent(oauthError)}`);
      }

      // Validate required parameters
      if (!code || !state) {
        return res.redirect('/dashboard?oauth_error=missing_parameters');
      }

      // Validate state parameter (CSRF protection)
      if (!req.session?.oauthState || req.session.oauthState !== state) {
        return res.redirect('/dashboard?oauth_error=invalid_state');
      }

      // Validate platform matches session
      if (req.session.oauthPlatform !== platform) {
        return res.redirect('/dashboard?oauth_error=platform_mismatch');
      }

      // Clear state from session
      req.session.oauthState = null;
      req.session.oauthPlatform = null;

      // Exchange code for tokens
      const tokens = await oauthService.exchangeCodeForTokens(platform, code as string, state as string);

      // Validate token and get account info
      const accountInfo = await oauthService.validateToken(platform, tokens.accessToken);

      // Get user info
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.redirect('/dashboard?oauth_error=user_not_found');
      }

      // Store tokens in database
      const oauthToken = await storage.createOAuthToken({
        agencyId: user.agencyId,
        userId: user.id,
        platform,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        tokenType: tokens.tokenType || 'Bearer',
        expiresAt: tokens.expiresAt,
        scope: tokens.scope,
        accountId: platform === 'meta' ? accountInfo.data?.[0]?.account_id : accountInfo.resourceNames?.[0],
        accountName: platform === 'meta' ? accountInfo.data?.[0]?.name : 'Google Ads Account',
        isActive: true
      });

      // Redirect to dashboard with success message
      res.redirect('/dashboard?oauth_success=' + encodeURIComponent(`${platform} חובר בהצלחה`));
    } catch (error) {
      console.error('OAuth callback error:', error);
      res.redirect('/dashboard?oauth_error=' + encodeURIComponent('שגיאה בחיבור החשבון'));
    }
  });

  // Disconnect OAuth account
  app.delete('/api/oauth/:platform/disconnect', async (req: any, res) => {
    try {
      if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: 'לא מחובר' });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user || !user.agencyId) {
        return res.status(401).json({ message: 'משתמש לא נמצא' });
      }

      const platform = req.params.platform;
      
      // Get existing tokens
      const tokens = await storage.getOAuthTokens(user.agencyId, platform);
      
      if (tokens.length > 0) {
        // Revoke token with platform
        const activeToken = tokens.find(t => t.isActive);
        if (activeToken) {
          await oauthService.revokeToken(platform, activeToken.accessToken);
        }

        // Deactivate all tokens for this platform
        for (const token of tokens) {
          await storage.updateOAuthToken(token.id, { isActive: false });
        }
      }

      res.json({ success: true, message: 'החשבון נותק בהצלחה' });
    } catch (error) {
      console.error('OAuth disconnect error:', error);
      res.status(500).json({ message: 'שגיאה בניתוק החשבון' });
    }
  });

  // Get OAuth connection status
  app.get('/api/oauth/status', async (req: any, res) => {
    try {
      if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: 'לא מחובר' });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user || !user.agencyId) {
        return res.status(401).json({ message: 'משתמש לא נמצא' });
      }

      const platforms = ['meta', 'google_ads', 'google_analytics'];
      const status: Record<string, any> = {};

      for (const platform of platforms) {
        const tokens = await storage.getOAuthTokens(user.agencyId, platform);
        const activeToken = tokens.find(t => t.isActive);
        
        if (activeToken) {
          const isExpired = oauthService.isTokenExpired(activeToken.expiresAt);
          status[platform] = {
            connected: true,
            accountId: activeToken.accountId,
            accountName: activeToken.accountName,
            expiresAt: activeToken.expiresAt,
            isExpired,
            needsRefresh: isExpired && activeToken.refreshToken
          };
        } else {
          status[platform] = { connected: false };
        }
      }

      res.json(status);
    } catch (error) {
      console.error('OAuth status error:', error);
      res.status(500).json({ message: 'שגיאה בבדיקת סטטוס החיבורים' });
    }
  });

  // Refresh OAuth tokens
  app.post('/api/oauth/:platform/refresh', async (req: any, res) => {
    try {
      if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: 'לא מחובר' });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user || !user.agencyId) {
        return res.status(401).json({ message: 'משתמש לא נמצא' });
      }

      const platform = req.params.platform;
      const tokens = await storage.getOAuthTokens(user.agencyId, platform);
      const activeToken = tokens.find(t => t.isActive);

      if (!activeToken || !activeToken.refreshToken) {
        return res.status(400).json({ message: 'אין טוקן רענון זמין' });
      }

      // Refresh the token
      const newTokens = await oauthService.refreshAccessToken(platform, activeToken.refreshToken);

      // Update token in database
      await storage.updateOAuthToken(activeToken.id, {
        accessToken: newTokens.accessToken,
        refreshToken: newTokens.refreshToken,
        expiresAt: newTokens.expiresAt,
        scope: newTokens.scope
      });

      res.json({ 
        success: true, 
        message: 'טוקן עודכן בהצלחה',
        expiresAt: newTokens.expiresAt 
      });
    } catch (error) {
      console.error('OAuth refresh error:', error);
      res.status(500).json({ message: 'שגיאה בעדכון הטוכן' });
    }
  });

  // ==================== PROJECT ANALYTICS ENDPOINTS ====================

  // Time Entries - Start time tracking
  app.post('/api/analytics/time-entries', async (req: any, res) => {
    try {
      if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: 'לא מחובר' });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user || !user.agencyId) {
        return res.status(401).json({ message: 'משתמש לא נמצא' });
      }

      const { projectId, taskId, description } = req.body;
      
      const timeEntry = await storage.createTimeEntry({
        agencyId: user.agencyId,
        projectId,
        taskId,
        userId: req.session.userId,
        description,
        startTime: Date.now(),
        billable: true,
        approved: false
      });

      res.json(timeEntry);
    } catch (error) {
      console.error("Error creating time entry:", error);
      res.status(500).json({ message: 'שגיאה ביצירת רישום זמן' });
    }
  });

  // Time Entries - Stop time tracking
  app.put('/api/analytics/time-entries/:id/stop', async (req: any, res) => {
    try {
      if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: 'לא מחובר' });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user || !user.agencyId) {
        return res.status(401).json({ message: 'משתמש לא נמצא' });
      }

      const entryId = req.params.id;
      const endTime = Date.now();
      
      const timeEntry = await storage.getTimeEntry(entryId);
      if (!timeEntry || timeEntry.agencyId !== user.agencyId) {
        return res.status(404).json({ message: 'רישום זמן לא נמצא' });
      }

      const duration = Math.floor((endTime - timeEntry.startTime) / 1000 / 60); // Duration in minutes
      
      const updatedEntry = await storage.updateTimeEntry(entryId, {
        endTime,
        duration
      });

      res.json(updatedEntry);
    } catch (error) {
      console.error("Error stopping time entry:", error);
      res.status(500).json({ message: 'שגיאה בעצירת רישום זמן' });
    }
  });

  // Get time entries for project
  app.get('/api/analytics/time-entries/project/:projectId', async (req: any, res) => {
    try {
      if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: 'לא מחובר' });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user || !user.agencyId) {
        return res.status(401).json({ message: 'משתמש לא נמצא' });
      }

      const projectId = req.params.projectId;
      const timeEntries = await storage.getTimeEntriesByProject(projectId);
      
      // Filter by agency for security
      const agencyEntries = timeEntries.filter(entry => entry.agencyId === user.agencyId);
      res.json(agencyEntries);
    } catch (error) {
      console.error("Error fetching time entries:", error);
      res.status(500).json([]);
    }
  });

  // Project Expenses - Create expense
  app.post('/api/analytics/expenses', async (req: any, res) => {
    try {
      if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: 'לא מחובר' });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user || !user.agencyId) {
        return res.status(401).json({ message: 'משתמש לא נמצא' });
      }

      const { projectId, category, description, amount, date, receipt } = req.body;
      
      const expense = await storage.createProjectExpense({
        agencyId: user.agencyId,
        projectId,
        category,
        description,
        amount: parseInt(amount * 100), // Convert to agorot
        date,
        receipt,
        approved: false,
        createdBy: req.session.userId
      });

      res.json(expense);
    } catch (error) {
      console.error("Error creating expense:", error);
      res.status(500).json({ message: 'שגיאה ביצירת הוצאה' });
    }
  });

  // Get expenses for project
  app.get('/api/analytics/expenses/project/:projectId', async (req: any, res) => {
    try {
      if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: 'לא מחובר' });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user || !user.agencyId) {
        return res.status(401).json({ message: 'משתמש לא נמצא' });
      }

      const projectId = req.params.projectId;
      const expenses = await storage.getProjectExpenses(projectId);
      
      // Filter by agency for security
      const agencyExpenses = expenses.filter(expense => expense.agencyId === user.agencyId);
      res.json(agencyExpenses);
    } catch (error) {
      console.error("Error fetching expenses:", error);
      res.status(500).json([]);
    }
  });

  // Project Revenue - Create revenue entry
  app.post('/api/analytics/revenue', async (req: any, res) => {
    try {
      if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: 'לא מחובר' });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user || !user.agencyId) {
        return res.status(401).json({ message: 'משתמש לא נמצא' });
      }

      const { projectId, quoteId, amount, type, description, invoiceDate, status } = req.body;
      
      const revenue = await storage.createProjectRevenue({
        agencyId: user.agencyId,
        projectId,
        quoteId,
        amount: parseInt(amount * 100), // Convert to agorot
        type,
        description,
        invoiceDate,
        status: status || 'pending'
      });

      res.json(revenue);
    } catch (error) {
      console.error("Error creating revenue:", error);
      res.status(500).json({ message: 'שגיאה ביצירת הכנסה' });
    }
  });

  // Get revenue for project
  app.get('/api/analytics/revenue/project/:projectId', async (req: any, res) => {
    try {
      if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: 'לא מחובר' });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user || !user.agencyId) {
        return res.status(401).json({ message: 'משתמש לא נמצא' });
      }

      const projectId = req.params.projectId;
      const revenue = await storage.getProjectRevenue(projectId);
      
      // Filter by agency for security
      const agencyRevenue = revenue.filter(rev => rev.agencyId === user.agencyId);
      res.json(agencyRevenue);
    } catch (error) {
      console.error("Error fetching revenue:", error);
      res.status(500).json([]);
    }
  });

  // Project Profitability Summary
  app.get('/api/analytics/profitability/:projectId', async (req: any, res) => {
    try {
      if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: 'לא מחובר' });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user || !user.agencyId) {
        return res.status(401).json({ message: 'משתמש לא נמצא' });
      }

      const projectId = req.params.projectId;
      
      // Get all project data
      const [timeEntries, expenses, revenue] = await Promise.all([
        storage.getTimeEntriesByProject(projectId),
        storage.getProjectExpenses(projectId),
        storage.getProjectRevenue(projectId)
      ]);

      // Filter by agency for security
      const agencyTimeEntries = timeEntries.filter(entry => entry.agencyId === user.agencyId);
      const agencyExpenses = expenses.filter(expense => expense.agencyId === user.agencyId);
      const agencyRevenue = revenue.filter(rev => rev.agencyId === user.agencyId);

      // Calculate totals
      const totalHours = agencyTimeEntries.reduce((sum, entry) => sum + (entry.duration || 0), 0) / 60;
      const totalExpenses = agencyExpenses.reduce((sum, expense) => sum + expense.amount, 0);
      const totalRevenue = agencyRevenue.reduce((sum, rev) => sum + rev.amount, 0);
      const laborCost = agencyTimeEntries.reduce((sum, entry) => {
        return sum + ((entry.duration || 0) / 60 * (entry.hourlyRate || 0));
      }, 0);

      const totalCosts = totalExpenses + laborCost;
      const profit = totalRevenue - totalCosts;
      const profitMargin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

      res.json({
        projectId,
        totalHours,
        totalRevenue: totalRevenue / 100, // Convert from agorot to shekels
        totalExpenses: totalExpenses / 100,
        laborCost: laborCost / 100,
        totalCosts: totalCosts / 100,
        profit: profit / 100,
        profitMargin: Math.round(profitMargin * 100) / 100
      });
    } catch (error) {
      console.error("Error calculating profitability:", error);
      res.status(500).json({ message: 'שגיאה בחישוב רווחיות' });
    }
  });

  // OAuth Tokens - Store platform tokens
  app.post('/api/analytics/oauth-tokens', async (req: any, res) => {
    try {
      if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: 'לא מחובר' });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user || !user.agencyId) {
        return res.status(401).json({ message: 'משתמש לא נמצא' });
      }

      const { platform, accessToken, refreshToken, expiresAt, scope, accountId, accountName } = req.body;
      
      const oauthToken = await storage.createOAuthToken({
        agencyId: user.agencyId,
        userId: req.session.userId,
        platform,
        accessToken,
        refreshToken,
        expiresAt,
        scope,
        accountId,
        accountName,
        isActive: true
      });

      res.json(oauthToken);
    } catch (error) {
      console.error("Error storing OAuth token:", error);
      res.status(500).json({ message: 'שגיאה בשמירת טוקן' });
    }
  });

  // Get OAuth tokens for platform
  app.get('/api/analytics/oauth-tokens/:platform', async (req: any, res) => {
    try {
      if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: 'לא מחובר' });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user || !user.agencyId) {
        return res.status(401).json({ message: 'משתמש לא נמצא' });
      }

      const platform = req.params.platform;
      const tokens = await storage.getOAuthTokens(user.agencyId, platform);
      
      res.json(tokens);
    } catch (error) {
      console.error("Error fetching OAuth tokens:", error);
      res.status(500).json([]);
    }
  });

  // Campaigns - Create campaign
  app.post('/api/analytics/campaigns', async (req: any, res) => {
    try {
      if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: 'לא מחובר' });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user || !user.agencyId) {
        return res.status(401).json({ message: 'משתמש לא נמצא' });
      }

      const { projectId, clientId, platform, platformCampaignId, name, status, objective, budget, budgetType, startDate, endDate } = req.body;
      
      const campaign = await storage.createCampaign({
        agencyId: user.agencyId,
        projectId,
        clientId,
        platform,
        platformCampaignId,
        name,
        status,
        objective,
        budget: budget ? parseInt(budget * 100) : null, // Convert to agorot
        budgetType,
        startDate,
        endDate
      });

      res.json(campaign);
    } catch (error) {
      console.error("Error creating campaign:", error);
      res.status(500).json({ message: 'שגיאה ביצירת קמפיין' });
    }
  });

  // Get campaigns for project
  app.get('/api/analytics/campaigns/project/:projectId', async (req: any, res) => {
    try {
      if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: 'לא מחובר' });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user || !user.agencyId) {
        return res.status(401).json({ message: 'משתמש לא נמצא' });
      }

      const projectId = req.params.projectId;
      const campaigns = await storage.getCampaignsByProject(projectId);
      
      // Filter by agency for security
      const agencyCampaigns = campaigns.filter(campaign => campaign.agencyId === user.agencyId);
      res.json(agencyCampaigns);
    } catch (error) {
      console.error("Error fetching campaigns:", error);
      res.status(500).json([]);
    }
  });

  // Campaign Metrics - Store daily metrics
  app.post('/api/analytics/campaign-metrics', async (req: any, res) => {
    try {
      if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: 'לא מחובר' });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user || !user.agencyId) {
        return res.status(401).json({ message: 'משתמש לא נמצא' });
      }

      const { campaignId, date, impressions, clicks, spend, conversions, cpm, cpc, ctr, conversionRate, reach, frequency } = req.body;
      
      const metrics = await storage.createCampaignMetrics({
        campaignId,
        date,
        impressions: impressions || 0,
        clicks: clicks || 0,
        spend: spend ? parseInt(spend * 100) : 0, // Convert to agorot
        conversions: conversions || 0,
        cpm: cpm ? parseInt(cpm * 100) : 0, // Convert to agorot
        cpc: cpc ? parseInt(cpc * 100) : 0, // Convert to agorot
        ctr: ctr || 0,
        conversionRate: conversionRate || 0,
        reach: reach || 0,
        frequency: frequency || 0
      });

      res.json(metrics);
    } catch (error) {
      console.error("Error storing campaign metrics:", error);
      res.status(500).json({ message: 'שגיאה בשמירת מדדי קמפיין' });
    }
  });

  // Get campaign metrics
  app.get('/api/analytics/campaign-metrics/:campaignId', async (req: any, res) => {
    try {
      if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: 'לא מחובר' });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user || !user.agencyId) {
        return res.status(401).json({ message: 'משתמש לא נמצא' });
      }

      const campaignId = req.params.campaignId;
      const { startDate, endDate } = req.query;
      
      const metrics = await storage.getCampaignMetrics(campaignId, startDate as string, endDate as string);
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching campaign metrics:", error);
      res.status(500).json([]);
    }
  });

  // Lead Generation Campaigns
  app.post('/api/analytics/lead-gen-campaigns', async (req: any, res) => {
    try {
      if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: 'לא מחובר' });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user || !user.agencyId) {
        return res.status(401).json({ message: 'משתמש לא נמצא' });
      }

      const { projectId, campaignId, name, targetAudience, leadForm, costPerLead, conversionGoals } = req.body;
      
      const leadGenCampaign = await storage.createLeadGenCampaign({
        agencyId: user.agencyId,
        projectId,
        campaignId,
        name,
        targetAudience,
        leadForm: JSON.stringify(leadForm),
        costPerLead: costPerLead ? parseInt(costPerLead * 100) : null, // Convert to agorot
        conversionGoals: JSON.stringify(conversionGoals),
        status: 'active'
      });

      res.json(leadGenCampaign);
    } catch (error) {
      console.error("Error creating lead gen campaign:", error);
      res.status(500).json({ message: 'שגיאה ביצירת קמפיין ליד ג׳ן' });
    }
  });

  // Get lead gen campaigns for project
  app.get('/api/analytics/lead-gen-campaigns/project/:projectId', async (req: any, res) => {
    try {
      if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: 'לא מחובר' });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user || !user.agencyId) {
        return res.status(401).json({ message: 'משתמש לא נמצא' });
      }

      const projectId = req.params.projectId;
      const leadGenCampaigns = await storage.getLeadGenCampaignsByProject(projectId);
      
      // Filter by agency for security
      const agencyLeadGenCampaigns = leadGenCampaigns.filter(campaign => campaign.agencyId === user.agencyId);
      res.json(agencyLeadGenCampaigns);
    } catch (error) {
      console.error("Error fetching lead gen campaigns:", error);
      res.status(500).json([]);
    }
  });

  // Calendar endpoints
  app.get('/api/calendar/events', async (req: any, res) => {
    try {
      if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: 'לא מחובר' });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user || !user.agencyId) {
        return res.status(401).json({ message: 'משתמש לא נמצא' });
      }

      // Mock calendar events data
      const events = [
        {
          id: '1',
          title: 'פגישה עם לקוח',
          date: new Date().toISOString(),
          type: 'meeting',
          contactId: 'client-1',
          contactName: 'לקוח דוגמה',
          status: 'scheduled'
        }
      ];

      res.json(events);
    } catch (error) {
      console.error("Error fetching calendar events:", error);
      res.status(500).json([]);
    }
  });

  app.post('/api/calendar/events', async (req: any, res) => {
    try {
      if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: 'לא מחובר' });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user || !user.agencyId) {
        return res.status(401).json({ message: 'משתמש לא נמצא' });
      }

      const { title, date, time, duration, contactType, contactId, location, notes, priority } = req.body;

      // Mock creating event
      const newEvent = {
        id: generateId(),
        title,
        date,
        time,
        duration,
        contactType,
        contactId,
        location,
        notes,
        priority: priority || 'medium',
        status: 'scheduled',
        agencyId: user.agencyId,
        createdBy: user.id,
        createdAt: Date.now()
      };

      res.json(newEvent);
    } catch (error) {
      console.error("Error creating calendar event:", error);
      res.status(500).json({ message: 'שגיאה ביצירת אירוע' });
    }
  });

  // Communications endpoint
  app.get('/api/communications', async (req: any, res) => {
    try {
      if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: 'לא מחובר' });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user || !user.agencyId) {
        return res.status(401).json({ message: 'משתמש לא נמצא' });
      }

      // Mock communications data
      const communications = [];

      res.json(communications);
    } catch (error) {
      console.error("Error fetching communications:", error);
      res.status(500).json([]);
    }
  });

  // Create HTTP server
  const server = createServer(app);

  // Setup WebSocket server
  setupWebSocketServer(server, storage);

  return server;
}