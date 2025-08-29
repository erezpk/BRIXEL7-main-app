import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Building,
  Settings as SettingsIcon,
  Upload,
  Save,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { rtlClass } from "@/lib/rtl";
import { apiRequest } from "@/lib/queryClient";
import { ObjectUploader } from "@/components/ObjectUploader";

const agencyFormSchema = z.object({
  name: z.string().min(1, "שם הסוכנות נדרש"),
  slug: z.string().min(1, "קיצור דרך נדרש"),
  industry: z.string().min(1, "תחום פעילות נדרש"),
  website: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("כתובת אימייל לא תקינה").optional(),
  address: z.string().optional(),
  description: z.string().optional(),
});

type AgencyFormData = z.infer<typeof agencyFormSchema>;

export default function UnifiedSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Agency form
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

  // States
  const [settings, setSettings] = useState({
    general: {
      language: "he",
      timezone: "Asia/Jerusalem",
      theme: "light"
    }
  });
  const [agencyLogo, setAgencyLogo] = useState<string | null>(null);

  // Fetch current agency
  const { data: currentAgency, isLoading: isLoadingAgency } = useQuery({
    queryKey: ['/api/agencies/current'],
    onSuccess: (data) => {
      if (data) {
        agencyForm.reset({
          name: data.name || "",
          slug: data.slug || "",
          industry: data.industry || "",
          website: data.website || "",
          phone: data.phone || "",
          email: data.email || "",
          address: data.address || "",
          description: data.description || "",
        });
        setAgencyLogo(data.logo || null);
      }
    }
  });

  // Update agency mutation
  const updateAgencyMutation = useMutation({
    mutationFn: async (data: AgencyFormData) => {
      return await apiRequest("/api/agencies/current", "PUT", data);
    },
    onSuccess: () => {
      toast({
        title: "פרטי הסוכנות נשמרו בהצלחה",
        description: "השינויים שלך נשמרו במערכת",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/agencies/current'] });
    },
    onError: () => {
      toast({
        title: "שגיאה בשמירת פרטי הסוכנות",
        description: "נסה שוב מאוחר יותר",
        variant: "destructive",
      });
    },
  });

<<<<<<< HEAD
=======
  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (data: typeof settings) => {
      return await apiRequest("/api/settings", "PUT", data);
    },
    onSuccess: () => {
      toast({
        title: "הגדרות נשמרו בהצלחה",
        description: "השינויים שלך נשמרו במערכת",
      });
    },
    onError: () => {
      toast({
        title: "שגיאה בשמירת הגדרות",
        description: "נסה שוב מאוחר יותר",
        variant: "destructive",
      });
    },
  });

>>>>>>> f54764f5dc343e882aeda53f92c07128e830ece3
  // Upload logo handlers
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
        
        // Update agency with new logo
        await updateAgencyMutation.mutateAsync({
          ...agencyForm.getValues(),
          logo: logoURL
        });
        
        setAgencyLogo(logoURL);
        
        toast({
          title: "לוגו הועלה בהצלחה",
          description: "הלוגו החדש נשמר במערכת",
        });
      }
    } catch (error) {
      toast({
        title: "שגיאה בשמירת הלוגו",
        description: "הקובץ הועלה אך לא נשמר במערכת",
        variant: "destructive",
      });
    }
  };

  const onAgencySubmit = (data: AgencyFormData) => {
    updateAgencyMutation.mutate(data);
  };

<<<<<<< HEAD
=======
  const saveSettings = () => {
    updateSettingsMutation.mutate(settings);
  };

