import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line
} from 'recharts';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  PlusCircle,
  Edit,
  Trash2,
  Calendar
} from 'lucide-react';

interface ProfitabilityData {
  projectId: string;
  totalHours: number;
  totalRevenue: number;
  totalExpenses: number;
  laborCost: number;
  totalCosts: number;
  profit: number;
  profitMargin: number;
}

interface Expense {
  id: string;
  projectId: string;
  category: string;
  description: string;
  amount: number;
  date: string;
  receipt?: string;
  approved: boolean;
  createdBy: string;
}

interface Revenue {
  id: string;
  projectId: string;
  amount: number;
  type: 'one_time' | 'monthly' | 'milestone';
  description?: string;
  invoiceDate?: string;
  paidDate?: string;
  status: 'pending' | 'paid' | 'overdue';
}

interface ProfitabilityAnalyticsProps {
  projectId: string;
  profitabilityData?: ProfitabilityData;
  onDataUpdated?: () => void;
}

export function ProfitabilityAnalytics({ 
  projectId, 
  profitabilityData, 
  onDataUpdated 
}: ProfitabilityAnalyticsProps) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [revenue, setRevenue] = useState<Revenue[]>([]);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showAddRevenue, setShowAddRevenue] = useState(false);
  const [loading, setLoading] = useState(true);

  // New expense form
  const [newExpense, setNewExpense] = useState({
    category: 'advertising',
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0]
  });

  // New revenue form
  const [newRevenue, setNewRevenue] = useState({
    amount: '',
    type: 'one_time' as const,
    description: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    status: 'pending' as const
  });

  useEffect(() => {
    if (projectId) {
      fetchExpenses();
      fetchRevenue();
    }
  }, [projectId]);

  const fetchExpenses = async () => {
    try {
      const response = await fetch(`/api/analytics/expenses/project/${projectId}`);
      if (response.ok) {
        const data = await response.json();
        setExpenses(data);
      }
    } catch (error) {
      console.error('Error fetching expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRevenue = async () => {
    try {
      const response = await fetch(`/api/analytics/revenue/project/${projectId}`);
      if (response.ok) {
        const data = await response.json();
        setRevenue(data);
      }
    } catch (error) {
      console.error('Error fetching revenue:', error);
    }
  };

  const addExpense = async () => {
    try {
      const response = await fetch('/api/analytics/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newExpense,
          projectId,
          amount: parseFloat(newExpense.amount)
        })
      });

      if (response.ok) {
        setNewExpense({
          category: 'advertising',
          description: '',
          amount: '',
          date: new Date().toISOString().split('T')[0]
        });
        setShowAddExpense(false);
        fetchExpenses();
        onDataUpdated?.();
      }
    } catch (error) {
      console.error('Error adding expense:', error);
    }
  };

  const addRevenue = async () => {
    try {
      const response = await fetch('/api/analytics/revenue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newRevenue,
          projectId,
          amount: parseFloat(newRevenue.amount)
        })
      });

      if (response.ok) {
        setNewRevenue({
          amount: '',
          type: 'one_time',
          description: '',
          invoiceDate: new Date().toISOString().split('T')[0],
          status: 'pending'
        });
        setShowAddRevenue(false);
        fetchRevenue();
        onDataUpdated?.();
      }
    } catch (error) {
      console.error('Error adding revenue:', error);
    }
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS'
    }).format(amount);
  };

  const getCategoryColor = (category: string): string => {
    const colors: Record<string, string> = {
      advertising: '#ef4444',
      tools: '#3b82f6',
      resources: '#f59e0b',
      outsourcing: '#8b5cf6'
    };
    return colors[category] || '#6b7280';
  };

  // Prepare chart data
  const pieChartData = profitabilityData ? [
    { name: 'עלויות עבודה', value: profitabilityData.laborCost, color: '#3b82f6' },
    { name: 'הוצאות', value: profitabilityData.totalExpenses, color: '#ef4444' },
    { name: 'רווח', value: Math.max(0, profitabilityData.profit), color: '#22c55e' }
  ].filter(item => item.value > 0) : [];

  const expensesByCategory = expenses.reduce((acc, expense) => {
    acc[expense.category] = (acc[expense.category] || 0) + expense.amount / 100;
    return acc;
  }, {} as Record<string, number>);

  const expenseCategoryData = Object.entries(expensesByCategory).map(([category, amount]) => ({
    category,
    amount,
    color: getCategoryColor(category)
  }));

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Summary Cards */}
      {profitabilityData && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">רווח נקי</p>
                  <p className={`text-2xl font-bold ${profitabilityData.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(profitabilityData.profit)}
                  </p>
                  <p className="text-sm text-gray-500">
                    מרווח: {profitabilityData.profitMargin.toFixed(1)}%
                  </p>
                </div>
                {profitabilityData.profit >= 0 ? (
                  <TrendingUp className="h-8 w-8 text-green-500" />
                ) : (
                  <TrendingDown className="h-8 w-8 text-red-500" />
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">סה״כ הכנסות</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(profitabilityData.totalRevenue)}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">סה״כ עלויות</p>
                  <p className="text-2xl font-bold text-red-600">
                    {formatCurrency(profitabilityData.totalCosts)}
                  </p>
                  <p className="text-sm text-gray-500">
                    עבודה: {formatCurrency(profitabilityData.laborCost)}
                  </p>
                </div>
                <BarChart3 className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">סקירה כללית</TabsTrigger>
          <TabsTrigger value="expenses">הוצאות</TabsTrigger>
          <TabsTrigger value="revenue">הכנסות</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Profit Distribution Pie Chart */}
            <Card>
              <CardHeader>
                <CardTitle>פילוח עלויות ורווח</CardTitle>
              </CardHeader>
              <CardContent>
                {pieChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={pieChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {pieChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p>אין מספיק נתונים להצגת גרף</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Expenses by Category */}
            <Card>
              <CardHeader>
                <CardTitle>הוצאות לפי קטגוריה</CardTitle>
              </CardHeader>
              <CardContent>
                {expenseCategoryData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={expenseCategoryData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="category" />
                      <YAxis />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Bar dataKey="amount" fill="#ef4444" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p>עדיין אין הוצאות רשומות</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Expenses Tab */}
        <TabsContent value="expenses">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>ניהול הוצאות</CardTitle>
              <Button onClick={() => setShowAddExpense(true)}>
                <PlusCircle className="w-4 h-4 ml-2" />
                הוסף הוצאה
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add Expense Form */}
              {showAddExpense && (
                <Card className="border-2 border-blue-200 bg-blue-50">
                  <CardContent className="pt-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">קטגוריה</label>
                        <select
                          value={newExpense.category}
                          onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })}
                          className="w-full p-2 border rounded-lg"
                        >
                          <option value="advertising">פרסום</option>
                          <option value="tools">כלים</option>
                          <option value="resources">משאבים</option>
                          <option value="outsourcing">מיקור חוץ</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">סכום (₪)</label>
                        <Input
                          type="number"
                          step="0.01"
                          value={newExpense.amount}
                          onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">תיאור</label>
                      <Input
                        value={newExpense.description}
                        onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                        placeholder="תיאור ההוצאה"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">תאריך</label>
                      <Input
                        type="date"
                        value={newExpense.date}
                        onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value })}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={addExpense}>שמור הוצאה</Button>
                      <Button variant="outline" onClick={() => setShowAddExpense(false)}>
                        ביטול
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Expenses List */}
              {expenses.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <DollarSign className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p>עדיין אין הוצאות רשומות לפרויקט זה</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {expenses.map((expense) => (
                    <div key={expense.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge 
                            style={{ backgroundColor: getCategoryColor(expense.category) }}
                            className="text-white"
                          >
                            {expense.category}
                          </Badge>
                          <span className="font-medium">{expense.description}</span>
                        </div>
                        <p className="text-sm text-gray-500">
                          {new Date(expense.date).toLocaleDateString('he-IL')}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold text-red-600">
                          {formatCurrency(expense.amount / 100)}
                        </span>
                        {expense.approved && (
                          <Badge className="bg-green-100 text-green-800">
                            אושר
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Revenue Tab */}
        <TabsContent value="revenue">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>ניהול הכנסות</CardTitle>
              <Button onClick={() => setShowAddRevenue(true)}>
                <PlusCircle className="w-4 h-4 ml-2" />
                הוסף הכנסה
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add Revenue Form */}
              {showAddRevenue && (
                <Card className="border-2 border-green-200 bg-green-50">
                  <CardContent className="pt-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">סוג</label>
                        <select
                          value={newRevenue.type}
                          onChange={(e) => setNewRevenue({ ...newRevenue, type: e.target.value as any })}
                          className="w-full p-2 border rounded-lg"
                        >
                          <option value="one_time">חד פעמי</option>
                          <option value="monthly">חודשי</option>
                          <option value="milestone">אבן דרך</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">סכום (₪)</label>
                        <Input
                          type="number"
                          step="0.01"
                          value={newRevenue.amount}
                          onChange={(e) => setNewRevenue({ ...newRevenue, amount: e.target.value })}
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">תיאור</label>
                      <Input
                        value={newRevenue.description}
                        onChange={(e) => setNewRevenue({ ...newRevenue, description: e.target.value })}
                        placeholder="תיאור ההכנסה"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">תאריך חשבונית</label>
                        <Input
                          type="date"
                          value={newRevenue.invoiceDate}
                          onChange={(e) => setNewRevenue({ ...newRevenue, invoiceDate: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">סטטוס</label>
                        <select
                          value={newRevenue.status}
                          onChange={(e) => setNewRevenue({ ...newRevenue, status: e.target.value as any })}
                          className="w-full p-2 border rounded-lg"
                        >
                          <option value="pending">ממתין לתשלום</option>
                          <option value="paid">שולם</option>
                          <option value="overdue">באיחור</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={addRevenue}>שמור הכנסה</Button>
                      <Button variant="outline" onClick={() => setShowAddRevenue(false)}>
                        ביטול
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Revenue List */}
              {revenue.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <TrendingUp className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p>עדיין אין הכנסות רשומות לפרויקט זה</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {revenue.map((rev) => (
                    <div key={rev.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge 
                            className={
                              rev.status === 'paid' ? 'bg-green-100 text-green-800' :
                              rev.status === 'overdue' ? 'bg-red-100 text-red-800' :
                              'bg-yellow-100 text-yellow-800'
                            }
                          >
                            {rev.status === 'paid' ? 'שולם' : 
                             rev.status === 'overdue' ? 'באיחור' : 'ממתין'}
                          </Badge>
                          <span className="font-medium">{rev.description}</span>
                        </div>
                        <p className="text-sm text-gray-500">
                          {rev.type === 'one_time' ? 'חד פעמי' :
                           rev.type === 'monthly' ? 'חודשי' : 'אבן דרך'}
                          {rev.invoiceDate && ` • ${new Date(rev.invoiceDate).toLocaleDateString('he-IL')}`}
                        </p>
                      </div>
                      <div className="text-lg font-bold text-green-600">
                        {formatCurrency(rev.amount / 100)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}