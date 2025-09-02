import React, { useState, useEffect } from 'react';
import { useRoute } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  TrendingUp, TrendingDown, DollarSign, Clock, Users, Target,
  Calendar, BarChart3, PieChart, Activity, AlertCircle, CheckCircle,
  Timer, FileText, MessageSquare, Settings, Filter, Download,
  Plus, Edit, Trash2, Eye, Search, ArrowUp, ArrowDown, User
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
// Chart.js imports (temporarily commented out until dependencies are properly loaded)
// import { Line, Bar, Doughnut } from 'react-chartjs-2';
// import {
//   Chart as ChartJS,
//   CategoryScale,
//   LinearScale,
//   PointElement,
//   LineElement,
//   BarElement,
//   Title,
//   Tooltip,
//   Legend,
//   ArcElement,
// } from 'chart.js';

// // Register Chart.js components
// ChartJS.register(
//   CategoryScale,
//   LinearScale,
//   PointElement,
//   LineElement,
//   BarElement,
//   Title,
//   Tooltip,
//   Legend,
//   ArcElement
// );

interface ProjectData {
  id: string;
  name: string;
  description: string;
  type: string;
  status: string;
  budget: number;
  spent: number;
  startDate: string;
  endDate?: string;
  progress: number;
  client: {
    id: string;
    name: string;
    email: string;
    phone: string;
  };
}

interface TaskData {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignedTo: string;
  dueDate: string;
  estimatedHours: number;
  actualHours: number;
  progress: number;
}

interface TimeEntry {
  id: string;
  description: string;
  hours: number;
  date: string;
  billable: boolean;
  hourlyRate: number;
  userId: string;
  userName: string;
}

interface AnalyticsData {
  profitability: {
    revenue: number;
    costs: number;
    profit: number;
    margin: number;
  };
  timeTracking: {
    totalHours: number;
    billableHours: number;
    efficiency: number;
  };
  performance: {
    onTime: number;
    overdue: number;
    completed: number;
    total: number;
  };
}

