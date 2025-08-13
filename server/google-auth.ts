// Google OAuth token verification
import { OAuth2Client } from 'google-auth-library';

// Lazily initialize Google OAuth client
let client: OAuth2Client | null = null;
function getGoogleClient(): OAuth2Client {
  // Get the client ID at runtime, not at module load time
  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  
  if (!googleClientId) {
    console.log('❌ Google Client ID is missing. Available env vars:', Object.keys(process.env).filter(k => k.startsWith('GOOGLE')));
    throw new Error('Google login not configured: missing GOOGLE_CLIENT_ID');
  }
  
  if (!client) {
    console.log('✅ Initializing Google OAuth client with ID:', googleClientId.substring(0, 20) + '...');
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
    const googleClientId = process.env.GOOGLE_CLIENT_ID; // Get at runtime
    
    // First, let's decode the token to see what audience it has
    const tokenParts = idToken.split('.');
    if (tokenParts.length === 3) {
      try {
        const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
        console.log('🔍 Token audience (aud):', payload.aud);
        console.log('🔍 Expected audience:', googleClientId);
      } catch (e) {
        console.log('Could not decode token payload for debugging');
      }
    }
    
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
