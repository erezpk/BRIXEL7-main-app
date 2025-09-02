import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database(path.join(__dirname, 'database.db'));

try {
  // Add new columns to clients table
  console.log('Adding missing columns to clients table...');
  
  const clientsColumns = [
    'business_number TEXT',
    'business_name TEXT',
    'account_manager TEXT',
    'logo TEXT', 
    'website TEXT',
    'instagram TEXT',
    'facebook TEXT',
    'tiktok TEXT',
    'linkedin TEXT',
    'whatsapp TEXT',
    'twitter TEXT',
    'youtube TEXT'
  ];

  for (const column of clientsColumns) {
    try {
      db.exec(`ALTER TABLE clients ADD COLUMN ${column};`);
      console.log(`✅ Added column: ${column}`);
    } catch (error) {
      if (error.message.includes('duplicate column name')) {
        console.log(`⚠️ Column ${column} already exists, skipping...`);
      } else {
        console.error(`❌ Error adding column ${column}:`, error.message);
      }
    }
  }

  // Create contacts table if it doesn't exist
  console.log('Creating contacts table...');
  db.exec(`
    CREATE TABLE IF NOT EXISTS contacts (
      id TEXT PRIMARY KEY,
      agency_id TEXT NOT NULL,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      company TEXT,
      notes TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (agency_id) REFERENCES agencies (id)
    );
  `);
  console.log('✅ Contacts table created/verified');

  // Add foreign key constraints
  console.log('Adding foreign key constraints...');
  try {
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_clients_account_manager ON clients (account_manager);
      CREATE INDEX IF NOT EXISTS idx_contacts_agency_id ON contacts (agency_id);
    `);
    console.log('✅ Indexes created successfully');
  } catch (error) {
    console.error('❌ Error creating indexes:', error.message);
  }

  console.log('🎉 Database migration completed successfully!');
} catch (error) {
  console.error('❌ Migration failed:', error.message);
} finally {
  db.close();
}