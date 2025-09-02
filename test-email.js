import { emailService } from './server/email-service.ts';

console.log('🧪 Testing email service...');

async function testEmail() {
    try {
        console.log('📧 Initializing email service...');
        await emailService.initialize();
        
        console.log('📨 Sending test email...');
        const success = await emailService.sendEmail({
            to: 'errz190@gmail.com',
            subject: 'אימייל בדיקה מהמערכת AgencyCRM',
            text: `שלום,

זהו אימייל בדיקה מהמערכת החדשה של AgencyCRM.

✅ המערכת עובדת כרגיל!
✅ שליחת אימיילים פועלת
✅ ההיסטוריה מציגה נתונים אמיתיים
✅ יישור לימין תוקן

המערכת מוכנה לשימוש!

בברכה,
מערכת AgencyCRM`,
            html: `<div dir="rtl" style="font-family: Arial, sans-serif; text-align: right;">
                <h2>שלום,</h2>
                <p>זהו אימייל בדיקה מהמערכת החדשה של AgencyCRM.</p>
                <ul>
                    <li>✅ המערכת עובדת כרגיל!</li>
                    <li>✅ שליחת אימיילים פועלת</li>
                    <li>✅ ההיסטוריה מציגה נתונים אמיתיים</li>
                    <li>✅ יישור לימין תוקן</li>
                </ul>
                <p><strong>המערכת מוכנה לשימוש!</strong></p>
                <p>בברכה,<br>מערכת AgencyCRM</p>
            </div>`
        });
        
        if (success) {
            console.log('✅ Email sent successfully to errz190@gmail.com');
        } else {
            console.log('❌ Failed to send email');
        }
    } catch (error) {
        console.error('❌ Error testing email:', error);
    }
}

testEmail();