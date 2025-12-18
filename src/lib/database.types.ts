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
      projects: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string | null
          weekly_goal: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description?: string | null
          weekly_goal?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string | null
          weekly_goal?: number
          created_at?: string
          updated_at?: string
        }
      }
      leads: {
        Row: {
          id: string
          project_id: string | null
          user_id: string | null
          first_name: string
          last_name: string
          form_type: string
          entry_date: string
          contact_date: string | null
          scheduled_call_date: string | null
          attended_meeting: boolean | null
          result: string | null
          sale_made: boolean
          observations: string | null
          sale_amount: number | null
          payment_method: string | null
          cash_collected: number | null
          closer: string | null
          installment_count: number | null
          initial_payment: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id?: string | null
          user_id?: string | null
          first_name: string
          last_name: string
          form_type: string
          entry_date?: string
          contact_date?: string | null
          scheduled_call_date?: string | null
          attended_meeting?: boolean | null
          result?: string | null
          sale_made?: boolean
          observations?: string | null
          sale_amount?: number | null
          payment_method?: string | null
          cash_collected?: number | null
          closer?: string | null
          installment_count?: number | null
          initial_payment?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string | null
          user_id?: string | null
          first_name?: string
          last_name?: string
          form_type?: string
          entry_date?: string
          contact_date?: string | null
          scheduled_call_date?: string | null
          attended_meeting?: boolean | null
          result?: string | null
          sale_made?: boolean
          observations?: string | null
          sale_amount?: number | null
          payment_method?: string | null
          cash_collected?: number | null
          closer?: string | null
          installment_count?: number | null
          initial_payment?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      settings: {
        Row: {
          id: string
          weekly_goal: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          weekly_goal?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          weekly_goal?: number
          created_at?: string
          updated_at?: string
        }
      }
      meta_leads: {
        Row: {
          id: string
          project_id: string
          user_id: string
          week_start_date: string
          week_number: number
          year: number
          leads_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          user_id: string
          week_start_date: string
          week_number: number
          year: number
          leads_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          user_id?: string
          week_start_date?: string
          week_number?: number
          year?: number
          leads_count?: number
          created_at?: string
          updated_at?: string
        }
      }
      project_members: {
        Row: {
          id: string
          project_id: string
          user_id: string
          role: 'owner' | 'member'
          joined_at: string
        }
        Insert: {
          id?: string
          project_id: string
          user_id: string
          role: 'owner' | 'member'
          joined_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          user_id?: string
          role?: 'owner' | 'member'
          joined_at?: string
        }
      }
      invitation_codes: {
        Row: {
          id: string
          project_id: string
          code: string
          created_by: string
          created_at: string
          expires_at: string | null
          max_uses: number | null
          uses_count: number
          is_active: boolean
        }
        Insert: {
          id?: string
          project_id: string
          code: string
          created_by: string
          created_at?: string
          expires_at?: string | null
          max_uses?: number | null
          uses_count?: number
          is_active?: boolean
        }
        Update: {
          id?: string
          project_id?: string
          code?: string
          created_by?: string
          created_at?: string
          expires_at?: string | null
          max_uses?: number | null
          uses_count?: number
          is_active?: boolean
        }
      }
    }
    Functions: {
      use_invitation_code: {
        Args: {
          invitation_code: string
        }
        Returns: string
      }
    }
  }
}
