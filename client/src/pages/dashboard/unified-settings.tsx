import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { apiRequest } from "@/lib/queryClient";

const rtlClass = () => "text-right";

// Form schemas
const agencyFormSchema = z.object({
  name: z.string().min(1, "שם העסק נדרש"),
  industry: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("אימייל לא תקין").optional().or(z.literal("")),
  address: z.string().optional(),
  description: z.string().optional(),
});

type AgencyFormData = z.infer<typeof agencyFormSchema>;

export default function UnifiedSettings() {
  const [agencyLogo, setAgencyLogo] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form setup
  const agencyForm = useForm<AgencyFormData>({
    resolver: zodResolver(agencyFormSchema),
    defaultValues: {
      name: "",
      industry: "",
      phone: "",
      email: "",
      address: "",
      description: "",
    },
  });

  // Fetch current agency
  const { data: currentAgency, isLoading: isLoadingAgency } = useQuery({
    queryKey: ['/api/agencies/current'],
    onSuccess: (data) => {
      if (data) {
        agencyForm.reset({
          name: data.name || "",
          industry: data.industry || "",
          phone: data.phone || "",
          email: data.email || "",
          address: data.address || "",
          description: data.description || "",
        });
        setAgencyLogo(data.logo || null);
      }
    }
  });

  // Agency update mutation
  const updateAgencyMutation = useMutation({
    mutationFn: async (data: AgencyFormData) => {
      return apiRequest("/api/agencies/current", "PUT", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/agencies/current'] });
      toast({
        title: "פרטי העסק נשמרו בהצלחה",
        description: "השינויים שלך נשמרו במערכת",
      });
    },
    onError: () => {
      toast({
        title: "שגיאה בשמירת פרטי הסוכנות",
        description: "נסה שוב מאוחר יותר",
        variant: "destructive",
      });
    },
  });

  const onAgencySubmit = (data: AgencyFormData) => {
    updateAgencyMutation.mutate(data);
  };

  return (
    <div className={cn("container mx-auto py-6 space-y-6 max-w-7xl", rtlClass())}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">הגדרות מערכת</h1>
          <p className="text-muted-foreground">
            נהל את פרטי העסק והגדרות המערכת הכלליות
          </p>
        </div>
      </div>

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
          {/* טופס פרטי עסק */}
          <Form {...agencyForm}>
            <form onSubmit={agencyForm.handleSubmit(onAgencySubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={agencyForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>שם העסק</FormLabel>
                      <FormControl>
                        <Input placeholder="שם העסק" {...field} />
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
                      <FormLabel>תעשייה</FormLabel>
                      <FormControl>
                        <Input placeholder="תעשייה" {...field} />
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
                        <Input placeholder="050-123-4567" {...field} />
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
                        <Input type="email" placeholder="email@company.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={agencyForm.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>כתובת</FormLabel>
                      <FormControl>
                        <Input placeholder="כתובת העסק" {...field} />
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
                    <FormLabel>תיאור העסק</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="תיאור קצר של העסק"
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" disabled={updateAgencyMutation.isPending}>
                <Save className="h-4 w-4 ml-2" />
                {updateAgencyMutation.isPending ? "שומר..." : "שמור שינויים"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}