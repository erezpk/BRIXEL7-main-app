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

interface ProjectData {
  id: string;
  name: string;
  description: string;
  type: string;
  status: string;
  budget: number;
  spent: number;
  progress: number;
  startDate: string;
  endDate?: string;
  client: {
    id: string;
    name: string;
    email: string;
    phone: string;
  };
}

interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  progress: number;
  assignedTo: string;
  dueDate: string;
  estimatedHours: number;
  actualHours: number;
}

interface TimeEntry {
  id: string;
  taskId: string;
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

export default function ProjectDetails() {
  const [, params] = useRoute("/dashboard/projects/:projectId");
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
    type: 'web_development',
    status: 'in_progress',
    budget: 150000,
    spent: 89000,
    progress: 67,
    startDate: '2024-01-01',
    endDate: '2024-03-31',
    client: {
      id: 'client-1',
      name: 'חברת טכנולוגיות מתקדמת בע"מ',
      email: 'info@tech-company.co.il',
      phone: '03-1234567'
    }
  };

  const tasks: Task[] = [
    {
      id: 'task-1',
      title: 'עיצוב דף הבית',
      description: 'יצירת עיצוב מודרני ומותאם לנייד לדף הבית של האתר',
      status: 'completed',
      priority: 'high',
      progress: 100,
      assignedTo: 'מעצב ראשי',
      dueDate: '2024-01-15',
      estimatedHours: 20,
      actualHours: 18
    },
    {
      id: 'task-2', 
      title: 'פיתוח מערכת הזמנות',
      description: 'פיתוח מערכת הזמנות מקוונת עם אינטגרציה לתשלומים',
      status: 'in_progress',
      priority: 'urgent',
      progress: 65,
      assignedTo: 'מפתח בכיר',
      dueDate: '2024-02-01',
      estimatedHours: 40,
      actualHours: 28
    },
    {
      id: 'task-3',
      title: 'אינטגרציה עם API חיצוני',
      description: 'חיבור למערכות תשלום ומשלוח חיצוניות',
      status: 'pending',
      priority: 'medium',
      progress: 0,
      assignedTo: 'מפתח Backend',
      dueDate: '2024-02-15',
      estimatedHours: 25,
      actualHours: 0
    },
    {
      id: 'task-4',
      title: 'בדיקות ו-QA',
      description: 'בדיקות יסודיות של כל מרכיבי המערכת',
      status: 'blocked',
      priority: 'high',
      progress: 0,
      assignedTo: 'בודק איכות',
      dueDate: '2024-03-01',
      estimatedHours: 30,
      actualHours: 0
    }
  ];

  const timeEntries: TimeEntry[] = [
    {
      id: 'time-1',
      taskId: 'task-1',
      description: 'עיצוב ראשוני לדף הבית',
      hours: 8,
      date: '2024-01-10',
      billable: true,
      hourlyRate: 150,
      userId: '1',
      userName: 'שרה מעצבת'
    },
    {
      id: 'time-2',
      taskId: 'task-2',
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
                <Download className="h-4 w-4 mr-2" />
                ייצוא דוח
              </Button>
              <Button variant="outline" size="sm" className="bg-white border-2 border-green-500 text-green-600 hover:bg-green-50">
                <Edit className="h-4 w-4 mr-2" />
                עריכת פרויקט
              </Button>
              <Button size="sm" className="bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white shadow-lg">
                <Settings className="h-4 w-4 mr-2" />
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

        {/* Main Content - Quick Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                    <Eye className="h-4 w-4 mr-2" />
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

        {/* Recent Tasks */}
        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur mt-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-right flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              משימות אחרונות
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {tasks.slice(0, 3).map((task) => (
                <div key={task.id} className="border border-gray-200 rounded-xl p-4 bg-gradient-to-r from-white to-gray-50 hover:shadow-lg transition-all duration-300">
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
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}