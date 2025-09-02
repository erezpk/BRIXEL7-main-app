import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TimeTracker } from "@/components/time-tracker";
import { CampaignsManager } from "@/components/campaigns-manager";
import { LeadsManager } from "@/components/leads-manager";
import { 
  BarChart3, 
  Clock, 
  DollarSign, 
  TrendingUp, 
  Settings, 
  Play, 
  Pause, 
  PlusCircle,
  Zap,
  Target,
  Users,
  Activity
} from 'lucide-react';

// Types
interface Project {
  id: string;
  name: string;
  type: 'website' | 'marketing' | 'lead_gen';
  status: string;
  clientId: string;
}

interface TimeEntry {
  id: string;
  projectId: string;
  taskId?: string;
  userId: string;
  description?: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  hourlyRate?: number;
  billable: boolean;
  approved: boolean;
}

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

interface OAuthStatus {
  meta: { connected: boolean; accountName?: string; isExpired?: boolean };
  google_ads: { connected: boolean; accountName?: string; isExpired?: boolean };
  google_analytics: { connected: boolean; accountName?: string; isExpired?: boolean };
}

export default function ProjectAnalytics() {
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get('id');
  
  const [project, setProject] = useState<Project | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [isTracking, setIsTracking] = useState(false);
  const [currentTimeEntry, setCurrentTimeEntry] = useState<TimeEntry | null>(null);
  const [profitability, setProfitability] = useState<ProfitabilityData | null>(null);
  const [oauthStatus, setOAuthStatus] = useState<OAuthStatus | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch project data
  useEffect(() => {
    if (projectId) {
      fetchProject();
      fetchProfitability();
      fetchOAuthStatus();
    }
  }, [projectId]);

  const fetchProject = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}`);
      if (response.ok) {
        const data = await response.json();
        setProject(data);
      }
    } catch (error) {
      console.error('Error fetching project:', error);
    }
  };

  const fetchProfitability = async () => {
    try {
      const response = await fetch(`/api/analytics/profitability/${projectId}`);
      if (response.ok) {
        const data = await response.json();
        setProfitability(data);
      }
    } catch (error) {
      console.error('Error fetching profitability:', error);
    }
  };

  const fetchOAuthStatus = async () => {
    try {
      const response = await fetch('/api/oauth/status');
      if (response.ok) {
        const data = await response.json();
        setOAuthStatus(data);
      }
    } catch (error) {
      console.error('Error fetching OAuth status:', error);
    } finally {
      setLoading(false);
    }
  };

  const startTimeTracking = async () => {
    try {
      const response = await fetch('/api/analytics/time-entries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId,
          description: `עבודה על פרויקט ${project?.name}`
        })
      });
      
      if (response.ok) {
        const timeEntry = await response.json();
        setCurrentTimeEntry(timeEntry);
        setIsTracking(true);
      }
    } catch (error) {
      console.error('Error starting time tracking:', error);
    }
  };

  const stopTimeTracking = async () => {
    if (!currentTimeEntry) return;
    
    try {
      const response = await fetch(`/api/analytics/time-entries/${currentTimeEntry.id}/stop`, {
        method: 'PUT',
      });
      
      if (response.ok) {
        setIsTracking(false);
        setCurrentTimeEntry(null);
        fetchProfitability(); // Refresh profitability data
      }
    } catch (error) {
      console.error('Error stopping time tracking:', error);
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

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-gray-500">פרויקט לא נמצא</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getProjectTypeColor = (type: string) => {
    switch (type) {
      case 'website': return 'bg-blue-500';
      case 'marketing': return 'bg-green-500';
      case 'lead_gen': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  const getProjectTypeIcon = (type: string) => {
    switch (type) {
      case 'website': return <Activity className="h-4 w-4" />;
      case 'marketing': return <TrendingUp className="h-4 w-4" />;
      case 'lead_gen': return <Target className="h-4 w-4" />;
      default: return <BarChart3 className="h-4 w-4" />;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">{project.name}</h1>
            <Badge 
              className={`${getProjectTypeColor(project.type)} text-white flex items-center gap-1`}
            >
              {getProjectTypeIcon(project.type)}
              {project.type === 'website' && 'אתר'}
              {project.type === 'marketing' && 'שיווק'}
              {project.type === 'lead_gen' && 'ליד גנרציה'}
            </Badge>
          </div>
          <p className="text-gray-600">ניתוח רווחיות ומעקב זמנים</p>
        </div>
        
        {/* Time Tracking Controls */}
        <div className="flex items-center gap-2">
          {!isTracking ? (
            <Button onClick={startTimeTracking} className="bg-green-600 hover:bg-green-700">
              <Play className="w-4 h-4 ml-2" />
              התחל מעקב זמן
            </Button>
          ) : (
            <Button onClick={stopTimeTracking} variant="destructive">
              <Pause className="w-4 h-4 ml-2" />
              עצור מעקב זמן
            </Button>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      {profitability && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">סה״כ הכנסות</p>
                  <p className="text-2xl font-bold text-green-600">
                    ₪{profitability.totalRevenue.toLocaleString()}
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
                    ₪{profitability.totalCosts.toLocaleString()}
                  </p>
                </div>
                <BarChart3 className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">רווח נקי</p>
                  <p className={`text-2xl font-bold ${profitability.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ₪{profitability.profit.toLocaleString()}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">שעות עבודה</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {profitability.totalHours.toFixed(1)}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">סקירה כללית</TabsTrigger>
          <TabsTrigger value="time-tracking">מעקב זמנים</TabsTrigger>
          <TabsTrigger value="campaigns">קמפיינים</TabsTrigger>
          <TabsTrigger value="leads">ליידים</TabsTrigger>
          <TabsTrigger value="settings">הגדרות</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  ניתוח רווחיות
                </CardTitle>
              </CardHeader>
              <CardContent>
                {profitability ? (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span>הכנסות:</span>
                      <span className="font-bold text-green-600">₪{profitability.totalRevenue.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>עלויות עבודה:</span>
                      <span className="font-bold text-blue-600">₪{profitability.laborCost.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>הוצאות:</span>
                      <span className="font-bold text-orange-600">₪{profitability.totalExpenses.toLocaleString()}</span>
                    </div>
                    <hr />
                    <div className="flex justify-between items-center">
                      <span>רווח נקי:</span>
                      <span className={`font-bold text-lg ${profitability.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ₪{profitability.profit.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>מרווח רווח:</span>
                      <span className={`font-bold ${profitability.profitMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {profitability.profitMargin.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-center text-gray-500">טוען נתוני רווחיות...</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  חיבורי פלטפורמות
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                      <span>Meta Ads</span>
                    </div>
                    {oauthStatus?.meta?.connected ? (
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        מחובר
                      </Badge>
                    ) : (
                      <Button size="sm" onClick={() => connectPlatform('meta')}>
                        חבר
                      </Button>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-red-500"></div>
                      <span>Google Ads</span>
                    </div>
                    {oauthStatus?.google_ads?.connected ? (
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        מחובר
                      </Badge>
                    ) : (
                      <Button size="sm" onClick={() => connectPlatform('google_ads')}>
                        חבר
                      </Button>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                      <span>Google Analytics</span>
                    </div>
                    {oauthStatus?.google_analytics?.connected ? (
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        מחובר
                      </Badge>
                    ) : (
                      <Button size="sm" onClick={() => connectPlatform('google_analytics')}>
                        חבר
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Time Tracking Tab */}
        <TabsContent value="time-tracking" className="space-y-4">
          <TimeTracker 
            projectId={projectId!} 
            projectName={project.name}
            onTimeEntryUpdated={fetchProfitability}
          />
        </TabsContent>

        {/* Campaigns Tab */}
        <TabsContent value="campaigns" className="space-y-4">
          <CampaignsManager 
            projectId={projectId!}
            oauthStatus={oauthStatus || undefined}
          />
        </TabsContent>

        {/* Leads Tab */}
        <TabsContent value="leads" className="space-y-4">
          <LeadsManager 
            projectId={projectId!}
            projectType={project.type}
          />
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                הגדרות פרויקט
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">תעריף לשעה ברירת מחדל</label>
                  <input 
                    type="number" 
                    className="w-full p-2 border rounded-lg" 
                    placeholder="200" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">הגדרות התראות</label>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input type="checkbox" className="ml-2" />
                      שלח התראה כשהזמן עולה על התקציב
                    </label>
                    <label className="flex items-center">
                      <input type="checkbox" className="ml-2" />
                      שלח דוח שבועי של זמנים
                    </label>
                  </div>
                </div>
                <Button className="w-full">
                  שמור הגדרות
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}