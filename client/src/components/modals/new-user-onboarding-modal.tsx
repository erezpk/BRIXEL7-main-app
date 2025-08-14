import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Building, 
  Users, 
  User, 
  ArrowRight, 
  ArrowLeft, 
  Check, 
  Upload,
  UserPlus,
  Skip,
  Save
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { ObjectUploader } from "@/components/ObjectUploader";
import { cn } from "@/lib/utils";
import { rtlClass } from "@/lib/rtl";

const agencyFormSchema = z.object({
  name: z.string().min(1, "שם העסק נדרש"),
  slug: z.string().min(1, "קיצור דרך נדרש"),
  industry: z.string().min(1, "תחום פעילות נדרש"),
  website: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("כתובת אימייל לא תקינה").optional(),
  address: z.string().optional(),
  description: z.string().optional(),
});

const teamMemberFormSchema = z.object({
  email: z.string().email("כתובת אימייל לא תקינה"),
  fullName: z.string().min(1, "שם מלא נדרש"),
  role: z.string().default("team_member"),
});

const profileFormSchema = z.object({
  fullName: z.string().min(1, "שם מלא נדרש"),
  email: z.string().email("כתובת אימייל לא תקינה"),
  phone: z.string().optional(),
});

type AgencyFormData = z.infer<typeof agencyFormSchema>;
type TeamMemberFormData = z.infer<typeof teamMemberFormSchema>;
type ProfileFormData = z.infer<typeof profileFormSchema>;

interface NewUserOnboardingModalProps {
  open: boolean;
  onClose: () => void;
}

