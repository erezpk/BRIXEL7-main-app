import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowRight, Phone, Mail, Calendar, DollarSign, Star, Edit, Save, X, User, Clock, MapPin, 
         MessageSquare, FileText, TrendingUp, Activity, Bell, Settings, Share2, Filter,
         BarChart3, PieChart, Target, Zap, Phone as PhoneCall, Video, Send,
         History, Tag, Flag, AlertTriangle, CheckCircle, Users, Building, Globe } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ContactMeetings } from "@/components/contact-meetings";
import { notifyLeadUpdated, notifyStatusChanged, notifyMeetingCreated, notifyEmailSent } from "@/lib/notifications";

interface Lead {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  source: string;
  status: string;
  priority: string;
  value?: number;
  notes?: string;
  assignedTo?: string;
  createdAt: string;
  updatedAt: string;
}

const statusOptions = [
  { value: "new", label: "חדש", color: "bg-blue-500" },
  { value: "contacted", label: "נוצר קשר", color: "bg-yellow-500" },
  { value: "qualified", label: "מוכשר", color: "bg-orange-500" },
  { value: "won", label: "נמכר", color: "bg-green-500" },
  { value: "lost", label: "אבוד", color: "bg-red-500" },
];

const sourceOptions = [
  { value: "website", label: "אתר" },
  { value: "facebook", label: "פייסבוק" },
  { value: "google", label: "גוגל" },
  { value: "referral", label: "הפניה" },
  { value: "manual", label: "ידני" },
];

const priorityOptions = [
  { value: "low", label: "נמוכה", color: "text-green-600" },
  { value: "medium", label: "בינונית", color: "text-yellow-600" },
  { value: "high", label: "גבוהה", color: "text-red-600" },
];

