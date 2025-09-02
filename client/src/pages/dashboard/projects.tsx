import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Grid, List, Calendar, User, DollarSign, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { type Project, type Client, type InsertProject, type InsertClient } from "@shared/schema";

export interface ProjectWithRelations extends Omit<Project, "createdBy"> {
  client?: Client;
  status: string;
  type: string;
}

export default function Projects() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | string>("all");
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [showNewClientModal, setShowNewClientModal] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "table">("table");

  // Project form state
  const [projectData, setProjectData] = useState({
    name: "",
    description: "",
    type: "",
    clientId: "",
  });

  // Client form state  
  const [newClientData, setNewClientData] = useState({
    name: "",
    contactName: "",
    email: "",
    phone: "",
    industry: "",
    status: "active" as const,
    notes: "",
  });

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  const { data = [], isLoading } = useQuery<ProjectWithRelations[]>({
    queryKey: ["projects"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/projects");
        if (!response.ok) {
          console.error('Projects API error:', response.status, response.statusText);
          return [];
        }
        const result = await response.json();
        return Array.isArray(result) ? result : [];
      } catch (error) {
        console.error('Error fetching projects:', error);
        return [];
      }
    },
  });

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ['/api/clients'],
    queryFn: async () => {
      try {
        const response = await fetch("/api/clients");
        if (!response.ok) {
          console.error('Clients API error:', response.status, response.statusText);
          return [];
        }
        const result = await response.json();
        return Array.isArray(result) ? result : [];
      } catch (error) {
        console.error('Error fetching clients:', error);
        return [];
      }
    },
    staleTime: 30000,
  });

  // Create client mutation
  const createClientMutation = useMutation({
    mutationFn: async (data: Omit<InsertClient, 'agencyId'>) => {
      const response = await apiRequest('POST', '/api/clients', data);
      return response.json();
    },
    onSuccess: (newClient) => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      setProjectData(prev => ({ ...prev, clientId: newClient.id }));
      setShowNewClientModal(false);
      resetNewClientForm();
      toast({
        title: "לקוח נוצר בהצלחה",
        description: "הלקוח החדש נוסף למערכת ונבחר לפרויקט",
      });
    },
    onError: (error: any) => {
      toast({
        title: "שגיאה ביצירת לקוח",
        description: error?.message || "אירעה שגיאה לא צפויה",
        variant: "destructive",
      });
    },
  });

  // Create project mutation
  const createProjectMutation = useMutation({
    mutationFn: async (data: Omit<InsertProject, 'agencyId'>) => {
      const response = await apiRequest('POST', '/api/projects', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast({
        title: "פרויקט נוצר בהצלחה",
        description: "הפרויקט החדש נוסף למערכת",
      });
      setShowNewProjectModal(false);
      resetProjectForm();
    },
    onError: (error: any) => {
      toast({
        title: "שגיאה ביצירת פרויקט",
        description: error?.message || "אירעה שגיאה לא צפויה",
        variant: "destructive",
      });
    },
  });

  const filtered = data.filter((p) => {
    const matchesSearch =
      !search || p.name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = status === "all" || p.status === status;
    return matchesSearch && matchesStatus;
  });

  const resetProjectForm = () => {
    setProjectData({
      name: "",
      description: "",
      type: "",
      clientId: "",
    });
  };

  const resetNewClientForm = () => {
    setNewClientData({
      name: "",
      contactName: "",
      email: "",
      phone: "",
      industry: "",
      status: "active",
      notes: "",
    });
  };

  const handleProjectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectData.name.trim()) {
      toast({
        title: "שגיאה",
        description: "שם הפרויקט הוא שדה חובה",
        variant: "destructive",
      });
      return;
    }

    const projectPayload = {
      name: projectData.name,
      description: projectData.description,
      type: projectData.type,
      clientId: projectData.clientId === "none" ? null : projectData.clientId || null,
      status: 'planning' as const,
      createdBy: user?.id || '',
    };

    createProjectMutation.mutate(projectPayload);
  };

  const handleNewClientSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientData.name.trim()) {
      toast({
        title: "שגיאה",
        description: "שם הלקוח הוא שדה חובה",
        variant: "destructive",
      });
      return;
    }
    createClientMutation.mutate(newClientData);
  };

  const handleProjectInputChange = (field: keyof typeof projectData, value: string) => {
    setProjectData(prev => ({ ...prev, [field]: value }));
  };

  const handleNewClientInputChange = (field: keyof typeof newClientData, value: string) => {
    setNewClientData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="p-6 space-y-8" dir="rtl">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">ניהול פרויקטים</h1>
        <Button size="lg" onClick={() => setShowNewProjectModal(true)} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-5 w-5 ml-2" />
          פרויקט חדש
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex gap-4 items-center flex-1">
          <Input
            placeholder="חפש פרויקטים..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 max-w-md"
          />
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="סטטוס" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל הסטטוסים</SelectItem>
              <SelectItem value="planning">תכנון</SelectItem>
              <SelectItem value="active">פעיל</SelectItem>
              <SelectItem value="completed">הושלם</SelectItem>
              <SelectItem value="cancelled">בוטל</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {/* View Toggle */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          <Button
            variant={viewMode === "table" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("table")}
            className={viewMode === "table" ? "bg-white shadow-sm" : ""}
          >
            <List className="h-4 w-4 ml-1" />
            טבלה
          </Button>
          <Button
            variant={viewMode === "grid" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("grid")}
            className={viewMode === "grid" ? "bg-white shadow-sm" : ""}
          >
            <Grid className="h-4 w-4 ml-1" />
            כרטיסים
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">טוען פרויקטים...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-4xl mb-4">📁</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">אין פרויקטים להצגה</h3>
          <p className="text-gray-500 mb-6">התחל על ידי יצירת הפרויקט הראשון שלך</p>
          <Button onClick={() => setShowNewProjectModal(true)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4 ml-2" />
            צור פרויקט חדש
          </Button>
        </div>
      ) : viewMode === "table" ? (
        /* Table View */
        <Card className="bg-white shadow-lg border-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-right py-4 px-6 font-medium text-gray-900">שם הפרויקט</th>
                  <th className="text-right py-4 px-6 font-medium text-gray-900">לקוח</th>
                  <th className="text-right py-4 px-6 font-medium text-gray-900">סוג</th>
                  <th className="text-right py-4 px-6 font-medium text-gray-900">סטטוס</th>
                  <th className="text-right py-4 px-6 font-medium text-gray-900">תאריך יצירה</th>
                  <th className="text-center py-4 px-6 font-medium text-gray-900">פעולות</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <span className="text-blue-600 font-bold text-sm">
                            {p.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{p.name}</div>
                          <div className="text-sm text-gray-500 max-w-xs truncate">
                            {p.description || 'ללא תיאור'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-900">{p.client?.name ?? "לא מוקצה"}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded-full">
                        {p.type === 'website' ? '🌐 אתר' : 
                         p.type === 'mobile-app' ? '📱 אפליקציה' :
                         p.type === 'ecommerce' ? '🛒 חנות' : p.type}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${
                        p.status === 'active' ? 'bg-green-100 text-green-800' :
                        p.status === 'planning' ? 'bg-yellow-100 text-yellow-800' :
                        p.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {p.status === 'active' ? '🟢 פעיל' :
                         p.status === 'planning' ? '🟡 תכנון' :
                         p.status === 'completed' ? '🔵 הושלם' : p.status}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="h-4 w-4" />
                        {new Date(p.createdAt).toLocaleDateString('he-IL', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center justify-center gap-2">
                        <Link href={`/dashboard/project-details/${p.id}`}>
                          <Button size="sm" variant="outline" className="hover:bg-blue-50 hover:border-blue-300">
                            <Eye className="h-4 w-4 ml-1" />
                            צפה
                          </Button>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Table Summary Footer */}
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <div>סה"כ פרויקטים: {filtered.length}</div>
              <div className="flex gap-4">
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  פעילים: {filtered.filter(p => p.status === 'active').length}
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  בתכנון: {filtered.filter(p => p.status === 'planning').length}
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  הושלמו: {filtered.filter(p => p.status === 'completed').length}
                </span>
              </div>
            </div>
          </div>
        </Card>
      ) : (
        /* Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((p) => (
            <Card key={p.id} className="h-full flex flex-col justify-between hover:shadow-lg transition-all duration-200 border-0 shadow-md">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <span className="text-blue-600 font-bold text-sm">
                      {p.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-semibold text-gray-900">{p.name}</h2>
                    <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {p.client?.name ?? "לא מוקצה"}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">סטטוס:</span>
                  <div className={`px-2 py-1 text-xs font-medium rounded-full ${
                    p.status === 'active' ? 'bg-green-100 text-green-800' :
                    p.status === 'planning' ? 'bg-yellow-100 text-yellow-800' :
                    p.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {p.status}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">סוג:</span>
                  <span className="text-sm font-medium text-gray-900">{p.type}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">נוצר:</span>
                  <span className="text-sm text-gray-900 flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(p.createdAt).toLocaleDateString('he-IL')}
                  </span>
                </div>
              </CardContent>
              <div className="p-4 pt-0">
                <Link href={`/dashboard/project-details/${p.id}`}>
                  <Button variant="outline" className="w-full hover:bg-blue-50 hover:border-blue-300">
                    <Eye className="h-4 w-4 ml-2" />
                    פתח פרטי פרויקט
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* New Project Modal */}
      <Dialog open={showNewProjectModal} onOpenChange={setShowNewProjectModal}>
        <DialogContent className="max-w-2xl" aria-describedby="new-project-description">
          <DialogHeader>
            <DialogTitle className="text-right font-rubik">פרויקט חדש</DialogTitle>
            <div id="new-project-description" className="sr-only">צור פרויקט חדש עבור הלקוח שלך</div>
          </DialogHeader>
          
          <form onSubmit={handleProjectSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="projectName" className="text-right block">
                שם הפרויקט *
              </Label>
              <Input
                id="projectName"
                value={projectData.name}
                onChange={(e) => handleProjectInputChange('name', e.target.value)}
                placeholder="הכנס שם פרויקט"
                className="text-right"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="projectDescription" className="text-right block">
                תיאור הפרויקט
              </Label>
              <Textarea
                id="projectDescription"
                value={projectData.description}
                onChange={(e) => handleProjectInputChange('description', e.target.value)}
                placeholder="תאר את הפרויקט"
                className="text-right min-h-[100px]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="projectType" className="text-right block">
                סוג הפרויקט
              </Label>
              <Select value={projectData.type} onValueChange={(value) => handleProjectInputChange('type', value)}>
                <SelectTrigger className="text-right">
                  <SelectValue placeholder="בחר סוג פרויקט" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="website">אתר אינטרנט</SelectItem>
                  <SelectItem value="mobile-app">אפליקציית מובייל</SelectItem>
                  <SelectItem value="web-app">אפליקציית ווב</SelectItem>
                  <SelectItem value="ecommerce">חנות מקוונת</SelectItem>
                  <SelectItem value="other">אחר</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-right block">
                לקוח
              </Label>
              <div className="flex gap-2">
                <Select value={projectData.clientId} onValueChange={(value) => handleProjectInputChange('clientId', value)}>
                  <SelectTrigger className="flex-1 text-right">
                    <SelectValue placeholder="בחר לקוח" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no-client">ללא לקוח</SelectItem>
                    {clients?.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowNewClientModal(true)}
                  className="px-3"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex space-x-reverse space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowNewProjectModal(false)}
              >
                ביטול
              </Button>
              <Button
                type="submit"
                disabled={createProjectMutation.isPending}
              >
                {createProjectMutation.isPending ? "יוצר פרויקט..." : "צור פרויקט"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* New Client Modal */}
      <Dialog open={showNewClientModal} onOpenChange={setShowNewClientModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-right font-rubik">לקוח חדש</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleNewClientSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="clientName" className="text-right">שם הלקוח *</Label>
              <Input
                id="clientName"
                value={newClientData.name}
                onChange={(e) => handleNewClientInputChange('name', e.target.value)}
                placeholder="הכנס שם הלקוח"
                className="text-right"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="contactName" className="text-right">איש קשר</Label>
              <Input
                id="contactName"
                value={newClientData.contactName}
                onChange={(e) => handleNewClientInputChange('contactName', e.target.value)}
                placeholder="שם איש הקשר"
                className="text-right"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email" className="text-right">אימייל</Label>
              <Input
                id="email"
                type="email"
                value={newClientData.email}
                onChange={(e) => handleNewClientInputChange('email', e.target.value)}
                placeholder="כתובת אימייל"
                className="text-right"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-right">טלפון</Label>
              <Input
                id="phone"
                value={newClientData.phone}
                onChange={(e) => handleNewClientInputChange('phone', e.target.value)}
                placeholder="מספר טלפון"
                className="text-right"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="industry" className="text-right">תחום עיסוק</Label>
              <Select value={newClientData.industry} onValueChange={(value) => handleNewClientInputChange('industry', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="בחר תחום עיסוק" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="technology">טכנולוגיה</SelectItem>
                  <SelectItem value="healthcare">בריאות</SelectItem>
                  <SelectItem value="education">חינוך</SelectItem>
                  <SelectItem value="finance">פיננסים</SelectItem>
                  <SelectItem value="retail">קמעונאות</SelectItem>
                  <SelectItem value="food">מזון ומשקאות</SelectItem>
                  <SelectItem value="real-estate">נדל"ן</SelectItem>
                  <SelectItem value="legal">משפטים</SelectItem>
                  <SelectItem value="consulting">ייעוץ</SelectItem>
                  <SelectItem value="other">אחר</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex space-x-reverse space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowNewClientModal(false)}
              >
                ביטול
              </Button>
              <Button
                type="submit"
                disabled={createClientMutation.isPending}
              >
                {createClientMutation.isPending ? "יוצר..." : "צור לקוח"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}