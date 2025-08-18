import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import { db } from '../db.ts';
import { agencies, users, clients, projects, leads, products, quotes, passwordResetTokens } from '@shared/schema-sqlite';
import { eq } from 'drizzle-orm';

function getArg(name: string): string | undefined {
  const prefix = `--${name}=`;
  const found = process.argv.find(a => a.startsWith(prefix));
  return found ? found.slice(prefix.length) : undefined;
}

async function main() {
  const email = getArg('email');
  if (!email) {
    console.error('Usage: tsx server/scripts/purge-user-and-agency.ts --email=user@example.com');
    process.exit(1);
  }

  // Find user
  const [user] = await db.select().from(users).where(eq(users.email, email));
  if (!user) {
    console.log(`No user found for email: ${email}`);
    return;
  }

  const agencyId = user.agencyId as string | null;

  // Delete user's reset tokens and user row
  await db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, user.id as string));
  await db.delete(users).where(eq(users.id, user.id as string));

  if (agencyId) {
    // Delete all users under the same agency (in case there are others created during tests)
    await db.delete(users).where(eq(users.agencyId, agencyId));
    // Delete agency-related data
    await db.delete(leads).where(eq(leads.agencyId, agencyId));
    await db.delete(projects).where(eq(projects.agencyId, agencyId));
    await db.delete(products).where(eq(products.agencyId, agencyId));
    await db.delete(quotes).where(eq(quotes.agencyId, agencyId));
    await db.delete(clients).where(eq(clients.agencyId, agencyId));
    // Finally delete the agency
    await db.delete(agencies).where(eq(agencies.id, agencyId));
    console.log(`Purged agency ${agencyId} and all related data for ${email}`);
  } else {
    console.log(`Deleted user ${email} (no agency associated)`);
  }
}

main();


