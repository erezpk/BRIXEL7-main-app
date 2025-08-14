import React, { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Building2, ArrowRight, CheckCircle, Users, User, ArrowLeft, Plus, X } from "lucide-react";
import { useMutation } from "@tanstack/react-query";

interface TeamMember {
  email: string;
  fullName: string;
  role: 'admin' | 'member';
}

export default function SetupWizard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [isFromGoogle, setIsFromGoogle] = useState(false);
  
  // Step 1: Business details
  const [businessData, setBusinessData] = useState({
    name: "",
    industry: "",
    website: "",
    phone: "",
    email: "",
    address: "",
    description: ""
  });

  // Step 2: Team management
  const [wantTeam, setWantTeam] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [newMember, setNewMember] = useState({ email: "", fullName: "", role: 'member' as 'admin' | 'member' });

  // Step 3: Personal profile
  const [profileData, setProfileData] = useState({
    fullName: "",
    position: "",
    phone: "",
    bio: ""
  });

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('from') === 'google') {
      setIsFromGoogle(true);
    }
  }, []);

  const setupMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/setup-agency', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'שגיאה בהגדרת המערכת');
      }
      
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "ההתקנה הושלמה בהצלחה!",
        description: "ברוכים הבאים למערכת ניהול העסק שלכם",
      });
      setLocation("/dashboard");
    },
    onError: (error: any) => {
      toast({
        title: "שגיאה בהתקנת המערכת",
        description: error?.message || "נסו שוב",
        variant: "destructive",
      });
    }
  });

  const addTeamMember = () => {
    if (!newMember.email || !newMember.fullName) {
      toast({
        title: "נתונים חסרים",
        description: "אנא מלאו את כל השדות הנדרשים",
        variant: "destructive",
      });
      return;
    }

    if (teamMembers.find(member => member.email === newMember.email)) {
      toast({
        title: "כתובת אימייל קיימת",
        description: "חבר צוות עם כתובת אימייל זו כבר קיים",
        variant: "destructive",
      });
      return;
    }

    setTeamMembers([...teamMembers, { ...newMember }]);
    setNewMember({ email: "", fullName: "", role: 'member' });
  };

  const removeTeamMember = (email: string) => {
    setTeamMembers(teamMembers.filter(member => member.email !== email));
  };

  const handleNext = () => {
    if (currentStep === 1) {
      if (!businessData.name.trim()) {
        toast({
          title: "שם העסק נדרש",
          description: "אנא הזינו שם לעסק",
          variant: "destructive",
        });
        return;
      }
      if (!businessData.industry) {
        toast({
          title: "תחום פעילות נדרש",
          description: "אנא בחרו תחום פעילות",
          variant: "destructive",
        });
        return;
      }
    }

    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleFinish = () => {
    if (!profileData.fullName.trim()) {
      toast({
        title: "שם מלא נדרש",
        description: "אנא הזינו את השם המלא שלכם",
        variant: "destructive",
      });
      return;
    }

    const setupData = {
      business: businessData,
      team: wantTeam ? teamMembers : [],
      profile: profileData
    };

    setupMutation.mutate(setupData);
  };

  const steps = [
    { number: 1, title: "פרטי העסק", icon: Building2 },
    { number: 2, title: "ניהול צוות", icon: Users },
    { number: 3, title: "הפרופיל שלי", icon: User }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center mb-4">
            {React.createElement(steps[currentStep - 1].icon, { className: "h-6 w-6 text-white" })}
          </div>
          
          {/* Progress indicator */}
          <div className="flex justify-center mb-4">
            {steps.map((step, index) => (
              <div key={step.number} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    currentStep >= step.number
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {currentStep > step.number ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    step.number
                  )}
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`w-12 h-0.5 mx-2 ${
                      currentStep > step.number ? "bg-blue-600" : "bg-gray-200"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">
            {steps[currentStep - 1].title}
          </CardTitle>
          
          {isFromGoogle && currentStep === 1 && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 mt-4">
              <div className="flex items-center text-green-800 dark:text-green-300">
                <CheckCircle className="h-4 w-4 mr-2" />
                <span className="text-sm">התחברתם בהצלחה עם Google!</span>
              </div>
            </div>
          )}
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Step 1: Business Details */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <CardDescription className="text-center">
                בואו נתחיל בהגדרת פרטי העסק שלכם
              </CardDescription>
              
              <div>
                <Label htmlFor="businessName" className="text-right block mb-2">
                  שם העסק *
                </Label>
                <Input
                  id="businessName"
                  type="text"
                  value={businessData.name}
                  onChange={(e) => setBusinessData(prev => ({ ...prev, name: e.target.value }))}
                  className="text-right"
                  placeholder="לדוגמה: דיגיטל מדיה פלוס"
                  required
                />
              </div>

              <div>
                <Label htmlFor="industry" className="text-right block mb-2">
                  תחום פעילות *
                </Label>
                <Select 
                  value={businessData.industry} 
                  onValueChange={(value) => setBusinessData(prev => ({ ...prev, industry: value }))}
                >
                  <SelectTrigger className="text-right">
                    <SelectValue placeholder="בחרו תחום פעילות" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="digital_marketing">שיווק דיגיטלי</SelectItem>
                    <SelectItem value="web_development">פיתוח אתרים</SelectItem>
                    <SelectItem value="graphic_design">עיצוב גרפי</SelectItem>
                    <SelectItem value="video_production">הפקת וידאו</SelectItem>
                    <SelectItem value="social_media">רשתות חברתיות</SelectItem>
                    <SelectItem value="consulting">ייעוץ עסקי</SelectItem>
                    <SelectItem value="other">אחר</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="website" className="text-right block mb-2">
                    אתר אינטרנט
                  </Label>
                  <Input
                    id="website"
                    type="url"
                    value={businessData.website}
                    onChange={(e) => setBusinessData(prev => ({ ...prev, website: e.target.value }))}
                    className="text-right"
                    placeholder="https://www.example.com"
                  />
                </div>

                <div>
                  <Label htmlFor="phone" className="text-right block mb-2">
                    טלפון
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={businessData.phone}
                    onChange={(e) => setBusinessData(prev => ({ ...prev, phone: e.target.value }))}
                    className="text-right"
                    placeholder="050-1234567"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="email" className="text-right block mb-2">
                  אימייל עסקי
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={businessData.email}
                  onChange={(e) => setBusinessData(prev => ({ ...prev, email: e.target.value }))}
                  className="text-right"
                  placeholder="info@business.com"
                />
              </div>

              <div>
                <Label htmlFor="address" className="text-right block mb-2">
                  כתובת
                </Label>
                <Input
                  id="address"
                  type="text"
                  value={businessData.address}
                  onChange={(e) => setBusinessData(prev => ({ ...prev, address: e.target.value }))}
                  className="text-right"
                  placeholder="רחוב הדוגמה 123, תל אביב"
                />
              </div>

              <div>
                <Label htmlFor="description" className="text-right block mb-2">
                  תיאור העסק
                </Label>
                <Textarea
                  id="description"
                  value={businessData.description}
                  onChange={(e) => setBusinessData(prev => ({ ...prev, description: e.target.value }))}
                  className="text-right"
                  placeholder="תיאור קצר על העסק ושירותיו"
                  rows={3}
                />
              </div>
            </div>
          )}

          {/* Step 2: Team Management */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <CardDescription className="text-center">
                האם ברצונכם להוסיף חברי צוות כבר עכשיו?
              </CardDescription>
              
              <div className="flex items-center justify-center space-x-4 rtl:space-x-reverse">
                <Label htmlFor="want-team">רוצה להוסיף חברי צוות</Label>
                <Switch
                  id="want-team"
                  checked={wantTeam}
                  onCheckedChange={setWantTeam}
                />
              </div>

              {wantTeam && (
                <div className="space-y-4">
                  <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
                    <h3 className="font-medium mb-4">הוסף חבר צוות חדש</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="memberEmail" className="text-right block mb-2">
                          אימייל
                        </Label>
                        <Input
                          id="memberEmail"
                          type="email"
                          value={newMember.email}
                          onChange={(e) => setNewMember(prev => ({ ...prev, email: e.target.value }))}
                          className="text-right"
                          placeholder="name@example.com"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="memberName" className="text-right block mb-2">
                          שם מלא
                        </Label>
                        <Input
                          id="memberName"
                          type="text"
                          value={newMember.fullName}
                          onChange={(e) => setNewMember(prev => ({ ...prev, fullName: e.target.value }))}
                          className="text-right"
                          placeholder="יוסי כהן"
                        />
                      </div>

                      <div>
                        <Label htmlFor="memberRole" className="text-right block mb-2">
                          תפקיד
                        </Label>
                        <Select 
                          value={newMember.role} 
                          onValueChange={(value: 'admin' | 'member') => setNewMember(prev => ({ ...prev, role: value }))}
                        >
                          <SelectTrigger className="text-right">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="member">חבר צוות</SelectItem>
                            <SelectItem value="admin">מנהל</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <Button onClick={addTeamMember} className="mt-4 w-full md:w-auto">
                      <Plus className="h-4 w-4 ml-2" />
                      הוסף חבר צוות
                    </Button>
                  </div>

                  {teamMembers.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="font-medium">חברי צוות שנוספו:</h3>
                      {teamMembers.map((member, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <p className="font-medium">{member.fullName}</p>
                            <p className="text-sm text-gray-600">{member.email}</p>
                            <Badge variant={member.role === 'admin' ? 'default' : 'secondary'}>
                              {member.role === 'admin' ? 'מנהל' : 'חבר צוות'}
                            </Badge>
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => removeTeamMember(member.email)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {!wantTeam && (
                <div className="text-center py-8 text-gray-600">
                  <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p>אין בעיה! תוכלו להוסיף חברי צוות מאוחר יותר מהגדרות המערכת</p>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Personal Profile */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <CardDescription className="text-center">
                כמה פרטים אישיים לסיום ההתקנה
              </CardDescription>
              
              <div>
                <Label htmlFor="fullName" className="text-right block mb-2">
                  שם מלא *
                </Label>
                <Input
                  id="fullName"
                  type="text"
                  value={profileData.fullName}
                  onChange={(e) => setProfileData(prev => ({ ...prev, fullName: e.target.value }))}
                  className="text-right"
                  placeholder="יוסי כהן"
                  required
                />
              </div>

              <div>
                <Label htmlFor="position" className="text-right block mb-2">
                  תפקיד בעסק
                </Label>
                <Input
                  id="position"
                  type="text"
                  value={profileData.position}
                  onChange={(e) => setProfileData(prev => ({ ...prev, position: e.target.value }))}
                  className="text-right"
                  placeholder="מנכ״ל / מנהל שיווק / בעלים"
                />
              </div>

              <div>
                <Label htmlFor="profilePhone" className="text-right block mb-2">
                  טלפון אישי
                </Label>
                <Input
                  id="profilePhone"
                  type="tel"
                  value={profileData.phone}
                  onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                  className="text-right"
                  placeholder="050-1234567"
                />
              </div>

              <div>
                <Label htmlFor="bio" className="text-right block mb-2">
                  קצת עליכם
                </Label>
                <Textarea
                  id="bio"
                  value={profileData.bio}
                  onChange={(e) => setProfileData(prev => ({ ...prev, bio: e.target.value }))}
                  className="text-right"
                  placeholder="ניסיון מקצועי, התמחויות, או כל דבר שתרצו לשתף"
                  rows={3}
                />
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between pt-6 border-t">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 1}
            >
              <ArrowLeft className="h-4 w-4 ml-2" />
              קודם
            </Button>

            {currentStep < 3 ? (
              <Button onClick={handleNext}>
                הבא
                <ArrowRight className="h-4 w-4 mr-2" />
              </Button>
            ) : (
              <Button 
                onClick={handleFinish}
                disabled={setupMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                {setupMutation.isPending ? "מסיים..." : "סיים התקנה"}
                <CheckCircle className="h-4 w-4 mr-2" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}