>>>>>>> f54764f5dc343e882aeda53f92c07128e830ece3
  return (
    <div className={cn("container mx-auto py-6 space-y-6 max-w-7xl", rtlClass())}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">הגדרות מערכת</h1>
          <p className="text-muted-foreground">
<<<<<<< HEAD
            נהל את פרטי העסק שלך
=======
            נהל את פרטי העסק והגדרות המערכת הכלליות
>>>>>>> f54764f5dc343e882aeda53f92c07128e830ece3
          </p>
        </div>
      </div>

<<<<<<< HEAD
      {/* פרטי העסק */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            פרטי העסק
          </CardTitle>
          <CardDescription>
            עדכן את פרטי העסק והלוגו
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* העלאת לוגו */}
          <div className="space-y-4">
            <Label>לוגו העסק</Label>
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

          {/* טופס פרטי עסק */}
          <Form {...agencyForm}>
            <form onSubmit={agencyForm.handleSubmit(onAgencySubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={agencyForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>שם העסק</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="שם העסק" />
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
                      <FormLabel>קיצור דרך (באנגלית)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="business-name" />
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
                      <FormLabel>תחום פעילות</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="שיווק דיגיטלי" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={agencyForm.control}
                  name="website"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>אתר אינטרנט</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="https://www.example.com" />
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

                <FormField
                  control={agencyForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>אימייל</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="info@business.com" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={agencyForm.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>כתובת</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="רחוב הדוגמה 123, תל אביב" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={agencyForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>תיאור העסק</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="תיאור קצר על העסק ושירותיו" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button 
                type="submit" 
                disabled={updateAgencyMutation.isPending}
                className="w-full md:w-auto"
              >
                <Save className="h-4 w-4 ml-2" />
                שמור פרטי עסק
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
=======
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="overflow-x-auto">
          <TabsList className="grid w-full grid-cols-2 min-w-[300px]">
            <TabsTrigger value="agency">פרטי העסק</TabsTrigger>
            <TabsTrigger value="system">הגדרות מערכת</TabsTrigger>
          </TabsList>
        </div>

        {/* פרטי העסק */}
        <TabsContent value="agency" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                פרטי העסק
              </CardTitle>
              <CardDescription>
                עדכן את פרטי העסק והלוגו
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* העלאת לוגו */}
              <div className="space-y-4">
                <Label>לוגו העסק</Label>
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

              {/* טופס פרטי העסק */}
              <Form {...agencyForm}>
                <form onSubmit={agencyForm.handleSubmit(onAgencySubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={agencyForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>שם העסק</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="שם העסק" />
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
                          <FormLabel>קיצור דרך (באנגלית)</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="business-name" />
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
                          <FormLabel>תחום פעילות</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="שיווק דיגיטלי" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={agencyForm.control}
                      name="website"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>אתר אינטרנט</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="https://www.example.com" />
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

                    <FormField
                      control={agencyForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>אימייל</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="info@business.com" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={agencyForm.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>כתובת</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="רחוב הדוגמה 123, תל אביב" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={agencyForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>תיאור העסק</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="תיאור קצר על העסק ושירותיו" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button 
                    type="submit" 
                    disabled={updateAgencyMutation.isPending}
                    className="w-full md:w-auto"
                  >
                    <Save className="h-4 w-4 ml-2" />
                    שמור פרטי עסק
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* הגדרות מערכת */}
        <TabsContent value="system" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SettingsIcon className="h-5 w-5" />
                הגדרות מערכת כלליות
              </CardTitle>
              <CardDescription>
                הגדרות כלליות למערכת
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>שפה</Label>
                    <p className="text-sm text-muted-foreground">שפת המערכת</p>
                  </div>
                  <Badge>עברית</Badge>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>אזור זמן</Label>
                    <p className="text-sm text-muted-foreground">אזור הזמן של המערכת</p>
                  </div>
                  <Badge>ישראל</Badge>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>ערכת נושא</Label>
                    <p className="text-sm text-muted-foreground">מראה המערכת</p>
                  </div>
                  <Badge>בהיר</Badge>
                </div>
              </div>

              <Button onClick={saveSettings} disabled={updateSettingsMutation.isPending}>
                <Save className="h-4 w-4 ml-2" />
                שמור הגדרות מערכת
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
>>>>>>> f54764f5dc343e882aeda53f92c07128e830ece3
    </div>
  );
}