import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Plus,
  Search,
  Mail,
  Phone,
  User,
  Building,
  MapPin,
  Filter,
  MoreHorizontal,
  Edit,
  Trash2,
  Users,
  Calendar,
  MessageSquare
} from 'lucide-react';

// Interface for Contact
interface Contact {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  position?: string;
  industry?: string;
  address?: string;
  city?: string;
  country?: string;
  notes?: string;
  tags?: string[];
  source: string;
  type: 'lead' | 'client' | 'prospect' | 'partner';
  status: 'active' | 'inactive' | 'blocked';
  leadId?: string;
  clientId?: string;
  createdAt: string;
  updatedAt: string;
}

const CONTACT_TYPES = [
  { value: 'lead', label: 'ליד', color: 'bg-blue-100 text-blue-800' },
  { value: 'client', label: 'לקוח', color: 'bg-green-100 text-green-800' },
  { value: 'prospect', label: 'פרוספקט', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'partner', label: 'שותף', color: 'bg-purple-100 text-purple-800' },
];

const CONTACT_STATUS = [
  { value: 'active', label: 'פעיל', color: 'bg-green-100 text-green-800' },
  { value: 'inactive', label: 'לא פעיל', color: 'bg-gray-100 text-gray-800' },
  { value: 'blocked', label: 'חסום', color: 'bg-red-100 text-red-800' },
];

