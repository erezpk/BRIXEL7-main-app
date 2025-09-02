import { storage } from './server/storage.ts';

async function setupDemoData() {
  console.log('Setting up demo data...');
  
  try {
    // Create demo agency
    const agency = await storage.createAgency({
      name: 'סוכנות דיגיטלית לדוגמה',
      slug: 'demo-agency',
      industry: 'digital-marketing',
      settings: JSON.stringify({
        timezone: 'Asia/Jerusalem',
        language: 'he',
        currency: 'ILS'
      })
    });
    console.log('Agency created:', agency.id);

    // Create demo user
    const user = await storage.createUser({
      email: 'horizonxoffice@gmail.com',
      fullName: 'משתמש לדוגמה',
      role: 'agency_admin',
      agencyId: agency.id,
      isActive: true
    });
    console.log('User created:', user.id);

    // Create demo client
    const client = await storage.createClient({
      agencyId: agency.id,
      name: 'לקוח לדוגמה',
      email: 'client@example.com',
      phone: '050-1234567',
      industry: 'technology',
      status: 'active'
    });
    console.log('Client created:', client.id);

    // Create demo projects
    const projects = [
      {
        agencyId: agency.id,
        clientId: client.id,
        name: 'פיתוח אתר קורפורטיבי',
        description: 'פיתוח אתר חברה מתקדם עם מערכת ניהול תוכן',
        type: 'website',
        status: 'in_progress',
        priority: 'high',
        startDate: new Date().toISOString().split('T')[0],
        budget: 25000, // 250 NIS
        createdBy: user.id
      },
      {
        agencyId: agency.id,
        clientId: client.id,
        name: 'קמפיין שיווקי במדיות החברתיות',
        description: 'קמפיין פרסום ממוקד בפייסבוק ואינסטגרם',
        type: 'marketing',
        status: 'planning',
        priority: 'medium',
        startDate: new Date().toISOString().split('T')[0],
        budget: 15000, // 150 NIS
        createdBy: user.id
      },
      {
        agencyId: agency.id,
        clientId: client.id,
        name: 'מערכת ליד גנרציה',
        description: 'פיתוח מערכת לייצור וניהול לידים',
        type: 'lead_gen',
        status: 'active',
        priority: 'urgent',
        startDate: new Date().toISOString().split('T')[0],
        budget: 35000, // 350 NIS
        createdBy: user.id
      }
    ];

    for (const projectData of projects) {
      const project = await storage.createProject(projectData);
      console.log('Project created:', project.name);
    }

    console.log('✅ Demo data setup completed successfully!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error setting up demo data:', error);
    process.exit(1);
  }
}

setupDemoData();