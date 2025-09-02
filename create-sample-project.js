import sqlite3 from 'sqlite3';
import crypto from 'crypto';

// Open database
const db = new sqlite3.Database('./database.db');

// Generate IDs
const projectId = crypto.randomUUID();
const clientId = crypto.randomUUID();
const agencyId = '1'; // Assuming agency with ID 1 exists

console.log('Creating sample project...');

// Create a sample client first
db.run(`
  INSERT OR IGNORE INTO clients (id, agencyId, name, email, phone, industry, status, createdAt, updatedAt)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`, [clientId, agencyId, 'לקוח לדוגמה', 'client@example.com', '050-1234567', 'technology', 'active', Date.now(), Date.now()], function(err) {
  if (err) {
    console.error('Error creating client:', err);
    return;
  }
  
  console.log('Client created with ID:', clientId);
  
  // Create a sample project
  db.run(`
    INSERT OR IGNORE INTO projects (id, agencyId, clientId, name, description, type, status, priority, startDate, budget, createdBy, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    projectId,
    agencyId,
    clientId,
    'פרויקט דיגיטלי לדוגמה',
    'פרויקט פיתוח אתר עם מערכת ניהול תוכן',
    'website',
    'in_progress',
    'high',
    new Date().toISOString().split('T')[0],
    50000, // 500 NIS
    '1', // Assuming user ID 1 exists
    Date.now(),
    Date.now()
  ], function(err) {
    if (err) {
      console.error('Error creating project:', err);
      return;
    }
    
    console.log('Project created successfully!');
    console.log('Project ID:', projectId);
    console.log('Client ID:', clientId);
    
    // Query to verify
    db.get('SELECT * FROM projects WHERE id = ?', [projectId], (err, row) => {
      if (err) {
        console.error('Error verifying project:', err);
      } else if (row) {
        console.log('Project verified:', row.name);
      }
      
      db.close();
    });
  });
});