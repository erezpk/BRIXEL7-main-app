import crypto from 'crypto';

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
}

export interface OAuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  scope: string;
  tokenType?: string;
}

export class OAuthService {
  private readonly configs: Record<string, OAuthConfig> = {};

  constructor() {
    // Initialize OAuth configurations from environment variables
    this.configs.meta = {
      clientId: process.env.META_CLIENT_ID || '',
      clientSecret: process.env.META_CLIENT_SECRET || '',
      redirectUri: process.env.META_REDIRECT_URI || 'http://localhost:5000/oauth/meta/callback',
      scopes: ['ads_management', 'ads_read', 'pages_read_engagement']
    };

    this.configs.google_ads = {
      clientId: process.env.GOOGLE_ADS_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_ADS_CLIENT_SECRET || '',
      redirectUri: process.env.GOOGLE_ADS_REDIRECT_URI || 'http://localhost:5000/oauth/google-ads/callback',
      scopes: ['https://www.googleapis.com/auth/adwords']
    };

    this.configs.google_analytics = {
      clientId: process.env.GOOGLE_ANALYTICS_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_ANALYTICS_CLIENT_SECRET || '',
      redirectUri: process.env.GOOGLE_ANALYTICS_REDIRECT_URI || 'http://localhost:5000/oauth/google-analytics/callback',
      scopes: ['https://www.googleapis.com/auth/analytics.readonly']
    };
  }

