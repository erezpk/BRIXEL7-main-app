import { storage } from './server/storage.ts';

async function addProjectData() {
  console.log('Adding project tasks and time entries...');
  
  try {
    // Project ID from the logs
    const projectId = 'project-1';
    console.log('Working with project:', projectId);
    
    // Get project details to verify it exists
    const project = await storage.getProject(projectId);
    if (!project) {
      console.log('❌ Project not found:', projectId);
      return;
    }
    
    console.log('✅ Project found:', project.name);
    
    // Find a user to associate with tasks
    const user = await storage.getUserByEmail('errz190@gmail.com');
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    
    console.log('✅ User found:', user.fullName);
    
    // Create tasks for the project
    const tasks = [
      {
        projectId: projectId,
        agencyId: project.agencyId,
        title: 'עיצוב דף הבית',
        description: 'עיצוב ופיתוח דף הבית הראשי',
        status: 'in_progress',
        priority: 'high',
        assignedTo: user.id,
        createdBy: user.id,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days from now
        estimatedHours: 8
      },
      {
        projectId: projectId,
        agencyId: project.agencyId,
        title: 'פיתוח רכיבי React',
        description: 'פיתוח רכיבי ממשק המשתמש',
        status: 'pending',
        priority: 'medium',
        assignedTo: user.id,
        createdBy: user.id,
        dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 10 days from now
        estimatedHours: 12
      },
      {
        projectId: projectId,
        agencyId: project.agencyId,
        title: 'בדיקות איכות',
        description: 'ביצוע בדיקות איכות ובדיקות משתמש',
        status: 'pending',
        priority: 'low',
        assignedTo: user.id,
        createdBy: user.id,
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 14 days from now
        estimatedHours: 6
      }
    ];
    
    for (const taskData of tasks) {
      const task = await storage.createTask(taskData);
      console.log('✅ Task created:', task.title);
    }
    
    // Create time entries for the project
    const timeEntries = [
      {
        projectId: projectId,
        userId: user.id,
        description: 'עיצוב דף הבית - מחקר ורעיונות',
        hours: 3.5,
        date: new Date().toISOString().split('T')[0],
        billable: true,
        hourlyRate: 150
      },
      {
        projectId: projectId,
        userId: user.id,
        description: 'פיתוח רכיבים בסיסיים',
        hours: 5.0,
        date: new Date().toISOString().split('T')[0],
        billable: true,
        hourlyRate: 150
      },
      {
        projectId: projectId,
        userId: user.id,
        description: 'סקירה ותיקונים',
        hours: 2.0,
        date: new Date().toISOString().split('T')[0],
        billable: true,
        hourlyRate: 120
      }
    ];
    
    for (const entryData of timeEntries) {
      const entry = await storage.createTimeEntry(entryData);
      console.log('✅ Time entry created:', entry.description, '-', entry.hours, 'hours');
    }
    
    // Create project expenses
    const expenses = [
      {
        projectId: projectId,
        description: 'רכישת תמונות stock ואייקונים',
        amount: 25000, // 250 NIS in agorot
        date: new Date().toISOString().split('T')[0],
        category: 'materials'
      },
      {
        projectId: projectId,
        description: 'שירותי אחסון ענן לפיתוח',
        amount: 15000, // 150 NIS in agorot
        date: new Date().toISOString().split('T')[0],
        category: 'services'
      }
    ];
    
    for (const expenseData of expenses) {
      const expense = await storage.createProjectExpense(expenseData);
      console.log('✅ Expense created:', expense.description, '-', (expense.amount / 100), 'NIS');
    }
    
    console.log('\n🎉 All project data added successfully!');
    console.log('Now you should be able to see:');
    console.log('- Tasks in the project');
    console.log('- Time tracking entries');
    console.log('- Project expenses');
    console.log('- Analytics data');
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error adding project data:', error);
    process.exit(1);
  }
}

addProjectData();