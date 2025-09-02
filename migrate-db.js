import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database(path.join(__dirname, 'database.db'));

try {
  // Add new columns to clients table
  console.log('Adding new columns to clients table...');
  
  db.exec(`
    ALTER TABLE clients ADD COLUMN business_number TEXT;
    ALTER TABLE clients ADD COLUMN business_name TEXT;  
    ALTER TABLE clients ADD COLUMN account_manager TEXT;
    ALTER TABLE clients ADD COLUMN logo TEXT;
  `);
  
  console.log('✅ Successfully added new columns to clients table');
} catch (error) {
  if (error.message.includes('duplicate column name')) {
    console.log('⚠️ Columns already exist, skipping...');
  } else {
    console.error('❌ Error:', error.message);
  }
} finally {
  db.close();
}