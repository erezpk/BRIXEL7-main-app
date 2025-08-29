import Database from 'better-sqlite3';

console.log('Adding sample data to database...');

const sqlite = new Database('./database.db');

// Add sample agency
const agencyId = 'test-agency-123';
sqlite.prepare(`
  INSERT OR REPLACE INTO agencies (id, name, slug, industry, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?)
`).run(agencyId, 'סוכנות דיגיטל', 'digital-agency', 'marketing', Date.now(), Date.now());

// Add sample user
const userId = 'test-user-123';
sqlite.prepare(`
  INSERT OR REPLACE INTO users (id, email, first_name, last_name, role, agency_id, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`).run(userId, 'test@example.com', 'משה', 'כהן', 'agency_admin', agencyId, Date.now(), Date.now());

// Add sample leads
const leads = [
  {
    id: 'lead-1',
    agency_id: agencyId,
    name: 'יוסי לוי',
    email: 'yossi@example.com',
    phone: '050-1234567',
    source: 'facebook_ads',
    campaign_id: 'camp_123',
    campaign_name: 'קמפיין פייסבוק חדש',
    status: 'new',
    priority: 'high',
    created_at: Date.now(),
    updated_at: Date.now()
  },
  {
    id: 'lead-2', 
    agency_id: agencyId,
    name: 'דנה גרין',
    email: 'dana@example.com',
    phone: '052-7654321',
    source: 'google_ads',
    campaign_id: 'camp_456',
    campaign_name: 'קמפיין גוגל חדש',
    status: 'contacted',
    priority: 'medium',
    created_at: Date.now() - 86400000,
    updated_at: Date.now() - 86400000
  },
  {
    id: 'lead-3',
    agency_id: agencyId,
    name: 'אבי שמואלי',
    email: 'avi@example.com',
    phone: '053-9876543',
    source: 'website',
    status: 'qualified',
    priority: 'low',
    created_at: Date.now() - 172800000,
    updated_at: Date.now() - 172800000
  }
];

const insertLead = sqlite.prepare(`
  INSERT OR REPLACE INTO leads (
    id, agency_id, name, email, phone, source, campaign_id, campaign_name, 
    status, priority, created_at, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

leads.forEach(lead => {
  insertLead.run(
    lead.id, lead.agency_id, lead.name, lead.email, lead.phone, lead.source,
    lead.campaign_id, lead.campaign_name, lead.status, lead.priority,
    lead.created_at, lead.updated_at
  );
});

// Add sample client
sqlite.prepare(`
  INSERT OR REPLACE INTO clients (
    id, agency_id, name, contact_name, email, phone, status, created_at, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run('client-1', agencyId, 'חברת טכנולוגיה בע"מ', 'רון שמידט', 'ron@tech.com', '03-1234567', 'active', Date.now(), Date.now());

// Add sample project
sqlite.prepare(`
  INSERT OR REPLACE INTO projects (
    id, agency_id, client_id, name, description, type, status, created_at, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run('project-1', agencyId, 'client-1', 'פיתוח אתר', 'פיתוח אתר תדמית חדש', 'website', 'active', Date.now(), Date.now());

console.log('✅ Sample data added successfully!');
console.log(`Added ${leads.length} leads, 1 agency, 1 user, 1 client, 1 project`);

sqlite.close();