export default function NewUserOnboardingModal({ open, onClose }: NewUserOnboardingModalProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [wantToAddTeamMember, setWantToAddTeamMember] = useState<boolean | null>(null);
  const [agencyLogo, setAgencyLogo] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Forms
  const agencyForm = useForm<AgencyFormData>({
    resolver: zodResolver(agencyFormSchema),
    defaultValues: {
      name: "",
      slug: "",
      industry: "",
      website: "",
      phone: "",
      email: "",
      address: "",
      description: "",
    },
  });

  const teamMemberForm = useForm<TeamMemberFormData>({
    resolver: zodResolver(teamMemberFormSchema),
    defaultValues: {
      email: "",
      fullName: "",
      role: "team_member",
    },
  });

  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      fullName: user?.fullName || "",
      email: user?.email || "",
      phone: "",
    },
  });

  // Update profile form when user data changes
  useEffect(() => {
    if (user) {
      profileForm.reset({
        fullName: user.fullName || "",
        email: user.email || "",
        phone: "",
      });
    }
  }, [user, profileForm]);

  // Mutations
  const updateAgencyMutation = useMutation({
    mutationFn: async (data: AgencyFormData) => {
      return await apiRequest("/api/agencies/current", "PUT", data);
    },
    onSuccess: () => {
      toast({
        title: "פרטי העסק נשמרו בהצלחה",
        description: "המידע נשמר במערכת",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/agencies/current'] });
    },
    onError: () => {
      toast({
        title: "שגיאה בשמירת פרטי העסק",
        description: "נסה שוב מאוחר יותר",
        variant: "destructive",
      });
    },
  });

  const inviteTeamMemberMutation = useMutation({
    mutationFn: async (data: TeamMemberFormData) => {
      return await apiRequest("/api/team/invite", "POST", data);
    },
    onSuccess: () => {
      toast({
        title: "הזמנה נשלחה בהצלחה",
        description: "חבר הצוות יקבל אימייל עם הזמנה להצטרף",
      });
      teamMemberForm.reset();
      queryClient.invalidateQueries({ queryKey: ['/api/team'] });
    },
    onError: () => {
      toast({
        title: "שגיאה בשליחת הזמנה",
        description: "נסה שוב מאוחר יותר",
        variant: "destructive",
      });
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      return await apiRequest("/api/auth/profile", "PUT", data);
    },
    onSuccess: () => {
      toast({
        title: "הפרופיל עודכן בהצלחה",
        description: "המידע האישי שלך נשמר",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
    },
    onError: () => {
      toast({
        title: "שגיאה בעדכון פרופיל",
        description: "נסה שוב מאוחר יותר",
        variant: "destructive",
      });
    },
  });

  // Upload handlers
  const handleGetUploadParameters = async () => {
    try {
      const response = await apiRequest("/api/objects/upload", "POST");
      return {
        method: "PUT" as const,
        url: response.uploadURL,
      };
    } catch (error) {
      toast({
        title: "שגיאה בהעלאת קובץ",
        description: "לא ניתן להעלות את הלוגו כרגע",
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleLogoUploadComplete = async (result: any) => {
    try {
      if (result.successful && result.successful.length > 0) {
        const uploadedFile = result.successful[0];
        const logoURL = uploadedFile.uploadURL;
        setAgencyLogo(logoURL);
        
        toast({
          title: "לוגו הועלה בהצלחה",
          description: "הלוגו יישמר עם פרטי העסק",
        });
      }
    } catch (error) {
      toast({
        title: "שגיאה בהעלאת הלוגו",
        description: "הקובץ לא הועלה בהצלחה",
        variant: "destructive",
      });
    }
  };

  const onAgencySubmit = async (data: AgencyFormData) => {
    try {
      let submitData = { ...data };
      if (agencyLogo) {
        submitData = { ...submitData, logo: agencyLogo };
      }
      await updateAgencyMutation.mutateAsync(submitData);
      setCurrentStep(2);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const onTeamMemberSubmit = async (data: TeamMemberFormData) => {
    try {
      await inviteTeamMemberMutation.mutateAsync(data);
      setCurrentStep(3);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const onProfileSubmit = async (data: ProfileFormData) => {
    try {
      await updateProfileMutation.mutateAsync(data);
      onClose();
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleSkipTeamMember = () => {
    setCurrentStep(3);
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const steps = [
    { number: 1, title: "פרטי העסק", icon: Building },
    { number: 2, title: "ניהול צוות", icon: Users },
    { number: 3, title: "הפרופיל שלי", icon: User },
  ];

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className={cn("max-w-4xl max-h-[90vh] overflow-y-auto", rtlClass())} onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">ברוכים הבאים למערכת!</DialogTitle>
          <p className="text-muted-foreground">
            בואו נגדיר את המערכת שלכם בכמה שלבים קצרים
          </p>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8 space-x-4 rtl:space-x-reverse">
          {steps.map((step) => {
            const Icon = step.icon;
            const isActive = step.number === currentStep;
            const isCompleted = step.number < currentStep;
            
            return (
              <div key={step.number} className="flex items-center">
                <div
                  className={cn(
                    "flex items-center justify-center w-12 h-12 rounded-full border-2 transition-colors",
                    isActive
                      ? "border-primary bg-primary text-primary-foreground"
                      : isCompleted
                      ? "border-green-500 bg-green-500 text-white"
                      : "border-muted-foreground text-muted-foreground"
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-6 w-6" />
                  ) : (
                    <Icon className="h-6 w-6" />
                  )}
                </div>
                <div className="mr-3 ml-3">
                  <p
                    className={cn(
                      "text-sm font-medium",
                      isActive ? "text-primary" : isCompleted ? "text-green-600" : "text-muted-foreground"
                    )}
                  >
                    {step.title}
                  </p>
                </div>
                {step.number < steps.length && (
                  <ArrowRight
                    className={cn(
                      "h-4 w-4 mx-4",
                      step.number < currentStep ? "text-green-500" : "text-muted-foreground"
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Step Content */}
        <div className="space-y-6">
          {/* Step 1: Business Details */}
          {currentStep === 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  פרטי העסק
                </CardTitle>
                <CardDescription>
                  בואו נתחיל עם המידע הבסיסי על העסק שלכם
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Logo Upload */}
                <div className="space-y-4">
                  <Label>לוגו העסק (אופציונלי)</Label>
                  <div className="flex items-center gap-4">
                    {agencyLogo && (
                      <div className="w-20 h-20 border rounded-lg overflow-hidden">
                        <img 
                          src={agencyLogo} 
                          alt="לוגו העסק" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <ObjectUploader
                      maxNumberOfFiles={1}
                      maxFileSize={5242880} // 5MB
                      onGetUploadParameters={handleGetUploadParameters}
                      onComplete={handleLogoUploadComplete}
                      buttonClassName="flex items-center gap-2"
                    >
                      <Upload className="h-4 w-4" />
                      {agencyLogo ? "החלף לוגו" : "העלה לוגו"}
                    </ObjectUploader>
                  </div>
                </div>

                <Separator />

                <Form {...agencyForm}>
                  <form onSubmit={agencyForm.handleSubmit(onAgencySubmit)} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={agencyForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>שם העסק *</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="שם העסק שלכם" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={agencyForm.control}
                        name="industry"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>תחום פעילות *</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="שיווק דיגיטלי, יעוץ עסקי, וכו'" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={agencyForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>אימייל העסק</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="info@business.com" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={agencyForm.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>טלפון</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="03-1234567" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={agencyForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>תיאור העסק (אופציונלי)</FormLabel>
                          <FormControl>
                            <Textarea {...field} placeholder="תיאור קצר על העסק ושירותיו" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={agencyForm.control}
                      name="slug"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>קיצור דרך (באנגלית) *</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="my-business" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-end">
                      <Button 
                        type="submit" 
                        disabled={updateAgencyMutation.isPending}
                        className="min-w-[120px]"
                      >
                        {updateAgencyMutation.isPending ? "שומר..." : "המשך"}
                        <ArrowRight className="h-4 w-4 mr-2" />
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Team Management */}
          {currentStep === 2 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  ניהול צוות
                </CardTitle>
                <CardDescription>
                  האם תרצו להזמין חברי צוות נוספים למערכת?
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {wantToAddTeamMember === null && (
                  <div className="text-center space-y-4">
                    <p className="text-lg">האם תרצו להוסיף חברי צוות?</p>
                    <div className="flex gap-4 justify-center">
                      <Button 
                        onClick={() => setWantToAddTeamMember(true)}
                        className="flex items-center gap-2"
                      >
                        <UserPlus className="h-4 w-4" />
                        כן, אני רוצה להוסיף חבר צוות
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => setWantToAddTeamMember(false)}
                        className="flex items-center gap-2"
                      >
                        <Skip className="h-4 w-4" />
                        לא, אדלג על זה כרגע
                      </Button>
                    </div>
                  </div>
                )}

                {wantToAddTeamMember === true && (
                  <Form {...teamMemberForm}>
                    <form onSubmit={teamMemberForm.handleSubmit(onTeamMemberSubmit)} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={teamMemberForm.control}
                          name="fullName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>שם מלא *</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="שם מלא של חבר הצוות" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={teamMemberForm.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>כתובת אימייל *</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="email@example.com" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="flex justify-between">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleBack}
                          className="flex items-center gap-2"
                        >
                          <ArrowLeft className="h-4 w-4" />
                          חזור
                        </Button>
                        <div className="flex gap-2">
                          <Button 
                            type="button"
                            variant="outline"
                            onClick={handleSkipTeamMember}
                            className="flex items-center gap-2"
                          >
                            <Skip className="h-4 w-4" />
                            דלג
                          </Button>
                          <Button 
                            type="submit" 
                            disabled={inviteTeamMemberMutation.isPending}
                            className="min-w-[120px]"
                          >
                            {inviteTeamMemberMutation.isPending ? "שולח..." : "שלח הזמנה והמשך"}
                            <ArrowRight className="h-4 w-4 mr-2" />
                          </Button>
                        </div>
                      </div>
                    </form>
                  </Form>
                )}

                {wantToAddTeamMember === false && (
                  <div className="text-center space-y-4">
                    <p>בסדר! תוכלו להוסיף חברי צוות מאוחר יותר דרך הגדרות הצוות</p>
                    <div className="flex justify-between">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleBack}
                        className="flex items-center gap-2"
                      >
                        <ArrowLeft className="h-4 w-4" />
                        חזור
                      </Button>
                      <Button 
                        onClick={() => setCurrentStep(3)}
                        className="flex items-center gap-2"
                      >
                        המשך לשלב הבא
                        <ArrowRight className="h-4 w-4 mr-2" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 3: Profile */}
          {currentStep === 3 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  הפרופיל שלי
                </CardTitle>
                <CardDescription>
                  בואו נסיים עם עדכון הפרטים האישיים שלכם
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <Form {...profileForm}>
                  <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={profileForm.control}
                        name="fullName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>שם מלא *</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="השם המלא שלכם" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={profileForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>כתובת אימייל *</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="האימייל האישי שלכם" disabled />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={profileForm.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>טלפון אישי</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="050-1234567" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="flex justify-between">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleBack}
                        className="flex items-center gap-2"
                      >
                        <ArrowLeft className="h-4 w-4" />
                        חזור
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={updateProfileMutation.isPending}
                        className="min-w-[140px] flex items-center gap-2"
                      >
                        <Save className="h-4 w-4" />
                        {updateProfileMutation.isPending ? "שומר..." : "סיים הגדרה"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}