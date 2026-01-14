export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      admin_notifications: {
        Row: {
          created_at: string
          id: string
          match_id: string | null
          message: string
          parent_email: string | null
          read_at: string | null
          title: string
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          match_id?: string | null
          message: string
          parent_email?: string | null
          read_at?: string | null
          title: string
          type: string
        }
        Update: {
          created_at?: string
          id?: string
          match_id?: string | null
          message?: string
          parent_email?: string | null
          read_at?: string | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_notifications_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      caregivers: {
        Row: {
          active: boolean
          additional_certificate_1_expires: string | null
          additional_certificate_1_url: string | null
          additional_certificate_2_expires: string | null
          additional_certificate_2_url: string | null
          address: string | null
          address_line_2: string | null
          avail_weekdays_afternoons: boolean | null
          avail_weekdays_evenings: boolean | null
          avail_weekdays_mornings: boolean | null
          avail_weekdays_overnight: boolean | null
          avail_weekends_afternoons: boolean | null
          avail_weekends_evenings: boolean | null
          avail_weekends_mornings: boolean | null
          avail_weekends_overnight: boolean | null
          bio: string | null
          births_supported: string | null
          care_antenatal_planning: boolean | null
          care_birth_support: boolean | null
          care_cultural_spiritual: boolean | null
          care_feeding_lactation: boolean | null
          care_fertility_conception: boolean | null
          care_full_spectrum: boolean | null
          care_grief_loss: boolean | null
          care_postnatal_support: boolean | null
          care_style: string | null
          certifications_training: string | null
          city_town: string | null
          country: string | null
          created_at: string
          dbs_certificate_expires: string | null
          dbs_certificate_url: string | null
          doula_package_rate: number | null
          email: string
          first_name: string | null
          gdpr_consent: boolean | null
          hourly_rate: number | null
          id: string
          insurance_certificate_expires: string | null
          insurance_certificate_url: string | null
          intake_completed_at: string | null
          is_bereavement_councillor: boolean | null
          is_doula: boolean | null
          is_hypnobirthing_coach: boolean | null
          is_lactation_consultant: boolean | null
          is_private_midwife: boolean | null
          is_sleep_consultant: boolean | null
          language_other: string | null
          last_name: string | null
          offers_active_labour_support: boolean | null
          offers_birth_planning: boolean | null
          offers_fertility_conception: boolean | null
          offers_hypnobirthing: boolean | null
          offers_lactation_support: boolean | null
          offers_loss_bereavement_care: boolean | null
          offers_newborn_sleep_support: boolean | null
          offers_nutrition_support: boolean | null
          offers_postnatal_support: boolean | null
          phone: string | null
          profile_completed_at: string | null
          profile_photo_url: string | null
          pronouns: string | null
          services_other: string | null
          speaks_arabic: boolean | null
          speaks_bengali: boolean | null
          speaks_english: boolean | null
          speaks_french: boolean | null
          speaks_german: boolean | null
          speaks_gujrati: boolean | null
          speaks_italian: boolean | null
          speaks_mandarin: boolean | null
          speaks_portuguese: boolean | null
          speaks_punjabi: boolean | null
          speaks_spanish: boolean | null
          speaks_urdu: boolean | null
          state_region_province: string | null
          support_type_other: string | null
          supports_bereavement: boolean | null
          supports_caesareans: boolean | null
          supports_complex_health: boolean | null
          supports_disabled_parents: boolean | null
          supports_families_of_colour: boolean | null
          supports_home_births: boolean | null
          supports_immigrant_refugee: boolean | null
          supports_multiples: boolean | null
          supports_neurodivergent: boolean | null
          supports_queer_trans: boolean | null
          supports_rebozo: boolean | null
          supports_solo_parents: boolean | null
          supports_trauma_survivors: boolean | null
          supports_water_births: boolean | null
          training_certificate_expires: string | null
          training_certificate_url: string | null
          typeform_response_id: string | null
          unavailable_school_holidays: boolean | null
          user_id: string | null
          years_practicing: string | null
          zip_post_code: string | null
        }
        Insert: {
          active?: boolean
          additional_certificate_1_expires?: string | null
          additional_certificate_1_url?: string | null
          additional_certificate_2_expires?: string | null
          additional_certificate_2_url?: string | null
          address?: string | null
          address_line_2?: string | null
          avail_weekdays_afternoons?: boolean | null
          avail_weekdays_evenings?: boolean | null
          avail_weekdays_mornings?: boolean | null
          avail_weekdays_overnight?: boolean | null
          avail_weekends_afternoons?: boolean | null
          avail_weekends_evenings?: boolean | null
          avail_weekends_mornings?: boolean | null
          avail_weekends_overnight?: boolean | null
          bio?: string | null
          births_supported?: string | null
          care_antenatal_planning?: boolean | null
          care_birth_support?: boolean | null
          care_cultural_spiritual?: boolean | null
          care_feeding_lactation?: boolean | null
          care_fertility_conception?: boolean | null
          care_full_spectrum?: boolean | null
          care_grief_loss?: boolean | null
          care_postnatal_support?: boolean | null
          care_style?: string | null
          certifications_training?: string | null
          city_town?: string | null
          country?: string | null
          created_at?: string
          dbs_certificate_expires?: string | null
          dbs_certificate_url?: string | null
          doula_package_rate?: number | null
          email: string
          first_name?: string | null
          gdpr_consent?: boolean | null
          hourly_rate?: number | null
          id?: string
          insurance_certificate_expires?: string | null
          insurance_certificate_url?: string | null
          intake_completed_at?: string | null
          is_bereavement_councillor?: boolean | null
          is_doula?: boolean | null
          is_hypnobirthing_coach?: boolean | null
          is_lactation_consultant?: boolean | null
          is_private_midwife?: boolean | null
          is_sleep_consultant?: boolean | null
          language_other?: string | null
          last_name?: string | null
          offers_active_labour_support?: boolean | null
          offers_birth_planning?: boolean | null
          offers_fertility_conception?: boolean | null
          offers_hypnobirthing?: boolean | null
          offers_lactation_support?: boolean | null
          offers_loss_bereavement_care?: boolean | null
          offers_newborn_sleep_support?: boolean | null
          offers_nutrition_support?: boolean | null
          offers_postnatal_support?: boolean | null
          phone?: string | null
          profile_completed_at?: string | null
          profile_photo_url?: string | null
          pronouns?: string | null
          services_other?: string | null
          speaks_arabic?: boolean | null
          speaks_bengali?: boolean | null
          speaks_english?: boolean | null
          speaks_french?: boolean | null
          speaks_german?: boolean | null
          speaks_gujrati?: boolean | null
          speaks_italian?: boolean | null
          speaks_mandarin?: boolean | null
          speaks_portuguese?: boolean | null
          speaks_punjabi?: boolean | null
          speaks_spanish?: boolean | null
          speaks_urdu?: boolean | null
          state_region_province?: string | null
          support_type_other?: string | null
          supports_bereavement?: boolean | null
          supports_caesareans?: boolean | null
          supports_complex_health?: boolean | null
          supports_disabled_parents?: boolean | null
          supports_families_of_colour?: boolean | null
          supports_home_births?: boolean | null
          supports_immigrant_refugee?: boolean | null
          supports_multiples?: boolean | null
          supports_neurodivergent?: boolean | null
          supports_queer_trans?: boolean | null
          supports_rebozo?: boolean | null
          supports_solo_parents?: boolean | null
          supports_trauma_survivors?: boolean | null
          supports_water_births?: boolean | null
          training_certificate_expires?: string | null
          training_certificate_url?: string | null
          typeform_response_id?: string | null
          unavailable_school_holidays?: boolean | null
          user_id?: string | null
          years_practicing?: string | null
          zip_post_code?: string | null
        }
        Update: {
          active?: boolean
          additional_certificate_1_expires?: string | null
          additional_certificate_1_url?: string | null
          additional_certificate_2_expires?: string | null
          additional_certificate_2_url?: string | null
          address?: string | null
          address_line_2?: string | null
          avail_weekdays_afternoons?: boolean | null
          avail_weekdays_evenings?: boolean | null
          avail_weekdays_mornings?: boolean | null
          avail_weekdays_overnight?: boolean | null
          avail_weekends_afternoons?: boolean | null
          avail_weekends_evenings?: boolean | null
          avail_weekends_mornings?: boolean | null
          avail_weekends_overnight?: boolean | null
          bio?: string | null
          births_supported?: string | null
          care_antenatal_planning?: boolean | null
          care_birth_support?: boolean | null
          care_cultural_spiritual?: boolean | null
          care_feeding_lactation?: boolean | null
          care_fertility_conception?: boolean | null
          care_full_spectrum?: boolean | null
          care_grief_loss?: boolean | null
          care_postnatal_support?: boolean | null
          care_style?: string | null
          certifications_training?: string | null
          city_town?: string | null
          country?: string | null
          created_at?: string
          dbs_certificate_expires?: string | null
          dbs_certificate_url?: string | null
          doula_package_rate?: number | null
          email?: string
          first_name?: string | null
          gdpr_consent?: boolean | null
          hourly_rate?: number | null
          id?: string
          insurance_certificate_expires?: string | null
          insurance_certificate_url?: string | null
          intake_completed_at?: string | null
          is_bereavement_councillor?: boolean | null
          is_doula?: boolean | null
          is_hypnobirthing_coach?: boolean | null
          is_lactation_consultant?: boolean | null
          is_private_midwife?: boolean | null
          is_sleep_consultant?: boolean | null
          language_other?: string | null
          last_name?: string | null
          offers_active_labour_support?: boolean | null
          offers_birth_planning?: boolean | null
          offers_fertility_conception?: boolean | null
          offers_hypnobirthing?: boolean | null
          offers_lactation_support?: boolean | null
          offers_loss_bereavement_care?: boolean | null
          offers_newborn_sleep_support?: boolean | null
          offers_nutrition_support?: boolean | null
          offers_postnatal_support?: boolean | null
          phone?: string | null
          profile_completed_at?: string | null
          profile_photo_url?: string | null
          pronouns?: string | null
          services_other?: string | null
          speaks_arabic?: boolean | null
          speaks_bengali?: boolean | null
          speaks_english?: boolean | null
          speaks_french?: boolean | null
          speaks_german?: boolean | null
          speaks_gujrati?: boolean | null
          speaks_italian?: boolean | null
          speaks_mandarin?: boolean | null
          speaks_portuguese?: boolean | null
          speaks_punjabi?: boolean | null
          speaks_spanish?: boolean | null
          speaks_urdu?: boolean | null
          state_region_province?: string | null
          support_type_other?: string | null
          supports_bereavement?: boolean | null
          supports_caesareans?: boolean | null
          supports_complex_health?: boolean | null
          supports_disabled_parents?: boolean | null
          supports_families_of_colour?: boolean | null
          supports_home_births?: boolean | null
          supports_immigrant_refugee?: boolean | null
          supports_multiples?: boolean | null
          supports_neurodivergent?: boolean | null
          supports_queer_trans?: boolean | null
          supports_rebozo?: boolean | null
          supports_solo_parents?: boolean | null
          supports_trauma_survivors?: boolean | null
          supports_water_births?: boolean | null
          training_certificate_expires?: string | null
          training_certificate_url?: string | null
          typeform_response_id?: string | null
          unavailable_school_holidays?: boolean | null
          user_id?: string | null
          years_practicing?: string | null
          zip_post_code?: string | null
        }
        Relationships: []
      }
      commissions: {
        Row: {
          booking_value: number
          caregiver_id: string
          commission_amount: number
          commission_paid: boolean
          commission_rate: number
          created_at: string
          id: string
          match_id: string
          paid_at: string | null
        }
        Insert: {
          booking_value: number
          caregiver_id: string
          commission_amount: number
          commission_paid?: boolean
          commission_rate?: number
          created_at?: string
          id?: string
          match_id: string
          paid_at?: string | null
        }
        Update: {
          booking_value?: number
          caregiver_id?: string
          commission_amount?: number
          commission_paid?: boolean
          commission_rate?: number
          created_at?: string
          id?: string
          match_id?: string
          paid_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commissions_caregiver_id_fkey"
            columns: ["caregiver_id"]
            isOneToOne: false
            referencedRelation: "caregivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          caregiver_id: string | null
          created_at: string
          id: string
          parent_email: string
          parent_request_id: string | null
          status: string
          subject: string | null
          updated_at: string
        }
        Insert: {
          caregiver_id?: string | null
          created_at?: string
          id?: string
          parent_email: string
          parent_request_id?: string | null
          status?: string
          subject?: string | null
          updated_at?: string
        }
        Update: {
          caregiver_id?: string | null
          created_at?: string
          id?: string
          parent_email?: string
          parent_request_id?: string | null
          status?: string
          subject?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_caregiver_id_fkey"
            columns: ["caregiver_id"]
            isOneToOne: false
            referencedRelation: "caregivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_parent_request_id_fkey"
            columns: ["parent_request_id"]
            isOneToOne: false
            referencedRelation: "parent_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          caregiver_id: string
          caregiver_synopsis: string | null
          created_at: string
          decline_reason: string | null
          id: string
          meeting_link: string | null
          parent_email: string
          parent_first_name: string
          reviewed_at: string | null
          status: string
          support_type: string
        }
        Insert: {
          caregiver_id: string
          caregiver_synopsis?: string | null
          created_at?: string
          decline_reason?: string | null
          id?: string
          meeting_link?: string | null
          parent_email: string
          parent_first_name: string
          reviewed_at?: string | null
          status?: string
          support_type: string
        }
        Update: {
          caregiver_id?: string
          caregiver_synopsis?: string | null
          created_at?: string
          decline_reason?: string | null
          id?: string
          meeting_link?: string | null
          parent_email?: string
          parent_first_name?: string
          reviewed_at?: string | null
          status?: string
          support_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "matches_caregiver_id_fkey"
            columns: ["caregiver_id"]
            isOneToOne: false
            referencedRelation: "caregivers"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          read_at: string | null
          sender_id: string | null
          sender_type: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id?: string | null
          sender_type: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id?: string | null
          sender_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      parent_requests: {
        Row: {
          budget: string | null
          caregiver_preferences: string | null
          created_at: string
          due_date: string | null
          email: string | null
          family_context: string | null
          first_name: string
          general_availability: string | null
          id: string
          language: string | null
          last_name: string | null
          location: string | null
          matched_caregiver_id: string | null
          phone: string | null
          preferred_communication: string | null
          shared_identity_requests: string | null
          special_requirements: string | null
          specific_concerns: string | null
          stage_of_journey: string | null
          status: string
          support_type: string | null
          updated_at: string
        }
        Insert: {
          budget?: string | null
          caregiver_preferences?: string | null
          created_at?: string
          due_date?: string | null
          email?: string | null
          family_context?: string | null
          first_name: string
          general_availability?: string | null
          id?: string
          language?: string | null
          last_name?: string | null
          location?: string | null
          matched_caregiver_id?: string | null
          phone?: string | null
          preferred_communication?: string | null
          shared_identity_requests?: string | null
          special_requirements?: string | null
          specific_concerns?: string | null
          stage_of_journey?: string | null
          status?: string
          support_type?: string | null
          updated_at?: string
        }
        Update: {
          budget?: string | null
          caregiver_preferences?: string | null
          created_at?: string
          due_date?: string | null
          email?: string | null
          family_context?: string | null
          first_name?: string
          general_availability?: string | null
          id?: string
          language?: string | null
          last_name?: string | null
          location?: string | null
          matched_caregiver_id?: string | null
          phone?: string | null
          preferred_communication?: string | null
          shared_identity_requests?: string | null
          special_requirements?: string | null
          specific_concerns?: string | null
          stage_of_journey?: string | null
          status?: string
          support_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "parent_requests_matched_caregiver_id_fkey"
            columns: ["matched_caregiver_id"]
            isOneToOne: false
            referencedRelation: "caregivers"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      waitlist_signups: {
        Row: {
          created_at: string
          email: string
          first_name: string | null
          id: string
          last_name: string | null
          referrer: string | null
          user_agent: string | null
          user_type: Database["public"]["Enums"]["waitlist_user_type"]
        }
        Insert: {
          created_at?: string
          email: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          referrer?: string | null
          user_agent?: string | null
          user_type: Database["public"]["Enums"]["waitlist_user_type"]
        }
        Update: {
          created_at?: string
          email?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          referrer?: string | null
          user_agent?: string | null
          user_type?: Database["public"]["Enums"]["waitlist_user_type"]
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_current_caregiver_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      match_status: "matched" | "booked" | "closed"
      support_type: "doula" | "lactation" | "sleep" | "hypnobirthing"
      waitlist_user_type: "caregiver" | "mother" | "interested"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
      match_status: ["matched", "booked", "closed"],
      support_type: ["doula", "lactation", "sleep", "hypnobirthing"],
      waitlist_user_type: ["caregiver", "mother", "interested"],
    },
  },
} as const
