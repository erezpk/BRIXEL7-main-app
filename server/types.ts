// Type extensions for express-session
declare module 'express-session' {
  interface SessionData {
    userId?: string;
  }
}

// Extend Express types
declare global {
  namespace Express {
    interface User {
      id: string;
      email: string;
      fullName: string;
      role: string;
      agencyId: string | null;
      avatar?: string | null;
    }
  }
}
