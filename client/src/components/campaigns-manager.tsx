import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  TrendingUp, 
  Eye, 
  MousePointer, 
  Target, 
  DollarSign, 
  Users,
  PlusCircle,
  Zap,
  AlertCircle,
  CheckCircle,
  Clock,
  Pause
} from 'lucide-react';

interface Campaign {
  id: string;
  projectId: string;
  clientId?: string;
  platform: 'meta' | 'google_ads';
  platformCampaignId: string;
  name: string;
  status: 'active' | 'paused' | 'completed';
  objective?: string;
  budget?: number;
  budgetType?: 'daily' | 'lifetime';
  startDate?: string;
  endDate?: string;
  createdAt: number;
  updatedAt: number;
}

interface CampaignMetrics {
  id: string;
  campaignId: string;
  date: string;
  impressions: number;
  clicks: number;
  spend: number;
  conversions: number;
  cpm: number;
  cpc: number;
  ctr: number;
  conversionRate: number;
  reach: number;
  frequency: number;
}

interface CampaignsManagerProps {
  projectId: string;
  oauthStatus?: {
    meta?: { connected: boolean; accountName?: string };
    google_ads?: { connected: boolean; accountName?: string };
  };
}

export function CampaignsManager({ projectId, oauthStatus }: CampaignsManagerProps) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [metrics, setMetrics] = useState<Record<string, CampaignMetrics[]>>({});
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [loading, setLoading] = useState(true);

  // New campaign form
  const [newCampaign, setNewCampaign] = useState({
    platform: 'meta' as const,
    name: '',
    objective: '',
    budget: '',
    budgetType: 'daily' as const,
    startDate: new Date().toISOString().split('T')[0],
    endDate: ''
  });

  useEffect(() => {
    if (projectId) {
      fetchCampaigns();
    }
  }, [projectId]);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/analytics/campaigns/project/${projectId}`);
      if (response.ok) {
        const campaignsData = await response.json();
        setCampaigns(campaignsData);
        
        // Fetch metrics for each campaign
        for (const campaign of campaignsData) {
          await fetchCampaignMetrics(campaign.id);
        }
      }
    } catch (error) {
      console.error('Error fetching campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCampaignMetrics = async (campaignId: string) => {
    try {
      const response = await fetch(`/api/analytics/campaign-metrics/${campaignId}`);
      if (response.ok) {
        const metricsData = await response.json();
        setMetrics(prev => ({ ...prev, [campaignId]: metricsData }));
      }
    } catch (error) {
      console.error('Error fetching campaign metrics:', error);
    }
  };

  const createCampaign = async () => {
    try {
      const response = await fetch('/api/analytics/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newCampaign,
          projectId,
          platformCampaignId: `manual_${Date.now()}`,
          budget: newCampaign.budget ? parseFloat(newCampaign.budget) : null,
          status: 'active'
        })
      });

      if (response.ok) {
        setNewCampaign({
          platform: 'meta',
          name: '',
          objective: '',
          budget: '',
          budgetType: 'daily',
          startDate: new Date().toISOString().split('T')[0],
          endDate: ''
        });
        setShowCreateForm(false);
        fetchCampaigns();
      }
    } catch (error) {
      console.error('Error creating campaign:', error);
    }
  };

  const connectPlatform = async (platform: string) => {
    try {
      const response = await fetch(`/oauth/${platform}/auth`);
      if (response.ok) {
        const { authUrl } = await response.json();
        window.location.href = authUrl;
      }
    } catch (error) {
      console.error(`Error connecting to ${platform}:`, error);
    }
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS'
    }).format(amount / 100);
  };

  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('he-IL').format(num);
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'meta':
        return <div className="w-2 h-2 rounded-full bg-blue-500"></div>;
      case 'google_ads':
        return <div className="w-2 h-2 rounded-full bg-red-500"></div>;
      default:
        return <div className="w-2 h-2 rounded-full bg-gray-500"></div>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'paused':
        return <Pause className="w-4 h-4 text-yellow-500" />;
      case 'completed':
        return <Clock className="w-4 h-4 text-gray-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getMetricsSummary = (campaignId: string) => {
    const campaignMetrics = metrics[campaignId] || [];
    if (campaignMetrics.length === 0) return null;

    const totals = campaignMetrics.reduce((acc, metric) => ({
      impressions: acc.impressions + metric.impressions,
      clicks: acc.clicks + metric.clicks,
      spend: acc.spend + metric.spend,
      conversions: acc.conversions + metric.conversions
    }), { impressions: 0, clicks: 0, spend: 0, conversions: 0 });

    const avgCtr = campaignMetrics.reduce((acc, metric) => acc + metric.ctr, 0) / campaignMetrics.length;
    const avgCpc = totals.clicks > 0 ? totals.spend / totals.clicks : 0;

    return {
      ...totals,
      ctr: avgCtr,
      cpc: avgCpc
    };
  };

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
      {/* Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            חיבורי פלטפורמות פרסום
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                <span className="font-medium">Meta Ads</span>
                {oauthStatus?.meta?.accountName && (
                  <span className="text-sm text-gray-500">({oauthStatus.meta.accountName})</span>
                )}
              </div>
              {oauthStatus?.meta?.connected ? (
                <Badge className="bg-green-100 text-green-800">מחובר</Badge>
              ) : (
                <Button size="sm" onClick={() => connectPlatform('meta')}>
                  חבר
                </Button>
              )}
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                <span className="font-medium">Google Ads</span>
                {oauthStatus?.google_ads?.accountName && (
                  <span className="text-sm text-gray-500">({oauthStatus.google_ads.accountName})</span>
                )}
              </div>
              {oauthStatus?.google_ads?.connected ? (
                <Badge className="bg-green-100 text-green-800">מחובר</Badge>
              ) : (
                <Button size="sm" onClick={() => connectPlatform('google_ads')}>
                  חבר
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="campaigns" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="campaigns">קמפיינים</TabsTrigger>
          <TabsTrigger value="performance">ביצועים</TabsTrigger>
          <TabsTrigger value="insights">תובנות</TabsTrigger>
        </TabsList>

        {/* Campaigns Tab */}
        <TabsContent value="campaigns">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>ניהול קמפיינים</CardTitle>
              <Button onClick={() => setShowCreateForm(true)}>
                <PlusCircle className="w-4 h-4 ml-2" />
                צור קמפיין
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Create Campaign Form */}
              {showCreateForm && (
                <Card className="border-2 border-blue-200 bg-blue-50">
                  <CardContent className="pt-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">פלטפורמה</label>
                        <select
                          value={newCampaign.platform}
                          onChange={(e) => setNewCampaign({ ...newCampaign, platform: e.target.value as any })}
                          className="w-full p-2 border rounded-lg"
                        >
                          <option value="meta">Meta Ads</option>
                          <option value="google_ads">Google Ads</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">שם הקמפיין</label>
                        <Input
                          value={newCampaign.name}
                          onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
                          placeholder="שם הקמפיין"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">מטרת הקמפיין</label>
                      <Input
                        value={newCampaign.objective}
                        onChange={(e) => setNewCampaign({ ...newCampaign, objective: e.target.value })}
                        placeholder="למשל: הגדלת המודעות, יצירת לידים"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">תקציב (₪)</label>
                        <Input
                          type="number"
                          step="1"
                          value={newCampaign.budget}
                          onChange={(e) => setNewCampaign({ ...newCampaign, budget: e.target.value })}
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">סוג תקציב</label>
                        <select
                          value={newCampaign.budgetType}
                          onChange={(e) => setNewCampaign({ ...newCampaign, budgetType: e.target.value as any })}
                          className="w-full p-2 border rounded-lg"
                        >
                          <option value="daily">יומי</option>
                          <option value="lifetime">כולל</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">תאריך התחלה</label>
                        <Input
                          type="date"
                          value={newCampaign.startDate}
                          onChange={(e) => setNewCampaign({ ...newCampaign, startDate: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">תאריך סיום (אופציונלי)</label>
                        <Input
                          type="date"
                          value={newCampaign.endDate}
                          onChange={(e) => setNewCampaign({ ...newCampaign, endDate: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button onClick={createCampaign}>צור קמפיין</Button>
                      <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                        ביטול
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Campaigns List */}
              {campaigns.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <TrendingUp className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-medium mb-2">עדיין אין קמפיינים</h3>
                  <p className="mb-4">התחל בעבודה עם קמפיינים ממוקדים לפרויקט זה</p>
                  <Button onClick={() => setShowCreateForm(true)}>
                    <PlusCircle className="w-4 h-4 ml-2" />
                    צור קמפיין ראשון
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {campaigns.map((campaign) => {
                    const summary = getMetricsSummary(campaign.id);
                    return (
                      <Card 
                        key={campaign.id} 
                        className={`cursor-pointer transition-colors ${
                          selectedCampaign?.id === campaign.id ? 'border-blue-500 bg-blue-50' : 'hover:bg-gray-50'
                        }`}
                        onClick={() => setSelectedCampaign(campaign)}
                      >
                        <CardContent className="pt-6">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2">
                              {getPlatformIcon(campaign.platform)}
                              <span className="text-xs text-gray-500 uppercase">
                                {campaign.platform === 'meta' ? 'Meta' : 'Google'}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              {getStatusIcon(campaign.status)}
                            </div>
                          </div>
                          
                          <h4 className="font-medium mb-2 line-clamp-2">{campaign.name}</h4>
                          
                          {campaign.objective && (
                            <p className="text-sm text-gray-600 mb-3">{campaign.objective}</p>
                          )}

                          {campaign.budget && (
                            <div className="text-sm text-gray-500 mb-3">
                              תקציב: {formatCurrency(campaign.budget)} 
                              {campaign.budgetType === 'daily' ? ' יומי' : ' כולל'}
                            </div>
                          )}

                          {summary && (
                            <div className="space-y-2 pt-3 border-t">
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600">הופעות:</span>
                                <span className="font-medium">{formatNumber(summary.impressions)}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600">קליקים:</span>
                                <span className="font-medium">{formatNumber(summary.clicks)}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600">הוצאה:</span>
                                <span className="font-medium">{formatCurrency(summary.spend)}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600">CTR:</span>
                                <span className="font-medium">{(summary.ctr * 100).toFixed(2)}%</span>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance">
          {selectedCampaign ? (
            <Card>
              <CardHeader>
                <CardTitle>ביצועי קמפיין: {selectedCampaign.name}</CardTitle>
              </CardHeader>
              <CardContent>
                {metrics[selectedCampaign.id] && metrics[selectedCampaign.id].length > 0 ? (
                  <div className="space-y-6">
                    {/* Performance Chart */}
                    <div>
                      <h4 className="text-lg font-medium mb-4">מגמת ביצועים</h4>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={metrics[selectedCampaign.id]}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="date" 
                            tickFormatter={(value) => new Date(value).toLocaleDateString('he-IL')}
                          />
                          <YAxis />
                          <Tooltip 
                            labelFormatter={(value) => new Date(value).toLocaleDateString('he-IL')}
                          />
                          <Legend />
                          <Line 
                            type="monotone" 
                            dataKey="impressions" 
                            stroke="#3b82f6" 
                            name="הופעות"
                          />
                          <Line 
                            type="monotone" 
                            dataKey="clicks" 
                            stroke="#ef4444" 
                            name="קליקים"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Key Metrics */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {[
                        { 
                          label: 'הופעות', 
                          value: formatNumber(getMetricsSummary(selectedCampaign.id)?.impressions || 0),
                          icon: Eye,
                          color: 'text-blue-600'
                        },
                        { 
                          label: 'קליקים', 
                          value: formatNumber(getMetricsSummary(selectedCampaign.id)?.clicks || 0),
                          icon: MousePointer,
                          color: 'text-green-600'
                        },
                        { 
                          label: 'המרות', 
                          value: formatNumber(getMetricsSummary(selectedCampaign.id)?.conversions || 0),
                          icon: Target,
                          color: 'text-purple-600'
                        },
                        { 
                          label: 'הוצאה', 
                          value: formatCurrency(getMetricsSummary(selectedCampaign.id)?.spend || 0),
                          icon: DollarSign,
                          color: 'text-red-600'
                        }
                      ].map((metric, index) => (
                        <Card key={index}>
                          <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm text-gray-600">{metric.label}</p>
                                <p className={`text-xl font-bold ${metric.color}`}>
                                  {metric.value}
                                </p>
                              </div>
                              <metric.icon className={`h-6 w-6 ${metric.color}`} />
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <BarChart className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                    <p>אין נתוני ביצועים זמינים לקמפיין זה</p>
                    <p className="text-sm">הנתונים יתעדכנו לאחר שהקמפיין יתחיל לפעול</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6 text-center py-12">
                <TrendingUp className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-500">בחר קמפיין כדי לראות נתוני ביצועים</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Insights Tab */}
        <TabsContent value="insights">
          <Card>
            <CardHeader>
              <CardTitle>תובנות ובדיקות</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-gray-500">
                <Users className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium mb-2">תובנות AI</h3>
                <p className="mb-4">תובנות חכמות והמלצות לשיפור ביצועי הקמפיינים</p>
                <p className="text-sm">בקרוב...</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}