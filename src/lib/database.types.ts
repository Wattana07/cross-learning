// Database types for Supabase
// These types should be generated from Supabase CLI: supabase gen types typescript

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole = 'learner' | 'admin'
export type ContentStatus = 'draft' | 'published' | 'hidden'
export type UnlockMode = 'sequential' | 'open'
export type MediaType = 'video_url' | 'video_upload' | 'pdf'
export type ResourceType = 'link' | 'file' | 'pdf'
export type RoomStatus = 'active' | 'maintenance'
export type BookingStatus = 'approved' | 'pending' | 'rejected' | 'cancelled'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          department: string | null
          avatar_path: string | null
          role: UserRole
          is_active: boolean
          created_at: string
          updated_at: string
          hmpm_mcode: string | null
          hmpm_member_group: string[] | null
          hmpm_pos_cur: Json | null
          hmpm_honor: Json | null
          hmpm_member_status: number | null
          hmpm_expire: string | null
          hmpm_raw: Json | null
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          department?: string | null
          avatar_path?: string | null
          role?: UserRole
          is_active?: boolean
          created_at?: string
          updated_at?: string
          hmpm_mcode?: string | null
          hmpm_member_group?: string[] | null
          hmpm_pos_cur?: Json | null
          hmpm_honor?: Json | null
          hmpm_member_status?: number | null
          hmpm_expire?: string | null
          hmpm_raw?: Json | null
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          department?: string | null
          avatar_path?: string | null
          role?: UserRole
          is_active?: boolean
          created_at?: string
          updated_at?: string
          hmpm_mcode?: string | null
          hmpm_member_group?: string[] | null
          hmpm_pos_cur?: Json | null
          hmpm_honor?: Json | null
          hmpm_member_status?: number | null
          hmpm_expire?: string | null
          hmpm_raw?: Json | null
        }
      }
      categories: {
        Row: {
          id: string
          name: string
          description: string | null
          thumbnail_path: string | null
          status: ContentStatus
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          thumbnail_path?: string | null
          status?: ContentStatus
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          thumbnail_path?: string | null
          status?: ContentStatus
          created_at?: string
          updated_at?: string
        }
      }
      subjects: {
        Row: {
          id: string
          category_id: string
          title: string
          description: string | null
          cover_path: string | null
          level: string | null
          unlock_mode: UnlockMode
          status: ContentStatus
          order_no: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          category_id: string
          title: string
          description?: string | null
          cover_path?: string | null
          level?: string | null
          unlock_mode?: UnlockMode
          status?: ContentStatus
          order_no?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          category_id?: string
          title?: string
          description?: string | null
          cover_path?: string | null
          level?: string | null
          unlock_mode?: UnlockMode
          status?: ContentStatus
          order_no?: number
          created_at?: string
          updated_at?: string
        }
      }
      episodes: {
        Row: {
          id: string
          subject_id: string
          title: string
          description: string | null
          order_no: number
          status: ContentStatus
          primary_media_type: MediaType
          video_url: string | null
          video_path: string | null
          pdf_path: string | null
          duration_seconds: number | null
          points_reward: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          subject_id: string
          title: string
          description?: string | null
          order_no?: number
          status?: ContentStatus
          primary_media_type?: MediaType
          video_url?: string | null
          video_path?: string | null
          pdf_path?: string | null
          duration_seconds?: number | null
          points_reward?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          subject_id?: string
          title?: string
          description?: string | null
          order_no?: number
          status?: ContentStatus
          primary_media_type?: MediaType
          video_url?: string | null
          video_path?: string | null
          pdf_path?: string | null
          duration_seconds?: number | null
          points_reward?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      episode_resources: {
        Row: {
          id: string
          episode_id: string
          type: ResourceType
          title: string | null
          url_or_path: string
          created_at: string
        }
        Insert: {
          id?: string
          episode_id: string
          type?: ResourceType
          title?: string | null
          url_or_path: string
          created_at?: string
        }
        Update: {
          id?: string
          episode_id?: string
          type?: ResourceType
          title?: string | null
          url_or_path?: string
          created_at?: string
        }
      }
      user_episode_progress: {
        Row: {
          user_id: string
          episode_id: string
          watched_percent: number
          last_position_seconds: number
          completed_at: string | null
          updated_at: string
        }
        Insert: {
          user_id: string
          episode_id: string
          watched_percent?: number
          last_position_seconds?: number
          completed_at?: string | null
          updated_at?: string
        }
        Update: {
          user_id?: string
          episode_id?: string
          watched_percent?: number
          last_position_seconds?: number
          completed_at?: string | null
          updated_at?: string
        }
      }
      point_rules: {
        Row: {
          key: string
          points: number
          is_active: boolean
          description: string | null
          updated_at: string
        }
        Insert: {
          key: string
          points: number
          is_active?: boolean
          description?: string | null
          updated_at?: string
        }
        Update: {
          key?: string
          points?: number
          is_active?: boolean
          description?: string | null
          updated_at?: string
        }
      }
      point_transactions: {
        Row: {
          id: string
          user_id: string
          rule_key: string
          ref_type: string
          ref_id: string
          points: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          rule_key: string
          ref_type: string
          ref_id: string
          points: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          rule_key?: string
          ref_type?: string
          ref_id?: string
          points?: number
          created_at?: string
        }
      }
      user_wallet: {
        Row: {
          user_id: string
          total_points: number
          level: number
          updated_at: string
        }
        Insert: {
          user_id: string
          total_points?: number
          level?: number
          updated_at?: string
        }
        Update: {
          user_id?: string
          total_points?: number
          level?: number
          updated_at?: string
        }
      }
      user_streaks: {
        Row: {
          user_id: string
          current_streak: number
          max_streak: number
          last_activity_date: string | null
          updated_at: string
        }
        Insert: {
          user_id: string
          current_streak?: number
          max_streak?: number
          last_activity_date?: string | null
          updated_at?: string
        }
        Update: {
          user_id?: string
          current_streak?: number
          max_streak?: number
          last_activity_date?: string | null
          updated_at?: string
        }
      }
      rooms: {
        Row: {
          id: string
          name: string
          location: string | null
          capacity: number
          features_json: Json
          status: RoomStatus
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          location?: string | null
          capacity?: number
          features_json?: Json
          status?: RoomStatus
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          location?: string | null
          capacity?: number
          features_json?: Json
          status?: RoomStatus
          created_at?: string
          updated_at?: string
        }
      }
      room_blocks: {
        Row: {
          id: string
          room_id: string
          start_at: string
          end_at: string
          reason: string | null
          created_at: string
        }
        Insert: {
          id?: string
          room_id: string
          start_at: string
          end_at: string
          reason?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          room_id?: string
          start_at?: string
          end_at?: string
          reason?: string | null
          created_at?: string
        }
      }
      room_bookings: {
        Row: {
          id: string
          room_id: string
          booked_by_user_id: string
          title: string
          description: string | null
          start_at: string
          end_at: string
          status: BookingStatus
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          room_id: string
          booked_by_user_id: string
          title: string
          description?: string | null
          start_at: string
          end_at: string
          status?: BookingStatus
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          room_id?: string
          booked_by_user_id?: string
          title?: string
          description?: string | null
          start_at?: string
          end_at?: string
          status?: BookingStatus
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      wallet_add_points: {
        Args: {
          p_user_id: string
          p_points: number
        }
        Returns: undefined
      }
      get_admin_dashboard_stats: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
    }
    Enums: {
      user_role: UserRole
      content_status: ContentStatus
      unlock_mode: UnlockMode
      media_type: MediaType
      resource_type: ResourceType
      room_status: RoomStatus
      booking_status: BookingStatus
    }
  }
}

// Helper types
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Category = Database['public']['Tables']['categories']['Row']
export type Subject = Database['public']['Tables']['subjects']['Row']
export type Episode = Database['public']['Tables']['episodes']['Row']
export type EpisodeResource = Database['public']['Tables']['episode_resources']['Row']
export type UserProgress = Database['public']['Tables']['user_episode_progress']['Row']
export type PointRule = Database['public']['Tables']['point_rules']['Row']
export type PointTransaction = Database['public']['Tables']['point_transactions']['Row']
export type UserWallet = Database['public']['Tables']['user_wallet']['Row']
export type UserStreak = Database['public']['Tables']['user_streaks']['Row']
export type Room = Database['public']['Tables']['rooms']['Row']
export type RoomBlock = Database['public']['Tables']['room_blocks']['Row']
export type RoomBooking = Database['public']['Tables']['room_bookings']['Row']

