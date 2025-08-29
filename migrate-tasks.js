import Database from 'better-sqlite3';

console.log('Creating tasks table...');

try {
  // Connect to SQLite database directly  
  const sqlite = new Database('./database.db');
  
  // Create tasks table if it doesn't exist
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      agency_id TEXT NOT NULL REFERENCES agencies(id),
      project_id TEXT REFERENCES projects(id),
      lead_id TEXT REFERENCES leads(id),
      client_id TEXT REFERENCES clients(id),
      title TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'todo' NOT NULL,
      priority TEXT DEFAULT 'medium' NOT NULL,
      type TEXT DEFAULT 'task' NOT NULL,
      assigned_to TEXT REFERENCES users(id),
      created_by TEXT NOT NULL REFERENCES users(id),
      due_date TEXT,
      start_time TEXT,
      end_time TEXT,
      location TEXT,
      notes TEXT,
      tags TEXT,
      estimated_hours INTEGER,
      actual_hours INTEGER,
      completed_at INTEGER,
      created_at INTEGER DEFAULT (unixepoch() * 1000) NOT NULL,
      updated_at INTEGER DEFAULT (unixepoch() * 1000) NOT NULL
    );
  `);
  
  console.log('✅ Tasks table created successfully!');
  
  // Check if table was created
  const tables = sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='tasks'").all();
  console.log('Tasks table exists:', tables.length > 0);
  
  sqlite.close();
  
} catch (error) {
  console.error('❌ Error creating tasks table:', error);
}

console.log('Migration completed!');