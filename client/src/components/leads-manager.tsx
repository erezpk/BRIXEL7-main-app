import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  Users, 
  UserPlus, 
  Target, 
  DollarSign, 
  TrendingUp,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Star,
  Eye,
  PlusCircle,
  Filter,
  Download,
  UserCheck
} from 'lucide-react';

interface Lead {
  id: string;
  agencyId: string;
  clientId?: string;
  name: string;
  firstName?: string;
  lastName?: string;
  businessName?: string;
  businessField?: string;
  email?: string;
  phone?: string;
  industry?: string;
  company?: string;
  source: string;
  campaign_id?: string;
  campaignName?: string;
  status: 'new' | 'contacted' | 'qualified' | 'proposal' | 'converted' | 'lost';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  budget?: number;
  assignedTo?: string;
  notes?: string;
  convertedToClientId?: string;
  convertedToProjectId?: string;
  createdAt: number;
  updatedAt: number;
}

interface LeadGenCampaign {
  id: string;
  agencyId: string;
  projectId: string;
  campaignId?: string;
  name: string;
  targetAudience?: string;
  leadForm: any;
  costPerLead?: number;
  conversionGoals: any;
  status: 'active' | 'paused' | 'completed';
  createdAt: number;
  updatedAt: number;
}

interface LeadsManagerProps {
  projectId: string;
  projectType: string;
}

