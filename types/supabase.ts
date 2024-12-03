export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      invites: {
        Row: {
          id: string
          created_at: string
          email: string
          used: boolean
          access_key: string
        }
        Insert: {
          id?: string
          created_at?: string
          email: string
          used?: boolean
          access_key: string
        }
        Update: {
          id?: string
          created_at?: string
          email?: string
          used?: boolean
          access_key?: string
        }
      }
      profiles: {
        Row: {
          id: string
          created_at: string
          email: string | null
          full_name: string | null
          is_admin: boolean
        }
        Insert: {
          id: string
          created_at?: string
          email?: string | null
          full_name?: string | null
          is_admin?: boolean
        }
        Update: {
          id?: string
          created_at?: string
          email?: string | null
          full_name?: string | null
          is_admin?: boolean
        }
      }
      tasks: {
        Row: {
          id: number
          created_at: string
          title: string
          body: string
          status: string
          assignee: string
          priority: string
          due: string | null
          user_id: string | null
          updated_at: string | null
        }
        Insert: {
          id?: number
          created_at?: string
          title: string
          body: string
          status?: string
          assignee?: string
          priority: string
          due?: string | null
          user_id?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: number
          created_at?: string
          title?: string
          body?: string
          status?: string
          assignee?: string
          priority?: string
          due?: string | null
          user_id?: string | null
          updated_at?: string | null
        }
      }
      user_permissions: {
        Row: {
          id: string
          user_id: string
          assignee: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          assignee: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          assignee?: string
          created_at?: string
        }
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
  }
  auth: {
    Tables: {
      users: {
        Row: {
          id: string
          created_at: string
          email: string
        }
      }
    }
  }
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T]
