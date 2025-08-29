import Database from 'better-sqlite3';

console.log('Adding industry column to leads table...');

try {
  const sqlite = new Database('./database.db');
  
  // Add industry column to leads table
  sqlite.exec(`
    ALTER TABLE leads ADD COLUMN industry TEXT;
  `);
  
  console.log('✅ Industry column added successfully!');
  
  // Verify the column was added
  const tableInfo = sqlite.prepare("PRAGMA table_info(leads)").all();
  const hasIndustryColumn = tableInfo.some(col => col.name === 'industry');
  console.log('Industry column exists:', hasIndustryColumn);
  
  sqlite.close();
  
} catch (error) {
  if (error.message.includes('duplicate column name')) {
    console.log('✅ Industry column already exists!');
  } else {
    console.error('❌ Error adding industry column:', error);
  }
}

console.log('Migration completed!');