import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import { db } from '../db.ts';
import { agencies, users, clients, projects, leads, products, quotes } from '@shared/schema-sqlite';
import { eq } from 'drizzle-orm';

function getArg(name: string): string | undefined {
  const prefix = `--${name}=`;
  const found = process.argv.find(a => a.startsWith(prefix));
  return found ? found.slice(prefix.length) : undefined;
}

async function main() {
  const agencyId = getArg('id');
  if (!agencyId) {
    console.error('Usage: tsx server/scripts/delete-agency.ts --id=<agencyId>');
    process.exit(1);
  }

  await db.delete(users).where(eq(users.agencyId, agencyId));
  await db.delete(leads).where(eq(leads.agencyId, agencyId));
  await db.delete(projects).where(eq(projects.agencyId, agencyId));
  await db.delete(products).where(eq(products.agencyId, agencyId));
  await db.delete(quotes).where(eq(quotes.agencyId, agencyId));
  await db.delete(clients).where(eq(clients.agencyId, agencyId));
  await db.delete(agencies).where(eq(agencies.id, agencyId));
  console.log(`Deleted agency ${agencyId} and related data`);
}

main();


