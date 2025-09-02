import { storage } from './server/storage.ts';

async function addTimeEntries() {
  console.log('Adding demo time entries...');
  
  try {
    // Get the first project
    const projects = await storage.getProjectsByAgency('df1f6ef1-6d90-8c3a-d9f1-d7f159783065');
    if (!projects || projects.length === 0) {
      console.log('No projects found');
      return;
    }
    
    const project = projects[0];
    console.log('Project:', project.name);
    
    // Get the first user
    const user = await storage.getUserByEmail('horizonxoffice@gmail.com');
    if (!user) {
      console.log('User not found');
      return;
    }
    
    console.log('User:', user.fullName);
    
    // Create time entries for the project
    const timeEntries = [
      {
        projectId: project.id,
        userId: user.id,
        description: 'עיצוב דף הבית',
        hours: 4.5,
        date: new Date().toISOString().split('T')[0],
        billable: true,
        hourlyRate: 150
      },
      {
        projectId: project.id,
        userId: user.id,
        description: 'פיתוח רכיבים',
        hours: 6.0,
        date: new Date().toISOString().split('T')[0],
        billable: true,
        hourlyRate: 150
      },
      {
        projectId: project.id,
        userId: user.id,
        description: 'בדיקות איכות',
        hours: 2.5,
        date: new Date().toISOString().split('T')[0],
        billable: true,
        hourlyRate: 120
      }
    ];
    
    for (const entryData of timeEntries) {
      const entry = await storage.createTimeEntry(entryData);
      console.log('Time entry created:', entry.description, entry.hours, 'hours');
    }
    
    // Add some project expenses
    const expenses = [
      {
        projectId: project.id,
        description: 'רכישת תמונות stock',
        amount: 25000, // 250 NIS
        date: new Date().toISOString().split('T')[0],
        category: 'materials'
      },
      {
        projectId: project.id,
        description: 'שירותי אחסון ענן',
        amount: 15000, // 150 NIS
        date: new Date().toISOString().split('T')[0],
        category: 'services'
      }
    ];
    
    for (const expenseData of expenses) {
      const expense = await storage.createProjectExpense(expenseData);
      console.log('Expense created:', expense.description, expense.amount / 100, 'NIS');
    }
    
    console.log('✅ Time entries and expenses added successfully!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error adding time entries:', error);
    process.exit(1);
  }
}

addTimeEntries();