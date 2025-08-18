import path from 'path';
import dotenv from 'dotenv';

// Load .env from project root
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import { emailService } from '../email-service.ts';

function parseArg(name: string): string | undefined {
  const prefix = `--${name}=`;
  const found = process.argv.find(a => a.startsWith(prefix));
  return found ? found.slice(prefix.length) : undefined;
}

async function main() {
  const to = parseArg('to') || process.env.TEST_EMAIL_TO;
  if (!to) {
    console.error('Usage: tsx server/scripts/send-test-email.ts --to=recipient@example.com');
    process.exit(1);
  }

  process.env.MOCK_EMAIL = 'false';
  await emailService.initialize();

  const ok = await emailService.sendEmail({
    to,
    subject: 'Test email from BRIXEL7',
    text: 'This is a test email sent via your current SMTP/API configuration.',
    html: '<p>This is a <strong>test email</strong> sent via your current SMTP/API configuration.</p>'
  });

  console.log('Send result:', ok ? 'OK' : 'FAILED');
  if (!ok) process.exitCode = 1;
}

main();


