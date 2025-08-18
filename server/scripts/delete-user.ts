import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import { db } from '../db.ts';
import { users, passwordResetTokens } from '@shared/schema-sqlite';
import { eq } from 'drizzle-orm';

function getArg(name: string): string | undefined {
  const prefix = `--${name}=`;
  const found = process.argv.find(a => a.startsWith(prefix));
  return found ? found.slice(prefix.length) : undefined;
}

async function main() {
  const email = getArg('email');
  if (!email) {
    console.error('Usage: tsx server/scripts/delete-user.ts --email=user@example.com');
    process.exit(1);
  }

  const [user] = await db.select().from(users).where(eq(users.email, email));
  if (!user) {
    console.log(`No user found for email: ${email}`);
    return;
  }

  const userId = user.id as string;

  await db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, userId));
  await db.delete(users).where(eq(users.id, userId));

  console.log(`Deleted user ${email} and related password reset tokens`);
}

main();


