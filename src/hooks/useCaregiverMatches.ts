import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useCaregiverMatchesList = (caregiverId: string | undefined) => {
  return useQuery({
    queryKey: ["caregiver-matches", caregiverId],
    queryFn: async () => {
      if (!caregiverId) return [];
      const { data, error } = await supabase
        .from("matches")
        .select(
          "id, parent_first_name, parent_email, support_type, status, created_at, caregiver_synopsis, meeting_link",
        )
        .eq("caregiver_id", caregiverId)
        .in("status", ["matched", "booked", "approved"])
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!caregiverId,
    staleTime: 2 * 60 * 1000,
  });
};

export const useParentRequestsByEmails = (emails: string[]) => {
  return useQuery({
    queryKey: ["parent-requests-by-emails", [...emails].sort()],
    queryFn: async () => {
      if (emails.length === 0) return {};
      const { data, error } = await supabase
        .from("parent_requests")
        .select("*")
        .in("email", emails);
      if (error) throw error;
      const map: Record<string, any> = {};
      (data || []).forEach((req) => {
        map[req.email] = req;
      });
      return map;
    },
    enabled: emails.length > 0,
    staleTime: 5 * 60 * 1000,
  });
};
