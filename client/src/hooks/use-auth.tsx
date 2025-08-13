import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '@/lib/firebase';

interface User {
  id: string;
  email: string;
  fullName: string;
  role: string;
  agencyId: string | null;
  avatar?: string | null;
}

interface LoginData {
  email: string;
  password: string;
}

interface SignupData {
  email: string;
  password: string;
  fullName: string;
  agencyName: string;
  industry?: string;
}

export function useAuth() {
  const queryClient = useQueryClient();

  const { data: user, isLoading } = useQuery<User | null>({
    queryKey: ['/api/auth/me'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/auth/me', {
          credentials: 'include',
        });
        if (response.status === 401) {
          return null;
        }
        if (!response.ok) {
          throw new Error('Failed to fetch user');
        }
        const result = await response.json();
        return result.user;
      } catch (error) {
        return null;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginData & { rememberMe?: boolean }) => {
      console.log('🔐 Login mutation started with data:', { ...data, password: '***' });
      
      try {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(data),
        });
        
        console.log('📡 Login response status:', response.status);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.log('❌ Login response error text:', errorText);
          let message = 'Login failed';
          try {
            const parsed = JSON.parse(errorText);
            message = parsed.message || message;
          } catch {}
          const err = new Error(message);
          (err as any).status = response.status;
          throw err;
        }
        
        const result = await response.json();
        console.log('✅ Login response success:', result);
        return result;
      } catch (error: any) {
        console.error('❌ Login mutation error:', error);
        if (error?.status === 401) {
          throw new Error('אימייל או סיסמה שגויים');
        }
        throw new Error(error?.message || 'שגיאה בהתחברות');
      }
    },
    onSuccess: (data) => {
      console.log('🎉 Login mutation onSuccess:', data);
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
    },
    onError: (error) => {
      console.error('💥 Login mutation onError:', error);
    },
  });

  const signupMutation = useMutation({
    mutationFn: async (data: SignupData) => {
      try {
        const response = await apiRequest('/api/auth/signup', 'POST', data);
        
        // apiRequest already handles error responses, so if we get here, it's successful
        const result = await response.json();
        return result;
      } catch (error: any) {
        // Handle specific error messages from the server
        if (error.message && error.message.includes('400')) {
          throw new Error('נתונים לא תקינים או משתמש כבר קיים');
        }
        throw new Error(error.message || 'שגיאה ביצירת החשבון');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
    },
  });

  // Google login via Firebase popup → send Google OAuth ID token to server
  const googleLoginMutation = useMutation({
    mutationFn: async () => {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const idToken = credential?.idToken;

      if (!idToken) {
        throw new Error('Failed to obtain Google ID token');
      }

      const response = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ idToken }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        try {
          const parsed = JSON.parse(errorText);
          throw new Error(parsed.message || 'Google login failed');
        } catch {
          throw new Error('Google login failed');
        }
      }

      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('/api/auth/logout', 'POST');
    },
    onSuccess: () => {
      queryClient.setQueryData(['/api/auth/me'], null);
      queryClient.clear();
    },
  });

  return {
    user,
    isLoading,
    login: loginMutation.mutate,
    loginWithGoogle: googleLoginMutation.mutate,
    signup: signupMutation.mutate,
    logout: logoutMutation.mutate,
    isLoginLoading: loginMutation.isPending,
    isGoogleLoginLoading: googleLoginMutation.isPending,
    isSignupLoading: signupMutation.isPending,
    isLogoutLoading: logoutMutation.isPending,
    loginError: loginMutation.error,
    googleLoginError: googleLoginMutation.error,
    signupError: signupMutation.error,
    loginMutation,
    googleLoginMutation,
    signupMutation,
    logoutMutation,
  };
}
