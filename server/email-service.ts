import * as nodemailer from 'nodemailer';
import Brevo from '@getbrevo/brevo';

interface EmailParams {
  to: string;
  from?: string;
  subject: string;
  text?: string;
  html?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer;
    contentType: string;
  }>;
}

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: string;
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private config: EmailConfig | null = null;
  private useBrevo: boolean = false;
  private brevo: {
    transactionalApi: Brevo.TransactionalEmailsApi;
    accountApi: Brevo.AccountApi;
    senderEmail: string;
    senderName?: string;
  } | null = null;

  async initialize() {
    console.log('🔄 Initializing email service...');
    console.log('Gmail User:', process.env.GMAIL_USER ? 'Set' : 'Not set');
    console.log('Gmail App Password:', process.env.GMAIL_APP_PASSWORD ? 'Set' : 'Not set');
    console.log('Brevo API Key:', process.env.BREVO_API_KEY ? 'Set' : 'Not set');
    
    // In development, default to a mock email transport to avoid SMTP errors
    if (process.env.NODE_ENV !== 'production' && process.env.MOCK_EMAIL !== 'false') {
      this.config = {
        host: 'mock',
        port: 0,
        secure: false,
        auth: { user: 'mock', pass: 'mock' },
        from: process.env.GMAIL_USER || 'no-reply@localhost'
      } as any;
      this.transporter = nodemailer.createTransport({ jsonTransport: true });
      console.log('📨 Email service running in MOCK mode (development). Emails will be logged, not sent.');
      console.log('ℹ️  To test real SMTP in dev, set env MOCK_EMAIL=false and provide valid credentials.');
      return;
    }

    // Prefer Brevo (Sendinblue) transactional emails if configured
    if (process.env.BREVO_API_KEY && process.env.BREVO_SENDER_EMAIL) {
      const apiKey = process.env.BREVO_API_KEY;
      const senderEmail = process.env.BREVO_SENDER_EMAIL as string;
      const senderName = process.env.BREVO_SENDER_NAME;

      const transactionalApi = new Brevo.TransactionalEmailsApi();
      transactionalApi.setApiKey(Brevo.TransactionalEmailsApiApiKeys.apiKey, apiKey as string);
      const accountApi = new Brevo.AccountApi();
      accountApi.setApiKey(Brevo.AccountApiApiKeys.apiKey, apiKey as string);

      this.useBrevo = true;
      this.brevo = { transactionalApi, accountApi, senderEmail, senderName };
      this.config = {
        host: 'brevo',
        port: 0,
        secure: true,
        auth: { user: 'brevo', pass: 'apiKey' },
        from: senderEmail
      } as any;

      try {
        await accountApi.getAccount();
        console.log('✅ Brevo API connection verified successfully');
        console.log(`📧 Email service ready with Brevo: ${senderName || senderEmail}`);
      } catch (error) {
        console.error('❌ Brevo API verification failed:', error);
        this.useBrevo = false;
        this.brevo = null;
        this.config = null;
      }
    }
    // Check for Gmail credentials next
    else if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
      this.config = {
        host: 'smtp.gmail.com',
        port: 587,
        secure: false, // true for 465, false for other ports
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_APP_PASSWORD
        },
        from: process.env.GMAIL_USER
      };

      this.transporter = nodemailer.createTransport(this.config);
      
      // Verify connection
      try {
        await this.transporter.verify();
        console.log('✅ Gmail SMTP connection verified successfully');
        console.log(`📧 Email service ready with Gmail: ${process.env.GMAIL_USER}`);
      } catch (error) {
        console.error('❌ Gmail SMTP verification failed:', error);
        this.transporter = null;
        this.config = null;
      }
    }
    // Fallback to generic SMTP if configured
    else if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD) {
      this.config = {
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD
        },
        from: process.env.SMTP_FROM || process.env.SMTP_USER
      };

      this.transporter = nodemailer.createTransport(this.config);
      
      // Verify connection
      try {
        await this.transporter.verify();
        console.log('✅ SMTP connection verified successfully');
      } catch (error) {
        console.error('❌ SMTP verification failed:', error);
        this.transporter = null;
        this.config = null;
      }
    } else {
      console.warn('⚠️ Email service not configured - no SMTP credentials found');
      console.warn('💡 To enable email: Set GMAIL_USER and GMAIL_APP_PASSWORD environment variables');
    }
  }

  async sendEmail(params: EmailParams): Promise<boolean> {
    if (!this.useBrevo && (!this.transporter || !this.config)) {
      console.error('Email service not initialized or configured');
      return false;
    }

    try {
      if (this.useBrevo && this.brevo) {
        const sendSmtpEmail = new Brevo.SendSmtpEmail();
        const senderName = params.from?.split('@')[0] || this.brevo.senderName || 'HORIZON-X';

        sendSmtpEmail.sender = { email: this.brevo.senderEmail, name: senderName } as any;
        sendSmtpEmail.replyTo = params.from ? { email: params.from } as any : undefined;
        sendSmtpEmail.to = [{ email: params.to }] as any;
        sendSmtpEmail.subject = params.subject;
        if (params.html) sendSmtpEmail.htmlContent = params.html;
        if (params.text) sendSmtpEmail.textContent = params.text;

        if (params.attachments && params.attachments.length > 0) {
          (sendSmtpEmail as any).attachment = params.attachments.map(att => ({
            name: att.filename,
            content: att.content.toString('base64')
          }));
        }

        const result = await this.brevo.transactionalApi.sendTransacEmail(sendSmtpEmail);
        console.log('📧 Email sent successfully via Brevo:', (result as any).messageId || 'OK');
        if ((sendSmtpEmail as any).attachment) {
          console.log(`📎 Email sent with ${(sendSmtpEmail as any).attachment.length} attachment(s)`);
        }
        return true;
      } else {
        const mailOptions: any = {
          from: `"${params.from?.split('@')[0] || 'HORIZON-X'}" <${this.config!.from}>`,
          replyTo: params.from,
          to: params.to,
          subject: params.subject,
          text: params.text,
          html: params.html
        };

        if (params.attachments && params.attachments.length > 0) {
          mailOptions.attachments = params.attachments;
        }

        const result = await this.transporter!.sendMail(mailOptions);
        console.log('📧 Email sent successfully:', result.messageId);
        if (mailOptions.attachments) {
          console.log(`📎 Email sent with ${mailOptions.attachments.length} attachment(s)`);
        }
        return true;
      }
    } catch (error) {
      console.error('❌ Email sending failed:', error);
      return false;
    }
  }

  // Email templates for common use cases
  async sendWelcomeEmail(to: string, userName: string): Promise<boolean> {
    const html = `
      <div dir="rtl" style="font-family: Arial, sans-serif; direction: rtl; text-align: right;">
        <h2>ברוכים הבאים ל-AgencyCRM!</h2>
        <p>שלום ${userName},</p>
        <p>תודה שהצטרפת למערכת ניהול הלקוחות שלנו. אנחנו שמחים שבחרת בנו לנהל את העסק שלך.</p>
        <p>כעת תוכל:</p>
        <ul>
          <li>לנהל לקוחות ופרויקטים</li>
          <li>לעקוב אחר לידים חדשים</li>
          <li>לנהל משימות וזמנים</li>
          <li>לקבל דוחות מפורטים</li>
        </ul>
        <p>אם יש לך שאלות, אנחנו כאן לעזור!</p>
        <p>בהצלחה,<br>צוות AgencyCRM</p>
      </div>
    `;

    return this.sendEmail({
      to,
      subject: 'ברוכים הבאים ל-AgencyCRM',
      html,
      text: `שלום ${userName}, ברוכים הבאים ל-AgencyCRM! תודה שהצטרפת למערכת ניהול הלקוחות שלנו.`
    });
  }

  async sendLeadNotification(to: string, leadName: string, leadEmail: string): Promise<boolean> {
    const html = `
      <div dir="rtl" style="font-family: Arial, sans-serif; direction: rtl; text-align: right;">
        <h2>ליד חדש התקבל!</h2>
        <p>ליד חדש נוסף למערכת:</p>
        <ul>
          <li><strong>שם:</strong> ${leadName}</li>
          <li><strong>אימייל:</strong> ${leadEmail}</li>
        </ul>
        <p>היכנס למערכת כדי לנהל את הליד החדש.</p>
      </div>
    `;

    return this.sendEmail({
      to,
      subject: 'ליד חדש - AgencyCRM',
      html,
      text: `ליד חדש: ${leadName} (${leadEmail})`
    });
  }

  async sendProjectUpdate(to: string, projectName: string, status: string): Promise<boolean> {
    const statusText = status === 'completed' ? 'הושלם' : 'עודכן';
    
    const html = `
      <div dir="rtl" style="font-family: Arial, sans-serif; direction: rtl; text-align: right;">
        <h2>עדכון פרויקט</h2>
        <p>הפרויקט "${projectName}" ${statusText}.</p>
        <p>היכנס למערכת לפרטים נוספים.</p>
      </div>
    `;

    return this.sendEmail({
      to,
      subject: `עדכון פרויקט: ${projectName}`,
      html,
      text: `הפרויקט "${projectName}" ${statusText}.`
    });
  }

  async sendPasswordReset(to: string, resetToken: string): Promise<boolean> {
    const resetUrl = `${process.env.BASE_URL || 'http://localhost:5000'}/auth/reset-password?token=${resetToken}`;
    
    const html = `
      <div dir="rtl" style="font-family: Arial, sans-serif; direction: rtl; text-align: right;">
        <h2>איפוס סיסמה</h2>
        <p>קיבלת בקשה לאיפוס סיסמה לחשבון שלך ב-AgencyCRM.</p>
        <p>לחץ על הקישור הבא כדי לאפס את הסיסמה:</p>
        <p><a href="${resetUrl}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">איפוס סיסמה</a></p>
        <p>הקישור תקף למשך 24 שעות.</p>
        <p>אם לא ביקשת איפוס סיסמה, התעלם מהאימייל הזה.</p>
      </div>
    `;

    return this.sendEmail({
      to,
      from: this.config?.from,
      subject: 'איפוס סיסמה - AgencyCRM',
      html,
      text: `איפוס סיסמה: ${resetUrl}`
    });
  }

  async sendTaskAssignment(to: string, taskName: string, projectName: string, dueDate?: string): Promise<boolean> {
    const dueDateText = dueDate ? `עד תאריך: ${new Date(dueDate).toLocaleDateString('he-IL')}` : '';
    
    const html = `
      <div dir="rtl" style="font-family: Arial, sans-serif; direction: rtl; text-align: right;">
        <h2>משימה חדשה הוקצתה לך</h2>
        <p>הוקצתה לך משימה חדשה:</p>
        <ul>
          <li><strong>משימה:</strong> ${taskName}</li>
          <li><strong>פרויקט:</strong> ${projectName}</li>
          ${dueDate ? `<li><strong>תאריך יעד:</strong> ${dueDateText}</li>` : ''}
        </ul>
        <p>היכנס למערכת לפרטים נוספים.</p>
      </div>
    `;

    return this.sendEmail({
      to,
      subject: `משימה חדשה: ${taskName}`,
      html,
      text: `משימה חדשה: ${taskName} בפרויקט ${projectName} ${dueDateText}`
    });
  }

  async sendClientCredentials(emailData: { to: string; clientName: string; username: string; password: string; loginUrl: string; agencyName: string; }): Promise<boolean> {
    const html = `
      <div dir="rtl" style="font-family: Arial, sans-serif; direction: rtl; text-align: right;">
        <h2>פרטי התחברות למערכת</h2>
        <p>שלום ${emailData.clientName},</p>
        <p>קיבלת גישה למערכת ${emailData.agencyName}.</p>
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>שם משתמש:</strong> ${emailData.username}</p>
          <p><strong>סיסמה:</strong> ${emailData.password}</p>
          <p><strong>קישור למערכת:</strong> <a href="${emailData.loginUrl}">${emailData.loginUrl}</a></p>
        </div>
        <p>מומלץ לשנות את הסיסמה בכניסה הראשונה.</p>
        <p>בברכה,<br>${emailData.agencyName}</p>
      </div>
    `;

    return this.sendEmail({
      to: emailData.to,
      subject: `פרטי התחברות למערכת - ${emailData.agencyName}`,
      html,
      text: `שלום ${emailData.clientName}, קיבלת גישה למערכת ${emailData.agencyName}. שם משתמש: ${emailData.username}, סיסמה: ${emailData.password}, קישור: ${emailData.loginUrl}`
    });
  }

  async testConnection(): Promise<boolean> {
    if (this.useBrevo && this.brevo) {
      try {
        await this.brevo.accountApi.getAccount();
        return true;
      } catch (error) {
        console.error('Email connection test failed (Brevo):', error);
        return false;
      }
    }

    if (!this.transporter) {
      return false;
    }

    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      console.error('Email connection test failed:', error);
      return false;
    }
  }

  isConfigured(): boolean {
    return this.transporter !== null && this.config !== null;
  }
}

// Create singleton instance
const emailService = new EmailService();

export { emailService, EmailService };
export type { EmailParams };