
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Mail, User, Shield, Settings, Users, FileText, Calendar, BarChart3 } from "lucide-react";

interface InviteTeamMemberModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface PermissionsType {
  tasks: {
    view: boolean;
    create: boolean;
    edit: boolean;
    delete: boolean;
  };
  projects: {
    view: boolean;
    create: boolean;
    edit: boolean;
    delete: boolean;
  };
  clients: {
    view: boolean;
    create: boolean;
    edit: boolean;
    delete: boolean;
  };
  leads: {
    view: boolean;
    create: boolean;
    edit: boolean;
    delete: boolean;
  };
  reports: {
    view: boolean;
    create: boolean;
  };
  settings: {
    view: boolean;
    edit: boolean;
  };
  team: {
    view: boolean;
    invite: boolean;
  };
}

export default function InviteTeamMemberModal({ open, onOpenChange }: InviteTeamMemberModalProps) {
  const [formData, setFormData] = useState({
    email: "",
    fullName: "",
    role: "team_member" as "agency_admin" | "team_member",
  });
  
  const [permissions, setPermissions] = useState<PermissionsType>({
    tasks: { view: true, create: true, edit: true, delete: false },
    projects: { view: true, create: false, edit: false, delete: false },
    clients: { view: true, create: false, edit: false, delete: false },
    leads: { view: true, create: false, edit: false, delete: false },
    reports: { view: true, create: false },
    settings: { view: false, edit: false },
    team: { view: false, invite: false }
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const inviteMemberMutation = useMutation({
    mutationFn: async (data: typeof formData & { permissions: PermissionsType }) => {
      const response = await apiRequest({
        url: '/api/team/invite',
        method: 'POST',
        body: data,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/team'] });
      toast({
        title: "הזמנה נשלחה בהצלחה",
        description: "חבר הצוות החדש יוכל להתחבר למערכת",
      });
      onOpenChange(false);
      setFormData({ email: "", fullName: "", role: "team_member" });
      setPermissions({
        tasks: { view: true, create: true, edit: true, delete: false },
        projects: { view: true, create: false, edit: false, delete: false },
        clients: { view: true, create: false, edit: false, delete: false },
        leads: { view: true, create: false, edit: false, delete: false },
        reports: { view: true, create: false },
        settings: { view: false, edit: false },
        team: { view: false, invite: false }
      });
    },
    onError: (error: any) => {
      toast({
        title: "שגיאה בשליחת הזמנה",
        description: error?.message || "אירעה שגיאה לא צפויה",
        variant: "destructive",
      });
    },
  });

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };
  
  const handlePermissionChange = (category: keyof PermissionsType, permission: string, checked: boolean) => {
    setPermissions(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [permission]: checked
      }
    }));
  };
  
  const handleRoleChange = (role: "agency_admin" | "team_member") => {
    setFormData(prev => ({ ...prev, role }));
    
    // Set default permissions based on role
    if (role === 'agency_admin') {
      setPermissions({
        tasks: { view: true, create: true, edit: true, delete: true },
        projects: { view: true, create: true, edit: true, delete: true },
        clients: { view: true, create: true, edit: true, delete: true },
        leads: { view: true, create: true, edit: true, delete: true },
        reports: { view: true, create: true },
        settings: { view: true, edit: true },
        team: { view: true, invite: true }
      });
    } else {
      setPermissions({
        tasks: { view: true, create: true, edit: true, delete: false },
        projects: { view: true, create: false, edit: false, delete: false },
        clients: { view: true, create: false, edit: false, delete: false },
        leads: { view: true, create: false, edit: false, delete: false },
        reports: { view: true, create: false },
        settings: { view: false, edit: false },
        team: { view: false, invite: false }
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email.trim() || !formData.fullName.trim()) {
      toast({
        title: "שגיאה",
        description: "יש למלא את כל השדות הנדרשים",
        variant: "destructive",
      });
      return;
    }

    if (!formData.email.includes('@')) {
      toast({
        title: "שגיאה",
        description: "כתובת אימייל לא תקינה",
        variant: "destructive",
      });
      return;
    }

    inviteMemberMutation.mutate({ ...formData, permissions });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="invite-member-modal">
        <DialogHeader>
          <DialogTitle className="text-right">הזמן חבר צוות חדש</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="fullName" className="text-right flex items-center space-x-reverse space-x-2">
              <User className="h-4 w-4" />
              <span>שם מלא</span>
            </Label>
            <Input
              id="fullName"
              value={formData.fullName}
              onChange={(e) => handleInputChange('fullName', e.target.value)}
              placeholder="הכנס שם מלא"
              className="text-right"
              data-testid="input-full-name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-right flex items-center space-x-reverse space-x-2">
              <Mail className="h-4 w-4" />
              <span>כתובת אימייל</span>
            </Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              placeholder="הכנס כתובת אימייל"
              className="text-right"
              data-testid="input-email"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role" className="text-right">תפקיד</Label>
            <Select value={formData.role} onValueChange={handleRoleChange}>
              <SelectTrigger data-testid="select-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="team_member">חבר צוות</SelectItem>
                <SelectItem value="agency_admin">מנהל סוכנות</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {formData.role === 'team_member' && (
            <>
              <Separator className="my-4" />
              <div className="space-y-4">
                <Label className="text-right flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  הרשאות חבר הצוות
                </Label>
                
                {/* Tasks Permissions */}
                <div className="space-y-3 p-4 border rounded-lg">
                  <div className="flex items-center gap-2 font-medium text-sm">
                    <BarChart3 className="h-4 w-4" />
                    משימות
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="tasks-view"
                        checked={permissions.tasks.view}
                        onCheckedChange={(checked) => handlePermissionChange('tasks', 'view', !!checked)}
                      />
                      <Label htmlFor="tasks-view" className="text-sm">צפייה</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="tasks-create"
                        checked={permissions.tasks.create}
                        onCheckedChange={(checked) => handlePermissionChange('tasks', 'create', !!checked)}
                      />
                      <Label htmlFor="tasks-create" className="text-sm">יצירה</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="tasks-edit"
                        checked={permissions.tasks.edit}
                        onCheckedChange={(checked) => handlePermissionChange('tasks', 'edit', !!checked)}
                      />
                      <Label htmlFor="tasks-edit" className="text-sm">עריכה</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="tasks-delete"
                        checked={permissions.tasks.delete}
                        onCheckedChange={(checked) => handlePermissionChange('tasks', 'delete', !!checked)}
                      />
                      <Label htmlFor="tasks-delete" className="text-sm">מחיקה</Label>
                    </div>
                  </div>
                </div>
                
                {/* Projects Permissions */}
                <div className="space-y-3 p-4 border rounded-lg">
                  <div className="flex items-center gap-2 font-medium text-sm">
                    <FileText className="h-4 w-4" />
                    פרויקטים
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="projects-view"
                        checked={permissions.projects.view}
                        onCheckedChange={(checked) => handlePermissionChange('projects', 'view', !!checked)}
                      />
                      <Label htmlFor="projects-view" className="text-sm">צפייה</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="projects-create"
                        checked={permissions.projects.create}
                        onCheckedChange={(checked) => handlePermissionChange('projects', 'create', !!checked)}
                      />
                      <Label htmlFor="projects-create" className="text-sm">יצירה</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="projects-edit"
                        checked={permissions.projects.edit}
                        onCheckedChange={(checked) => handlePermissionChange('projects', 'edit', !!checked)}
                      />
                      <Label htmlFor="projects-edit" className="text-sm">עריכה</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="projects-delete"
                        checked={permissions.projects.delete}
                        onCheckedChange={(checked) => handlePermissionChange('projects', 'delete', !!checked)}
                      />
                      <Label htmlFor="projects-delete" className="text-sm">מחיקה</Label>
                    </div>
                  </div>
                </div>
                
                {/* Clients Permissions */}
                <div className="space-y-3 p-4 border rounded-lg">
                  <div className="flex items-center gap-2 font-medium text-sm">
                    <Users className="h-4 w-4" />
                    לקוחות
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="clients-view"
                        checked={permissions.clients.view}
                        onCheckedChange={(checked) => handlePermissionChange('clients', 'view', !!checked)}
                      />
                      <Label htmlFor="clients-view" className="text-sm">צפייה</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="clients-create"
                        checked={permissions.clients.create}
                        onCheckedChange={(checked) => handlePermissionChange('clients', 'create', !!checked)}
                      />
                      <Label htmlFor="clients-create" className="text-sm">יצירה</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="clients-edit"
                        checked={permissions.clients.edit}
                        onCheckedChange={(checked) => handlePermissionChange('clients', 'edit', !!checked)}
                      />
                      <Label htmlFor="clients-edit" className="text-sm">עריכה</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="clients-delete"
                        checked={permissions.clients.delete}
                        onCheckedChange={(checked) => handlePermissionChange('clients', 'delete', !!checked)}
                      />
                      <Label htmlFor="clients-delete" className="text-sm">מחיקה</Label>
                    </div>
                  </div>
                </div>
                
                {/* Reports & Team Permissions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3 p-4 border rounded-lg">
                    <div className="flex items-center gap-2 font-medium text-sm">
                      <BarChart3 className="h-4 w-4" />
                      דוחות
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="reports-view"
                          checked={permissions.reports.view}
                          onCheckedChange={(checked) => handlePermissionChange('reports', 'view', !!checked)}
                        />
                        <Label htmlFor="reports-view" className="text-sm">צפייה בדוחות</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="reports-create"
                          checked={permissions.reports.create}
                          onCheckedChange={(checked) => handlePermissionChange('reports', 'create', !!checked)}
                        />
                        <Label htmlFor="reports-create" className="text-sm">יצירת דוחות</Label>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-3 p-4 border rounded-lg">
                    <div className="flex items-center gap-2 font-medium text-sm">
                      <Users className="h-4 w-4" />
                      צוות
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="team-view"
                          checked={permissions.team.view}
                          onCheckedChange={(checked) => handlePermissionChange('team', 'view', !!checked)}
                        />
                        <Label htmlFor="team-view" className="text-sm">צפייה בצוות</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="team-invite"
                          checked={permissions.team.invite}
                          onCheckedChange={(checked) => handlePermissionChange('team', 'invite', !!checked)}
                        />
                        <Label htmlFor="team-invite" className="text-sm">הזמנת חברים</Label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          <div className="flex justify-end space-x-reverse space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              data-testid="button-cancel"
            >
              ביטול
            </Button>
            <Button
              type="submit"
              disabled={inviteMemberMutation.isPending}
              data-testid="button-invite"
            >
              {inviteMemberMutation.isPending ? "שולח הזמנה..." : "שלח הזמנה"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
