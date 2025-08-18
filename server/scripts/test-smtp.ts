import path from 'path';
import dotenv from 'dotenv';

// Load .env from project root explicitly
const envPath = path.resolve(process.cwd(), '.env');
dotenv.config({ path: envPath });

// Ensure real SMTP path in dev
process.env.MOCK_EMAIL = 'false';

// Lazy import after env setup
import { emailService } from '../email-service.ts';

async function main() {
  console.log('--- SMTP Diagnostic ---');
  console.log('NODE_ENV:', process.env.NODE_ENV || '(unset)');
  console.log('MOCK_EMAIL:', process.env.MOCK_EMAIL || '(unset)');

  // Show what provider vars are set (mask secrets)
  const mask = (v?: string) => (v ? v.slice(0, 2) + '***' + v.slice(-2) : '(unset)');

  console.log('[Gmail] GMAIL_USER:', process.env.GMAIL_USER ? 'Set' : 'Not set');
  console.log('[Gmail] GMAIL_APP_PASSWORD:', process.env.GMAIL_APP_PASSWORD ? 'Set' : 'Not set');

  console.log('[Brevo] BREVO_API_KEY:', process.env.BREVO_API_KEY ? 'Set' : 'Not set');
  console.log('[Brevo] BREVO_SENDER_EMAIL:', process.env.BREVO_SENDER_EMAIL ? 'Set' : 'Not set');
  console.log('[Brevo] BREVO_SENDER_NAME:', process.env.BREVO_SENDER_NAME ? 'Set' : 'Not set');

  console.log('[SMTP] SMTP_HOST:', process.env.SMTP_HOST || '(unset)');
  console.log('[SMTP] SMTP_PORT:', process.env.SMTP_PORT || '(unset)');
  console.log('[SMTP] SMTP_SECURE:', process.env.SMTP_SECURE || '(unset)');
  console.log('[SMTP] SMTP_USER:', process.env.SMTP_USER || '(unset)');
  console.log('[SMTP] SMTP_PASSWORD:', process.env.SMTP_PASSWORD ? mask(process.env.SMTP_PASSWORD) : '(unset)');
  console.log('[SMTP] SMTP_FROM:', process.env.SMTP_FROM || '(unset)');

  try {
    await emailService.initialize();
    const ok = await emailService.testConnection();
    console.log('Transport verify:', ok ? 'OK' : 'FAILED');
    if (!ok) process.exitCode = 1;
  } catch (err) {
    console.error('Initialization error:', err);
    process.exitCode = 1;
  }
}

main();


