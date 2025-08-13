// Google OAuth token verification
import { OAuth2Client } from 'google-auth-library';

// Lazily initialize Google OAuth client to avoid crashing server when env is missing
const googleClientId = process.env.GOOGLE_CLIENT_ID;
let client: OAuth2Client | null = null;
function getGoogleClient(): OAuth2Client {
  if (!googleClientId) {
    throw new Error('Google login not configured: missing GOOGLE_CLIENT_ID');
  }
  if (!client) {
    client = new OAuth2Client(googleClientId);
  }
  return client;
}

export interface GoogleUserInfo {
  email: string;
  name: string;
  picture?: string;
  email_verified: boolean;
}

export async function verifyGoogleToken(idToken: string): Promise<GoogleUserInfo> {
  try {
    const ticket = await getGoogleClient().verifyIdToken({
      idToken: idToken,
      audience: googleClientId,
    });

    const payload = ticket.getPayload();
    
    if (!payload) {
      throw new Error('Invalid token payload');
    }

    if (!payload.email || !payload.email_verified) {
      throw new Error('Email not verified or missing');
    }

    console.log({
      email: payload.email,
      name: payload.name || payload.email,
      picture: payload.picture,
      email_verified: payload.email_verified || false,
    });
    

    return {
      email: payload.email,
      name: payload.name || payload.email,
      picture: payload.picture,
      email_verified: payload.email_verified || false,
    };
  } catch (error) {
    console.error('Google token verification error:', error);
    throw new Error('Invalid Google token');
  }
}
