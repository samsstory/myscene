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
      profiles: {
        Row: {
          created_at: string
          home_city: string | null
          home_latitude: number | null
          home_longitude: number | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          home_city?: string | null
          home_latitude?: number | null
          home_longitude?: number | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          home_city?: string | null
          home_latitude?: number | null
          home_longitude?: number | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      show_artists: {
        Row: {
          artist_name: string
          created_at: string
          id: string
          is_headliner: boolean
          show_id: string
        }
        Insert: {
          artist_name: string
          created_at?: string
          id?: string
          is_headliner?: boolean
          show_id: string
        }
        Update: {
          artist_name?: string
          created_at?: string
          id?: string
          is_headliner?: boolean
          show_id?: string
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
      shows: {
        Row: {
          artist_performance: number | null
          created_at: string
          crowd: number | null
          date_precision: string
          id: string
          lighting: number | null
          notes: string | null
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
