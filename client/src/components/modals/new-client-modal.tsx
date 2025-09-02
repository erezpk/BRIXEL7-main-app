import { useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { type InsertClient, type User } from "@shared/schema";
import { Plus, User as UserIcon, Upload, X, ArrowRight, ArrowLeft } from "lucide-react";

interface NewClientModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NewClientModal({ isOpen, onClose }: NewClientModalProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // States for contact linking
  const [linkToExistingContact, setLinkToExistingContact] = useState(false);
  const [selectedContactId, setSelectedContactId] = useState("");
  const [showNewContactDialog, setShowNewContactDialog] = useState(false);
  const [newContactData, setNewContactData] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    notes: ""
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>("");
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 3;
  
  // Fetch team members for account manager selection
  const { data: teamMembers } = useQuery({
    queryKey: ['/api/team'],
    queryFn: async () => {
      const response = await apiRequest('/api/team', 'GET');
      return response.json();
    },
  });
  
  // Fetch contacts for linking
  const { data: contacts } = useQuery({
    queryKey: ['/api/contacts'],
    queryFn: async () => {
      try {
        const response = await apiRequest('/api/contacts', 'GET');
        if (!response.ok) {
          console.warn('Contacts API not available:', response.status);
          return [];
        }
        return response.json();
      } catch (error) {
        console.warn('Error fetching contacts:', error);
        return [];
      }
    },
    enabled: linkToExistingContact,
    retry: false,
  });
  
  const [formData, setFormData] = useState({
    name: "",
    contact_name: "",
    email: "",
    phone: "",
    industry: "",
    status: "active" as const,
    notes: "",
    // businessNumber: "", // Temporarily removed - not in DB
    // businessName: "",   // Temporarily removed - not in DB
    // accountManager: "", // Temporarily removed - not in DB
    // logo: "",           // Temporarily removed - not in DB
    website: "",
    instagram: "",
    facebook: "",
    linkedin: "",
    // tiktok: "",         // Temporarily removed - not in DB
    // whatsapp: "",       // Temporarily removed - not in DB
    // twitter: "",        // Temporarily removed - not in DB
    // youtube: "",        // Temporarily removed - not in DB
  });

  const createClientMutation = useMutation({
    mutationFn: async (data: Omit<InsertClient, 'agencyId'>) => {
      const response = await apiRequest('/api/clients', 'POST', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      toast({
        title: "לקוח נוצר בהצלחה",
        description: "הלקוח החדש נוסף למערכת",
      });
      onClose();
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "שגיאה ביצירת לקוח",
        description: error?.message || "אירעה שגיאה לא צפויה",
        variant: "destructive",
      });
    },
  });

  const createContactMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('/api/contacts', 'POST', data);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'שגיאה לא ידועה' }));
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }
      return response.json();
    },
    onSuccess: (newContact) => {
      queryClient.invalidateQueries({ queryKey: ['/api/contacts'] });
      toast({
        title: "איש קשר נוצר בהצלחה",
        description: "איש הקשר החדש נוסף למערכת",
      });
      // Auto-select the new contact
      setSelectedContactId(newContact.id);
      setLinkToExistingContact(true);
      // Fill form data with new contact info
      setFormData(prev => ({
        ...prev,
        contact_name: newContact.name,
        email: newContact.email || "",
        phone: newContact.phone || "",
      }));
      // Reset and close new contact dialog
      setNewContactData({ name: "", email: "", phone: "", company: "", notes: "" });
      setShowNewContactDialog(false);
    },
    onError: (error: any) => {
      toast({
        title: "שגיאה ביצירת איש קשר",
        description: error?.message || "אירעה שגיאה לא צפויה",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      contact_name: "",
      email: "",
      phone: "",
      industry: "",
      status: "active",
      notes: "",
      website: "",
      instagram: "",
      facebook: "",
      linkedin: "",
    });
    setLinkToExistingContact(false);
    setSelectedContactId("");
    setLogoFile(null);
    setLogoPreview("");
    setCurrentStep(1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast({
        title: "שגיאה",
        description: "שם הלקוח הוא שדה חובה",
        variant: "destructive",
      });
      return;
    }
    
    try {
      let finalFormData = { ...formData };
      
      // Convert logo file to base64 if exists
      if (logoFile) {
        const base64Logo = await convertFileToBase64(logoFile);
        finalFormData.logo = base64Logo;
      }
      
      createClientMutation.mutate(finalFormData);
    } catch (error) {
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בעת עיבוד התמונה",
        variant: "destructive",
      });
    }
  };

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Handle contact selection
  const handleContactSelection = (contactId: string) => {
    setSelectedContactId(contactId);
    if (contactId && contacts) {
      const selectedContact = contacts.find((c: any) => c.id === contactId);
      if (selectedContact) {
        setFormData(prev => ({
          ...prev,
          contact_name: selectedContact.name,
          email: selectedContact.email || "",
          phone: selectedContact.phone || "",
        }));
      }
    }
  };

  // Handle new contact creation
  const handleNewContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContactData.name.trim()) {
      toast({
        title: "שגיאה",
        description: "שם איש הקשר הוא שדה חובה",
        variant: "destructive",
      });
      return;
    }
    createContactMutation.mutate(newContactData);
  };

  const handleNewContactInputChange = (field: keyof typeof newContactData, value: string) => {
    setNewContactData(prev => ({ ...prev, [field]: value }));
  };

  // Handle logo file selection
  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: "שגיאה",
          description: "אנא בחר קובץ תמונה בלבד",
          variant: "destructive",
        });
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "שגיאה",
          description: "גודל הקובץ לא יכול לעלות על 5MB",
          variant: "destructive",
        });
        return;
      }
      
      setLogoFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setLogoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Remove logo file
  const handleRemoveLogo = () => {
    setLogoFile(null);
    setLogoPreview("");
    setFormData(prev => ({ ...prev, logo: "" }));
  };

  // Convert file to base64 for storage
  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  // Wizard navigation
  const nextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const validateCurrentStep = (): boolean => {
    switch (currentStep) {
      case 1:
        if (!formData.name.trim()) {
          toast({
            title: "שגיאה",
            description: "שם הלקוח הוא שדה חובה",
            variant: "destructive",
          });
          return false;
        }
        return true;
      case 2:
        return true; // Optional fields
      case 3:
        return true; // Optional fields
      default:
        return true;
    }
  };

  const handleNextStep = () => {
    if (validateCurrentStep()) {
      nextStep();
    }
  };

  // Render functions for each step
  const renderStep1 = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name" className="text-right">שם הלקוח *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => handleInputChange('name', e.target.value)}
          placeholder="הכנס שם הלקוח"
          className="text-right"
          required
          data-testid="input-client-name"
        />
      </div>
      
      <div className="space-y-4">
        <div className="flex items-center gap-2 flex-row-reverse">
          <Label htmlFor="linkToContact" className="text-right">קשר לאיש קשר קיים</Label>
          <input
            type="checkbox"
            id="linkToContact"
            checked={linkToExistingContact}
            onChange={(e) => setLinkToExistingContact(e.target.checked)}
            className="rounded"
          />
        </div>
        
        {linkToExistingContact ? (
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="existingContact" className="text-right">בחר איש קשר</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowNewContactDialog(true)}
                className="gap-1 text-xs"
              >
                <Plus className="h-3 w-3" />
                יצור חדש
              </Button>
            </div>
            <Select value={selectedContactId} onValueChange={handleContactSelection}>
              <SelectTrigger data-testid="select-existing-contact">
                <SelectValue placeholder="בחר איש קשר קיים" />
              </SelectTrigger>
              <SelectContent>
                {contacts?.map((contact: any) => (
                  <SelectItem key={contact.id} value={contact.id}>
                    {contact.name} {contact.email ? `(${contact.email})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="contact_name" className="text-right">איש קשר</Label>
            <Input
              id="contact_name"
              value={formData.contact_name}
              onChange={(e) => handleInputChange('contact_name', e.target.value)}
              placeholder="שם איש הקשר"
              className="text-right"
              data-testid="input-contact-name"
            />
          </div>
        )}
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="email" className="text-right">אימייל</Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => handleInputChange('email', e.target.value)}
          placeholder="כתובת אימייל"
          className="text-right"
          data-testid="input-email"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="phone" className="text-right">טלפון</Label>
        <Input
          id="phone"
          value={formData.phone}
          onChange={(e) => handleInputChange('phone', e.target.value)}
          placeholder="מספר טלפון"
          className="text-right"
          data-testid="input-phone"
        />
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="industry" className="text-right">תחום עיסוק</Label>
        <Select value={formData.industry} onValueChange={(value) => handleInputChange('industry', value)}>
          <SelectTrigger data-testid="select-industry">
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
      
      <div className="space-y-2">
        <Label htmlFor="status" className="text-right">סטטוס</Label>
        <Select value={formData.status} onValueChange={(value: "active" | "inactive" | "pending") => handleInputChange('status', value)}>
          <SelectTrigger data-testid="select-status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">פעיל</SelectItem>
            <SelectItem value="pending">ממתין</SelectItem>
            <SelectItem value="inactive">לא פעיל</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes" className="text-right">הערות</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => handleInputChange('notes', e.target.value)}
          placeholder="הערות נוספות על הלקוח"
          className="text-right"
          rows={3}
          data-testid="textarea-notes"
        />
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-4">
      <div className="space-y-4">
        <Label className="text-right font-semibold">רשתות חברתיות</Label>
        
        <div className="space-y-2">
          <Label htmlFor="website" className="text-right">אתר אינטרנט</Label>
          <Input
            id="website"
            value={formData.website}
            onChange={(e) => handleInputChange('website', e.target.value)}
            placeholder="https://example.com"
            className="text-right"
            data-testid="input-website"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="instagram" className="text-right">אינסטגרם</Label>
          <Input
            id="instagram"
            value={formData.instagram}
            onChange={(e) => handleInputChange('instagram', e.target.value)}
            placeholder="@username או כתובת מלאה"
            className="text-right"
            data-testid="input-instagram"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="facebook" className="text-right">פייסבוק</Label>
          <Input
            id="facebook"
            value={formData.facebook}
            onChange={(e) => handleInputChange('facebook', e.target.value)}
            placeholder="שם עמוד או כתובת מלאה"
            className="text-right"
            data-testid="input-facebook"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="linkedin" className="text-right">לינקדאין</Label>
          <Input
            id="linkedin"
            value={formData.linkedin}
            onChange={(e) => handleInputChange('linkedin', e.target.value)}
            placeholder="כתובת פרופיל לינקדאין"
            className="text-right"
            data-testid="input-linkedin"
          />
        </div>
      </div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto" dir="rtl" data-testid="new-client-modal" aria-describedby="new-client-description">
        <DialogHeader className="text-right">
          <DialogTitle className="text-right font-rubik">לקוח חדש</DialogTitle>
          <DialogDescription id="new-client-description" className="text-right">
            שלב {currentStep} מתוך {totalSteps} - {
              currentStep === 1 ? "פרטים בסיסיים" :
              currentStep === 2 ? "פרטי התקשרות ועסק" :
              "רשתות חברתיות ועיצוב"
            }
          </DialogDescription>
          
          {/* Step Indicator */}
          <div className="flex justify-center gap-2 mt-4">
            {Array.from({ length: totalSteps }, (_, i) => (
              <div
                key={i}
                className={`w-8 h-2 rounded-full transition-colors ${
                  i + 1 <= currentStep ? 'bg-blue-500' : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Render current step */}
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
          
          {/* Navigation Buttons */}
          <div className="flex gap-2 pt-4 justify-between">
            {/* Left side - Cancel */}
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              data-testid="button-cancel"
            >
              ביטול
            </Button>
            
            {/* Right side - Navigation */}
            <div className="flex gap-2">
              {/* Previous Button */}
              {currentStep > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={prevStep}
                  className="gap-1"
                >
                  <ArrowRight className="h-4 w-4" />
                  קודם
                </Button>
              )}
              
              {/* Next/Submit Button */}
              {currentStep < totalSteps ? (
                <Button
                  type="button"
                  onClick={handleNextStep}
                  className="gap-1"
                  data-testid="button-next"
                >
                  הבא
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={createClientMutation.isPending}
                  className="gap-1"
                  data-testid="button-create"
                >
                  {createClientMutation.isPending ? "יוצר..." : "צור לקוח"}
                </Button>
              )}
            </div>
          </div>
        </form>
      </DialogContent>

      {/* New Contact Dialog */}
      <Dialog open={showNewContactDialog} onOpenChange={setShowNewContactDialog}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader className="text-right">
            <DialogTitle className="text-right font-rubik">איש קשר חדש</DialogTitle>
            <DialogDescription className="text-right">
              הוסף איש קשר חדש למערכת
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleNewContactSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newContactName" className="text-right">שם איש קשר *</Label>
              <Input
                id="newContactName"
                value={newContactData.name}
                onChange={(e) => handleNewContactInputChange('name', e.target.value)}
                placeholder="הכנס שם איש קשר"
                className="text-right"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="newContactEmail" className="text-right">אימייל</Label>
              <Input
                id="newContactEmail"
                type="email"
                value={newContactData.email}
                onChange={(e) => handleNewContactInputChange('email', e.target.value)}
                placeholder="כתובת אימייל"
                className="text-right"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="newContactPhone" className="text-right">טלפון</Label>
              <Input
                id="newContactPhone"
                value={newContactData.phone}
                onChange={(e) => handleNewContactInputChange('phone', e.target.value)}
                placeholder="מספר טלפון"
                className="text-right"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="newContactCompany" className="text-right">חברה</Label>
              <Input
                id="newContactCompany"
                value={newContactData.company}
                onChange={(e) => handleNewContactInputChange('company', e.target.value)}
                placeholder="שם החברה"
                className="text-right"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="newContactNotes" className="text-right">הערות</Label>
              <Textarea
                id="newContactNotes"
                value={newContactData.notes}
                onChange={(e) => handleNewContactInputChange('notes', e.target.value)}
                placeholder="הערות נוספות"
                className="text-right"
                rows={2}
              />
            </div>
            
            <div className="flex gap-2 pt-4 flex-row-reverse">
              <Button
                type="submit"
                disabled={createContactMutation.isPending}
              >
                {createContactMutation.isPending ? "יוצר..." : "צור איש קשר"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowNewContactDialog(false);
                  setNewContactData({ name: "", email: "", phone: "", company: "", notes: "" });
                }}
              >
                ביטול
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