export default function LeadDetails() {
  const [, params] = useRoute("/dashboard/leads/:leadId");
  const leadId = params?.leadId;
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddNoteModal, setShowAddNoteModal] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailForm, setEmailForm] = useState({ subject: "", body: "" });
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [meetingForm, setMeetingForm] = useState({
    title: "",
    date: "",
    time: "",
    duration: "60",
    location: "",
    notes: ""
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const actionMenuRef = useRef<HTMLDivElement>(null);

  const { data: lead, isLoading, error } = useQuery<Lead>({
    queryKey: ['/api/leads', leadId],
    enabled: !!leadId,
  });

  // Debug logging removed - lead fetching working correctly

  const { data: users = [] } = useQuery({
    queryKey: ['/api/users'],
  });

  const [leadForm, setLeadForm] = useState({
    name: "",
    email: "",
    phone: "",
    source: "website",
    status: "new",
    priority: "medium",
    value: 0,
    notes: "",
    assignedTo: "unassigned",
  });

  // Set form data when lead loads
  useEffect(() => {
    if (lead) {
      setLeadForm({
        name: lead.name,
        email: lead.email || "",
        phone: lead.phone || "",
        source: lead.source,
        status: lead.status,
        priority: lead.priority,
        value: lead.value || 0,
        notes: lead.notes || "",
        assignedTo: lead.assignedTo || "unassigned",
      });
    }
  }, [lead]);

  // Handle clicking outside action menu, scrolling, and escape key
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (actionMenuRef.current && !actionMenuRef.current.contains(event.target as Node)) {
        setShowActionMenu(false);
      }
    };

    const handleScroll = () => {
      setShowActionMenu(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowActionMenu(false);
      }
    };

    if (showActionMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('scroll', handleScroll, true);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('scroll', handleScroll, true);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showActionMenu]);

  const updateLeadMutation = useMutation({
    mutationFn: async (updatedLead: Partial<Lead>) => {
      console.log('Updating lead with data:', updatedLead);
      console.log('Lead ID:', leadId);
      
      const response = await fetch(`/api/leads/${leadId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedLead),
      });

      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error('שגיאה בעדכון הליד');
      }

      return response.json();
    },
    onSuccess: (updatedLead) => {
      queryClient.invalidateQueries({ queryKey: ['/api/leads', leadId] });
      queryClient.invalidateQueries({ queryKey: ['/api/leads'] });
      setShowEditModal(false);
      toast({
        title: "הליד עודכן בהצלחה",
        description: "פרטי הליד נשמרו במערכת",
      });
      
      // Send notification
      notifyLeadUpdated(lead.name, leadId, 'אתה');
      
      // If status changed, send specific notification
      if (leadForm.status !== lead.status) {
        const statusLabels = {
          'new': 'חדש',
          'contacted': 'נוצר קשר', 
          'qualified': 'מוכשר',
          'won': 'נמכר',
          'lost': 'אבוד'
        };
        notifyStatusChanged(
          lead.name, 
          leadId, 
          statusLabels[lead.status] || lead.status,
          statusLabels[leadForm.status] || leadForm.status,
          'אתה'
        );
      }
    },
    onError: () => {
      toast({
        title: "שגיאה בעדכון הליד",
        description: "אנא נסה שוב מאוחר יותר",
        variant: "destructive",
      });
    },
  });

  const addNoteMutation = useMutation({
    mutationFn: async (note: string) => {
      const currentNotes = lead?.notes || '';
      const timestamp = new Date().toLocaleString('he-IL');
      const newNotesContent = currentNotes 
        ? `${currentNotes}\n\n[${timestamp}]\n${note}`
        : `[${timestamp}]\n${note}`;

      const response = await fetch(`/api/leads/${leadId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notes: newNotesContent }),
      });

      if (!response.ok) {
        throw new Error('שגיאה בהוספת הערה');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/leads', leadId] });
      queryClient.invalidateQueries({ queryKey: ['/api/leads'] });
      setShowAddNoteModal(false);
      setNewNote('');
      toast({
        title: "הערה נוספה בהצלחה",
        description: "ההערה נשמרה במערכת",
      });
    },
    onError: () => {
      toast({
        title: "שגיאה בהוספת הערה",
        description: "אנא נסה שוב מאוחר יותר",
        variant: "destructive",
      });
    },
  });

  const getStatusColor = (status: string) => {
    return statusOptions.find(s => s.value === status)?.color || "bg-gray-500";
  };

  const getStatusLabel = (status: string) => {
    return statusOptions.find(s => s.value === status)?.label || status;
  };

  const getPriorityColor = (priority: string) => {
    return priorityOptions.find(p => p.value === priority)?.color || "text-gray-600";
  };

  const getPriorityLabel = (priority: string) => {
    return priorityOptions.find(p => p.value === priority)?.label || priority;
  };

  // Extract meetings from notes
  const getMeetingsFromNotes = (notes: string) => {
    if (!notes) return [];
    const meetingRegex = /\[פגישה - ([^\]]+)\] ([^\n]+)/g;
    const meetings = [];
    let match;
    while ((match = meetingRegex.exec(notes)) !== null) {
      meetings.push({
        dateTime: match[1],
        title: match[2],
        id: Math.random().toString(36).substr(2, 9)
      });
    }
    return meetings;
  };

  // Extract activities from notes (meetings, notes, etc.)
  const getActivitiesFromNotes = (notes: string) => {
    if (!notes) return [];
    const activities = [];
    
    // Extract meetings
    const meetingRegex = /\[פגישה - ([^\]]+)\] ([^\n]+)/g;
    let match;
    while ((match = meetingRegex.exec(notes)) !== null) {
      const dateTimeStr = match[1];
      const title = match[2];
      
      // Try to parse the date for sorting
      let timestamp;
      try {
        timestamp = new Date(dateTimeStr).getTime();
      } catch {
        timestamp = Date.now();
      }
      
      activities.push({
        type: 'meeting_scheduled',
        title: `פגישה נקבעה: ${title}`,
        description: `מתוכנן ל-${dateTimeStr}`,
        timestamp,
        dateTime: dateTimeStr,
        id: Math.random().toString(36).substr(2, 9),
        icon: Calendar
      });
    }
    
    // Extract timestamped notes
    const noteRegex = /\[([^\]]+)\]\n([^\n\[]+)/g;
    while ((match = noteRegex.exec(notes)) !== null) {
      const timestampStr = match[1];
      const noteContent = match[2];
      
      // Skip if this is a meeting (already processed)
      if (timestampStr.includes('פגישה -')) continue;
      
      let timestamp;
      try {
        timestamp = new Date(timestampStr).getTime();
      } catch {
        timestamp = Date.now();
      }
      
      activities.push({
        type: 'note_added',
        title: 'הערה נוספה',
        description: noteContent.length > 50 ? `${noteContent.substring(0, 50)}...` : noteContent,
        timestamp,
        dateTime: timestampStr,
        id: Math.random().toString(36).substr(2, 9),
        icon: MessageSquare
      });
    }
    
    // Sort by timestamp (newest first)
    return activities.sort((a, b) => b.timestamp - a.timestamp);
  };

  const leadMeetings = lead ? getMeetingsFromNotes(lead.notes || '') : [];
  const leadActivities = lead ? getActivitiesFromNotes(lead.notes || '') : [];

  // Fetch tasks for this lead
  const { data: leadTasks = [] } = useQuery({
    queryKey: ['/api/leads', leadId, 'tasks'],
    enabled: !!leadId,
  });

  if (isLoading) {
    return <div className="p-6">טוען...</div>;
  }

  if (!lead && !isLoading) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">ליד לא נמצא</h2>
          <p className="text-muted-foreground">Lead ID: {leadId}</p>
          <p className="text-muted-foreground">Error: {error?.message || 'Unknown error'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Advanced Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                onClick={() => window.history.back()}
                className="hover:bg-gray-100"
              >
                <ArrowRight className="h-4 w-4 ml-2" />
                לידים
              </Button>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                  {lead.name?.charAt(0) || 'L'}
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{lead.name}</h1>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      lead.status === 'new' ? 'bg-blue-100 text-blue-700' :
                      lead.status === 'contacted' ? 'bg-yellow-100 text-yellow-700' :
                      lead.status === 'qualified' ? 'bg-green-100 text-green-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {getStatusLabel(lead.status)}
                    </span>
                    <span>•</span>
                    <span>{sourceOptions.find(s => s.value === lead.source)?.label}</span>
                    <span>•</span>
                    <span>נוצר {new Date(lead.createdAt).toLocaleDateString('he-IL')}</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" className="text-gray-600" onClick={() => toast({ title: 'שיתוף', description: 'קישור לשיתוף נוצר בהצלחה' })}>
                <Share2 className="h-4 w-4 ml-2" />
                שתף
              </Button>
              <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => setShowMeetingModal(true)}>
                <Calendar className="h-4 w-4 ml-2" />
                קבע פגישה
              </Button>
              <div className="relative" ref={actionMenuRef}>
                <Button 
                  size="sm"
                  onClick={() => setShowActionMenu(!showActionMenu)}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Zap className="h-4 w-4 ml-2" />
                  פעולות
                </Button>
                {showActionMenu && (
                  <div className="absolute left-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                    <div className="p-2 space-y-1">
                      <Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => { setShowActionMenu(false); setShowEditModal(true); }}>
                        <Edit className="h-4 w-4 ml-2" />
                        עריכת פרטים
                      </Button>
                      <Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => { setShowActionMenu(false); window.open(`tel:${lead.phone}`, '_blank'); }}>
                        <PhoneCall className="h-4 w-4 ml-2" />
                        התקשר
                      </Button>
                      <Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => { setShowActionMenu(false); setShowEmailModal(true); }}>
                        <Send className="h-4 w-4 ml-2" />
                        שלח אימייל
                      </Button>
                      <Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => { setShowActionMenu(false); window.open('https://meet.google.com/new', '_blank'); }}>
                        <Video className="h-4 w-4 ml-2" />
                        וידאו קול
                      </Button>
                      <Button variant="ghost" size="sm" className="w-full justify-start text-red-600" onClick={() => setShowActionMenu(false)}>
                        <X className="h-4 w-4 ml-2" />
                        מחק ליד
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Navigation Tabs */}
          <div className="mt-4 border-b border-gray-200">
            <nav className="flex space-x-8">
              {[
                { id: 'overview', label: 'סקירה כללית', icon: User },
                { id: 'analytics', label: 'אנליטיקה', icon: BarChart3 },
                { id: 'activities', label: 'פעילות', icon: Activity },
                { id: 'communications', label: 'תקשורת', icon: MessageSquare },
                { id: 'documents', label: 'מסמכים', icon: FileText },
                { id: 'timeline', label: 'ציר זמן', icon: History }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        {activeTab === 'overview' && (
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Lead Details */}
            <div className="lg:col-span-2 space-y-6">
              {/* Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">אינטראקציות</p>
                      <p className="text-2xl font-bold text-green-600">7</p>
                    </div>
                    <Activity className="h-8 w-8 text-green-600" />
                  </div>
                </Card>
                <Card className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">זמן מענה</p>
                      <p className="text-2xl font-bold text-blue-600">2.3ש</p>
                    </div>
                    <Clock className="h-8 w-8 text-blue-600" />
                  </div>
                </Card>
                <Card className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">אינטראקציות</p>
                      <p className="text-2xl font-bold text-purple-600">12</p>
                    </div>
                    <Activity className="h-8 w-8 text-purple-600" />
                  </div>
                </Card>
                <Card className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">הסתברות</p>
                      <p className="text-2xl font-bold text-orange-600">76%</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-orange-600" />
                  </div>
                </Card>
              </div>

              {/* Contact Information */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <User className="h-5 w-5" />
                  פרטי קשר
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {lead.email && (
                    <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg border border-blue-200">
                      <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                        <Mail className="h-6 w-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-600">אימייל</p>
                        <p className="font-semibold text-gray-900">{lead.email}</p>
                        <Button size="sm" variant="outline" className="mt-2" onClick={() => setShowEmailModal(true)}>
                          <Send className="h-3 w-3 ml-1" />
                          שלח אימייל
                        </Button>
                      </div>
                    </div>
                  )}
                  {lead.phone && (
                    <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-lg border border-green-200">
                      <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                        <Phone className="h-6 w-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-600">טלפון</p>
                        <p className="font-semibold text-gray-900">{lead.phone}</p>
                        <Button size="sm" variant="outline" className="mt-2" onClick={() => window.open(`tel:${lead.phone}`, '_blank')}>
                          <PhoneCall className="h-3 w-3 ml-1" />
                          התקשר
                        </Button>
                      </div>
                    </div>
                  )}
                  {lead.value && (
                    <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg border border-purple-200">
                      <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center">
                        <DollarSign className="h-6 w-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-600">ערך פוטנציאלי</p>
                        <p className="font-semibold text-gray-900">{lead.value.toLocaleString()} ₪</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg border border-orange-200">
                    <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center">
                      <Globe className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-600">מקור</p>
                      <p className="font-semibold text-gray-900">{sourceOptions.find(s => s.value === lead.source)?.label}</p>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Notes Section */}
              {lead.notes && (
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    הערות
                  </h3>
                  <div className="bg-gradient-to-r from-gray-50 to-blue-50 p-4 rounded-lg border border-gray-200">
                    <div className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                      {lead.notes}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setShowAddNoteModal(true)}
                    className="mt-4"
                  >
                    <MessageSquare className="h-4 w-4 ml-2" />
                    הוסף הערה
                  </Button>
                </Card>
              )}
            </div>

            {/* Right Sidebar */}
            <div className="space-y-6">
              {/* Lead Score */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">סיכוי מכירה</h3>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-green-600 mb-2">76%</div>
                    <p className="text-sm text-gray-600">סיכוי להמרה</p>
                  </div>
                  
                  <div className="w-full bg-gray-200 rounded-full h-4">
                    <div className="bg-gradient-to-r from-green-400 to-green-600 h-4 rounded-full" style={{width: '76%'}}></div>
                  </div>
                  
                  <div className="flex justify-between items-center text-xs text-gray-600">
                    <span>נמוך</span>
                    <span>גבוה</span>
                  </div>
                </div>
              </Card>

              {/* Recent Meetings */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">פגישות אחרונות</h3>
                {leadMeetings.length === 0 ? (
                  <div className="text-center py-6 text-gray-500">
                    <Calendar className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">אין פגישות מתוכננות</p>
                    <Button 
                      size="sm" 
                      className="mt-3 bg-green-600 hover:bg-green-700" 
                      onClick={() => setShowMeetingModal(true)}
                    >
                      <Calendar className="h-3 w-3 ml-2" />
                      קבע פגישה
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {leadMeetings.slice(0, 3).map((meeting) => (
                      <div key={meeting.id} className="border border-blue-200 bg-blue-50 p-3 rounded-lg">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-2">
                            <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center mt-0.5">
                              <Calendar className="h-3 w-3 text-white" />
                            </div>
                            <div className="flex-1">
                              <h4 className="text-sm font-medium text-blue-900">{meeting.title}</h4>
                              <p className="text-xs text-blue-700 mt-0.5">{meeting.dateTime}</p>
                            </div>
                          </div>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-6 px-2 text-xs"
                            onClick={() => {
                              const [date, time] = meeting.dateTime.split(' ');
                              const startDate = new Date(`${date}T${time}`);
                              const endDate = new Date(startDate.getTime() + 60 * 60000);
                              const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(meeting.title)}&dates=${startDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z/${endDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z&details=${encodeURIComponent('פגישה עם ' + lead.name)}`;
                              window.open(calendarUrl, '_blank');
                            }}
                          >
                            סנכרן
                          </Button>
                        </div>
                      </div>
                    ))}
                    {leadMeetings.length > 3 && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="w-full text-blue-600 hover:text-blue-700"
                        onClick={() => setActiveTab('activities')}
                      >
                        הצג עוד ({leadMeetings.length - 3})
                      </Button>
                    )}
                  </div>
                )}
              </Card>

              {/* Tasks for this Lead */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">משימות</h3>
                {leadTasks.length === 0 ? (
                  <div className="text-center py-6 text-gray-500">
                    <CheckCircle className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">אין משימות עדיין</p>
                    <Button 
                      size="sm" 
                      className="mt-3" 
                      onClick={() => setActiveTab('timeline')}
                    >
                      הצג כל המשימות
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {leadTasks.slice(0, 5).map((task: any) => {
                      const isCompleted = task.status === 'completed';
                      const isMeeting = task.type === 'meeting';
                      const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && !isCompleted;
                      
                      return (
                        <div key={task.id} className={`border p-3 rounded-lg ${
                          isCompleted ? 'bg-green-50 border-green-200' :
                          isOverdue ? 'bg-red-50 border-red-200' :
                          isMeeting ? 'bg-blue-50 border-blue-200' :
                          'bg-gray-50 border-gray-200'
                        }`}>
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3">
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center mt-0.5 ${
                                isCompleted ? 'bg-green-500' :
                                isOverdue ? 'bg-red-500' :
                                isMeeting ? 'bg-blue-500' :
                                'bg-gray-500'
                              }`}>
                                {isMeeting ? (
                                  <Calendar className="h-3 w-3 text-white" />
                                ) : (
                                  <CheckCircle className="h-3 w-3 text-white" />
                                )}
                              </div>
                              <div className="flex-1">
                                <h4 className={`text-sm font-medium ${
                                  isCompleted ? 'text-green-900 line-through' :
                                  isOverdue ? 'text-red-900' :
                                  isMeeting ? 'text-blue-900' :
                                  'text-gray-900'
                                }`}>
                                  {task.title}
                                </h4>
                                {task.description && (
                                  <p className="text-xs text-gray-600 mt-0.5">{task.description}</p>
                                )}
                                <div className="flex items-center gap-2 mt-1 text-xs">
                                  {task.dueDate && (
                                    <span className={isOverdue ? 'text-red-600 font-medium' : 'text-gray-500'}>
                                      {new Date(task.dueDate).toLocaleDateString('he-IL')}
                                    </span>
                                  )}
                                  {task.priority !== 'medium' && (
                                    <span className={`px-2 py-0.5 rounded text-xs ${
                                      task.priority === 'urgent' ? 'bg-red-100 text-red-700' :
                                      task.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                                      'bg-gray-100 text-gray-700'
                                    }`}>
                                      {task.priority === 'urgent' ? 'דחופה' :
                                       task.priority === 'high' ? 'גבוהה' : 'נמוכה'}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            {isMeeting && task.startTime && (
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="h-6 px-2 text-xs"
                                onClick={() => {
                                  const startDate = new Date(task.startTime);
                                  const endDate = task.endTime ? new Date(task.endTime) : new Date(startDate.getTime() + 60 * 60000);
                                  const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(task.title)}&dates=${startDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z/${endDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z&details=${encodeURIComponent(task.description || '')}${task.location ? `&location=${encodeURIComponent(task.location)}` : ''}`;
                                  window.open(calendarUrl, '_blank');
                                }}
                              >
                                סנכרן
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {leadTasks.length > 5 && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="w-full text-blue-600 hover:text-blue-700"
                        onClick={() => window.open('/dashboard/tasks', '_blank')}
                      >
                        הצג עוד ({leadTasks.length - 5})
                      </Button>
                    )}
                  </div>
                )}
              </Card>

              {/* Recent Activity */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">פעילות אחרונה</h3>
                {leadActivities.length === 0 ? (
                  <div className="text-center py-4 text-gray-500">
                    <Activity className="h-6 w-6 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">אין פעילות עדיין</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {leadActivities.slice(0, 4).map((activity) => {
                      const IconComponent = activity.icon;
                      const isMeeting = activity.type === 'meeting_scheduled';
                      return (
                        <div key={activity.id} className="flex items-start gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            isMeeting ? 'bg-green-100' : 'bg-blue-100'
                          }`}>
                            <IconComponent className={`h-4 w-4 ${
                              isMeeting ? 'text-green-600' : 'text-blue-600'
                            }`} />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium">{activity.title}</p>
                            <p className="text-xs text-gray-600 mt-0.5">{activity.description}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {new Date(activity.timestamp).toLocaleDateString('he-IL', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    {leadActivities.length > 4 && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="w-full text-blue-600 hover:text-blue-700 mt-3"
                        onClick={() => setActiveTab('timeline')}
                      >
                        הצג עוד פעילות
                      </Button>
                    )}
                  </div>
                )}
              </Card>
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="max-w-7xl mx-auto">
            <Card className="p-6">
              <h3 className="text-xl font-semibold mb-4">אנליטיקה מתקדמת</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-6 rounded-lg">
                  <PieChart className="h-8 w-8 text-blue-600 mb-2" />
                  <h4 className="font-semibold text-gray-900">התפלגות פעילויות</h4>
                  <p className="text-sm text-gray-600 mt-2">מיילים: 45% | שיחות: 30% | פגישות: 25%</p>
                </div>
                <div className="bg-gradient-to-r from-green-50 to-green-100 p-6 rounded-lg">
                  <Target className="h-8 w-8 text-green-600 mb-2" />
                  <h4 className="font-semibold text-gray-900">סיכוי מכירה</h4>
                  <p className="text-sm text-gray-600 mt-2">76% סיכוי להמרה</p>
                  <div className="w-full bg-green-200 rounded-full h-2 mt-2">
                    <div className="bg-green-500 h-2 rounded-full" style={{width: '76%'}}></div>
                  </div>
                </div>
                <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-6 rounded-lg">
                  <Target className="h-8 w-8 text-purple-600 mb-2" />
                  <h4 className="font-semibold text-gray-900">יעדי המרה</h4>
                  <p className="text-sm text-gray-600 mt-2">80% מהיעד החודשי</p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'activities' && (
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Activities */}
              <div className="lg:col-span-2 space-y-6">
                <Card className="p-6">
                  <h3 className="text-xl font-semibold mb-4">פגישות מתוכננות</h3>
                  {leadMeetings.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Calendar className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                      <p>אין פגישות מתוכננות</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {leadMeetings.map((meeting) => (
                        <div key={meeting.id} className="border border-blue-200 bg-blue-50 p-4 rounded-lg">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3">
                              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                                <Calendar className="h-4 w-4 text-white" />
                              </div>
                              <div>
                                <h4 className="font-medium text-blue-900">{meeting.title}</h4>
                                <p className="text-sm text-blue-700 mt-1">מתוכנן ל-{meeting.dateTime}</p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" onClick={() => {
                                const [date, time] = meeting.dateTime.split(' ');
                                const startDate = new Date(`${date}T${time}`);
                                const endDate = new Date(startDate.getTime() + 60 * 60000); // 1 hour default
                                const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(meeting.title)}&dates=${startDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z/${endDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z&details=${encodeURIComponent('פגישה עם ' + lead.name)}`;
                                window.open(calendarUrl, '_blank');
                              }}>
                                סנכרן ליומן
                              </Button>
                              <Badge className="bg-green-100 text-green-700">מתוכנן</Badge>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
                
                <Card className="p-6">
                  <h3 className="text-xl font-semibold mb-4">יומן פעילות כללי</h3>
                  <ContactMeetings
                    contactType="lead"
                    contactId={lead.id}
                    contactName={lead.name}
                  />
                </Card>
              </div>
              
              {/* Activities Sidebar */}
              <div className="space-y-6">
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4">סטטיסטיקות</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">פגישות מתוכננות</span>
                      <span className="font-bold text-blue-600">{leadMeetings.length}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">אינטראקציות כולל</span>
                      <span className="font-bold text-green-600">7</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">ארועים החודש</span>
                      <span className="font-bold text-purple-600">12</span>
                    </div>
                  </div>
                </Card>
                
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4">פעולות מהירות</h3>
                  <div className="space-y-3">
                    <Button className="w-full justify-start" variant="outline" onClick={() => setShowMeetingModal(true)}>
                      <Calendar className="h-4 w-4 ml-2" />
                      קבע פגישה חדשה
                    </Button>
                    <Button className="w-full justify-start" variant="outline" onClick={() => setShowEmailModal(true)}>
                      <Send className="h-4 w-4 ml-2" />
                      שלח מעקב
                    </Button>
                    <Button className="w-full justify-start" variant="outline" onClick={() => setShowAddNoteModal(true)}>
                      <MessageSquare className="h-4 w-4 ml-2" />
                      הוסף הערה
                    </Button>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'communications' && (
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Communication History */}
              <div className="lg:col-span-2 space-y-6">
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-semibold">היסטוריית תקשורת</h3>
                    <div className="flex gap-2">
                      <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => setShowEmailModal(true)}>
                        <Send className="h-4 w-4 ml-2" />
                        שלח אימייל
                      </Button>
                      <Button size="sm" variant="outline">
                        <PhoneCall className="h-4 w-4 ml-2" />
                        התקשר
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="border border-blue-200 bg-blue-50 p-4 rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                            <Mail className="h-4 w-4 text-white" />
                          </div>
                          <div>
                            <h4 className="font-medium">אימייל - הצעת מחיר נשלחה</h4>
                            <p className="text-sm text-gray-600 mt-1">
                              נושא: הצעת מחיר לפרויקט דיגיטלי<br/>
                              תוכן: שלום {lead.name}, מצורף הצעת מחיר מפורטת...
                            </p>
                            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                              <span>נשלח: היום, 14:30</span>
                              <span>•</span>
                              <span className="text-green-600">נקרא</span>
                            </div>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm">
                          <Edit className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="border border-green-200 bg-green-50 p-4 rounded-lg">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                          <PhoneCall className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <h4 className="font-medium">שיחת טלפון - ייעוץ ראשוני</h4>
                          <p className="text-sm text-gray-600 mt-1">
                            משך: 25 דקות | איכות קשר: מעולה<br/>
                            תוכן: דיון על צרכי הלקוח ודרישות הפרויקט
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                            <span>אתמול, 10:15</span>
                            <span>•</span>
                            <span className="text-blue-600">הוקלט</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="border border-purple-200 bg-purple-50 p-4 rounded-lg">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                          <Video className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <h4 className="font-medium">פגישת זום - הצגת פתרונות</h4>
                          <p className="text-sm text-gray-600 mt-1">
                            משך: 45 דקות | משתתפים: 3<br/>
                            תוכן: הצגת פתרונות טכנולוגיים ודמו של המערכת
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                            <span>לפני 3 ימים, 16:00</span>
                            <span>•</span>
                            <span className="text-green-600">הושלמה בהצלחה</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
              
              {/* Communication Stats */}
              <div className="space-y-6">
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4">סטטיסטיקות תקשורת</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">אימיילים נשלחו</span>
                      <span className="font-bold text-blue-600">12</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">שיחות טלפון</span>
                      <span className="font-bold text-green-600">8</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">פגישות</span>
                      <span className="font-bold text-purple-600">3</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">זמן מענה ממוצע</span>
                      <span className="font-bold text-orange-600">2.3 שעות</span>
                    </div>
                  </div>
                </Card>
                
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4">תזכורות</h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 p-2 rounded">
                      <AlertTriangle className="h-4 w-4" />
                      מעקב אחר הצעת מחיר - היום
                    </div>
                    <div className="flex items-center gap-2 text-sm text-blue-700 bg-blue-50 p-2 rounded">
                      <Calendar className="h-4 w-4" />
                      פגישה מתוכננת - מחר
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'documents' && (
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Documents List */}
              <div className="lg:col-span-2 space-y-6">
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-semibold">מסמכים וקבצים</h3>
                    <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => toast({ title: 'העלאת מסמך', description: 'תכונה זו תוסף בגרסה הבאה' })}>
                      <FileText className="h-4 w-4 ml-2" />
                      העלה מסמך
                    </Button>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="border border-gray-200 p-4 rounded-lg hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                            <FileText className="h-5 w-5 text-red-600" />
                          </div>
                          <div>
                            <h4 className="font-medium">הצעת מחיר - פרויקט דיגיטלי</h4>
                            <p className="text-sm text-gray-500">PDF • 2.4 MB • נוצר היום</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm" onClick={() => toast({ title: 'שיתוף', description: 'קישור לשיתוף נוצר' })}>
                            <Share2 className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => toast({ title: 'הורדה', description: 'המסמך מתחיל להתהורד...' })}>
                            הורד
                          </Button>
                        </div>
                      </div>
                    </div>
                    
                    <div className="border border-gray-200 p-4 rounded-lg hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <FileText className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <h4 className="font-medium">חוזה שירות</h4>
                            <p className="text-sm text-gray-500">DOCX • 1.8 MB • לפני שבוע</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Badge className="bg-green-100 text-green-700">חתום</Badge>
                          <Button variant="ghost" size="sm" onClick={() => toast({ title: 'הורדה', description: 'המסמך מתחיל להתהורד...' })}>
                            הורד
                          </Button>
                        </div>
                      </div>
                    </div>
                    
                    <div className="border border-gray-200 p-4 rounded-lg hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                            <FileText className="h-5 w-5 text-green-600" />
                          </div>
                          <div>
                            <h4 className="font-medium">מפרט טכני</h4>
                            <p className="text-sm text-gray-500">PDF • 3.2 MB • לפני שבועיים</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm" onClick={() => toast({ title: 'עריכת מסמך', description: 'תכונה זו תוסף בגרסה הבאה' })}>
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => toast({ title: 'הורדה', description: 'המסמך מתחיל להתהורד...' })}>
                            הורד
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
              
              {/* Document Stats */}
              <div className="space-y-6">
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4">סטטיסטיקות מסמכים</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">סה"כ מסמכים</span>
                      <span className="font-bold text-blue-600">15</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">מסמכים חתומים</span>
                      <span className="font-bold text-green-600">8</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">בהמתנה לחתימה</span>
                      <span className="font-bold text-orange-600">3</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">גודל כולל</span>
                      <span className="font-bold text-purple-600">24.8 MB</span>
                    </div>
                  </div>
                </Card>
                
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4">פעולות מהירות</h3>
                  <div className="space-y-3">
                    <Button className="w-full justify-start" variant="outline" onClick={() => toast({ title: 'יצירת הצעה', description: 'מערכת הצעות מחיר תוסף בקרוב' })}>
                      <FileText className="h-4 w-4 ml-2" />
                      יצירת הצעת מחיר
                    </Button>
                    <Button className="w-full justify-start" variant="outline" onClick={() => toast({ title: 'שיתוף', description: 'קישור לשיתוף נוצר בהצלחה' })}>
                      <Share2 className="h-4 w-4 ml-2" />
                      שיתוף מסמכים
                    </Button>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'timeline' && (
          <div className="max-w-7xl mx-auto">
            <Card className="p-6">
              <h3 className="text-xl font-semibold mb-6">ציר זמן מלא</h3>
              <div className="relative">
                {/* Timeline Line */}
                <div className="absolute right-6 top-0 bottom-0 w-0.5 bg-gray-200"></div>
                
                <div className="space-y-8">
                  {/* Timeline Item */}
                  <div className="flex items-start gap-4">
                    <div className="relative z-10 w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white">
                      <Mail className="h-5 w-5" />
                    </div>
                    <div className="flex-1 bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold text-blue-900">אימייל נשלח - הצעת מחיר</h4>
                        <span className="text-xs text-gray-500">היום, 14:30</span>
                      </div>
                      <p className="text-sm text-gray-700 mb-2">
                        נשלחה הצעת מחיר מפורטת ללקוח. ההצעה כוללת פיתוח אתר, אחזקה ותמיכה טכנית.
                      </p>
                      <div className="flex items-center gap-4 text-xs">
                        <span className="text-green-600">✓ נקרא על ידי הלקוח</span>
                        <span className="text-blue-600">📎 2 קבצים מצורפים</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4">
                    <div className="relative z-10 w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white">
                      <PhoneCall className="h-5 w-5" />
                    </div>
                    <div className="flex-1 bg-green-50 p-4 rounded-lg border border-green-200">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold text-green-900">שיחת טלפון - ייעוץ ראשוני</h4>
                        <span className="text-xs text-gray-500">אתמול, 10:15</span>
                      </div>
                      <p className="text-sm text-gray-700 mb-2">
                        שיחה של 25 דקות עם הלקוח. נדונו דרישות הפרויקט, תקציב ולוחות זמנים.
                      </p>
                      <div className="flex items-center gap-4 text-xs">
                        <span className="text-blue-600">🎙️ שיחה הוקלטה</span>
                        <span className="text-green-600">✓ איכות קשר מעולה</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4">
                    <div className="relative z-10 w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center text-white">
                      <Video className="h-5 w-5" />
                    </div>
                    <div className="flex-1 bg-purple-50 p-4 rounded-lg border border-purple-200">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold text-purple-900">פגישת זום - הצגת פתרונות</h4>
                        <span className="text-xs text-gray-500">לפני 3 ימים, 16:00</span>
                      </div>
                      <p className="text-sm text-gray-700 mb-2">
                        פגישה של 45 דקות עם 3 משתתפים. הוצגו פתרונות טכנולוגיים ונעשה דמו של המערכת.
                      </p>
                      <div className="flex items-center gap-4 text-xs">
                        <span className="text-purple-600">📹 הקלטה זמינה</span>
                        <span className="text-green-600">✓ פגישה מוצלחת</span>
                        <span className="text-gray-600">👥 3 משתתפים</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4">
                    <div className="relative z-10 w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center text-white">
                      <Edit className="h-5 w-5" />
                    </div>
                    <div className="flex-1 bg-orange-50 p-4 rounded-lg border border-orange-200">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold text-orange-900">עדכון פרטי ליד</h4>
                        <span className="text-xs text-gray-500">לפני שבוע, 09:20</span>
                      </div>
                      <p className="text-sm text-gray-700 mb-2">
                        עודכנו פרטי הליד: שונה הסטטוס ל"מוכשר", נוסף ערך פוטנציאלי וחוותה דעת ראשונית.
                      </p>
                      <div className="flex items-center gap-4 text-xs">
                        <span className="text-orange-600">📝 פרטים עודכנו</span>
                        <span className="text-blue-600">💰 ערך: 50,000 ₪</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4">
                    <div className="relative z-10 w-12 h-12 bg-gray-500 rounded-full flex items-center justify-center text-white">
                      <User className="h-5 w-5" />
                    </div>
                    <div className="flex-1 bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold text-gray-900">ליד נוצר</h4>
                        <span className="text-xs text-gray-500">{new Date(lead.createdAt).toLocaleDateString('he-IL')}</span>
                      </div>
                      <p className="text-sm text-gray-700 mb-2">
                        ליד חדש נוצר במערכת ממקור: {sourceOptions.find(s => s.value === lead.source)?.label}
                      </p>
                      <div className="flex items-center gap-4 text-xs">
                        <span className="text-gray-600">🎯 מקור: {sourceOptions.find(s => s.value === lead.source)?.label}</span>
                        <span className="text-blue-600">📊 סטטוס ראשוני: חדש</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto p-6" aria-describedby="edit-lead-description">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-right mb-2">עריכת ליד</DialogTitle>
          </DialogHeader>
          <div id="edit-lead-description" className="sr-only">טופס לעריכת פרטי הליד</div>
          
          <div className="space-y-6">
            {/* Basic Information Section */}
            <div>
              <h3 className="text-lg font-semibold text-right mb-4 border-b pb-2">פרטים בסיסיים</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-base font-medium">שם מלא *</Label>
                  <Input
                    id="name"
                    value={leadForm.name}
                    onChange={(e) => setLeadForm({...leadForm, name: e.target.value})}
                    placeholder="הכנס שם מלא"
                    className="text-right h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-base font-medium">כתובת אימייל</Label>
                  <Input
                    id="email"
                    type="email"
                    value={leadForm.email}
                    onChange={(e) => setLeadForm({...leadForm, email: e.target.value})}
                    placeholder="example@mail.com"
                    className="text-right h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-base font-medium">מספר טלפון</Label>
                  <Input
                    id="phone"
                    value={leadForm.phone}
                    onChange={(e) => setLeadForm({...leadForm, phone: e.target.value})}
                    placeholder="05X-XXX-XXXX"
                    className="text-right h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="value" className="text-base font-medium">ערך פוטנציאלי (₪)</Label>
                  <Input
                    id="value"
                    type="number"
                    value={leadForm.value}
                    onChange={(e) => setLeadForm({...leadForm, value: Number(e.target.value)})}
                    placeholder="0"
                    className="text-right h-11"
                  />
                </div>
              </div>
            </div>

            {/* Lead Management Section */}
            <div>
              <h3 className="text-lg font-semibold text-right mb-4 border-b pb-2">ניהול ליד</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="source" className="text-base font-medium">מקור הליד</Label>
                  <Select value={leadForm.source} onValueChange={(value) => setLeadForm({...leadForm, source: value})}>
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {sourceOptions.map(source => (
                        <SelectItem key={source.value} value={source.value}>
                          {source.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status" className="text-base font-medium">סטטוס</Label>
                  <Select value={leadForm.status} onValueChange={(value) => setLeadForm({...leadForm, status: value})}>
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map(status => (
                        <SelectItem key={status.value} value={status.value}>
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${status.color}`}></span>
                            {status.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="priority" className="text-base font-medium">עדיפות</Label>
                  <Select value={leadForm.priority} onValueChange={(value) => setLeadForm({...leadForm, priority: value})}>
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {priorityOptions.map(priority => (
                        <SelectItem key={priority.value} value={priority.value}>
                          <span className={priority.color}>{priority.label}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="assignedTo" className="text-base font-medium">משויך ל</Label>
                  <Select value={leadForm.assignedTo} onValueChange={(value) => setLeadForm({...leadForm, assignedTo: value})}>
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">לא משויך</SelectItem>
                      {(users as any[]).map((user: any) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.firstName} {user.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Notes Section */}
            <div>
              <h3 className="text-lg font-semibold text-right mb-4 border-b pb-2">הערות</h3>
              <div className="space-y-2">
                <Label htmlFor="notes" className="text-base font-medium">הערות נוספות</Label>
                <Textarea
                  id="notes"
                  value={leadForm.notes}
                  onChange={(e) => setLeadForm({...leadForm, notes: e.target.value})}
                  placeholder="הכנס הערות נוספות על הליד..."
                  rows={4}
                  className="text-right resize-none"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-3 pt-6 border-t">
            <Button variant="outline" onClick={() => setShowEditModal(false)} className="px-6">
              ביטול
            </Button>
            <Button
              onClick={() => {
                console.log('leadForm before submit:', leadForm);
                console.log('leadForm stringified:', JSON.stringify(leadForm, null, 2));
                // Clean the form data - convert numbers properly
                const cleanedForm = {
                  name: leadForm.name?.toString() || '',
                  email: leadForm.email?.toString() || '',
                  phone: leadForm.phone?.toString() || '',
                  source: leadForm.source?.toString() || 'website',
                  status: leadForm.status?.toString() || 'new',
                  priority: leadForm.priority?.toString() || 'medium',
                  value: leadForm.value ? Number(leadForm.value) : 0,
                  notes: leadForm.notes?.toString() || '',
                  assignedTo: leadForm.assignedTo?.toString() || 'unassigned'
                };
                console.log('cleaned form:', cleanedForm);
                updateLeadMutation.mutate(cleanedForm);
              }}
              disabled={updateLeadMutation.isPending}
              className="px-6"
            >
              <Save className="h-4 w-4 ml-2" />
              {updateLeadMutation.isPending ? "שומר..." : "שמור שינויים"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Note Modal */}
      <Dialog open={showAddNoteModal} onOpenChange={setShowAddNoteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>הוסף הערה</DialogTitle>
          </DialogHeader>
          
          <div>
            <Label htmlFor="note">הערה חדשה</Label>
            <Textarea
              id="note"
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="הקלד את ההערה כאן..."
              rows={4}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddNoteModal(false)}>
              ביטול
            </Button>
            <Button
              onClick={() => addNoteMutation.mutate(newNote)}
              disabled={addNoteMutation.isPending || !newNote.trim()}
            >
              {addNoteMutation.isPending ? "שומר..." : "שמור הערה"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Email Modal */}
      <Dialog open={showEmailModal} onOpenChange={setShowEmailModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-right">שליחת אימייל ל-{lead.name}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="email-to" className="text-right">אל</Label>
              <Input
                id="email-to"
                value={lead.email || ''}
                disabled
                className="text-right bg-gray-50"
              />
            </div>
            
            <div>
              <Label htmlFor="email-subject" className="text-right">נושא</Label>
              <Input
                id="email-subject"
                value={emailForm.subject}
                onChange={(e) => setEmailForm({...emailForm, subject: e.target.value})}
                placeholder="הכנס נושא האימייל..."
                className="text-right"
              />
            </div>
            
            <div>
              <Label htmlFor="email-body" className="text-right">תוכן האימייל</Label>
              <Textarea
                id="email-body"
                value={emailForm.body}
                onChange={(e) => setEmailForm({...emailForm, body: e.target.value})}
                placeholder="שלום {lead.name},\n\nהכנס כאן את תוכן האימייל..."
                rows={8}
                className="text-right resize-none"
              />
            </div>
            
            {/* Quick Templates */}
            <div>
              <Label className="text-right text-sm text-gray-600">תבניות מהירות</Label>
              <div className="flex gap-2 mt-2 flex-wrap">
                <Button 
                  type="button" 
                  size="sm" 
                  variant="outline"
                  onClick={() => setEmailForm({
                    subject: "הצעת מחיר - פרויקט דיגיטלי",
                    body: `שלום ${lead.name},\n\nתודה שפנית אלינו לקבלת הצעת מחיר.\n\nלאחר בדיקת הדרישות שלך, אני מצרף הצעת מחיר מפורטת.\n\nאשמח לשמוע ממך בקרוב.\n\nבברכה,\n[השם שלך]`
                  })}
                >
                  הצעת מחיר
                </Button>
                <Button 
                  type="button" 
                  size="sm" 
                  variant="outline"
                  onClick={() => setEmailForm({
                    subject: "מעקב - שיחת הטלפון שלנו",
                    body: `שלום ${lead.name},\n\nתודה על השיחה מעניינת שערכנו היום.\n\nכפי שביקשת, אני מצרף מידע נוסף על הפתרון שלנו.\n\nאשמח לשמוע ממך בקרוב.\n\nבברכה,\n[השם שלך]`
                  })}
                >
                  מעקב
                </Button>
                <Button 
                  type="button" 
                  size="sm" 
                  variant="outline"
                  onClick={() => setEmailForm({
                    subject: "תודה על הפעילות",
                    body: `שלום ${lead.name},\n\nתודה על הפעילות והעניין שהראת בשירותינו.\n\nאנחנו כאן כדי לעזור לך בכל שאלה או בקשה.\n\nבברכה,\n[השם שלך]`
                  })}
                >
                  תודה
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-3">
            <Button variant="outline" onClick={() => {
              setShowEmailModal(false);
              setEmailForm({ subject: "", body: "" });
            }}>
              ביטול
            </Button>
            <Button
              onClick={() => {
                const subject = encodeURIComponent(emailForm.subject);
                const body = encodeURIComponent(emailForm.body);
                window.open(`mailto:${lead.email}?subject=${subject}&body=${body}`, '_blank');
                
                // Send notification for email sent
                notifyEmailSent(lead.name, lead.id, 'אתה');
                
                setShowEmailModal(false);
                setEmailForm({ subject: "", body: "" });
                toast({
                  title: "אימייל נשלח",
                  description: "אימייל נשלח בהצלחה"
                });
              }}
              disabled={!emailForm.subject.trim() || !emailForm.body.trim()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Send className="h-4 w-4 ml-2" />
              שלח אימייל
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Meeting Modal */}
      <Dialog open={showMeetingModal} onOpenChange={setShowMeetingModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-right">קביעת פגישה עם {lead.name}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="meeting-title" className="text-right">נושא הפגישה</Label>
              <Input
                id="meeting-title"
                value={meetingForm.title}
                onChange={(e) => setMeetingForm({...meetingForm, title: e.target.value})}
                placeholder="ייעוץ ראשוני, הצגת פתרון..."
                className="text-right"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="meeting-date" className="text-right">תאריך</Label>
                <Input
                  id="meeting-date"
                  type="date"
                  value={meetingForm.date}
                  onChange={(e) => setMeetingForm({...meetingForm, date: e.target.value})}
                  className="text-right"
                />
              </div>
              <div>
                <Label htmlFor="meeting-time" className="text-right">שעה</Label>
                <Input
                  id="meeting-time"
                  type="time"
                  value={meetingForm.time}
                  onChange={(e) => setMeetingForm({...meetingForm, time: e.target.value})}
                  className="text-right"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="meeting-duration" className="text-right">משך (דקות)</Label>
                <Select value={meetingForm.duration} onValueChange={(value) => setMeetingForm({...meetingForm, duration: value})}>
                  <SelectTrigger className="text-right">
                    <SelectValue placeholder="בחר משך..." />
                  </SelectTrigger>
                  <SelectContent className="text-right">
                    <SelectItem value="30">30 דקות</SelectItem>
                    <SelectItem value="45">45 דקות</SelectItem>
                    <SelectItem value="60">60 דקות</SelectItem>
                    <SelectItem value="90">90 דקות</SelectItem>
                    <SelectItem value="120">120 דקות</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="meeting-location" className="text-right">מיקום</Label>
                <Input
                  id="meeting-location"
                  value={meetingForm.location}
                  onChange={(e) => setMeetingForm({...meetingForm, location: e.target.value})}
                  placeholder="משרד, זום, טלפון..."
                  className="text-right"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="meeting-notes" className="text-right">הערות</Label>
              <Textarea
                id="meeting-notes"
                value={meetingForm.notes}
                onChange={(e) => setMeetingForm({...meetingForm, notes: e.target.value})}
                placeholder="נושאים לדיון, מסמכים להכנה..."
                rows={3}
                className="text-right resize-none"
              />
            </div>
          </div>

          <DialogFooter className="gap-3">
            <Button variant="outline" onClick={() => {
              setShowMeetingModal(false);
              setMeetingForm({ title: "", date: "", time: "", duration: "60", location: "", notes: "" });
            }}>
              ביטול
            </Button>
            <Button
              onClick={async () => {
                try {
                  // Save meeting to system via API
                  const response = await fetch(`/api/leads/${lead.id}/meetings`, {
                    method: 'POST',
                    credentials: 'include',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(meetingForm),
                  });

                  if (!response.ok) {
                    throw new Error('שגיאה בשמירת הפגישה');
                  }

                  // Refresh lead data to show the meeting
                  queryClient.invalidateQueries({ queryKey: ['/api/leads', lead.id] });
                  queryClient.invalidateQueries({ queryKey: ['/api/leads'] });
                  
                  // Send notification for meeting creation
                  notifyMeetingCreated(
                    lead.name,
                    lead.id,
                    meetingForm.title,
                    `${meetingForm.date} ${meetingForm.time}`,
                    'אתה'
                  );
                  
                  toast({
                    title: "פגישה נקבעה",
                    description: `פגישה עם ${lead.name} נקבעה ל-${meetingForm.date} ב-${meetingForm.time}`,
                    action: (
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => {
                          // Calendar sync functionality
                          const startDate = new Date(`${meetingForm.date}T${meetingForm.time}`);
                          const endDate = new Date(startDate.getTime() + parseInt(meetingForm.duration) * 60000);
                          const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(meetingForm.title)}&dates=${startDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z/${endDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z&details=${encodeURIComponent(meetingForm.notes)}&location=${encodeURIComponent(meetingForm.location)}`;
                          window.open(calendarUrl, '_blank');
                        }}>
                          סנכרן ליומן
                        </Button>
                      </div>
                    )
                  });
                  
                  setShowMeetingModal(false);
                  setMeetingForm({ title: "", date: "", time: "", duration: "60", location: "", notes: "" });
                } catch (error) {
                  toast({
                    title: "שגיאה",
                    description: "שגיאה בשמירת הפגישה",
                    variant: "destructive"
                  });
                }
              }}
              disabled={!meetingForm.title.trim() || !meetingForm.date || !meetingForm.time}
              className="bg-green-600 hover:bg-green-700"
            >
              <Calendar className="h-4 w-4 ml-2" />
              קבע פגישה
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}