  // Generate OAuth authorization URL
  generateAuthUrl(platform: string, state?: string): string {
    const config = this.configs[platform];
    if (!config) {
      throw new Error(`Unsupported OAuth platform: ${platform}`);
    }

    // Generate state parameter for CSRF protection if not provided
    const stateParam = state || crypto.randomBytes(32).toString('hex');

    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      scope: config.scopes.join(' '),
      response_type: 'code',
      state: stateParam,
    });

    // Platform-specific authorization URLs
    const authUrls = {
      meta: 'https://www.facebook.com/v18.0/dialog/oauth',
      google_ads: 'https://accounts.google.com/o/oauth2/v2/auth',
      google_analytics: 'https://accounts.google.com/o/oauth2/v2/auth'
    };

    const baseUrl = authUrls[platform as keyof typeof authUrls];
    if (!baseUrl) {
      throw new Error(`No authorization URL configured for platform: ${platform}`);
    }

    // Add platform-specific parameters
    if (platform.startsWith('google')) {
      params.append('access_type', 'offline');
      params.append('prompt', 'consent');
    }

    return `${baseUrl}?${params.toString()}`;
  }

  // Exchange authorization code for access token
  async exchangeCodeForTokens(platform: string, code: string, state?: string): Promise<OAuthTokens> {
    const config = this.configs[platform];
    if (!config) {
      throw new Error(`Unsupported OAuth platform: ${platform}`);
    }

    const tokenUrls = {
      meta: 'https://graph.facebook.com/v18.0/oauth/access_token',
      google_ads: 'https://oauth2.googleapis.com/token',
      google_analytics: 'https://oauth2.googleapis.com/token'
    };

    const tokenUrl = tokenUrls[platform as keyof typeof tokenUrls];
    if (!tokenUrl) {
      throw new Error(`No token URL configured for platform: ${platform}`);
    }

    const tokenParams = new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code: code,
      redirect_uri: config.redirectUri,
      grant_type: 'authorization_code'
    });

    try {
      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: tokenParams.toString()
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OAuth token exchange failed: ${response.status} ${errorText}`);
      }

      const tokenData = await response.json();

      // Normalize token response across platforms
      const expiresIn = tokenData.expires_in || 3600; // Default to 1 hour if not provided
      const expiresAt = Date.now() + (expiresIn * 1000);

      return {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresAt: expiresAt,
        scope: tokenData.scope || config.scopes.join(' '),
        tokenType: tokenData.token_type || 'Bearer'
      };
    } catch (error) {
      console.error(`OAuth token exchange failed for ${platform}:`, error);
      throw new Error(`Failed to exchange authorization code for tokens: ${error.message}`);
    }
  }

  // Refresh access token using refresh token
  async refreshAccessToken(platform: string, refreshToken: string): Promise<OAuthTokens> {
    const config = this.configs[platform];
    if (!config) {
      throw new Error(`Unsupported OAuth platform: ${platform}`);
    }

    const tokenUrls = {
      meta: 'https://graph.facebook.com/v18.0/oauth/access_token',
      google_ads: 'https://oauth2.googleapis.com/token',
      google_analytics: 'https://oauth2.googleapis.com/token'
    };

    const tokenUrl = tokenUrls[platform as keyof typeof tokenUrls];
    if (!tokenUrl) {
      throw new Error(`No token URL configured for platform: ${platform}`);
    }

    const refreshParams = new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    });

    try {
      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: refreshParams.toString()
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OAuth token refresh failed: ${response.status} ${errorText}`);
      }

      const tokenData = await response.json();

      const expiresIn = tokenData.expires_in || 3600;
      const expiresAt = Date.now() + (expiresIn * 1000);

      return {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || refreshToken, // Some platforms don't return new refresh token
        expiresAt: expiresAt,
        scope: tokenData.scope || config.scopes.join(' '),
        tokenType: tokenData.token_type || 'Bearer'
      };
    } catch (error) {
      console.error(`OAuth token refresh failed for ${platform}:`, error);
      throw new Error(`Failed to refresh access token: ${error.message}`);
    }
  }

  // Validate and get account information using access token
  async validateToken(platform: string, accessToken: string): Promise<any> {
    try {
      const validationUrls = {
        meta: 'https://graph.facebook.com/v18.0/me/adaccounts?fields=account_id,name,account_status&access_token=' + accessToken,
        google_ads: 'https://googleads.googleapis.com/v14/customers:listAccessibleCustomers',
        google_analytics: 'https://www.googleapis.com/analytics/v3/management/accounts'
      };

      const url = validationUrls[platform as keyof typeof validationUrls];
      if (!url) {
        throw new Error(`No validation URL configured for platform: ${platform}`);
      }

      const headers: Record<string, string> = {};
      
      // Platform-specific headers
      if (platform.startsWith('google')) {
        headers['Authorization'] = `Bearer ${accessToken}`;
        headers['Content-Type'] = 'application/json';
      }

      const response = await fetch(url, {
        method: 'GET',
        headers
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Token validation failed: ${response.status} ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Token validation failed for ${platform}:`, error);
      throw new Error(`Failed to validate access token: ${error.message}`);
    }
  }

  // Check if token is expired and needs refresh
  isTokenExpired(expiresAt: number, bufferMinutes: number = 5): boolean {
    const bufferTime = bufferMinutes * 60 * 1000; // Convert to milliseconds
    return Date.now() >= (expiresAt - bufferTime);
  }

  // Get platform configuration
  getConfig(platform: string): OAuthConfig | null {
    return this.configs[platform] || null;
  }

  // Revoke access token
  async revokeToken(platform: string, accessToken: string): Promise<boolean> {
    try {
      const revokeUrls = {
        meta: `https://graph.facebook.com/v18.0/me/permissions?access_token=${accessToken}`,
        google_ads: `https://oauth2.googleapis.com/revoke?token=${accessToken}`,
        google_analytics: `https://oauth2.googleapis.com/revoke?token=${accessToken}`
      };

      const url = revokeUrls[platform as keyof typeof revokeUrls];
      if (!url) {
        throw new Error(`No revoke URL configured for platform: ${platform}`);
      }

      const response = await fetch(url, {
        method: platform === 'meta' ? 'DELETE' : 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        }
      });

      return response.ok;
    } catch (error) {
      console.error(`Token revocation failed for ${platform}:`, error);
      return false;
    }
  }
}

// Export singleton instance
export const oauthService = new OAuthService();