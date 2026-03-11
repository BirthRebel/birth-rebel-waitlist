import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useAdminConversations = () => {
  return useQuery({
    queryKey: ["admin-conversations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conversations")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw error;

      const conversationsWithDetails = await Promise.all(
        (data || []).map(async (conv) => {
          let caregiverName = "";
          if (conv.caregiver_id) {
            const { data: cgData } =
              await supabase.functions.invoke("get-all-caregivers");
            const caregiver = cgData?.caregivers?.find(
              (c: any) => c.id === conv.caregiver_id,
            );
            caregiverName = caregiver
              ? `${caregiver.first_name || ""} ${caregiver.last_name || ""}`.trim()
              : "";
          }

          const { data: lastMsg } = await supabase
            .from("messages")
            .select("content")
            .eq("conversation_id", conv.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          return {
            ...conv,
            caregiver_name: caregiverName,
            last_message: lastMsg?.content,
          };
        }),
      );

      return conversationsWithDetails;
    },
    staleTime: 60 * 1000,
  });
};

export const useConversationMessages = (convId: string | null) => {
  return useQuery({
    queryKey: ["conversation-messages", convId],
    queryFn: async () => {
      if (!convId) return [];
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", convId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!convId,
    staleTime: 30 * 1000,
  });
};

export const useSendMessage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      conversationId,
      content,
      caregiverId,
    }: {
      conversationId: string;
      content: string;
      caregiverId: string | null;
    }) => {
      const { error } = await supabase.from("messages").insert({
        conversation_id: conversationId,
        content,
        sender_type: "admin",
      });
      if (error) throw error;

      await supabase
        .from("conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", conversationId);

      if (caregiverId) {
        supabase.functions
          .invoke("send-message-notification", {
            body: {
              conversationId,
              messageContent: content,
              senderType: "admin",
            },
          })
          .catch((err) => console.error("Failed to send notification:", err));
      }
    },
    onSuccess: (_, { conversationId }) => {
      queryClient.invalidateQueries({
        queryKey: ["conversation-messages", conversationId],
      });
      queryClient.invalidateQueries({ queryKey: ["admin-conversations"] });
    },
  });
};

export const useAdminMatches = () => {
  return useQuery({
    queryKey: ["admin-matches"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("matches")
        .select(
          `*, caregiver:caregivers(id, first_name, last_name, email, phone, city_town)`,
        )
        .order("created_at", { ascending: false });
      if (error) throw error;

      const matchesWithParents = await Promise.all(
        (data || []).map(async (match) => {
          const { data: parentRequest } = await supabase
            .from("parent_requests")
            .select("*")
            .eq("email", match.parent_email)
            .maybeSingle();
          return { ...match, parent_request: parentRequest };
        }),
      );

      return matchesWithParents;
    },
    staleTime: 2 * 60 * 1000,
  });
};