export default function Contacts() {
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showNewContactModal, setShowNewContactModal] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form state for new/edit contact
  const [contactForm, setContactForm] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    position: "",
    industry: "",
    address: "",
    city: "",
    country: "",
    notes: "",
    type: "prospect" as const,
    status: "active" as const,
    source: "manual"
  });

  // Fetch contacts
  const { data: contacts = [], isLoading } = useQuery<Contact[]>({
    queryKey: ['/api/contacts'],
    queryFn: async () => {
      // Mock data for now - in real app this would fetch from API
      return [
        {
          id: '1',
          name: 'יוסי כהן',
          email: 'yossi@example.com',
          phone: '050-1234567',
          company: 'טכנולוגיות חדשות בע"מ',
          position: 'מנהל שיווק',
          industry: 'technology',
          address: 'רחוב ההייטק 123',
          city: 'תל אביב',
          country: 'ישראל',
          notes: 'מעוניין בפתרונות שיווק דיגיטלי',
          tags: ['vip', 'technology'],
          source: 'website',
          type: 'lead',
          status: 'active',
          leadId: 'lead-1',
          createdAt: '2024-01-15T10:00:00Z',
          updatedAt: '2024-01-20T14:30:00Z'
        } as Contact,
        {
          id: '2',
          name: 'שרה לוי',
          email: 'sara@designco.com',
          phone: '052-9876543',
          company: 'עיצוב ופיתוח בע"מ',
          position: 'מנכ"לית',
          industry: 'design',
          address: 'רחוב הדיזיין 45',
          city: 'חיפה',
          country: 'ישראל',
          notes: 'שותפה פוטנציאלית לפרויקטים',
          tags: ['partner', 'design'],
          source: 'referral',
          type: 'partner',
          status: 'active',
          createdAt: '2024-01-10T08:00:00Z',
          updatedAt: '2024-01-25T16:45:00Z'
        } as Contact
      ];
    }
  });

  // Filter contacts
  const filteredContacts = useMemo(() => {
    if (!contacts) return [];

    return contacts.filter((contact) => {
      const matchesSearch = searchQuery === "" ||
        contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.company?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesType = typeFilter === "all" || contact.type === typeFilter;
      const matchesStatus = statusFilter === "all" || contact.status === statusFilter;

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [contacts, searchQuery, typeFilter, statusFilter]);

  // Reset form
  const resetForm = () => {
    setContactForm({
      name: "",
      email: "",
      phone: "",
      company: "",
      position: "",
      industry: "",
      address: "",
      city: "",
      country: "ישראל",
      notes: "",
      type: "prospect",
      status: "active",
      source: "manual"
    });
    setEditingContact(null);
  };

  // Handle edit contact
  const handleEditContact = (contact: Contact) => {
    setEditingContact(contact);
    setContactForm({
      name: contact.name,
      email: contact.email || "",
      phone: contact.phone || "",
      company: contact.company || "",
      position: contact.position || "",
      industry: contact.industry || "",
      address: contact.address || "",
      city: contact.city || "",
      country: contact.country || "ישראל",
      notes: contact.notes || "",
      type: contact.type,
      status: contact.status,
      source: contact.source
    });
    setShowNewContactModal(true);
  };

  // Handle save contact (create or update)
  const handleSaveContact = () => {
    if (!contactForm.name.trim()) {
      toast({
        title: "שגיאה",
        description: "שם האיש קשר הוא שדה חובה",
        variant: "destructive",
      });
      return;
    }

    // In real app, this would make API call
    toast({
      title: editingContact ? "איש הקשר עודכן בהצלחה" : "איש קשר חדש נוצר בהצלחה",
      description: editingContact ? "פרטי איש הקשר נשמרו במערכת" : "איש הקשר החדש נוסף למערכת",
    });

    setShowNewContactModal(false);
    resetForm();
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">טוען...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6" dir="rtl">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">אנשי קשר</h1>
          <div className="flex gap-2">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              onClick={() => setViewMode('grid')}
              size="sm"
            >
              כרטיסים
            </Button>
            <Button
              variant={viewMode === 'table' ? 'default' : 'outline'}
              onClick={() => setViewMode('table')}
              size="sm"
            >
              טבלה
            </Button>
            <Button onClick={() => setShowNewContactModal(true)}>
              <Plus className="h-4 w-4 ml-2" />
              איש קשר חדש
            </Button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="חיפוש אנשי קשר..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10"
            />
          </div>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="סנן לפי סוג" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל הסוגים</SelectItem>
              {CONTACT_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="סנן לפי סטטוס" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל הסטטוסים</SelectItem>
              {CONTACT_STATUS.map((status) => (
                <SelectItem key={status.value} value={status.value}>
                  {status.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="flex items-center p-6">
              <Users className="h-8 w-8 text-blue-600 ml-4" />
              <div>
                <p className="text-2xl font-bold">{contacts.length}</p>
                <p className="text-xs text-muted-foreground">סך הכל</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center p-6">
              <User className="h-8 w-8 text-green-600 ml-4" />
              <div>
                <p className="text-2xl font-bold">{contacts.filter(c => c.type === 'client').length}</p>
                <p className="text-xs text-muted-foreground">לקוחות</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center p-6">
              <Users className="h-8 w-8 text-yellow-600 ml-4" />
              <div>
                <p className="text-2xl font-bold">{contacts.filter(c => c.type === 'lead').length}</p>
                <p className="text-xs text-muted-foreground">לידים</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center p-6">
              <Building className="h-8 w-8 text-purple-600 ml-4" />
              <div>
                <p className="text-2xl font-bold">{contacts.filter(c => c.type === 'partner').length}</p>
                <p className="text-xs text-muted-foreground">שותפים</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Contacts View */}
      {viewMode === 'grid' ? (
        /* Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredContacts.map((contact) => {
            const typeConfig = CONTACT_TYPES.find(t => t.value === contact.type);
            const statusConfig = CONTACT_STATUS.find(s => s.value === contact.status);

            return (
              <Card key={contact.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback>
                          {contact.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-lg">{contact.name}</CardTitle>
                        {contact.position && (
                          <p className="text-sm text-muted-foreground">{contact.position}</p>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditContact(contact)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="flex gap-2 mt-2">
                    <Badge className={typeConfig?.color}>
                      {typeConfig?.label}
                    </Badge>
                    <Badge className={statusConfig?.color}>
                      {statusConfig?.label}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  <div className="space-y-2">
                    {contact.company && (
                      <div className="flex items-center gap-2 text-sm">
                        <Building className="h-4 w-4 text-muted-foreground" />
                        <span>{contact.company}</span>
                      </div>
                    )}
                    {contact.email && (
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="truncate">{contact.email}</span>
                      </div>
                    )}
                    {contact.phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{contact.phone}</span>
                      </div>
                    )}
                    {contact.city && (
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>{contact.city}, {contact.country}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between mt-4 pt-3 border-t">
                    <div className="flex gap-1">
                      {contact.email && (
                        <Button size="sm" variant="outline">
                          <Mail className="h-3 w-3" />
                        </Button>
                      )}
                      {contact.phone && (
                        <Button size="sm" variant="outline">
                          <Phone className="h-3 w-3" />
                        </Button>
                      )}
                      <Button size="sm" variant="outline">
                        <Calendar className="h-3 w-3" />
                      </Button>
                    </div>
                    <Button size="sm" variant="outline">
                      <MessageSquare className="h-3 w-3 ml-1" />
                      הערות
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="p-3 text-right font-medium text-gray-700">שם</th>
                    <th className="p-3 text-right font-medium text-gray-700">חברה</th>
                    <th className="p-3 text-right font-medium text-gray-700">תפקיד</th>
                    <th className="p-3 text-right font-medium text-gray-700">אימייל</th>
                    <th className="p-3 text-right font-medium text-gray-700">טלפון</th>
                    <th className="p-3 text-right font-medium text-gray-700">עיר</th>
                    <th className="p-3 text-right font-medium text-gray-700">סוג</th>
                    <th className="p-3 text-right font-medium text-gray-700">סטטוס</th>
                    <th className="p-3 text-right font-medium text-gray-700 w-24">פעולות</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredContacts.map((contact) => {
                    const typeConfig = CONTACT_TYPES.find(t => t.value === contact.type);
                    const statusConfig = CONTACT_STATUS.find(s => s.value === contact.status);
                    
                    return (
                      <tr key={contact.id} className="border-b hover:bg-gray-50 transition-colors">
                        <td className="p-3">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="text-xs">
                                {contact.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{contact.name}</span>
                          </div>
                        </td>
                        <td className="p-3 text-gray-600">{contact.company || '-'}</td>
                        <td className="p-3 text-gray-600">{contact.position || '-'}</td>
                        <td className="p-3 text-gray-600">{contact.email || '-'}</td>
                        <td className="p-3 text-gray-600">{contact.phone || '-'}</td>
                        <td className="p-3 text-gray-600">{contact.city ? `${contact.city}, ${contact.country}` : '-'}</td>
                        <td className="p-3">
                          <Badge className={typeConfig?.color}>
                            {typeConfig?.label}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <Badge className={statusConfig?.color}>
                            {statusConfig?.label}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditContact(contact)}
                              className="h-8 w-8 p-0"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            {contact.email && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                              >
                                <Mail className="h-4 w-4" />
                              </Button>
                            )}
                            {contact.phone && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                              >
                                <Phone className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filteredContacts.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p>לא נמצאו אנשי קשר</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {filteredContacts.length === 0 && viewMode === 'grid' && (
        <div className="text-center py-12">
          <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">לא נמצאו אנשי קשר</h3>
          <p className="text-muted-foreground mb-4">
            {searchQuery ? 'נסה לשנות את החיפוש' : 'התחל על ידי הוספת איש קשר חדש'}
          </p>
          <Button onClick={() => setShowNewContactModal(true)}>
            <Plus className="h-4 w-4 ml-2" />
            איש קשר חדש
          </Button>
        </div>
      )}

      {/* New/Edit Contact Modal */}
      <Dialog open={showNewContactModal} onOpenChange={setShowNewContactModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-right">
              {editingContact ? 'עריכת איש קשר' : 'איש קשר חדש'}
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">שם מלא *</Label>
              <Input
                id="name"
                value={contactForm.name}
                onChange={(e) => setContactForm(prev => ({...prev, name: e.target.value}))}
                placeholder="שם מלא"
                className="text-right"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">אימייל</Label>
              <Input
                id="email"
                type="email"
                value={contactForm.email}
                onChange={(e) => setContactForm(prev => ({...prev, email: e.target.value}))}
                placeholder="אימייל"
                className="text-right"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">טלפון</Label>
              <Input
                id="phone"
                value={contactForm.phone}
                onChange={(e) => setContactForm(prev => ({...prev, phone: e.target.value}))}
                placeholder="מספר טלפון"
                className="text-right"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="company">חברה</Label>
              <Input
                id="company"
                value={contactForm.company}
                onChange={(e) => setContactForm(prev => ({...prev, company: e.target.value}))}
                placeholder="שם החברה"
                className="text-right"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="position">תפקיד</Label>
              <Input
                id="position"
                value={contactForm.position}
                onChange={(e) => setContactForm(prev => ({...prev, position: e.target.value}))}
                placeholder="תפקיד בחברה"
                className="text-right"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="industry">תעשייה</Label>
              <Select value={contactForm.industry} onValueChange={(value) => setContactForm(prev => ({...prev, industry: value}))}>
                <SelectTrigger>
                  <SelectValue placeholder="בחר תעשייה" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="technology">טכנולוגיה</SelectItem>
                  <SelectItem value="marketing">שיווק</SelectItem>
                  <SelectItem value="design">עיצוב</SelectItem>
                  <SelectItem value="finance">פיננסים</SelectItem>
                  <SelectItem value="healthcare">בריאות</SelectItem>
                  <SelectItem value="education">חינוך</SelectItem>
                  <SelectItem value="real_estate">נדל"ן</SelectItem>
                  <SelectItem value="retail">קמעונאות</SelectItem>
                  <SelectItem value="other">אחר</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="city">עיר</Label>
              <Input
                id="city"
                value={contactForm.city}
                onChange={(e) => setContactForm(prev => ({...prev, city: e.target.value}))}
                placeholder="עיר"
                className="text-right"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="country">מדינה</Label>
              <Input
                id="country"
                value={contactForm.country}
                onChange={(e) => setContactForm(prev => ({...prev, country: e.target.value}))}
                placeholder="מדינה"
                className="text-right"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">סוג איש קשר</Label>
              <Select value={contactForm.type} onValueChange={(value: any) => setContactForm(prev => ({...prev, type: value}))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONTACT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">סטטוס</Label>
              <Select value={contactForm.status} onValueChange={(value: any) => setContactForm(prev => ({...prev, status: value}))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONTACT_STATUS.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2 mt-4">
            <Label htmlFor="address">כתובת</Label>
            <Input
              id="address"
              value={contactForm.address}
              onChange={(e) => setContactForm(prev => ({...prev, address: e.target.value}))}
              placeholder="כתובת מלאה"
              className="text-right"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">הערות</Label>
            <Textarea
              id="notes"
              value={contactForm.notes}
              onChange={(e) => setContactForm(prev => ({...prev, notes: e.target.value}))}
              placeholder="הערות נוספות על איש הקשר"
              className="text-right"
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <Button
              variant="outline"
              onClick={() => {
                setShowNewContactModal(false);
                resetForm();
              }}
            >
              ביטול
            </Button>
            <Button onClick={handleSaveContact}>
              {editingContact ? 'עדכן' : 'צור'} איש קשר
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}