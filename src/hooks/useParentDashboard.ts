import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useParentRequest = (email: string | undefined) => {
  return useQuery({
    queryKey: ["parent-request", email],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke(
        "get-parent-request",
        {
          body: { email },
        },
      );
      if (error) throw error;
      return data?.request || null;
    },
    enabled: !!email,
    staleTime: 5 * 60 * 1000,
  });
};

export const useParentMatches = (email: string | undefined) => {
  return useQuery({
    queryKey: ["parent-matches", email],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke(
        "get-parent-matches",
        {
          body: { email },
        },
      );
      if (error) throw error;
      return data?.matches || [];
    },
    enabled: !!email,
    staleTime: 2 * 60 * 1000,
  });
};
