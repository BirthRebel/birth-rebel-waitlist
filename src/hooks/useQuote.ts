import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useQuote = (quoteId: string | undefined) => {
  return useQuery({
    queryKey: ["quote", quoteId],
    queryFn: async () => {
      if (!quoteId) return null;
      const response = await fetch(
        `https://zjbzjtljoxwreyhlrjbq.supabase.co/functions/v1/get-quote?quote_id=${quoteId}`,
        {
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
      const result = await response.json();
      if (result.error) throw new Error(result.error);
      return result.quote;
    },
    enabled: !!quoteId,
    staleTime: 5 * 60 * 1000,
    retry: 0,
  });
};

export const usePayQuote = () => {
  return useMutation({
    mutationFn: async (quoteId: string) => {
      const { data, error } = await supabase.functions.invoke("pay-quote", {
        body: { quote_id: quoteId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data?.url) {
        window.location.href = data.url;
      }
    },
  });
};
