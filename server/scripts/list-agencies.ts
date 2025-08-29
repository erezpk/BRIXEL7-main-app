import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import { db } from '../db.ts';
import { agencies } from '@shared/schema-sqlite';

async function main() {
  const rows = await db.select({ id: agencies.id, name: agencies.name, slug: agencies.slug, createdAt: agencies.createdAt }).from(agencies);
  if (!rows || rows.length === 0) {
    console.log('No agencies found');
    return;
  }
  console.table(rows.map(r => ({ id: r.id, name: r.name, slug: r.slug, createdAt: new Date(r.createdAt as number).toISOString() })));
}

main();


