import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useCaregiverProfile = (userId: string | undefined) => {
  return useQuery({
    queryKey: ["caregiver-profile", userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from("caregivers")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
    staleTime: 10 * 60 * 1000,
  });
};

export const useIsCaregiverCheck = (userId: string | undefined) => {
  return useQuery({
    queryKey: ["is-caregiver", userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from("caregivers")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
    staleTime: 10 * 60 * 1000,
  });
};

export const useUpdateCaregiverProfile = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      updateData,
    }: {
      id: string;
      updateData: Record<string, unknown>;
    }) => {
      const { error } = await supabase
        .from("caregivers")
        .update(updateData)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["caregiver-profile"] });
    },
  });
};

export const useUploadCaregiverPhoto = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      file,
      caregiverId,
    }: {
      file: File;
      caregiverId: string;
    }) => {
      const fileExt = file.name.split(".").pop();
      const filePath = `${caregiverId}/profile.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("caregiver-photos")
        .upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("caregiver-photos").getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from("caregivers")
        .update({ profile_photo_url: publicUrl })
        .eq("id", caregiverId);
      if (updateError) throw updateError;

      return publicUrl;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["caregiver-profile"] });
    },
  });
};
