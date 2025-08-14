import { drizzle } from 'drizzle-orm/better-sqlite3';
import { eq, and, ne } from 'drizzle-orm';
import Database from 'better-sqlite3';
import { users, agencies } from './shared/schema.js';

const db = drizzle(new Database('./app.db'));

async function deleteUser(email) {
  try {
    console.log(`🔍 חיפוש משתמש עם אימייל: ${email}`);
    
    // מצא את המשתמש
    const user = await db.select().from(users).where(eq(users.email, email)).get();
    
    if (!user) {
      console.log('❌ משתמש לא נמצא');
      process.exit(1);
    }
    
    console.log(`👤 נמצא משתמש: ${user.fullName} (ID: ${user.id})`);
    console.log(`🏢 סוכנות: ${user.agencyId}`);
    
    // בדיקה אם זה המשתמש היחיד בסוכנות
    if (user.agencyId) {
      const otherUsers = await db.select().from(users)
        .where(and(
          eq(users.agencyId, user.agencyId),
          ne(users.id, user.id) // לא כולל את המשתמש הנוכחי
        )).all();
      
      if (otherUsers.length === 0) {
        console.log('⚠️  זה המשתמש היחיד בסוכנות - הסוכנות תמחק גם כן');
        
        // מחק את הסוכנות
        await db.delete(agencies).where(eq(agencies.id, user.agencyId));
        console.log('🗑️  סוכנות נמחקה');
      }
    }
    
    // מחק את המשתמש
    const result = await db.delete(users).where(eq(users.email, email));
    
    console.log('✅ משתמש נמחק בהצלחה!');
    
  } catch (error) {
    console.error('💥 שגיאה במחיקת המשתמש:', error);
    process.exit(1);
  }
}

// הפעל את הפונקציה עם האימייל
const email = process.argv[2];
if (!email) {
  console.log('❌ חסר אימייל. שימוש: node delete-user.js EMAIL');
  process.exit(1);
}

deleteUser(email);