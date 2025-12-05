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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      caregivers: {
        Row: {
          active: boolean
          address_line_1: string | null
          address_line_2: string | null
          births_supported: number | null
          care_style: string | null
          care_types_supported: string[] | null
          city: string | null
          country: string | null
          created_at: string
          document_url: string | null
          email: string
          first_name: string | null
          gdpr_consent: boolean | null
          id: string
          intake_completed_at: string | null
          language_spoken: string[] | null
          last_name: string | null
          name: string
          phone: string | null
          post_code: string | null
          pronouns: string | null
          services_offered: string[] | null
          specific_support_experience: string | null
          state: string | null
          training_certifications: string[] | null
          type_of_support: Database["public"]["Enums"]["support_type"]
          typeform_response_id: string | null
          typical_availability: string | null
          user_id: string | null
          years_practicing: number | null
        }
        Insert: {
          active?: boolean
          address_line_1?: string | null
          address_line_2?: string | null
          births_supported?: number | null
          care_style?: string | null
          care_types_supported?: string[] | null
          city?: string | null
          country?: string | null
          created_at?: string
          document_url?: string | null
          email: string
          first_name?: string | null
          gdpr_consent?: boolean | null
          id?: string
          intake_completed_at?: string | null
          language_spoken?: string[] | null
          last_name?: string | null
          name: string
          phone?: string | null
          post_code?: string | null
          pronouns?: string | null
          services_offered?: string[] | null
          specific_support_experience?: string | null
          state?: string | null
          training_certifications?: string[] | null
          type_of_support: Database["public"]["Enums"]["support_type"]
          typeform_response_id?: string | null
          typical_availability?: string | null
          user_id?: string | null
          years_practicing?: number | null
        }
        Update: {
          active?: boolean
          address_line_1?: string | null
          address_line_2?: string | null
          births_supported?: number | null
          care_style?: string | null
          care_types_supported?: string[] | null
          city?: string | null
          country?: string | null
          created_at?: string
          document_url?: string | null
          email?: string
          first_name?: string | null
          gdpr_consent?: boolean | null
          id?: string
          intake_completed_at?: string | null
          language_spoken?: string[] | null
          last_name?: string | null
          name?: string
          phone?: string | null
          post_code?: string | null
          pronouns?: string | null
          services_offered?: string[] | null
          specific_support_experience?: string | null
          state?: string | null
          training_certifications?: string[] | null
          type_of_support?: Database["public"]["Enums"]["support_type"]
          typeform_response_id?: string | null
          typical_availability?: string | null
          user_id?: string | null
          years_practicing?: number | null
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
            isOneToOne: true
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          caregiver_id: string
          created_at: string
          id: string
          parent_email: string
          parent_first_name: string
          status: Database["public"]["Enums"]["match_status"]
          support_type: string
        }
        Insert: {
          caregiver_id: string
          created_at?: string
          id?: string
          parent_email: string
          parent_first_name: string
          status?: Database["public"]["Enums"]["match_status"]
          support_type: string
        }
        Update: {
          caregiver_id?: string
          created_at?: string
          id?: string
          parent_email?: string
          parent_first_name?: string
          status?: Database["public"]["Enums"]["match_status"]
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
    }
    Enums: {
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
      match_status: ["matched", "booked", "closed"],
      support_type: ["doula", "lactation", "sleep", "hypnobirthing"],
      waitlist_user_type: ["caregiver", "mother", "interested"],
    },
  },
} as const
