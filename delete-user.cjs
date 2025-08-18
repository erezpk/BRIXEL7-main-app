#!/usr/bin/env node
const Database = require('better-sqlite3');
const path = require('path');

// Connect to the database
const dbPath = path.join(__dirname, 'app.db');
const db = new Database(dbPath);

try {
  // First, let's check if the user exists
  const userEmail = 'techpikado@gmail.com';
  console.log(`Looking for user: ${userEmail}`);
  
  const checkUser = db.prepare('SELECT * FROM users WHERE email = ?');
  const user = checkUser.get(userEmail);
  
  if (!user) {
    console.log(`❌ User ${userEmail} not found in database`);
    process.exit(1);
  }
  
  console.log(`✅ Found user: ${userEmail} (ID: ${user.id})`);
  console.log(`   Name: ${user.fullName || user.firstName + ' ' + user.lastName || 'N/A'}`);
  console.log(`   Role: ${user.role}`);
  console.log(`   Agency ID: ${user.agencyId || 'N/A'}`);
  
  // Delete the user
  const deleteUser = db.prepare('DELETE FROM users WHERE email = ?');
  const result = deleteUser.run(userEmail);
  
  if (result.changes > 0) {
    console.log(`✅ Successfully deleted user ${userEmail}`);
    console.log(`   Deleted ${result.changes} row(s)`);
  } else {
    console.log(`❌ Failed to delete user ${userEmail}`);
  }
  
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
} finally {
  // Close database connection
  db.close();
  console.log('Database connection closed');
}
