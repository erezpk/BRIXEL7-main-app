import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupWebSocketServer } from "./websocket";
import express from "express";
import { emailService } from "./email-service.js";
import crypto from 'crypto';
import { setupAuth } from "./replitAuth";
import bcrypt from 'bcrypt';
import { verifyGoogleToken } from "./google-auth";
import './types';

// Placeholder for generateId function
function generateId(): string {
  return crypto.randomBytes(16).toString('hex');
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware - skip if SKIP_AUTH is set
  if (!process.env.SKIP_AUTH) {
    await setupAuth(app);
  } else {
    console.log('Auth setup skipped based on SKIP_AUTH environment variable');
  }

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
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
        // Don't reveal if user exists
        return res.json({ message: 'אם האימייל קיים במערכת, תקבל הוראות לאיפוס סיסמה' });
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

      // Get recent activity for the agency
      // TODO: Implement activityLog table in SQLite schema
      const activities = []; // Empty array for now since we're using SQLite
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

      const client = await storage.createClient(clientData);
      res.json(client);
    } catch (error) {
      console.error("Error creating client:", error);
      res.status(500).json({ message: "Failed to create client" });
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

  // Create HTTP server
  const server = createServer(app);

  // Setup WebSocket server
  setupWebSocketServer(server, storage);

  return server;
}