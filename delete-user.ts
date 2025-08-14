import { storage } from './server/storage';

const email = 'techpikado@gmail.com';

async function deleteUser() {
  try {
    console.log(`🔍 חיפוש משתמש עם אימייל: ${email}`);
    
    // חיפוש המשתמש
    const user = await storage.getUserByEmail(email);
    
    if (!user) {
      console.log('❌ משתמש לא נמצא');
      process.exit(1);
    }
    
    console.log(`👤 נמצא משתמש: ${user.fullName} (ID: ${user.id})`);
    console.log(`🏢 סוכנות: ${user.agencyId || 'אין'}`);
    console.log(`🎭 תפקיד: ${user.role}`);
    
    // בדיקה אם יש משתמשים נוספים בסוכנות
    if (user.agencyId) {
      const allUsersInAgency = await storage.getUsersByAgency(user.agencyId);
      const otherUsers = allUsersInAgency.filter(u => u.id !== user.id);
      
      console.log(`👥 משתמשים נוספים בסוכנות: ${otherUsers.length}`);
      
      if (otherUsers.length === 0) {
        console.log('⚠️  זה המשתמש היחיד בסוכנות');
        
        // קבלת פרטי הסוכנות
        const agency = await storage.getAgency(user.agencyId);
        if (agency) {
          console.log(`🏢 סוכנות שתמחק: ${agency.name}`);
          
          // מחיקת כל הנתונים הקשורים לסוכנות
          console.log('🗑️  מוחק כל הנתונים של הסוכנות...');
          
          try {
            // מחיקת לקוחות
            const clients = await storage.getClientsByAgency(user.agencyId);
            console.log(`📋 מוחק ${clients.length} לקוחות`);
            
            // מחיקת פרויקטים
            const projects = await storage.getProjectsByAgency(user.agencyId);
            console.log(`📁 מוחק ${projects.length} פרויקטים`);
            
            // מחיקת לידים
            const leads = await storage.getLeadsByAgency(user.agencyId);
            console.log(`🎯 מוחק ${leads.length} לידים`);
            
            console.log('🏢 מוחק את הסוכנות...');
            
          } catch (error) {
            console.log('⚠️  שגיאה בקבלת נתוני הסוכנות:', error.message);
          }
        }
      } else {
        console.log(`👥 משתמשים אחרים בסוכנות:`);
        otherUsers.forEach(u => {
          console.log(`   - ${u.fullName} (${u.email}) - ${u.role}`);
        });
      }
    }
    
    // מחיקת המשתמש בפועל
    console.log('🗑️  מוחק את המשתמש...');
    
    // כאן נשתמש במחיקה ישירה מהדאטאבייס
    const db = storage['db']; // גישה ישירה לדאטאבייס
    
    if (user.agencyId) {
      const otherUsers = await storage.getUsersByAgency(user.agencyId);
      if (otherUsers.length === 1) { // רק המשתמש הנוכחי
        // מחק את כל הנתונים של הסוכנות
        await db.run('DELETE FROM clients WHERE agencyId = ?', [user.agencyId]);
        await db.run('DELETE FROM projects WHERE agencyId = ?', [user.agencyId]);
        await db.run('DELETE FROM leads WHERE agencyId = ?', [user.agencyId]);
        await db.run('DELETE FROM quotes WHERE agencyId = ?', [user.agencyId]);
        await db.run('DELETE FROM agencies WHERE id = ?', [user.agencyId]);
        console.log('🗑️  הסוכנות וכל הנתונים שלה נמחקו');
      }
    }
    
    // מחק את המשתמש
    await db.run('DELETE FROM users WHERE email = ?', [email]);
    
    console.log('✅ המשתמש נמחק בהצלחה!');
    
  } catch (error) {
    console.error('💥 שגיאה במחיקת המשתמש:', error);
    process.exit(1);
  }
}

deleteUser().then(() => {
  console.log('🎉 הפעולה הושלמה!');
  process.exit(0);
}).catch((error) => {
  console.error('💥 שגיאה:', error);
  process.exit(1);
});