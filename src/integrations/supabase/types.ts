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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      buzzer_queue: {
        Row: {
          created_at: string
          id: string
          judged_at: string | null
          player_id: string
          session_id: string
          status: string
          tile_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          judged_at?: string | null
          player_id: string
          session_id: string
          status?: string
          tile_id: string
        }
        Update: {
          created_at?: string
          id?: string
          judged_at?: string | null
          player_id?: string
          session_id?: string
          status?: string
          tile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "buzzer_queue_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buzzer_queue_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buzzer_queue_tile_id_fkey"
            columns: ["tile_id"]
            isOneToOne: false
            referencedRelation: "tiles"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          game_id: string
          id: string
          position: number
          title: string
        }
        Insert: {
          created_at?: string
          game_id: string
          id?: string
          position?: number
          title?: string
        }
        Update: {
          created_at?: string
          game_id?: string
          id?: string
          position?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      final_answers: {
        Row: {
          answer: string
          id: string
          judged: boolean | null
          session_id: string
          submitted_at: string
          team: string
          wager: number
        }
        Insert: {
          answer?: string
          id?: string
          judged?: boolean | null
          session_id: string
          submitted_at?: string
          team: string
          wager?: number
        }
        Update: {
          answer?: string
          id?: string
          judged?: boolean | null
          session_id?: string
          submitted_at?: string
          team?: string
          wager?: number
        }
        Relationships: [
          {
            foreignKeyName: "final_answers_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      games: {
        Row: {
          created_at: string
          host_id: string
          id: string
          join_code: string
          theme: Json
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          host_id: string
          id?: string
          join_code: string
          theme?: Json
          title?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          host_id?: string
          id?: string
          join_code?: string
          theme?: Json
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "games_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          avatar: string
          created_at: string
          id: string
          locked_out: boolean
          name: string
          session_id: string
          team: string
        }
        Insert: {
          avatar?: string
          created_at?: string
          id?: string
          locked_out?: boolean
          name: string
          session_id: string
          team?: string
        }
        Update: {
          avatar?: string
          created_at?: string
          id?: string
          locked_out?: boolean
          name?: string
          session_id?: string
          team?: string
        }
        Relationships: [
          {
            foreignKeyName: "players_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          id: string
          preferences: Json
          updated_at: string
          username: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          id: string
          preferences?: Json
          updated_at?: string
          username: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          preferences?: Json
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      sessions: {
        Row: {
          active_player_id: string | null
          created_at: string
          current_tile_id: string | null
          daily_double_tile_ids: string[]
          dd_wager: number | null
          final_answer: string | null
          final_question: string | null
          game_id: string
          host_id: string
          id: string
          phase: string
          score_alpha: number
          score_bravo: number
          status: string
          timer_ends_at: string | null
          updated_at: string
          used_tile_ids: string[]
        }
        Insert: {
          active_player_id?: string | null
          created_at?: string
          current_tile_id?: string | null
          daily_double_tile_ids?: string[]
          dd_wager?: number | null
          final_answer?: string | null
          final_question?: string | null
          game_id: string
          host_id: string
          id?: string
          phase?: string
          score_alpha?: number
          score_bravo?: number
          status?: string
          timer_ends_at?: string | null
          updated_at?: string
          used_tile_ids?: string[]
        }
        Update: {
          active_player_id?: string | null
          created_at?: string
          current_tile_id?: string | null
          daily_double_tile_ids?: string[]
          dd_wager?: number | null
          final_answer?: string | null
          final_question?: string | null
          game_id?: string
          host_id?: string
          id?: string
          phase?: string
          score_alpha?: number
          score_bravo?: number
          status?: string
          timer_ends_at?: string | null
          updated_at?: string
          used_tile_ids?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "sessions_current_tile_id_fkey"
            columns: ["current_tile_id"]
            isOneToOne: false
            referencedRelation: "tiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tiles: {
        Row: {
          answer: string
          audio_url: string | null
          category_id: string
          created_at: string
          hint: string | null
          id: string
          image_url: string | null
          points: number
          question: string
          row_index: number
        }
        Insert: {
          answer?: string
          audio_url?: string | null
          category_id: string
          created_at?: string
          hint?: string | null
          id?: string
          image_url?: string | null
          points?: number
          question?: string
          row_index?: number
        }
        Update: {
          answer?: string
          audio_url?: string | null
          category_id?: string
          created_at?: string
          hint?: string | null
          id?: string
          image_url?: string | null
          points?: number
          question?: string
          row_index?: number
        }
        Relationships: [
          {
            foreignKeyName: "tiles_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_public_tile_points: {
        Args: { p_join_code: string }
        Returns: {
          category_id: string
          id: string
          points: number
          row_index: number
        }[]
      }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