export default function NewProjectDetails() {
  const [, params] = useRoute("/dashboard/project-details/:projectId");
  const projectId = params?.projectId;
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [activeView, setActiveView] = useState('overview');
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [filters, setFilters] = useState({ status: 'all', priority: 'all' });

  // Mock data - in real app this would come from API
  const project: ProjectData = {
    id: projectId || 'project-1',
    name: 'פיתוח אתר אי-קומרס מתקדם',
    description: 'פיתוח פלטפורמת מכירות מקוונת עם מערכת ניהול מלאי ותשלומים',
    type: 'website',
    status: 'in_progress',
    budget: 150000, // 1500 NIS
    spent: 89000,   // 890 NIS
    startDate: '2024-01-01',
    endDate: '2024-03-31',
    progress: 65,
    client: {
      id: 'client-1',
      name: 'חברת טכנולוגיה בע"מ',
      email: 'info@techcompany.co.il',
      phone: '03-1234567'
    }
  };

  const tasks: TaskData[] = [
    {
      id: '1',
      title: 'עיצוב דף הבית',
      description: 'עיצוב ופיתוח דף הבית הראשי עם התאמה למובייל',
      status: 'completed',
      priority: 'high',
      assignedTo: 'מעצב UI/UX',
      dueDate: '2024-01-15',
      estimatedHours: 40,
      actualHours: 35,
      progress: 100
    },
    {
      id: '2',
      title: 'פיתוח מערכת הזמנות',
      description: 'בניית מערכת עגלת קניות ותהליך הזמנה',
      status: 'in_progress',
      priority: 'urgent',
      assignedTo: 'מפתח Backend',
      dueDate: '2024-02-01',
      estimatedHours: 60,
      actualHours: 45,
      progress: 75
    },
    {
      id: '3',
      title: 'אינטגרציה עם שער תשלומים',
      description: 'חיבור לשירותי תשלום ואימות עסקאות',
      status: 'pending',
      priority: 'high',
      assignedTo: 'מפתח Full-Stack',
      dueDate: '2024-02-15',
      estimatedHours: 30,
      actualHours: 0,
      progress: 0
    },
    {
      id: '4',
      title: 'בדיקות איכות',
      description: 'ביצוע בדיקות מקיפות ותיקון באגים',
      status: 'blocked',
      priority: 'medium',
      assignedTo: 'בודק QA',
      dueDate: '2024-03-01',
      estimatedHours: 25,
      actualHours: 0,
      progress: 0
    }
  ];

  const timeEntries: TimeEntry[] = [
    {
      id: '1',
      description: 'עבודה על עיצוב דף הבית',
      hours: 8,
      date: '2024-01-10',
      billable: true,
      hourlyRate: 150,
      userId: '1',
      userName: 'דני מעצב'
    },
    {
      id: '2',
      description: 'פיתוח API למוצרים',
      hours: 6,
      date: '2024-01-11',
      billable: true,
      hourlyRate: 180,
      userId: '2',
      userName: 'רותם מפתחת'
    }
  ];

  const analytics: AnalyticsData = {
    profitability: {
      revenue: 150000,
      costs: 89000,
      profit: 61000,
      margin: 40.67
    },
    timeTracking: {
      totalHours: 120,
      billableHours: 95,
      efficiency: 79.17
    },
    performance: {
      onTime: 15,
      overdue: 3,
      completed: 12,
      total: 18
    }
  };

  // Chart configurations
  const profitabilityChartData = {
    labels: ['הכנסות', 'עלויות', 'רווח'],
    datasets: [{
      label: 'סכומים (₪)',
      data: [analytics.profitability.revenue / 100, analytics.profitability.costs / 100, analytics.profitability.profit / 100],
      backgroundColor: ['#10B981', '#EF4444', '#3B82F6'],
      borderWidth: 0
    }]
  };

  const timeTrackingChartData = {
    labels: ['ינואר', 'פברואר', 'מרץ'],
    datasets: [{
      label: 'שעות מתוכננות',
      data: [40, 35, 25],
      borderColor: '#3B82F6',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      tension: 0.4
    }, {
      label: 'שעות בפועל',
      data: [35, 42, 18],
      borderColor: '#10B981',
      backgroundColor: 'rgba(16, 185, 129, 0.1)',
      tension: 0.4
    }]
  };

  const taskStatusChartData = {
    labels: ['הושלמו', 'בתהליך', 'ממתין', 'חסום'],
    datasets: [{
      data: [
        tasks.filter(t => t.status === 'completed').length,
        tasks.filter(t => t.status === 'in_progress').length,
        tasks.filter(t => t.status === 'pending').length,
        tasks.filter(t => t.status === 'blocked').length
      ],
      backgroundColor: ['#10B981', '#F59E0B', '#6B7280', '#EF4444'],
      borderWidth: 0
    }]
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'blocked': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-yellow-500 text-white';
      case 'low': return 'bg-green-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return 'הושלם';
      case 'in_progress': return 'בתהליך';
      case 'pending': return 'ממתין';
      case 'blocked': return 'חסום';
      default: return status;
    }
  };

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'דחוף';
      case 'high': return 'גבוהה';
      case 'medium': return 'בינונית';
      case 'low': return 'נמוכה';
      default: return priority;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-bl from-blue-50 via-indigo-50 to-purple-50" dir="rtl">
      {/* Header */}
      <div className="bg-white shadow-lg border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-2">
                <h1 className="text-3xl font-bold text-gray-900">{project.name}</h1>
                <Badge className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(project.status)}`}>
                  {getStatusText(project.status)}
                </Badge>
              </div>
              <p className="text-gray-600 text-lg mb-4">{project.description}</p>
              
              {/* Progress Bar */}
              <div className="flex items-center gap-4">
                <div className="flex-1 max-w-md">
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>התקדמות הפרויקט</span>
                    <span>{project.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-indigo-600 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${project.progress}%` }}
                    ></div>
                  </div>
                </div>
                <div className="text-sm text-gray-500">
                  {Math.round((new Date().getTime() - new Date(project.startDate).getTime()) / (1000 * 60 * 60 * 24))} ימים מתחילת הפרויקט
                </div>
              </div>
            </div>
            
            <div className="flex gap-3">
              <Button variant="outline" size="sm" className="bg-white border-2 border-blue-500 text-blue-600 hover:bg-blue-50">
                <Download className="h-4 w-4 ml-2" />
                ייצוא דוח
              </Button>
              <Button variant="outline" size="sm" className="bg-white border-2 border-green-500 text-green-600 hover:bg-green-50">
                <Edit className="h-4 w-4 ml-2" />
                עריכת פרויקט
              </Button>
              <Button size="sm" className="bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white shadow-lg">
                <Settings className="h-4 w-4 ml-2" />
                הגדרות
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium opacity-90">תקציב פרויקט</CardTitle>
              <DollarSign className="h-5 w-5 opacity-80" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₪{(project.budget / 100).toLocaleString()}</div>
              <div className="text-xs opacity-80 mt-1">
                נוצל: ₪{(project.spent / 100).toLocaleString()} ({Math.round((project.spent / project.budget) * 100)}%)
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium opacity-90">רווח צפוי</CardTitle>
              <TrendingUp className="h-5 w-5 opacity-80" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₪{(analytics.profitability.profit / 100).toLocaleString()}</div>
              <div className="text-xs opacity-80 mt-1 flex items-center gap-1">
                <ArrowUp className="h-3 w-3" />
                {analytics.profitability.margin.toFixed(1)}% מרווח רווח
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium opacity-90">שעות עבודה</CardTitle>
              <Clock className="h-5 w-5 opacity-80" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.timeTracking.totalHours}</div>
              <div className="text-xs opacity-80 mt-1">
                {analytics.timeTracking.billableHours} שעות חיוב ({analytics.timeTracking.efficiency.toFixed(1)}%)
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white border-0 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium opacity-90">משימות</CardTitle>
              <Target className="h-5 w-5 opacity-80" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{tasks.filter(t => t.status === 'completed').length}/{tasks.length}</div>
              <div className="text-xs opacity-80 mt-1">
                {Math.round((tasks.filter(t => t.status === 'completed').length / tasks.length) * 100)}% הושלמו
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeView} onValueChange={setActiveView} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 bg-white rounded-xl shadow-lg p-1 border border-gray-200">
            <TabsTrigger value="overview" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white rounded-lg transition-all duration-200">
              <BarChart3 className="h-4 w-4 ml-2" />
              סקירה כללית
            </TabsTrigger>
            <TabsTrigger value="tasks" className="data-[state=active]:bg-green-500 data-[state=active]:text-white rounded-lg transition-all duration-200">
              <CheckCircle className="h-4 w-4 ml-2" />
              משימות וזמן
            </TabsTrigger>
            <TabsTrigger value="analytics" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white rounded-lg transition-all duration-200">
              <PieChart className="h-4 w-4 ml-2" />
              אנליטיקה מתקדמת
            </TabsTrigger>
            <TabsTrigger value="financials" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white rounded-lg transition-all duration-200">
              <DollarSign className="h-4 w-4 ml-2" />
              כספים ורווחיות
            </TabsTrigger>
            <TabsTrigger value="communication" className="data-[state=active]:bg-indigo-500 data-[state=active]:text-white rounded-lg transition-all duration-200">
              <MessageSquare className="h-4 w-4 ml-2" />
              תקשורת ולקוח
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Project Timeline */}
              <Card className="shadow-lg border-0 bg-white/80 backdrop-blur">
                <CardHeader className="pb-3">
                  <CardTitle className="text-right flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-blue-500" />
                    ציר זמן הפרויקט
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border-r-4 border-green-500">
                      <div>
                        <p className="font-medium text-green-800">תחילת הפרויקט</p>
                        <p className="text-sm text-green-600">{new Date(project.startDate).toLocaleDateString('he-IL')}</p>
                      </div>
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border-r-4 border-blue-500">
                      <div>
                        <p className="font-medium text-blue-800">מצב נוכחי</p>
                        <p className="text-sm text-blue-600">{project.progress}% מהפרויקט הושלם</p>
                      </div>
                      <Activity className="h-5 w-5 text-blue-500" />
                    </div>
                    
                    {project.endDate && (
                      <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg border-r-4 border-purple-500">
                        <div>
                          <p className="font-medium text-purple-800">יעד סיום</p>
                          <p className="text-sm text-purple-600">{new Date(project.endDate).toLocaleDateString('he-IL')}</p>
                        </div>
                        <Target className="h-5 w-5 text-purple-500" />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Task Status Distribution */}
              <Card className="shadow-lg border-0 bg-white/80 backdrop-blur">
                <CardHeader className="pb-3">
                  <CardTitle className="text-right flex items-center gap-2">
                    <PieChart className="h-5 w-5 text-purple-500" />
                    התפלגות משימות
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64 flex items-center justify-center">
                    {/* Chart placeholder - will be replaced with actual chart */}
                    <div className="w-full h-full flex items-center justify-center bg-gray-50 rounded-lg">
                      <div className="text-center">
                        <div className="text-4xl mb-2">📊</div>
                        <p className="text-gray-600">תרשים התפלגות משימות</p>
                        <p className="text-sm text-gray-500">בקרוב...</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Client Information */}
              <Card className="shadow-lg border-0 bg-white/80 backdrop-blur">
                <CardHeader className="pb-3">
                  <CardTitle className="text-right flex items-center gap-2">
                    <Users className="h-5 w-5 text-green-500" />
                    פרטי הלקוח
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">שם החברה:</span>
                      <span className="font-medium">{project.client.name}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">אימייל:</span>
                      <span className="font-medium">{project.client.email}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">טלפון:</span>
                      <span className="font-medium">{project.client.phone}</span>
                    </div>
                    <div className="pt-3 border-t border-gray-200">
                      <Button size="sm" variant="outline" className="w-full">
                        <Eye className="h-4 w-4 ml-2" />
                        צפה בפרופיל מלא של הלקוח
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <Card className="shadow-lg border-0 bg-white/80 backdrop-blur">
                <CardHeader className="pb-3">
                  <CardTitle className="text-right flex items-center gap-2">
                    <Activity className="h-5 w-5 text-indigo-500" />
                    סטטיסטיקות מהירות
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">{tasks.length}</div>
                      <div className="text-sm text-blue-700">סה"כ משימות</div>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">{tasks.filter(t => t.status === 'completed').length}</div>
                      <div className="text-sm text-green-700">הושלמו</div>
                    </div>
                    <div className="text-center p-3 bg-orange-50 rounded-lg">
                      <div className="text-2xl font-bold text-orange-600">{timeEntries.length}</div>
                      <div className="text-sm text-orange-700">רישומי זמן</div>
                    </div>
                    <div className="text-center p-3 bg-purple-50 rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">{Math.round(analytics.timeTracking.efficiency)}%</div>
                      <div className="text-sm text-purple-700">יעילות</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Tasks Tab */}
          <TabsContent value="tasks" className="space-y-6">
            {/* Filters */}
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-right flex items-center gap-2">
                    <Filter className="h-5 w-5 text-blue-500" />
                    סינון משימות
                  </CardTitle>
                  <Button size="sm" className="bg-green-600 hover:bg-green-700">
                    <Plus className="h-4 w-4 ml-2" />
                    הוסף משימה
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">סטטוס</label>
                    <select 
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={filters.status}
                      onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                    >
                      <option value="all">כל הסטטוסים</option>
                      <option value="pending">ממתין</option>
                      <option value="in_progress">בתהליך</option>
                      <option value="completed">הושלם</option>
                      <option value="blocked">חסום</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">עדיפות</label>
                    <select 
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={filters.priority}
                      onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value }))}
                    >
                      <option value="all">כל העדיפויות</option>
                      <option value="urgent">דחוף</option>
                      <option value="high">גבוהה</option>
                      <option value="medium">בינונית</option>
                      <option value="low">נמוכה</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">מתאריך</label>
                    <input 
                      type="date" 
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={dateRange.from}
                      onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">עד תאריך</label>
                    <input 
                      type="date" 
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={dateRange.to}
                      onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tasks List */}
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur">
              <CardHeader className="pb-3">
                <CardTitle className="text-right flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  רשימת משימות ({tasks.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {tasks.map((task) => (
                    <div key={task.id} className="border border-gray-200 rounded-xl p-5 bg-gradient-to-r from-white to-gray-50 hover:shadow-lg transition-all duration-300">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">{task.title}</h3>
                            <Badge className={`px-2 py-1 text-xs rounded-full ${getPriorityColor(task.priority)}`}>
                              {getPriorityText(task.priority)}
                            </Badge>
                            <Badge className={`px-2 py-1 text-xs rounded-full border ${getStatusColor(task.status)}`}>
                              {getStatusText(task.status)}
                            </Badge>
                          </div>
                          <p className="text-gray-600 mb-3">{task.description}</p>
                          
                          {/* Progress Bar */}
                          <div className="mb-3">
                            <div className="flex justify-between text-sm text-gray-600 mb-1">
                              <span>התקדמות</span>
                              <span>{task.progress}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full transition-all duration-500"
                                style={{ width: `${task.progress}%` }}
                              ></div>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4" />
                              <span>{task.assignedTo}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              <span>{new Date(task.dueDate).toLocaleDateString('he-IL')}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4" />
                              <span>{task.actualHours}/{task.estimatedHours} שעות</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Timer className="h-4 w-4" />
                              <span>{((task.actualHours / task.estimatedHours) * 100).toFixed(0)}% מהמתוכנן</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Time Entries */}
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur">
              <CardHeader className="pb-3">
                <CardTitle className="text-right flex items-center gap-2">
                  <Timer className="h-5 w-5 text-blue-500" />
                  רישום שעות עבודה
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {timeEntries.map((entry) => (
                    <div key={entry.id} className="flex justify-between items-center p-4 border border-gray-200 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{entry.description}</h4>
                        <p className="text-sm text-gray-600">{entry.userName} • {new Date(entry.date).toLocaleDateString('he-IL')}</p>
                      </div>
                      <div className="text-left">
                        <p className="text-lg font-bold text-blue-600">{entry.hours} שעות</p>
                        <p className="text-sm text-gray-500">₪{(entry.hours * entry.hourlyRate).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Time Tracking Chart */}
              <Card className="shadow-lg border-0 bg-white/80 backdrop-blur">
                <CardHeader className="pb-3">
                  <CardTitle className="text-right flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-blue-500" />
                    מעקב שעות לאורך זמן
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80 flex items-center justify-center">
                    {/* Chart placeholder */}
                    <div className="w-full h-full flex items-center justify-center bg-gray-50 rounded-lg">
                      <div className="text-center">
                        <div className="text-4xl mb-2">📈</div>
                        <p className="text-gray-600">גרף מעקב שעות</p>
                        <p className="text-sm text-gray-500">בקרוב...</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Performance Metrics */}
              <Card className="shadow-lg border-0 bg-white/80 backdrop-blur">
                <CardHeader className="pb-3">
                  <CardTitle className="text-right flex items-center gap-2">
                    <Activity className="h-5 w-5 text-green-500" />
                    מדדי ביצועים
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-700">יעילות זמן</span>
                        <span className="text-lg font-bold text-green-600">{analytics.timeTracking.efficiency.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div 
                          className="bg-gradient-to-r from-green-500 to-green-600 h-3 rounded-full"
                          style={{ width: `${analytics.timeTracking.efficiency}%` }}
                        ></div>
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-700">משימות בזמן</span>
                        <span className="text-lg font-bold text-blue-600">{Math.round((analytics.performance.onTime / analytics.performance.total) * 100)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div 
                          className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full"
                          style={{ width: `${(analytics.performance.onTime / analytics.performance.total) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-700">התקדמות הפרויקט</span>
                        <span className="text-lg font-bold text-purple-600">{project.progress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div 
                          className="bg-gradient-to-r from-purple-500 to-purple-600 h-3 rounded-full"
                          style={{ width: `${project.progress}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Key Metrics */}
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                      <div className="text-center p-3 bg-blue-50 rounded-lg">
                        <div className="text-xl font-bold text-blue-600">{analytics.timeTracking.totalHours}</div>
                        <div className="text-sm text-blue-700">סה"כ שעות</div>
                      </div>
                      <div className="text-center p-3 bg-green-50 rounded-lg">
                        <div className="text-xl font-bold text-green-600">{analytics.timeTracking.billableHours}</div>
                        <div className="text-sm text-green-700">שעות חיוב</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Advanced Analytics */}
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur">
              <CardHeader className="pb-3">
                <CardTitle className="text-right flex items-center gap-2">
                  <PieChart className="h-5 w-5 text-purple-500" />
                  ניתוח מתקדם
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900">התפלגות זמן לפי משימות</h3>
                    <div className="space-y-3">
                      {tasks.map((task) => (
                        <div key={task.id} className="flex justify-between items-center">
                          <span className="text-sm text-gray-600 truncate">{task.title}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-500 h-2 rounded-full"
                                style={{ width: `${(task.actualHours / tasks.reduce((sum, t) => sum + t.actualHours, 0)) * 100}%` }}
                              ></div>
                            </div>
                            <span className="text-xs text-gray-500 w-8">{task.actualHours}ש</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900">יעילות לפי חודש</h3>
                    <div className="space-y-3">
                      {['ינואר', 'פברואר', 'מרץ'].map((month, index) => {
                        const efficiency = [85, 92, 78][index];
                        return (
                          <div key={month} className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">{month}</span>
                            <div className="flex items-center gap-2">
                              <div className="w-16 bg-gray-200 rounded-full h-2">
                                <div 
                                  className={`h-2 rounded-full ${efficiency >= 90 ? 'bg-green-500' : efficiency >= 80 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                  style={{ width: `${efficiency}%` }}
                                ></div>
                              </div>
                              <span className="text-xs text-gray-500 w-8">{efficiency}%</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900">סטטוס משימות</h3>
                    <div className="space-y-3">
                      {[
                        { label: 'הושלמו', count: tasks.filter(t => t.status === 'completed').length, color: 'bg-green-500' },
                        { label: 'בתהליך', count: tasks.filter(t => t.status === 'in_progress').length, color: 'bg-blue-500' },
                        { label: 'ממתין', count: tasks.filter(t => t.status === 'pending').length, color: 'bg-yellow-500' },
                        { label: 'חסום', count: tasks.filter(t => t.status === 'blocked').length, color: 'bg-red-500' }
                      ].map((status) => (
                        <div key={status.label} className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">{status.label}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full ${status.color}`}
                                style={{ width: `${(status.count / tasks.length) * 100}%` }}
                              ></div>
                            </div>
                            <span className="text-xs text-gray-500 w-8">{status.count}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Financials Tab */}
          <TabsContent value="financials" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Profitability Chart */}
              <Card className="shadow-lg border-0 bg-white/80 backdrop-blur">
                <CardHeader className="pb-3">
                  <CardTitle className="text-right flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-green-500" />
                    ניתוח רווחיות
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80 flex items-center justify-center">
                    {/* Chart placeholder */}
                    <div className="w-full h-full flex items-center justify-center bg-gray-50 rounded-lg">
                      <div className="text-center">
                        <div className="text-4xl mb-2">💰</div>
                        <p className="text-gray-600">גרף ניתוח רווחיות</p>
                        <p className="text-sm text-gray-500">בקרוב...</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Financial Summary */}
              <Card className="shadow-lg border-0 bg-white/80 backdrop-blur">
                <CardHeader className="pb-3">
                  <CardTitle className="text-right flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-blue-500" />
                    סיכום כספי
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 gap-4">
                      <div className="p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-lg border-2 border-green-200">
                        <div className="flex justify-between items-center">
                          <span className="text-green-800 font-medium">סה"כ הכנסות</span>
                          <span className="text-2xl font-bold text-green-900">₪{(analytics.profitability.revenue / 100).toLocaleString()}</span>
                        </div>
                      </div>
                      
                      <div className="p-4 bg-gradient-to-r from-red-50 to-red-100 rounded-lg border-2 border-red-200">
                        <div className="flex justify-between items-center">
                          <span className="text-red-800 font-medium">סה"כ עלויות</span>
                          <span className="text-2xl font-bold text-red-900">₪{(analytics.profitability.costs / 100).toLocaleString()}</span>
                        </div>
                      </div>
                      
                      <div className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg border-2 border-blue-200">
                        <div className="flex justify-between items-center">
                          <span className="text-blue-800 font-medium">רווח נטו</span>
                          <span className="text-2xl font-bold text-blue-900">₪{(analytics.profitability.profit / 100).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-gray-200">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-700">מרווח רווח</span>
                        <span className="text-lg font-bold text-purple-600">{analytics.profitability.margin.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div 
                          className="bg-gradient-to-r from-purple-500 to-purple-600 h-3 rounded-full"
                          style={{ width: `${Math.min(analytics.profitability.margin, 100)}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Budget vs Actual */}
                    <div className="pt-4 border-t border-gray-200">
                      <h4 className="text-lg font-semibold text-gray-900 mb-3">תקציב מול ביצוע</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">תקציב מתוכנן</span>
                          <span className="font-medium">₪{(project.budget / 100).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">הוצאו עד כה</span>
                          <span className="font-medium">₪{(project.spent / 100).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">נותר</span>
                          <span className="font-medium text-green-600">₪{((project.budget - project.spent) / 100).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Detailed Financial Breakdown */}
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur">
              <CardHeader className="pb-3">
                <CardTitle className="text-right flex items-center gap-2">
                  <FileText className="h-5 w-5 text-orange-500" />
                  פירוט כספי מפורט
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-right">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="p-3 font-medium text-gray-900">תיאור</th>
                        <th className="p-3 font-medium text-gray-900">סכום</th>
                        <th className="p-3 font-medium text-gray-900">אחוז מהתקציב</th>
                        <th className="p-3 font-medium text-gray-900">סטטוס</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      <tr className="hover:bg-gray-50">
                        <td className="p-3">עבודות עיצוב</td>
                        <td className="p-3 font-medium">₪250</td>
                        <td className="p-3">16.7%</td>
                        <td className="p-3">
                          <Badge className="bg-green-100 text-green-800 border-green-200">הושלם</Badge>
                        </td>
                      </tr>
                      <tr className="hover:bg-gray-50">
                        <td className="p-3">פיתוח Frontend</td>
                        <td className="p-3 font-medium">₪400</td>
                        <td className="p-3">26.7%</td>
                        <td className="p-3">
                          <Badge className="bg-blue-100 text-blue-800 border-blue-200">בתהליך</Badge>
                        </td>
                      </tr>
                      <tr className="hover:bg-gray-50">
                        <td className="p-3">פיתוח Backend</td>
                        <td className="p-3 font-medium">₪350</td>
                        <td className="p-3">23.3%</td>
                        <td className="p-3">
                          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">ממתין</Badge>
                        </td>
                      </tr>
                      <tr className="hover:bg-gray-50">
                        <td className="p-3">בדיקות ו-QA</td>
                        <td className="p-3 font-medium">₪150</td>
                        <td className="p-3">10%</td>
                        <td className="p-3">
                          <Badge className="bg-gray-100 text-gray-800 border-gray-200">לא התחיל</Badge>
                        </td>
                      </tr>
                      <tr className="hover:bg-gray-50">
                        <td className="p-3">השקה ותמיכה</td>
                        <td className="p-3 font-medium">₪350</td>
                        <td className="p-3">23.3%</td>
                        <td className="p-3">
                          <Badge className="bg-gray-100 text-gray-800 border-gray-200">לא התחיל</Badge>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Communication Tab */}
          <TabsContent value="communication" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Client Communication */}
              <Card className="lg:col-span-2 shadow-lg border-0 bg-white/80 backdrop-blur">
                <CardHeader className="pb-3">
                  <CardTitle className="text-right flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-blue-500" />
                    תקשורת עם הלקוח
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {/* Mock messages */}
                    {[
                      {
                        id: 1,
                        from: 'לקוח',
                        message: 'שלום, רציתי לבדוק מה המצב עם האתר החדש?',
                        timestamp: '2024-01-20 14:30',
                        type: 'received'
                      },
                      {
                        id: 2,
                        from: 'אתם',
                        message: 'שלום! העיצוב הסתיים ועכשיו אנחנו בתהליך הפיתוח. צפוי להסתיים עד סוף השבוע.',
                        timestamp: '2024-01-20 15:15',
                        type: 'sent'
                      },
                      {
                        id: 3,
                        from: 'לקוח',
                        message: 'מעולה, תודה על העדכון. האם יש אפשרות לראות דמו?',
                        timestamp: '2024-01-21 10:00',
                        type: 'received'
                      }
                    ].map((message) => (
                      <div key={message.id} className={`flex ${message.type === 'sent' ? 'justify-start' : 'justify-end'}`}>
                        <div className={`max-w-xs lg:max-w-md p-3 rounded-lg ${
                          message.type === 'sent' 
                            ? 'bg-blue-500 text-white' 
                            : 'bg-gray-200 text-gray-900'
                        }`}>
                          <p className="text-sm">{message.message}</p>
                          <p className={`text-xs mt-1 ${
                            message.type === 'sent' ? 'text-blue-100' : 'text-gray-500'
                          }`}>
                            {message.from} • {new Date(message.timestamp).toLocaleString('he-IL')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Message Input */}
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="כתוב הודעה..."
                        className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                        שלח
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Communication Summary */}
              <Card className="shadow-lg border-0 bg-white/80 backdrop-blur">
                <CardHeader className="pb-3">
                  <CardTitle className="text-right flex items-center gap-2">
                    <Users className="h-5 w-5 text-green-500" />
                    סיכום תקשורת
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">15</div>
                      <div className="text-sm text-blue-700">הודעות השבוע</div>
                    </div>
                    
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">98%</div>
                      <div className="text-sm text-green-700">שביעות רצון לקוח</div>
                    </div>
                    
                    <div className="text-center p-4 bg-orange-50 rounded-lg">
                      <div className="text-2xl font-bold text-orange-600">2.5</div>
                      <div className="text-sm text-orange-700">שעות תגובה ממוצעת</div>
                    </div>

                    <div className="pt-4 border-t border-gray-200">
                      <h4 className="text-sm font-medium text-gray-900 mb-3">פעילות אחרונה</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">הודעה אחרונה</span>
                          <span className="text-gray-900">לפני שעתיים</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">שיחת וידאו</span>
                          <span className="text-gray-900">אתמול</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">מסמך נשלח</span>
                          <span className="text-gray-900">לפני 3 ימים</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Project Updates */}
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur">
              <CardHeader className="pb-3">
                <CardTitle className="text-right flex items-center gap-2">
                  <FileText className="h-5 w-5 text-purple-500" />
                  עדכוני פרויקט
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    {
                      id: 1,
                      title: 'הושלם עיצוב דף הבית',
                      description: 'העיצוב הראשוני של דף הבית אושר על ידי הלקוח ונשלח לפיתוח',
                      timestamp: '2024-01-20 16:30',
                      type: 'success'
                    },
                    {
                      id: 2,
                      title: 'עדכון לוח זמנים',
                      description: 'בשל שינויים בדרישות, הפיתוח יתארך בשבוע נוסף',
                      timestamp: '2024-01-19 09:15',
                      type: 'warning'
                    },
                    {
                      id: 3,
                      title: 'פגישת סטטוס שבועית',
                      description: 'נקבעה פגישה עם הלקוח ביום חמישי בשעה 14:00',
                      timestamp: '2024-01-18 11:00',
                      type: 'info'
                    }
                  ].map((update) => (
                    <div key={update.id} className="flex gap-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className={`flex-shrink-0 w-3 h-3 rounded-full mt-2 ${
                        update.type === 'success' ? 'bg-green-500' :
                        update.type === 'warning' ? 'bg-orange-500' :
                        'bg-blue-500'
                      }`}></div>
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{update.title}</h4>
                        <p className="text-sm text-gray-600 mt-1">{update.description}</p>
                        <p className="text-xs text-gray-400 mt-2">{new Date(update.timestamp).toLocaleString('he-IL')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}