export function LeadsManager({ projectId, projectType }: LeadsManagerProps) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [leadGenCampaigns, setLeadGenCampaigns] = useState<LeadGenCampaign[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  // New lead form
  const [newLead, setNewLead] = useState({
    name: '',
    firstName: '',
    lastName: '',
    businessName: '',
    businessField: '',
    email: '',
    phone: '',
    industry: '',
    source: 'manual',
    status: 'new' as const,
    priority: 'medium' as const,
    budget: '',
    notes: ''
  });

  useEffect(() => {
    if (projectId) {
      fetchProjectLeads();
      fetchLeadGenCampaigns();
    }
  }, [projectId]);

  const fetchProjectLeads = async () => {
    try {
      setLoading(true);
      // Since we don't have a direct project-leads endpoint, we'll get all leads and filter
      const response = await fetch('/api/leads');
      if (response.ok) {
        const allLeads = await response.json();
        // For now, show all leads. In a real app, you'd filter by project relation
        setLeads(allLeads);
      }
    } catch (error) {
      console.error('Error fetching leads:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLeadGenCampaigns = async () => {
    try {
      const response = await fetch(`/api/analytics/lead-gen-campaigns/project/${projectId}`);
      if (response.ok) {
        const campaigns = await response.json();
        setLeadGenCampaigns(campaigns);
      }
    } catch (error) {
      console.error('Error fetching lead gen campaigns:', error);
    }
  };

  const createLead = async () => {
    try {
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newLead,
          budget: newLead.budget ? parseInt(newLead.budget) : null
        })
      });

      if (response.ok) {
        setNewLead({
          name: '',
          firstName: '',
          lastName: '',
          businessName: '',
          businessField: '',
          email: '',
          phone: '',
          industry: '',
          source: 'manual',
          status: 'new',
          priority: 'medium',
          budget: '',
          notes: ''
        });
        setShowCreateForm(false);
        fetchProjectLeads();
      }
    } catch (error) {
      console.error('Error creating lead:', error);
    }
  };

  const createLeadGenCampaign = async (campaignData: any) => {
    try {
      const response = await fetch('/api/analytics/lead-gen-campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...campaignData,
          projectId
        })
      });

      if (response.ok) {
        fetchLeadGenCampaigns();
      }
    } catch (error) {
      console.error('Error creating lead gen campaign:', error);
    }
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS'
    }).format(amount);
  };

  const getStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
      new: 'bg-blue-100 text-blue-800',
      contacted: 'bg-yellow-100 text-yellow-800',
      qualified: 'bg-purple-100 text-purple-800',
      proposal: 'bg-orange-100 text-orange-800',
      converted: 'bg-green-100 text-green-800',
      lost: 'bg-gray-100 text-gray-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityColor = (priority: string): string => {
    const colors: Record<string, string> = {
      low: 'bg-gray-100 text-gray-800',
      medium: 'bg-blue-100 text-blue-800',
      high: 'bg-orange-100 text-orange-800',
      urgent: 'bg-red-100 text-red-800'
    };
    return colors[priority] || 'bg-gray-100 text-gray-800';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'new': return <UserPlus className="w-4 h-4" />;
      case 'contacted': return <Phone className="w-4 h-4" />;
      case 'qualified': return <Star className="w-4 h-4" />;
      case 'proposal': return <Mail className="w-4 h-4" />;
      case 'converted': return <UserCheck className="w-4 h-4" />;
      case 'lost': return <Eye className="w-4 h-4" />;
      default: return <Users className="w-4 h-4" />;
    }
  };

  const filteredLeads = leads.filter(lead => {
    if (filterStatus !== 'all' && lead.status !== filterStatus) return false;
    if (filterPriority !== 'all' && lead.priority !== filterPriority) return false;
    return true;
  });

  // Calculate statistics
  const stats = {
    total: leads.length,
    new: leads.filter(l => l.status === 'new').length,
    qualified: leads.filter(l => l.status === 'qualified').length,
    converted: leads.filter(l => l.status === 'converted').length,
    conversionRate: leads.length > 0 ? (leads.filter(l => l.status === 'converted').length / leads.length) * 100 : 0
  };

  // Chart data
  const statusChartData = [
    { name: 'חדש', value: leads.filter(l => l.status === 'new').length, color: '#3b82f6' },
    { name: 'יצר קשר', value: leads.filter(l => l.status === 'contacted').length, color: '#f59e0b' },
    { name: 'מוכשר', value: leads.filter(l => l.status === 'qualified').length, color: '#8b5cf6' },
    { name: 'הצעה', value: leads.filter(l => l.status === 'proposal').length, color: '#f97316' },
    { name: 'הומר', value: leads.filter(l => l.status === 'converted').length, color: '#22c55e' },
    { name: 'אבד', value: leads.filter(l => l.status === 'lost').length, color: '#6b7280' }
  ].filter(item => item.value > 0);

  if (projectType !== 'lead_gen') {
    return (
      <Card>
        <CardContent className="pt-6 text-center py-12">
          <Target className="h-16 w-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium mb-2">ניהול ליידים</h3>
          <p className="text-gray-500 mb-4">רכיב זה זמין רק לפרויקטי Lead Generation</p>
          <p className="text-sm text-gray-400">שנה את סוג הפרויקט כדי לגשת לתכונה זו</p>
        </CardContent>
      </Card>
    );
  }

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
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">סה״כ ליידים</p>
                <p className="text-2xl font-bold text-blue-600">{stats.total}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">ליידים חדשים</p>
                <p className="text-2xl font-bold text-green-600">{stats.new}</p>
              </div>
              <UserPlus className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">מוכשרים</p>
                <p className="text-2xl font-bold text-purple-600">{stats.qualified}</p>
              </div>
              <Star className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">שיעור המרה</p>
                <p className="text-2xl font-bold text-orange-600">{stats.conversionRate.toFixed(1)}%</p>
              </div>
              <Target className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="leads" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="leads">ליידים</TabsTrigger>
          <TabsTrigger value="campaigns">קמפיינים</TabsTrigger>
          <TabsTrigger value="analytics">אנליטיקה</TabsTrigger>
        </TabsList>

        {/* Leads Tab */}
        <TabsContent value="leads">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>ניהול ליידים</CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm">
                  <Filter className="w-4 h-4 ml-2" />
                  סינון
                </Button>
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4 ml-2" />
                  ייצא
                </Button>
                <Button onClick={() => setShowCreateForm(true)}>
                  <PlusCircle className="w-4 h-4 ml-2" />
                  הוסף ליד
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filters */}
              <div className="flex gap-4">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-2 border rounded-lg"
                >
                  <option value="all">כל הסטטוסים</option>
                  <option value="new">חדש</option>
                  <option value="contacted">יצר קשר</option>
                  <option value="qualified">מוכשר</option>
                  <option value="proposal">הצעה</option>
                  <option value="converted">הומר</option>
                  <option value="lost">אבד</option>
                </select>
                
                <select
                  value={filterPriority}
                  onChange={(e) => setFilterPriority(e.target.value)}
                  className="px-3 py-2 border rounded-lg"
                >
                  <option value="all">כל הרמות</option>
                  <option value="low">נמוכה</option>
                  <option value="medium">בינונית</option>
                  <option value="high">גבוהה</option>
                  <option value="urgent">דחופה</option>
                </select>
              </div>

              {/* Create Lead Form */}
              {showCreateForm && (
                <Card className="border-2 border-green-200 bg-green-50">
                  <CardContent className="pt-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">שם פרטי</label>
                        <Input
                          value={newLead.firstName}
                          onChange={(e) => setNewLead({ ...newLead, firstName: e.target.value })}
                          placeholder="שם פרטי"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">שם משפחה</label>
                        <Input
                          value={newLead.lastName}
                          onChange={(e) => setNewLead({ ...newLead, lastName: e.target.value })}
                          placeholder="שם משפחה"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">שם עסק</label>
                        <Input
                          value={newLead.businessName}
                          onChange={(e) => setNewLead({ ...newLead, businessName: e.target.value })}
                          placeholder="שם העסק"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">תחום עסקי</label>
                        <Input
                          value={newLead.businessField}
                          onChange={(e) => setNewLead({ ...newLead, businessField: e.target.value })}
                          placeholder="תחום העסק"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">אימייל</label>
                        <Input
                          type="email"
                          value={newLead.email}
                          onChange={(e) => setNewLead({ ...newLead, email: e.target.value })}
                          placeholder="email@example.com"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">טלפון</label>
                        <Input
                          value={newLead.phone}
                          onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })}
                          placeholder="050-1234567"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">מקור</label>
                        <select
                          value={newLead.source}
                          onChange={(e) => setNewLead({ ...newLead, source: e.target.value })}
                          className="w-full p-2 border rounded-lg"
                        >
                          <option value="manual">ידני</option>
                          <option value="website">אתר</option>
                          <option value="facebook">פייסבוק</option>
                          <option value="google">גוגל</option>
                          <option value="referral">המלצה</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">סטטוס</label>
                        <select
                          value={newLead.status}
                          onChange={(e) => setNewLead({ ...newLead, status: e.target.value as any })}
                          className="w-full p-2 border rounded-lg"
                        >
                          <option value="new">חדש</option>
                          <option value="contacted">יצר קשר</option>
                          <option value="qualified">מוכשר</option>
                          <option value="proposal">הצעה</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">עדיפות</label>
                        <select
                          value={newLead.priority}
                          onChange={(e) => setNewLead({ ...newLead, priority: e.target.value as any })}
                          className="w-full p-2 border rounded-lg"
                        >
                          <option value="low">נמוכה</option>
                          <option value="medium">בינונית</option>
                          <option value="high">גבוהה</option>
                          <option value="urgent">דחופה</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">תקציב משוער (₪)</label>
                      <Input
                        type="number"
                        value={newLead.budget}
                        onChange={(e) => setNewLead({ ...newLead, budget: e.target.value })}
                        placeholder="0"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">הערות</label>
                      <textarea
                        value={newLead.notes}
                        onChange={(e) => setNewLead({ ...newLead, notes: e.target.value })}
                        placeholder="הערות נוספות..."
                        className="w-full p-2 border rounded-lg min-h-[80px]"
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button onClick={createLead}>שמור ליד</Button>
                      <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                        ביטול
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Leads List */}
              {filteredLeads.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Users className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-medium mb-2">אין ליידים להצגה</h3>
                  <p className="mb-4">התחל בהוספת ליידים או שנה את הסינונים</p>
                  <Button onClick={() => setShowCreateForm(true)}>
                    <PlusCircle className="w-4 h-4 ml-2" />
                    הוסף ליד ראשון
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredLeads.map((lead) => (
                    <div
                      key={lead.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                      onClick={() => setSelectedLead(lead)}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-medium">
                            {lead.firstName && lead.lastName ? 
                              `${lead.firstName} ${lead.lastName}` : 
                              lead.name || 'ללא שם'
                            }
                          </h4>
                          {lead.businessName && (
                            <span className="text-sm text-gray-500">• {lead.businessName}</span>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          {lead.email && (
                            <div className="flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {lead.email}
                            </div>
                          )}
                          {lead.phone && (
                            <div className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {lead.phone}
                            </div>
                          )}
                          {lead.budget && (
                            <div className="flex items-center gap-1">
                              <DollarSign className="w-3 h-3" />
                              {formatCurrency(lead.budget)}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge className={getPriorityColor(lead.priority)}>
                          {lead.priority === 'low' && 'נמוכה'}
                          {lead.priority === 'medium' && 'בינונית'}
                          {lead.priority === 'high' && 'גבוהה'}
                          {lead.priority === 'urgent' && 'דחופה'}
                        </Badge>
                        
                        <Badge className={`${getStatusColor(lead.status)} flex items-center gap-1`}>
                          {getStatusIcon(lead.status)}
                          {lead.status === 'new' && 'חדש'}
                          {lead.status === 'contacted' && 'יצר קשר'}
                          {lead.status === 'qualified' && 'מוכשר'}
                          {lead.status === 'proposal' && 'הצעה'}
                          {lead.status === 'converted' && 'הומר'}
                          {lead.status === 'lost' && 'אבד'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Campaigns Tab */}
        <TabsContent value="campaigns">
          <Card>
            <CardHeader>
              <CardTitle>קמפיינים לליד גנרציה</CardTitle>
            </CardHeader>
            <CardContent>
              {leadGenCampaigns.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Target className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-medium mb-2">אין קמפיינים פעילים</h3>
                  <p className="mb-4">צור קמפיינים מותאמים לליד גנרציה</p>
                  <Button>
                    <PlusCircle className="w-4 h-4 ml-2" />
                    צור קמפיין ליד גנרציה
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {leadGenCampaigns.map((campaign) => (
                    <Card key={campaign.id}>
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-medium">{campaign.name}</h4>
                          <Badge className={campaign.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                            {campaign.status === 'active' ? 'פעיל' : 'לא פעיל'}
                          </Badge>
                        </div>
                        
                        {campaign.targetAudience && (
                          <p className="text-sm text-gray-600 mb-2">
                            קהל יעד: {campaign.targetAudience}
                          </p>
                        )}
                        
                        {campaign.costPerLead && (
                          <p className="text-sm text-gray-600">
                            עלות לליד: {formatCurrency(campaign.costPerLead / 100)}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Status Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>התפלגות ליידים לפי סטטוס</CardTitle>
              </CardHeader>
              <CardContent>
                {statusChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={statusChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {statusChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <BarChart className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p>אין מספיק נתונים להצגת גרף</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Lead Sources */}
            <Card>
              <CardHeader>
                <CardTitle>מקורות ליידים</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {['website', 'facebook', 'google', 'referral', 'manual'].map(source => {
                    const count = leads.filter(l => l.source === source).length;
                    if (count === 0) return null;
                    
                    return (
                      <div key={source} className="flex items-center justify-between">
                        <span className="text-sm">
                          {source === 'website' && 'אתר'}
                          {source === 'facebook' && 'פייסבוק'}
                          {source === 'google' && 'גוגל'}
                          {source === 'referral' && 'המלצה'}
                          {source === 'manual' && 'ידני'}
                        </span>
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-gray-200 rounded-full">
                            <div 
                              className="h-2 bg-blue-500 rounded-full"
                              style={{ width: `${(count / leads.length) * 100}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium">{count}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}