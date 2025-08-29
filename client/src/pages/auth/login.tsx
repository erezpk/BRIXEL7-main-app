import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff } from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import { getRedirectResult, GoogleAuthProvider } from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function Login() {
  const [, setLocation] = useLocation();
  const { user, isLoading, login, loginWithGoogle, isLoginLoading, isGoogleLoginLoading, loginError, googleLoginError } = useAuth();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    rememberMe: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isGoogleLogin, setIsGoogleLogin] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (!isLoading && user) {
      const setupKey = `setup_complete_${user.id}`;
      const shouldGoToSetup = !localStorage.getItem(setupKey);
      setLocation(shouldGoToSetup ? "/dashboard/unified-settings" : "/dashboard");
    }
  }, [user, isLoading, setLocation]);

  // Handle Firebase redirect sign-in result (fallback when popup is blocked)
  useEffect(() => {
    (async () => {
      try {
        const result = await getRedirectResult(auth);
        if (!result) return;
        const credential = GoogleAuthProvider.credentialFromResult(result);
        const idToken = credential?.idToken;
        if (!idToken) return;

        const response = await fetch('/api/auth/google', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ idToken }),
        });

        if (!response.ok) return;
        console.log('✅ Google redirect login successful, redirecting to dashboard...');
        toast({ title: "התחברת עם Google", description: "ברוך השב" });
        setTimeout(() => {
          console.log('🔄 Executing redirect from Google redirect result...');
          setLocation('/dashboard');
        }, 500);
      } catch {}
    })();
  }, [setLocation, toast]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  useEffect(() => {
    if (loginError) {
      toast({
        title: "שגיאה בהתחברות",
        description: (loginError as any)?.message || "אימייל או סיסמה שגויים",
        variant: "destructive",
      });
    }
  }, [loginError, toast]);

  useEffect(() => {
    if (googleLoginError) {
      toast({
        title: "שגיאה בהתחברות עם Google",
        description: (googleLoginError as any)?.message || "נסה שוב",
        variant: "destructive",
      });
    }
  }, [googleLoginError, toast]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login({
      email: formData.email,
      password: formData.password,
      rememberMe: formData.rememberMe,
    }, {
      onSuccess: (result) => {
        if (result?.user) {
          toast({
            title: "התחברות הצליחה",
            description: "ברוכים הבאים למערכת",
          });
        }
      }
    });
  };

  const handleGoogleLogin = () => {
    console.log('🔄 Starting Google login via useAuth hook...');
    setIsGoogleLogin(true);
    loginWithGoogle();
  };

  // Handle successful Google login
  useEffect(() => {
    if (user && isGoogleLogin && !isGoogleLoginLoading) {
      console.log('✅ User state updated after Google login, redirecting to dashboard...');
      toast({ title: "התחברת עם Google", description: "ברוך השב" });
      setTimeout(() => {
        console.log('🔄 Executing redirect post Google login...');
        const setupKey = `setup_complete_${user.id}`;
        const shouldGoToSetup = !localStorage.getItem(setupKey);
        setLocation(shouldGoToSetup ? '/dashboard/unified-settings' : '/dashboard');
        setIsGoogleLogin(false); // Reset flag
      }, 500);
    }
  }, [user, isGoogleLogin, isGoogleLoginLoading, setLocation, toast]);

  // Handle Google login errors
  useEffect(() => {
    if (googleLoginError) {
      console.log('❌ Google login error:', googleLoginError);
      setIsGoogleLogin(false); // Reset flag on error
    }
  }, [googleLoginError]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-bl from-blue-50 to-white p-4" dir="rtl">
      <Card className="w-full max-w-md shadow-2xl" data-testid="login-card">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-gray-900 font-rubik" data-testid="login-title">
            כניסה למערכת
          </CardTitle>
          <CardDescription data-testid="login-description">
            הכנסו את פרטי החשבון שלכם כדי להתחבר
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" data-testid="label-email">אימייל</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="הכנס את האימייל שלך"
                value={formData.email}
                onChange={handleInputChange}
                required
                className="text-right"
                data-testid="input-email"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password" data-testid="label-password">סיסמה</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="הכנס את הסיסמה שלך"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                  className="text-right pl-10"
                  data-testid="input-password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute left-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  data-testid="toggle-password-visibility"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </Button>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-reverse space-x-2">
                <Checkbox
                  id="rememberMe"
                  name="rememberMe"
                  checked={formData.rememberMe}
                  onCheckedChange={(checked) => 
                    setFormData(prev => ({ ...prev, rememberMe: checked as boolean }))
                  }
                  data-testid="checkbox-remember-me"
                />
                <Label htmlFor="rememberMe" className="text-sm text-gray-600">
                  זכור אותי
                </Label>
              </div>
              <Link href="/forgot-password">
                <Button variant="link" className="text-sm text-primary hover:text-primary/80 p-0" data-testid="link-forgot-password">
                  שכחת סיסמה?
                </Button>
              </Link>
            </div>
            
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoginLoading || isGoogleLoginLoading}
              data-testid="button-submit"
            >
              {isLoginLoading ? "מתחבר..." : "כניסה"}
            </Button>
            
            {loginError && (
              <div className="text-sm text-red-600 text-center" data-testid="login-error">
                שגיאה בהתחברות. אנא נסה שוב.
              </div>
            )}

            {googleLoginError && (
              <div className="text-sm text-red-600 text-center" data-testid="google-login-error">
                שגיאה בהתחברות עם Google. אנא נסה שוב.
              </div>
            )}
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-muted-foreground">או</span>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              className="w-full mt-2"
              onClick={handleGoogleLogin}
              disabled={isGoogleLoginLoading}
            >
              <FcGoogle className="mr-2 h-4 w-4" />
              התחבר עם Google
            </Button>

          </form>
          
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              אין לך חשבון?{" "}
              <Link href="/signup">
                <Button variant="link" className="text-primary hover:text-primary/80 font-medium p-0" data-testid="link-signup">
                  הרשם כאן
                </Button>
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}