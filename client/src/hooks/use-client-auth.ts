import { useQuery } from "@tanstack/react-query";

interface ClientInfo {
  id: string;
  name: string;
  email: string;
  phone: string;
  industry: string;
  role: 'client';
}

interface UseClientAuthResult {
  client: ClientInfo | null;
  isLoading: boolean;
  isError: boolean;
}

export function useClientAuth(): UseClientAuthResult {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['/api/client/me'],
    queryFn: async (): Promise<{ client: ClientInfo }> => {
      const response = await fetch('/api/client/me');
      
      if (!response.ok) {
        throw new Error('Not authenticated');
      }
      
      return response.json();
    },
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  return {
    client: data?.client || null,
    isLoading,
    isError,
  };
}