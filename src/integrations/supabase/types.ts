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
      artist_associations: {
        Row: {
          artist1_name: string
          artist2_name: string
          co_occurrence_count: number
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          artist1_name: string
          artist2_name: string
          co_occurrence_count?: number
          created_at?: string
          id?: string
          updated_at?: string
        }
        Update: {
          artist1_name?: string
          artist2_name?: string
          co_occurrence_count?: number
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      bug_reports: {
        Row: {
          created_at: string
          description: string
          device_info: Json | null
          error_context: Json | null
          id: string
          page_url: string | null
          status: string
          type: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          description: string
          device_info?: Json | null
          error_context?: Json | null
          id?: string
          page_url?: string | null
          status?: string
          type?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string
          device_info?: Json | null
          error_context?: Json | null
          id?: string
          page_url?: string | null
          status?: string
          type?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          home_city: string | null
          home_latitude: number | null
          home_longitude: number | null
          id: string
          onboarding_completed_at: string | null
          onboarding_step: string | null
          pwa_installed: boolean | null
          referral_code: string | null
          updated_at: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          home_city?: string | null
          home_latitude?: number | null
          home_longitude?: number | null
          id: string
          onboarding_completed_at?: string | null
          onboarding_step?: string | null
          pwa_installed?: boolean | null
          referral_code?: string | null
          updated_at?: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          home_city?: string | null
          home_latitude?: number | null
          home_longitude?: number | null
          id?: string
          onboarding_completed_at?: string | null
          onboarding_step?: string | null
          pwa_installed?: boolean | null
          referral_code?: string | null
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      referrals: {
        Row: {
          converted_at: string | null
          created_at: string
          id: string
          referral_code: string
          referred_id: string
          referrer_id: string | null
          status: string
        }
        Insert: {
          converted_at?: string | null
          created_at?: string
          id?: string
          referral_code: string
          referred_id: string
          referrer_id?: string | null
          status?: string
        }
        Update: {
          converted_at?: string | null
          created_at?: string
          id?: string
          referral_code?: string
          referred_id?: string
          referrer_id?: string | null
          status?: string
        }
        Relationships: []
      }
      show_artists: {
        Row: {
          artist_image_url: string | null
          artist_name: string
          created_at: string
          id: string
          is_headliner: boolean
          show_id: string
          spotify_artist_id: string | null
        }
        Insert: {
          artist_image_url?: string | null
          artist_name: string
          created_at?: string
          id?: string
          is_headliner?: boolean
          show_id: string
          spotify_artist_id?: string | null
        }
        Update: {
          artist_image_url?: string | null
          artist_name?: string
          created_at?: string
          id?: string
          is_headliner?: boolean
          show_id?: string
          spotify_artist_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "show_artists_show_id_fkey"
            columns: ["show_id"]
            isOneToOne: false
            referencedRelation: "shows"
            referencedColumns: ["id"]
          },
        ]
      }
      show_comparisons: {
        Row: {
          created_at: string
          id: string
          show1_id: string
          show2_id: string
          user_id: string
          winner_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          show1_id: string
          show2_id: string
          user_id: string
          winner_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          show1_id?: string
          show2_id?: string
          user_id?: string
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "show_comparisons_show1_id_fkey"
            columns: ["show1_id"]
            isOneToOne: false
            referencedRelation: "shows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "show_comparisons_show2_id_fkey"
            columns: ["show2_id"]
            isOneToOne: false
            referencedRelation: "shows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "show_comparisons_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "shows"
            referencedColumns: ["id"]
          },
        ]
      }
      show_rankings: {
        Row: {
          comparisons_count: number
          created_at: string
          elo_score: number
          id: string
          show_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          comparisons_count?: number
          created_at?: string
          elo_score?: number
          id?: string
          show_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          comparisons_count?: number
          created_at?: string
          elo_score?: number
          id?: string
          show_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "show_rankings_show_id_fkey"
            columns: ["show_id"]
            isOneToOne: false
            referencedRelation: "shows"
            referencedColumns: ["id"]
          },
        ]
      }
      show_tags: {
        Row: {
          category: string
          created_at: string
          id: string
          show_id: string
          tag: string
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          show_id: string
          tag: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          show_id?: string
          tag?: string
        }
        Relationships: [
          {
            foreignKeyName: "show_tags_show_id_fkey"
            columns: ["show_id"]
            isOneToOne: false
            referencedRelation: "shows"
            referencedColumns: ["id"]
          },
        ]
      }
      shows: {
        Row: {
          artist_performance: number | null
          created_at: string
          crowd: number | null
          date_precision: string
          id: string
          lighting: number | null
          notes: string | null
          photo_declined: boolean
          photo_url: string | null
          rating: number | null
          show_date: string
          sound: number | null
          updated_at: string
          user_id: string
          venue_id: string | null
          venue_location: string | null
          venue_name: string
          venue_vibe: number | null
        }
        Insert: {
          artist_performance?: number | null
          created_at?: string
          crowd?: number | null
          date_precision?: string
          id?: string
          lighting?: number | null
          notes?: string | null
          photo_declined?: boolean
          photo_url?: string | null
          rating?: number | null
          show_date: string
          sound?: number | null
          updated_at?: string
          user_id: string
          venue_id?: string | null
          venue_location?: string | null
          venue_name: string
          venue_vibe?: number | null
        }
        Update: {
          artist_performance?: number | null
          created_at?: string
          crowd?: number | null
          date_precision?: string
          id?: string
          lighting?: number | null
          notes?: string | null
          photo_declined?: boolean
          photo_url?: string | null
          rating?: number | null
          show_date?: string
          sound?: number | null
          updated_at?: string
          user_id?: string
          venue_id?: string | null
          venue_location?: string | null
          venue_name?: string
          venue_vibe?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "shows_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_venues: {
        Row: {
          created_at: string
          last_show_date: string | null
          show_count: number
          updated_at: string
          user_id: string
          venue_id: string
        }
        Insert: {
          created_at?: string
          last_show_date?: string | null
          show_count?: number
          updated_at?: string
          user_id: string
          venue_id: string
        }
        Update: {
          created_at?: string
          last_show_date?: string | null
          show_count?: number
          updated_at?: string
          user_id?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_venues_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      venue_artist_popularity: {
        Row: {
          artist_name: string
          created_at: string
          id: string
          last_show_date: string | null
          show_count: number
          updated_at: string
          venue_id: string
        }
        Insert: {
          artist_name: string
          created_at?: string
          id?: string
          last_show_date?: string | null
          show_count?: number
          updated_at?: string
          venue_id: string
        }
        Update: {
          artist_name?: string
          created_at?: string
          id?: string
          last_show_date?: string | null
          show_count?: number
          updated_at?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venue_artist_popularity_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      venues: {
        Row: {
          bandsintown_id: string | null
          city: string | null
          country: string | null
          created_at: string
          id: string
          latitude: number | null
          location: string | null
          longitude: number | null
          metadata: Json | null
          name: string
          updated_at: string
        }
        Insert: {
          bandsintown_id?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          id?: string
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          metadata?: Json | null
          name: string
          updated_at?: string
        }
        Update: {
          bandsintown_id?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          id?: string
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          metadata?: Json | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      waitlist: {
        Row: {
          country_code: string
          created_at: string
          discovery_source: string | null
          email: string | null
          id: string
          notified_at: string | null
          phone_number: string | null
          shows_per_year: string | null
          source: string
          status: string
        }
        Insert: {
          country_code?: string
          created_at?: string
          discovery_source?: string | null
          email?: string | null
          id?: string
          notified_at?: string | null
          phone_number?: string | null
          shows_per_year?: string | null
          source?: string
          status?: string
        }
        Update: {
          country_code?: string
          created_at?: string
          discovery_source?: string | null
          email?: string | null
          id?: string
          notified_at?: string | null
          phone_number?: string | null
          shows_per_year?: string | null
          source?: string
          status?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_referral_code: { Args: never; Returns: string }
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
    },
  },
} as const
