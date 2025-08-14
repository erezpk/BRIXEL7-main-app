import Database from 'better-sqlite3';

const email = 'techpikado@gmail.com';

try {
  console.log('🔍 פתיחת מסד נתונים...');
  const db = new Database('./app.db');
  
  // חיפוש המשתמש
  console.log(`🔍 חיפוש משתמש עם אימייל: ${email}`);
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  
  if (!user) {
    console.log('❌ משתמש לא נמצא');
    process.exit(1);
  }
  
  console.log(`👤 נמצא משתמש: ${user.fullName} (ID: ${user.id})`);
  console.log(`🏢 סוכנות: ${user.agencyId || 'אין'}`);
  
  // בדיקה אם יש משתמשים נוספים בסוכנות
  if (user.agencyId) {
    const otherUsers = db.prepare('SELECT COUNT(*) as count FROM users WHERE agencyId = ? AND id != ?')
      .get(user.agencyId, user.id);
    
    console.log(`👥 משתמשים נוספים בסוכנות: ${otherUsers.count}`);
    
    if (otherUsers.count === 0) {
      console.log('⚠️  זה המשתמש היחיד בסוכנות - הסוכנות תמחק גם כן');
      
      // מחיקת כל הנתונים הקשורים לסוכנות
      const agency = db.prepare('SELECT name FROM agencies WHERE id = ?').get(user.agencyId);
      if (agency) {
        console.log(`🏢 מוחק סוכנות: ${agency.name}`);
        
        // מחיקת כל הנתונים הקשורים
        db.prepare('DELETE FROM clients WHERE agencyId = ?').run(user.agencyId);
        db.prepare('DELETE FROM projects WHERE agencyId = ?').run(user.agencyId);
        db.prepare('DELETE FROM leads WHERE agencyId = ?').run(user.agencyId);
        db.prepare('DELETE FROM quotes WHERE agencyId = ?').run(user.agencyId);
        db.prepare('DELETE FROM agencies WHERE id = ?').run(user.agencyId);
        
        console.log('🗑️  כל הנתונים של הסוכנות נמחקו');
      }
    }
  }
  
  // מחיקת המשתמש
  console.log('🗑️  מוחק משתמש...');
  const result = db.prepare('DELETE FROM users WHERE email = ?').run(email);
  
  if (result.changes > 0) {
    console.log('✅ המשתמש נמחק בהצלחה!');
  } else {
    console.log('❌ המשתמש לא נמחק');
  }
  
  db.close();
  
} catch (error) {
  console.error('💥 שגיאה במחיקת המשתמש:', error);
  process.exit(1);
}