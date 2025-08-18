import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import { storage } from '../storage.ts';

function getArg(name: string): string | undefined {
  const prefix = `--${name}=`;
  const found = process.argv.find(a => a.startsWith(prefix));
  return found ? found.slice(prefix.length) : undefined;
}

async function main() {
  const email = getArg('email');
  if (!email) {
    console.error('Usage: tsx server/scripts/inspect-user.ts --email=user@example.com');
    process.exit(1);
  }

  const user = await storage.getUserByEmail(email);
  if (!user) {
    console.log('User not found');
    return;
  }

  console.log('User:', {
    id: user.id,
    email: user.email,
    hasPassword: Boolean(user.password),
    agencyId: user.agencyId,
    updatedAt: user.updatedAt,
  });
}

main();


