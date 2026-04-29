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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admin_notification_phones: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          label: string | null
          notify_new_orders: boolean
          phone: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          label?: string | null
          notify_new_orders?: boolean
          phone: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          label?: string | null
          notify_new_orders?: boolean
          phone?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          ip_address: string | null
          new_data: Json | null
          old_data: Json | null
          performed_by: string
          record_id: string | null
          table_name: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          performed_by: string
          record_id?: string | null
          table_name: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          performed_by?: string
          record_id?: string | null
          table_name?: string
        }
        Relationships: []
      }
      bundle_items: {
        Row: {
          bundle_id: string
          id: string
          product_id: string
          quantity: number
        }
        Insert: {
          bundle_id: string
          id?: string
          product_id: string
          quantity?: number
        }
        Update: {
          bundle_id?: string
          id?: string
          product_id?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "bundle_items_bundle_id_fkey"
            columns: ["bundle_id"]
            isOneToOne: false
            referencedRelation: "maintenance_bundles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bundle_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      catalogs: {
        Row: {
          category: string | null
          created_at: string
          description_ar: string | null
          file_url: string | null
          id: string
          is_active: boolean
          sort_order: number | null
          title_ar: string
          title_en: string | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description_ar?: string | null
          file_url?: string | null
          id?: string
          is_active?: boolean
          sort_order?: number | null
          title_ar: string
          title_en?: string | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description_ar?: string | null
          file_url?: string | null
          id?: string
          is_active?: boolean
          sort_order?: number | null
          title_ar?: string
          title_en?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      client_account_attempts: {
        Row: {
          attempt_type: string
          attempted_by: string | null
          client_name: string | null
          created_at: string
          details: Json | null
          erp_customer_code: string | null
          error_message: string | null
          id: string
          lead_id: string | null
          phone: string | null
          status: string
        }
        Insert: {
          attempt_type: string
          attempted_by?: string | null
          client_name?: string | null
          created_at?: string
          details?: Json | null
          erp_customer_code?: string | null
          error_message?: string | null
          id?: string
          lead_id?: string | null
          phone?: string | null
          status: string
        }
        Update: {
          attempt_type?: string
          attempted_by?: string | null
          client_name?: string | null
          created_at?: string
          details?: Json | null
          erp_customer_code?: string | null
          error_message?: string | null
          id?: string
          lead_id?: string | null
          phone?: string | null
          status?: string
        }
        Relationships: []
      }
      coupon_usage: {
        Row: {
          coupon_id: string
          discount_applied: number
          id: string
          order_id: string | null
          used_at: string
          user_id: string
        }
        Insert: {
          coupon_id: string
          discount_applied?: number
          id?: string
          order_id?: string | null
          used_at?: string
          user_id: string
        }
        Update: {
          coupon_id?: string
          discount_applied?: number
          id?: string
          order_id?: string | null
          used_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_usage_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_usage_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          applies_to_brands: string[] | null
          code: string
          created_at: string
          description: string | null
          discount_type: string
          discount_value: number
          id: string
          is_active: boolean
          max_discount_amount: number | null
          max_uses: number | null
          min_order_amount: number | null
          updated_at: string
          used_count: number
          valid_from: string | null
          valid_to: string | null
        }
        Insert: {
          applies_to_brands?: string[] | null
          code: string
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value?: number
          id?: string
          is_active?: boolean
          max_discount_amount?: number | null
          max_uses?: number | null
          min_order_amount?: number | null
          updated_at?: string
          used_count?: number
          valid_from?: string | null
          valid_to?: string | null
        }
        Update: {
          applies_to_brands?: string[] | null
          code?: string
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value?: number
          id?: string
          is_active?: boolean
          max_discount_amount?: number | null
          max_uses?: number | null
          min_order_amount?: number | null
          updated_at?: string
          used_count?: number
          valid_from?: string | null
          valid_to?: string | null
        }
        Relationships: []
      }
      customer_assignments: {
        Row: {
          assigned_by: string | null
          assigned_staff_id: string
          created_at: string
          customer_user_id: string
          id: string
          last_contacted_at: string | null
          notes: string | null
          updated_at: string
        }
        Insert: {
          assigned_by?: string | null
          assigned_staff_id: string
          created_at?: string
          customer_user_id: string
          id?: string
          last_contacted_at?: string | null
          notes?: string | null
          updated_at?: string
        }
        Update: {
          assigned_by?: string | null
          assigned_staff_id?: string
          created_at?: string
          customer_user_id?: string
          id?: string
          last_contacted_at?: string | null
          notes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      customer_communications: {
        Row: {
          comm_type: string
          created_at: string
          customer_user_id: string | null
          done_at: string | null
          id: string
          is_done: boolean
          note: string | null
          reminder_at: string | null
          staff_user_id: string
          visitor_session_key: string | null
        }
        Insert: {
          comm_type?: string
          created_at?: string
          customer_user_id?: string | null
          done_at?: string | null
          id?: string
          is_done?: boolean
          note?: string | null
          reminder_at?: string | null
          staff_user_id: string
          visitor_session_key?: string | null
        }
        Update: {
          comm_type?: string
          created_at?: string
          customer_user_id?: string | null
          done_at?: string | null
          id?: string
          is_done?: boolean
          note?: string | null
          reminder_at?: string | null
          staff_user_id?: string
          visitor_session_key?: string | null
        }
        Relationships: []
      }
      customer_notes: {
        Row: {
          created_at: string
          customer_user_id: string
          id: string
          note: string
          staff_user_id: string
        }
        Insert: {
          created_at?: string
          customer_user_id: string
          id?: string
          note: string
          staff_user_id: string
        }
        Update: {
          created_at?: string
          customer_user_id?: string
          id?: string
          note?: string
          staff_user_id?: string
        }
        Relationships: []
      }
      customer_search_logs: {
        Row: {
          created_at: string
          filters: Json | null
          id: string
          results_count: number | null
          search_query: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          filters?: Json | null
          id?: string
          results_count?: number | null
          search_query: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          filters?: Json | null
          id?: string
          results_count?: number | null
          search_query?: string
          user_id?: string | null
        }
        Relationships: []
      }
      customer_sessions: {
        Row: {
          id: string
          last_seen_at: string
          page_views: number
          session_date: string
          user_id: string
        }
        Insert: {
          id?: string
          last_seen_at?: string
          page_views?: number
          session_date?: string
          user_id: string
        }
        Update: {
          id?: string
          last_seen_at?: string
          page_views?: number
          session_date?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_report_answers: {
        Row: {
          answer_boolean: boolean | null
          answer_choice: string | null
          answer_number: number | null
          answer_text: string | null
          created_at: string
          id: string
          question_id: string
          report_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          answer_boolean?: boolean | null
          answer_choice?: string | null
          answer_number?: number | null
          answer_text?: string | null
          created_at?: string
          id?: string
          question_id: string
          report_date?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          answer_boolean?: boolean | null
          answer_choice?: string | null
          answer_number?: number | null
          answer_text?: string | null
          created_at?: string
          id?: string
          question_id?: string
          report_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_report_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "daily_report_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_report_questions: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          is_required: boolean
          options: Json | null
          placeholder: string | null
          question_text: string
          question_type: string
          sort_order: number
          target_role: Database["public"]["Enums"]["app_role"] | null
          target_scope: string
          target_team_ids: string[] | null
          target_user_ids: string[] | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          is_required?: boolean
          options?: Json | null
          placeholder?: string | null
          question_text: string
          question_type?: string
          sort_order?: number
          target_role?: Database["public"]["Enums"]["app_role"] | null
          target_scope?: string
          target_team_ids?: string[] | null
          target_user_ids?: string[] | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          is_required?: boolean
          options?: Json | null
          placeholder?: string | null
          question_text?: string
          question_type?: string
          sort_order?: number
          target_role?: Database["public"]["Enums"]["app_role"] | null
          target_scope?: string
          target_team_ids?: string[] | null
          target_user_ids?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      dealer_accounts: {
        Row: {
          active_session_id: string | null
          application_id: string | null
          business_type: string | null
          created_at: string
          credit_limit: number | null
          custom_discount: number | null
          erp_customer_code: string | null
          erp_customer_name: string | null
          id: string
          is_active: boolean
          min_order_amount: number | null
          notes: string | null
          tier: Database["public"]["Enums"]["customer_tier"]
          updated_at: string
          user_id: string
          vehicle_types: string[] | null
        }
        Insert: {
          active_session_id?: string | null
          application_id?: string | null
          business_type?: string | null
          created_at?: string
          credit_limit?: number | null
          custom_discount?: number | null
          erp_customer_code?: string | null
          erp_customer_name?: string | null
          id?: string
          is_active?: boolean
          min_order_amount?: number | null
          notes?: string | null
          tier?: Database["public"]["Enums"]["customer_tier"]
          updated_at?: string
          user_id: string
          vehicle_types?: string[] | null
        }
        Update: {
          active_session_id?: string | null
          application_id?: string | null
          business_type?: string | null
          created_at?: string
          credit_limit?: number | null
          custom_discount?: number | null
          erp_customer_code?: string | null
          erp_customer_name?: string | null
          id?: string
          is_active?: boolean
          min_order_amount?: number | null
          notes?: string | null
          tier?: Database["public"]["Enums"]["customer_tier"]
          updated_at?: string
          user_id?: string
          vehicle_types?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "dealer_accounts_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "dealer_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      dealer_ai_recommendations: {
        Row: {
          created_at: string
          expires_at: string
          generated_at: string
          id: string
          recommendations: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          generated_at?: string
          id?: string
          recommendations?: Json
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          generated_at?: string
          id?: string
          recommendations?: Json
          user_id?: string
        }
        Relationships: []
      }
      dealer_applications: {
        Row: {
          additional_docs: string[] | null
          agreed_market_protection: boolean
          agreed_pricing_policy: boolean
          agreed_return_policy: boolean
          agreed_terms: boolean
          assigned_tier: Database["public"]["Enums"]["customer_tier"] | null
          avg_monthly_purchase: string | null
          business_name: string
          client_type: Database["public"]["Enums"]["client_type"]
          commercial_register_doc: string | null
          commercial_register_no: string
          coverage_areas: string | null
          created_at: string
          detailed_address: string
          email: string
          governorate: string
          has_branches: boolean | null
          id: string
          legal_name: string
          national_id_doc: string | null
          phone: string
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["application_status"]
          tax_card_doc: string | null
          tax_card_no: string
          updated_at: string
          user_id: string
          years_in_business: number
        }
        Insert: {
          additional_docs?: string[] | null
          agreed_market_protection?: boolean
          agreed_pricing_policy?: boolean
          agreed_return_policy?: boolean
          agreed_terms?: boolean
          assigned_tier?: Database["public"]["Enums"]["customer_tier"] | null
          avg_monthly_purchase?: string | null
          business_name: string
          client_type: Database["public"]["Enums"]["client_type"]
          commercial_register_doc?: string | null
          commercial_register_no: string
          coverage_areas?: string | null
          created_at?: string
          detailed_address: string
          email: string
          governorate: string
          has_branches?: boolean | null
          id?: string
          legal_name: string
          national_id_doc?: string | null
          phone: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["application_status"]
          tax_card_doc?: string | null
          tax_card_no: string
          updated_at?: string
          user_id: string
          years_in_business?: number
        }
        Update: {
          additional_docs?: string[] | null
          agreed_market_protection?: boolean
          agreed_pricing_policy?: boolean
          agreed_return_policy?: boolean
          agreed_terms?: boolean
          assigned_tier?: Database["public"]["Enums"]["customer_tier"] | null
          avg_monthly_purchase?: string | null
          business_name?: string
          client_type?: Database["public"]["Enums"]["client_type"]
          commercial_register_doc?: string | null
          commercial_register_no?: string
          coverage_areas?: string | null
          created_at?: string
          detailed_address?: string
          email?: string
          governorate?: string
          has_branches?: boolean | null
          id?: string
          legal_name?: string
          national_id_doc?: string | null
          phone?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["application_status"]
          tax_card_doc?: string | null
          tax_card_no?: string
          updated_at?: string
          user_id?: string
          years_in_business?: number
        }
        Relationships: []
      }
      dealer_cart_items: {
        Row: {
          created_at: string
          id: string
          product_id: string
          quantity: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          quantity?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          quantity?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dealer_cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      dealer_favorites: {
        Row: {
          created_at: string
          id: string
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dealer_favorites_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      dealer_passwords: {
        Row: {
          created_at: string
          dealer_account_id: string
          id: string
          initial_password: string
          viewed_at: string | null
          viewed_by: string | null
        }
        Insert: {
          created_at?: string
          dealer_account_id: string
          id?: string
          initial_password: string
          viewed_at?: string | null
          viewed_by?: string | null
        }
        Update: {
          created_at?: string
          dealer_account_id?: string
          id?: string
          initial_password?: string
          viewed_at?: string | null
          viewed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dealer_passwords_dealer_account_id_fkey"
            columns: ["dealer_account_id"]
            isOneToOne: true
            referencedRelation: "dealer_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      dealer_price_views: {
        Row: {
          id: string
          product_id: string
          user_id: string
          view_date: string
          viewed_at: string
        }
        Insert: {
          id?: string
          product_id: string
          user_id: string
          view_date?: string
          viewed_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          user_id?: string
          view_date?: string
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dealer_price_views_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      dealer_product_order_locks: {
        Row: {
          created_at: string
          id: string
          product_id: string
          quantity_ordered: number
          stock_at_order: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          quantity_ordered?: number
          stock_at_order: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          quantity_ordered?: number
          stock_at_order?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dealer_product_order_locks_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      dealer_quote_items: {
        Row: {
          id: string
          product_id: string
          quantity: number
          quote_id: string
          total_price: number
          unit_price: number
        }
        Insert: {
          id?: string
          product_id: string
          quantity?: number
          quote_id: string
          total_price?: number
          unit_price?: number
        }
        Update: {
          id?: string
          product_id?: string
          quantity?: number
          quote_id?: string
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "dealer_quote_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dealer_quote_items_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "dealer_quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      dealer_quotes: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          quote_number: string
          status: string
          total_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          quote_number: string
          status?: string
          total_amount?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          quote_number?: string
          status?: string
          total_amount?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      dealer_shopping_list_items: {
        Row: {
          created_at: string
          id: string
          list_id: string
          product_id: string
          quantity: number
        }
        Insert: {
          created_at?: string
          id?: string
          list_id: string
          product_id: string
          quantity?: number
        }
        Update: {
          created_at?: string
          id?: string
          list_id?: string
          product_id?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "dealer_shopping_list_items_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "dealer_shopping_lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dealer_shopping_list_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      dealer_shopping_lists: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      erp_config: {
        Row: {
          id: string
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      erp_sync_alerts: {
        Row: {
          alert_key: string
          alert_type: string
          created_at: string
          details: Json | null
          id: string
          notified_admins: number | null
          sync_type: string | null
        }
        Insert: {
          alert_key: string
          alert_type: string
          created_at?: string
          details?: Json | null
          id?: string
          notified_admins?: number | null
          sync_type?: string | null
        }
        Update: {
          alert_key?: string
          alert_type?: string
          created_at?: string
          details?: Json | null
          id?: string
          notified_admins?: number | null
          sync_type?: string | null
        }
        Relationships: []
      }
      erp_sync_logs: {
        Row: {
          created_at: string
          direction: string
          error_message: string | null
          id: string
          payload: Json | null
          reference_id: string | null
          reference_number: string | null
          response: Json | null
          status: string
          sync_type: string
        }
        Insert: {
          created_at?: string
          direction?: string
          error_message?: string | null
          id?: string
          payload?: Json | null
          reference_id?: string | null
          reference_number?: string | null
          response?: Json | null
          status?: string
          sync_type: string
        }
        Update: {
          created_at?: string
          direction?: string
          error_message?: string | null
          id?: string
          payload?: Json | null
          reference_id?: string | null
          reference_number?: string | null
          response?: Json | null
          status?: string
          sync_type?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          client_type: string
          created_at: string
          created_by: string
          erp_customer_code: string | null
          id: string
          name: string
          notes: string | null
          phone: string
          shop_name: string | null
          status: string
          updated_at: string
        }
        Insert: {
          client_type?: string
          created_at?: string
          created_by: string
          erp_customer_code?: string | null
          id?: string
          name: string
          notes?: string | null
          phone: string
          shop_name?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          client_type?: string
          created_at?: string
          created_by?: string
          erp_customer_code?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string
          shop_name?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      maintenance_bundles: {
        Row: {
          bundle_price: number
          created_at: string
          description_ar: string | null
          id: string
          image_url: string | null
          is_active: boolean
          name_ar: string
          name_en: string | null
          original_price: number
          sort_order: number | null
        }
        Insert: {
          bundle_price?: number
          created_at?: string
          description_ar?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name_ar: string
          name_en?: string | null
          original_price?: number
          sort_order?: number | null
        }
        Update: {
          bundle_price?: number
          created_at?: string
          description_ar?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name_ar?: string
          name_en?: string | null
          original_price?: number
          sort_order?: number | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          product_id: string
          quantity: number
          total_price: number
          unit_price: number
        }
        Insert: {
          id?: string
          order_id: string
          product_id: string
          quantity?: number
          total_price: number
          unit_price: number
        }
        Update: {
          id?: string
          order_id?: string
          product_id?: string
          quantity?: number
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          coupon_code: string | null
          coupon_discount: number | null
          created_at: string
          delivered_at: string | null
          erp_order_code: string | null
          first_contacted_at: string | null
          id: string
          invoice_url: string | null
          notes: string | null
          order_number: string
          payment_method: string | null
          pickup_branch: string | null
          shipped_at: string | null
          shipping_address: string | null
          shipping_company: string | null
          shipping_governorate: string | null
          status: string
          total_amount: number
          tracking_number: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          coupon_code?: string | null
          coupon_discount?: number | null
          created_at?: string
          delivered_at?: string | null
          erp_order_code?: string | null
          first_contacted_at?: string | null
          id?: string
          invoice_url?: string | null
          notes?: string | null
          order_number: string
          payment_method?: string | null
          pickup_branch?: string | null
          shipped_at?: string | null
          shipping_address?: string | null
          shipping_company?: string | null
          shipping_governorate?: string | null
          status?: string
          total_amount?: number
          tracking_number?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          coupon_code?: string | null
          coupon_discount?: number | null
          created_at?: string
          delivered_at?: string | null
          erp_order_code?: string | null
          first_contacted_at?: string | null
          id?: string
          invoice_url?: string | null
          notes?: string | null
          order_number?: string
          payment_method?: string | null
          pickup_branch?: string | null
          shipped_at?: string | null
          shipping_address?: string | null
          shipping_company?: string | null
          shipping_governorate?: string | null
          status?: string
          total_amount?: number
          tracking_number?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      otp_codes: {
        Row: {
          code: string
          created_at: string
          expires_at: string
          id: string
          phone: string
          verified: boolean
        }
        Insert: {
          code: string
          created_at?: string
          expires_at: string
          id?: string
          phone: string
          verified?: boolean
        }
        Update: {
          code?: string
          created_at?: string
          expires_at?: string
          id?: string
          phone?: string
          verified?: boolean
        }
        Relationships: []
      }
      page_visits: {
        Row: {
          id: string
          page_title: string | null
          path: string
          referrer: string | null
          session_key: string | null
          user_id: string | null
          visited_at: string
        }
        Insert: {
          id?: string
          page_title?: string | null
          path: string
          referrer?: string | null
          session_key?: string | null
          user_id?: string | null
          visited_at?: string
        }
        Update: {
          id?: string
          page_title?: string | null
          path?: string
          referrer?: string | null
          session_key?: string | null
          user_id?: string | null
          visited_at?: string
        }
        Relationships: []
      }
      part_requests: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          model: string | null
          name: string
          notes: string | null
          phone: string
          status: string
          vin: string | null
          year: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          model?: string | null
          name: string
          notes?: string | null
          phone: string
          status?: string
          vin?: string | null
          year?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          model?: string | null
          name?: string
          notes?: string | null
          phone?: string
          status?: string
          vin?: string | null
          year?: string | null
        }
        Relationships: []
      }
      payment_transactions: {
        Row: {
          amount_cents: number | null
          card_brand: string | null
          card_last_four: string | null
          created_at: string
          currency: string | null
          error_message: string | null
          id: string
          is_refunded: boolean | null
          is_voided: boolean | null
          order_id: string | null
          order_number: string | null
          payment_method: string | null
          paymob_transaction_id: string | null
          raw_payload: Json | null
          status: string
        }
        Insert: {
          amount_cents?: number | null
          card_brand?: string | null
          card_last_four?: string | null
          created_at?: string
          currency?: string | null
          error_message?: string | null
          id?: string
          is_refunded?: boolean | null
          is_voided?: boolean | null
          order_id?: string | null
          order_number?: string | null
          payment_method?: string | null
          paymob_transaction_id?: string | null
          raw_payload?: Json | null
          status?: string
        }
        Update: {
          amount_cents?: number | null
          card_brand?: string | null
          card_last_four?: string | null
          created_at?: string
          currency?: string | null
          error_message?: string | null
          id?: string
          is_refunded?: boolean | null
          is_voided?: boolean | null
          order_id?: string | null
          order_number?: string | null
          payment_method?: string | null
          paymob_transaction_id?: string | null
          raw_payload?: Json | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      permission_requests: {
        Row: {
          action_description: string
          action_type: string
          admin_response: string | null
          context_data: Json | null
          created_at: string
          id: string
          reason: string | null
          requester_email: string | null
          requester_id: string
          requester_name: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          action_description: string
          action_type: string
          admin_response?: string | null
          context_data?: Json | null
          created_at?: string
          id?: string
          reason?: string | null
          requester_email?: string | null
          requester_id: string
          requester_name?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          action_description?: string
          action_type?: string
          admin_response?: string | null
          context_data?: Json | null
          created_at?: string
          id?: string
          reason?: string | null
          requester_email?: string | null
          requester_id?: string
          requester_name?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      price_change_history: {
        Row: {
          change_percentage: number
          created_at: string
          id: string
          new_price: number
          notified_dealers_count: number | null
          old_price: number
          product_id: string
          source: string
        }
        Insert: {
          change_percentage: number
          created_at?: string
          id?: string
          new_price: number
          notified_dealers_count?: number | null
          old_price: number
          product_id: string
          source?: string
        }
        Update: {
          change_percentage?: number
          created_at?: string
          id?: string
          new_price?: number
          notified_dealers_count?: number | null
          old_price?: number
          product_id?: string
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_change_history_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      price_list_products: {
        Row: {
          id: string
          price: number | null
          price_list_id: string
          product_id: string
        }
        Insert: {
          id?: string
          price?: number | null
          price_list_id: string
          product_id: string
        }
        Update: {
          id?: string
          price?: number | null
          price_list_id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_list_products_price_list_id_fkey"
            columns: ["price_list_id"]
            isOneToOne: false
            referencedRelation: "price_lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_list_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      price_list_views: {
        Row: {
          id: string
          price_list_id: string
          user_id: string
          viewed_at: string
        }
        Insert: {
          id?: string
          price_list_id: string
          user_id: string
          viewed_at?: string
        }
        Update: {
          id?: string
          price_list_id?: string
          user_id?: string
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_list_views_price_list_id_fkey"
            columns: ["price_list_id"]
            isOneToOne: false
            referencedRelation: "price_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      price_lists: {
        Row: {
          created_at: string
          description: string | null
          file_url: string | null
          id: string
          is_active: boolean
          title: string
          updated_at: string
          version: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          file_url?: string | null
          id?: string
          is_active?: boolean
          title: string
          updated_at?: string
          version?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          file_url?: string | null
          id?: string
          is_active?: boolean
          title?: string
          updated_at?: string
          version?: string | null
        }
        Relationships: []
      }
      product_categories: {
        Row: {
          created_at: string
          icon: string | null
          id: string
          name_ar: string
          name_en: string | null
          slug: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          name_ar: string
          name_en?: string | null
          slug: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          name_ar?: string
          name_en?: string | null
          slug?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      product_reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          is_approved: boolean
          product_id: string
          rating: number
          reviewer_name: string | null
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          is_approved?: boolean
          product_id: string
          rating?: number
          reviewer_name?: string | null
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          is_approved?: boolean
          product_id?: string
          rating?: number
          reviewer_name?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_tier_prices: {
        Row: {
          discount_price: number | null
          id: string
          min_qty_for_discount: number | null
          price: number
          product_id: string
          tier: Database["public"]["Enums"]["customer_tier"]
        }
        Insert: {
          discount_price?: number | null
          id?: string
          min_qty_for_discount?: number | null
          price: number
          product_id: string
          tier: Database["public"]["Enums"]["customer_tier"]
        }
        Update: {
          discount_price?: number | null
          id?: string
          min_qty_for_discount?: number | null
          price?: number
          product_id?: string
          tier?: Database["public"]["Enums"]["customer_tier"]
        }
        Relationships: [
          {
            foreignKeyName: "product_tier_prices_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          base_price: number
          brand: Database["public"]["Enums"]["product_brand"]
          category_id: string | null
          compatible_models: string[] | null
          created_at: string
          description_ar: string | null
          description_en: string | null
          erp_item_code: string | null
          id: string
          image_url: string | null
          is_active: boolean
          is_featured: boolean
          is_on_sale: boolean
          max_order_cap: number | null
          min_order_qty: number
          name_ar: string
          name_en: string | null
          safety_stock: number
          sale_price: number | null
          sku: string
          stock_quantity: number
          updated_at: string
          year_from: number | null
          year_to: number | null
        }
        Insert: {
          base_price?: number
          brand: Database["public"]["Enums"]["product_brand"]
          category_id?: string | null
          compatible_models?: string[] | null
          created_at?: string
          description_ar?: string | null
          description_en?: string | null
          erp_item_code?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_featured?: boolean
          is_on_sale?: boolean
          max_order_cap?: number | null
          min_order_qty?: number
          name_ar: string
          name_en?: string | null
          safety_stock?: number
          sale_price?: number | null
          sku: string
          stock_quantity?: number
          updated_at?: string
          year_from?: number | null
          year_to?: number | null
        }
        Update: {
          base_price?: number
          brand?: Database["public"]["Enums"]["product_brand"]
          category_id?: string | null
          compatible_models?: string[] | null
          created_at?: string
          description_ar?: string | null
          description_en?: string | null
          erp_item_code?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_featured?: boolean
          is_on_sale?: boolean
          max_order_cap?: number | null
          min_order_qty?: number
          name_ar?: string
          name_en?: string | null
          safety_stock?: number
          sale_price?: number | null
          sku?: string
          stock_quantity?: number
          updated_at?: string
          year_from?: number | null
          year_to?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          car_model: string | null
          car_year: number | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
          user_id: string
          whatsapp_opt_in: boolean
        }
        Insert: {
          avatar_url?: string | null
          car_model?: string | null
          car_year?: number | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
          whatsapp_opt_in?: boolean
        }
        Update: {
          avatar_url?: string | null
          car_model?: string | null
          car_year?: number | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
          whatsapp_opt_in?: boolean
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_id: string | null
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_id?: string | null
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string | null
        }
        Relationships: []
      }
      quantity_discounts: {
        Row: {
          brand: string | null
          category_id: string | null
          created_at: string
          discount_type: string
          discount_value: number
          id: string
          is_active: boolean
          min_quantity: number
          product_id: string | null
        }
        Insert: {
          brand?: string | null
          category_id?: string | null
          created_at?: string
          discount_type?: string
          discount_value?: number
          id?: string
          is_active?: boolean
          min_quantity?: number
          product_id?: string | null
        }
        Update: {
          brand?: string | null
          category_id?: string | null
          created_at?: string
          discount_type?: string
          discount_value?: number
          id?: string
          is_active?: boolean
          min_quantity?: number
          product_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quantity_discounts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quantity_discounts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limit_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          identifier: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          identifier: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          identifier?: string
        }
        Relationships: []
      }
      reporter_daily_reports: {
        Row: {
          auto_invoices_count: number
          auto_orders_count: number
          auto_total_sales: number
          calls_count: number
          created_at: string
          followups_count: number
          id: string
          incomplete_orders_count: number
          is_submitted: boolean
          lost_opportunities_count: number
          main_problem: string | null
          new_customers_count: number
          offers_converted_count: number
          offers_count: number
          offers_sent_count: number
          problem_notes: string | null
          quotations_count: number
          report_date: string
          submitted_at: string | null
          updated_at: string
          user_id: string
          whatsapp_count: number
        }
        Insert: {
          auto_invoices_count?: number
          auto_orders_count?: number
          auto_total_sales?: number
          calls_count?: number
          created_at?: string
          followups_count?: number
          id?: string
          incomplete_orders_count?: number
          is_submitted?: boolean
          lost_opportunities_count?: number
          main_problem?: string | null
          new_customers_count?: number
          offers_converted_count?: number
          offers_count?: number
          offers_sent_count?: number
          problem_notes?: string | null
          quotations_count?: number
          report_date?: string
          submitted_at?: string | null
          updated_at?: string
          user_id: string
          whatsapp_count?: number
        }
        Update: {
          auto_invoices_count?: number
          auto_orders_count?: number
          auto_total_sales?: number
          calls_count?: number
          created_at?: string
          followups_count?: number
          id?: string
          incomplete_orders_count?: number
          is_submitted?: boolean
          lost_opportunities_count?: number
          main_problem?: string | null
          new_customers_count?: number
          offers_converted_count?: number
          offers_count?: number
          offers_sent_count?: number
          problem_notes?: string | null
          quotations_count?: number
          report_date?: string
          submitted_at?: string | null
          updated_at?: string
          user_id?: string
          whatsapp_count?: number
        }
        Relationships: []
      }
      reporter_day_off: {
        Row: {
          created_at: string
          id: string
          off_date: string
          reason: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          off_date: string
          reason?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          off_date?: string
          reason?: string | null
          user_id?: string
        }
        Relationships: []
      }
      reporter_motivational_messages: {
        Row: {
          created_at: string
          id: string
          message: string
          message_date: string
          performance_tier: string | null
          source: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          message_date?: string
          performance_tier?: string | null
          source?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          message_date?: string
          performance_tier?: string | null
          source?: string
          user_id?: string
        }
        Relationships: []
      }
      reporter_report_fields: {
        Row: {
          created_at: string
          field_key: string
          field_type: string
          id: string
          is_active: boolean
          is_auto: boolean
          is_required: boolean
          label_ar: string
          options: Json
          placeholder: string | null
          section_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          field_key: string
          field_type?: string
          id?: string
          is_active?: boolean
          is_auto?: boolean
          is_required?: boolean
          label_ar: string
          options?: Json
          placeholder?: string | null
          section_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          field_key?: string
          field_type?: string
          id?: string
          is_active?: boolean
          is_auto?: boolean
          is_required?: boolean
          label_ar?: string
          options?: Json
          placeholder?: string | null
          section_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reporter_report_fields_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "reporter_report_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      reporter_report_sections: {
        Row: {
          created_at: string
          description_ar: string | null
          icon: string | null
          id: string
          is_active: boolean
          is_auto: boolean
          key: string
          sort_order: number
          title_ar: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description_ar?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          is_auto?: boolean
          key: string
          sort_order?: number
          title_ar: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description_ar?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          is_auto?: boolean
          key?: string
          sort_order?: number
          title_ar?: string
          updated_at?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      staff_contact_marks: {
        Row: {
          context: string
          created_at: string
          customer_user_id: string
          id: string
          marked_date: string
          staff_user_id: string
        }
        Insert: {
          context?: string
          created_at?: string
          customer_user_id: string
          id?: string
          marked_date?: string
          staff_user_id: string
        }
        Update: {
          context?: string
          created_at?: string
          customer_user_id?: string
          id?: string
          marked_date?: string
          staff_user_id?: string
        }
        Relationships: []
      }
      staff_customer_file_opens: {
        Row: {
          customer_user_id: string | null
          id: string
          opened_at: string
          source: string
          staff_user_id: string
          visitor_session_id: string | null
        }
        Insert: {
          customer_user_id?: string | null
          id?: string
          opened_at?: string
          source?: string
          staff_user_id: string
          visitor_session_id?: string | null
        }
        Update: {
          customer_user_id?: string | null
          id?: string
          opened_at?: string
          source?: string
          staff_user_id?: string
          visitor_session_id?: string | null
        }
        Relationships: []
      }
      staff_daily_reports: {
        Row: {
          best_deal_today: string | null
          created_at: string
          customers_contacted: number
          customers_registered: number
          customers_with_invoices: number
          follow_ups_count: number
          follow_ups_done: number
          general_notes: string | null
          hot_leads_count: number
          id: string
          is_locked: boolean
          locked_at: string | null
          lost_customers_count: number
          lost_reason: string | null
          performance_rating: number | null
          problems_faced: string | null
          quotes_count: number
          report_date: string
          staff_email: string | null
          staff_name: string | null
          staff_user_id: string
          submitted_at: string
          tomorrow_plan: string | null
          total_invoices_amount: number
          updated_at: string
        }
        Insert: {
          best_deal_today?: string | null
          created_at?: string
          customers_contacted?: number
          customers_registered?: number
          customers_with_invoices?: number
          follow_ups_count?: number
          follow_ups_done?: number
          general_notes?: string | null
          hot_leads_count?: number
          id?: string
          is_locked?: boolean
          locked_at?: string | null
          lost_customers_count?: number
          lost_reason?: string | null
          performance_rating?: number | null
          problems_faced?: string | null
          quotes_count?: number
          report_date?: string
          staff_email?: string | null
          staff_name?: string | null
          staff_user_id: string
          submitted_at?: string
          tomorrow_plan?: string | null
          total_invoices_amount?: number
          updated_at?: string
        }
        Update: {
          best_deal_today?: string | null
          created_at?: string
          customers_contacted?: number
          customers_registered?: number
          customers_with_invoices?: number
          follow_ups_count?: number
          follow_ups_done?: number
          general_notes?: string | null
          hot_leads_count?: number
          id?: string
          is_locked?: boolean
          locked_at?: string | null
          lost_customers_count?: number
          lost_reason?: string | null
          performance_rating?: number | null
          problems_faced?: string | null
          quotes_count?: number
          report_date?: string
          staff_email?: string | null
          staff_name?: string | null
          staff_user_id?: string
          submitted_at?: string
          tomorrow_plan?: string | null
          total_invoices_amount?: number
          updated_at?: string
        }
        Relationships: []
      }
      staff_passwords: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          initial_password: string
          staff_user_id: string
          viewed_at: string | null
          viewed_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          initial_password: string
          staff_user_id: string
          viewed_at?: string | null
          viewed_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          initial_password?: string
          staff_user_id?: string
          viewed_at?: string | null
          viewed_by?: string | null
        }
        Relationships: []
      }
      stock_alerts: {
        Row: {
          alert_type: string
          created_at: string
          id: string
          is_active: boolean
          notified_at: string | null
          product_id: string
          user_id: string
        }
        Insert: {
          alert_type?: string
          created_at?: string
          id?: string
          is_active?: boolean
          notified_at?: string | null
          product_id: string
          user_id: string
        }
        Update: {
          alert_type?: string
          created_at?: string
          id?: string
          is_active?: boolean
          notified_at?: string | null
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_alerts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      support_request_ratings: {
        Row: {
          comment: string | null
          created_at: string
          customer_phone: string | null
          customer_user_id: string | null
          id: string
          rating: number
          staff_user_id: string
          support_request_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          customer_phone?: string | null
          customer_user_id?: string | null
          id?: string
          rating: number
          staff_user_id: string
          support_request_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          customer_phone?: string | null
          customer_user_id?: string | null
          id?: string
          rating?: number
          staff_user_id?: string
          support_request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_request_ratings_support_request_id_fkey"
            columns: ["support_request_id"]
            isOneToOne: true
            referencedRelation: "support_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      support_request_transfers: {
        Row: {
          created_at: string
          from_staff_id: string
          id: string
          note: string | null
          support_request_id: string
          to_staff_id: string
        }
        Insert: {
          created_at?: string
          from_staff_id: string
          id?: string
          note?: string | null
          support_request_id: string
          to_staff_id: string
        }
        Update: {
          created_at?: string
          from_staff_id?: string
          id?: string
          note?: string | null
          support_request_id?: string
          to_staff_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_request_transfers_support_request_id_fkey"
            columns: ["support_request_id"]
            isOneToOne: false
            referencedRelation: "support_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      support_requests: {
        Row: {
          assigned_to: string | null
          claimed_at: string | null
          claimed_by: string | null
          context: Json | null
          created_at: string
          customer_name: string | null
          customer_phone: string | null
          id: string
          is_dealer: boolean | null
          message: string | null
          request_type: string
          resolution_note: string | null
          resolved_at: string | null
          source: string
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          assigned_to?: string | null
          claimed_at?: string | null
          claimed_by?: string | null
          context?: Json | null
          created_at?: string
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          is_dealer?: boolean | null
          message?: string | null
          request_type?: string
          resolution_note?: string | null
          resolved_at?: string | null
          source?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          assigned_to?: string | null
          claimed_at?: string | null
          claimed_by?: string | null
          context?: Json | null
          created_at?: string
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          is_dealer?: boolean | null
          message?: string | null
          request_type?: string
          resolution_note?: string | null
          resolved_at?: string | null
          source?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      team_members: {
        Row: {
          added_at: string
          added_by: string | null
          id: string
          team_id: string
          user_id: string
        }
        Insert: {
          added_at?: string
          added_by?: string | null
          id?: string
          team_id: string
          user_id: string
        }
        Update: {
          added_at?: string
          added_by?: string | null
          id?: string
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      ui_translations: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          key: string
          updated_at: string
          updated_by: string | null
          value_ar: string
          value_en: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value_ar?: string
          value_en?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value_ar?: string
          value_en?: string
        }
        Relationships: []
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
      vehicle_model_aliases: {
        Row: {
          aliases: string[]
          canonical_name: string
          created_at: string
          id: string
        }
        Insert: {
          aliases?: string[]
          canonical_name: string
          created_at?: string
          id?: string
        }
        Update: {
          aliases?: string[]
          canonical_name?: string
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      visitor_leads: {
        Row: {
          contacted_at: string | null
          contacted_by: string | null
          created_at: string
          first_path: string | null
          id: string
          phone: string
          referrer: string | null
          session_key: string | null
          source: string | null
          staff_notes: string | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          contacted_at?: string | null
          contacted_by?: string | null
          created_at?: string
          first_path?: string | null
          id?: string
          phone: string
          referrer?: string | null
          session_key?: string | null
          source?: string | null
          staff_notes?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          contacted_at?: string | null
          contacted_by?: string | null
          created_at?: string
          first_path?: string | null
          id?: string
          phone?: string
          referrer?: string | null
          session_key?: string | null
          source?: string | null
          staff_notes?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      visitor_pipeline_status: {
        Row: {
          created_at: string
          customer_user_id: string | null
          id: string
          notes: string | null
          stage: Database["public"]["Enums"]["visitor_pipeline_stage"]
          updated_at: string
          updated_by: string
          visitor_session_key: string | null
        }
        Insert: {
          created_at?: string
          customer_user_id?: string | null
          id?: string
          notes?: string | null
          stage?: Database["public"]["Enums"]["visitor_pipeline_stage"]
          updated_at?: string
          updated_by: string
          visitor_session_key?: string | null
        }
        Update: {
          created_at?: string
          customer_user_id?: string | null
          id?: string
          notes?: string | null
          stage?: Database["public"]["Enums"]["visitor_pipeline_stage"]
          updated_at?: string
          updated_by?: string
          visitor_session_key?: string | null
        }
        Relationships: []
      }
      visitor_session_views: {
        Row: {
          created_at: string
          customer_user_id: string | null
          first_viewed_at: string
          id: string
          last_viewed_at: string
          session_key: string | null
          staff_user_id: string
          view_count: number
        }
        Insert: {
          created_at?: string
          customer_user_id?: string | null
          first_viewed_at?: string
          id?: string
          last_viewed_at?: string
          session_key?: string | null
          staff_user_id: string
          view_count?: number
        }
        Update: {
          created_at?: string
          customer_user_id?: string | null
          first_viewed_at?: string
          id?: string
          last_viewed_at?: string
          session_key?: string | null
          staff_user_id?: string
          view_count?: number
        }
        Relationships: []
      }
      whatsapp_conversations: {
        Row: {
          assigned_to: string | null
          contact_name: string | null
          created_at: string
          customer_user_id: string | null
          id: string
          is_archived: boolean
          last_message_at: string
          last_message_preview: string | null
          phone: string
          unread_count: number
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          contact_name?: string | null
          created_at?: string
          customer_user_id?: string | null
          id?: string
          is_archived?: boolean
          last_message_at?: string
          last_message_preview?: string | null
          phone: string
          unread_count?: number
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          contact_name?: string | null
          created_at?: string
          customer_user_id?: string | null
          id?: string
          is_archived?: boolean
          last_message_at?: string
          last_message_preview?: string | null
          phone?: string
          unread_count?: number
          updated_at?: string
        }
        Relationships: []
      }
      whatsapp_messages: {
        Row: {
          body: string | null
          conversation_id: string
          created_at: string
          direction: string
          error_message: string | null
          id: string
          media_caption: string | null
          media_mime: string | null
          media_url: string | null
          message_type: string
          meta_message_id: string | null
          phone: string
          raw_payload: Json | null
          sent_by: string | null
          source: string
          status: string
        }
        Insert: {
          body?: string | null
          conversation_id: string
          created_at?: string
          direction: string
          error_message?: string | null
          id?: string
          media_caption?: string | null
          media_mime?: string | null
          media_url?: string | null
          message_type?: string
          meta_message_id?: string | null
          phone: string
          raw_payload?: Json | null
          sent_by?: string | null
          source?: string
          status?: string
        }
        Update: {
          body?: string | null
          conversation_id?: string
          created_at?: string
          direction?: string
          error_message?: string | null
          id?: string
          media_caption?: string | null
          media_mime?: string | null
          media_url?: string | null
          message_type?: string
          meta_message_id?: string | null
          phone?: string
          raw_payload?: Json | null
          sent_by?: string | null
          source?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_send_logs: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          lead_id: string | null
          message_preview: string | null
          phone: string
          provider_response: Json | null
          recipient_name: string | null
          status: string
          template: string | null
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          lead_id?: string | null
          message_preview?: string | null
          phone: string
          provider_response?: Json | null
          recipient_name?: string | null
          status?: string
          template?: string | null
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          lead_id?: string | null
          message_preview?: string | null
          phone?: string
          provider_response?: Json | null
          recipient_name?: string | null
          status?: string
          template?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_send_logs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      product_reviews_public: {
        Row: {
          comment: string | null
          created_at: string | null
          id: string | null
          is_approved: boolean | null
          product_id: string | null
          rating: number | null
          reviewer_name: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          id?: string | null
          is_approved?: boolean | null
          product_id?: string | null
          rating?: number | null
          reviewer_name?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          id?: string | null
          is_approved?: boolean | null
          product_id?: string | null
          rating?: number | null
          reviewer_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_daily_reports_kpi: {
        Row: {
          activity_score: number | null
          avg_order_value: number | null
          best_deal_today: string | null
          conversion_rate_pct: number | null
          customers_contacted: number | null
          customers_registered: number | null
          customers_with_invoices: number | null
          follow_ups_count: number | null
          general_notes: string | null
          hot_leads_count: number | null
          id: string | null
          is_locked: boolean | null
          leads_to_orders_pct: number | null
          locked_at: string | null
          lost_customers_count: number | null
          lost_reason: string | null
          performance_rating: number | null
          problems_faced: string | null
          quotes_count: number | null
          report_date: string | null
          staff_email: string | null
          staff_name: string | null
          staff_user_id: string | null
          submitted_at: string | null
          tomorrow_plan: string | null
          total_invoices_amount: number | null
        }
        Insert: {
          activity_score?: never
          avg_order_value?: never
          best_deal_today?: string | null
          conversion_rate_pct?: never
          customers_contacted?: number | null
          customers_registered?: number | null
          customers_with_invoices?: number | null
          follow_ups_count?: number | null
          general_notes?: string | null
          hot_leads_count?: number | null
          id?: string | null
          is_locked?: boolean | null
          leads_to_orders_pct?: never
          locked_at?: string | null
          lost_customers_count?: number | null
          lost_reason?: string | null
          performance_rating?: number | null
          problems_faced?: string | null
          quotes_count?: number | null
          report_date?: string | null
          staff_email?: string | null
          staff_name?: string | null
          staff_user_id?: string | null
          submitted_at?: string | null
          tomorrow_plan?: string | null
          total_invoices_amount?: number | null
        }
        Update: {
          activity_score?: never
          avg_order_value?: never
          best_deal_today?: string | null
          conversion_rate_pct?: never
          customers_contacted?: number | null
          customers_registered?: number | null
          customers_with_invoices?: number | null
          follow_ups_count?: number | null
          general_notes?: string | null
          hot_leads_count?: number | null
          id?: string | null
          is_locked?: boolean | null
          leads_to_orders_pct?: never
          locked_at?: string | null
          lost_customers_count?: number | null
          lost_reason?: string | null
          performance_rating?: number | null
          problems_faced?: string | null
          quotes_count?: number | null
          report_date?: string | null
          staff_email?: string | null
          staff_name?: string | null
          staff_user_id?: string | null
          submitted_at?: string | null
          tomorrow_plan?: string | null
          total_invoices_amount?: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      bulk_import_products: { Args: { _items: Json }; Returns: Json }
      bulk_sync_stock: { Args: { _items: Json }; Returns: Json }
      bulk_update_product_prices: { Args: { _items: Json }; Returns: Json }
      bulk_upsert_wholesale_prices: { Args: { _items: Json }; Returns: Json }
      check_dealer_application_exists: {
        Args: { _email?: string; _phone?: string }
        Returns: Json
      }
      check_rate_limit: {
        Args: {
          _action: string
          _identifier: string
          _max_requests: number
          _window_seconds?: number
        }
        Returns: boolean
      }
      extract_models_from_name: { Args: { p_name: string }; Returns: string[] }
      extract_part_family: { Args: { p_name: string }; Returns: string }
      extract_year_from_name: { Args: { p_name: string }; Returns: number }
      generate_order_number: { Args: never; Returns: string }
      get_best_selling_products: {
        Args: { _limit?: number }
        Returns: string[]
      }
      get_daily_view_count: { Args: { _user_id: string }; Returns: number }
      get_reporter_aggregate: {
        Args: { _from: string; _to: string; _user_id: string }
        Returns: {
          auto_invoices_count: number
          auto_orders_count: number
          auto_total_sales: number
          calls_count: number
          followups_count: number
          incomplete_orders_count: number
          lost_opportunities_count: number
          new_customers_count: number
          offers_converted_count: number
          offers_sent_count: number
          performance_score: number
          quotations_count: number
          reports_count: number
          whatsapp_count: number
        }[]
      }
      get_reporter_leaderboard: {
        Args: { _from: string; _to: string }
        Returns: {
          calls_total: number
          converted_total: number
          new_customers_total: number
          performance_score: number
          quotations_total: number
          reports_count: number
          staff_email: string
          staff_name: string
          user_id: string
        }[]
      }
      get_staff_auto_metrics: {
        Args: { _date: string; _staff_user_id: string }
        Returns: {
          leads_count: number
          orders_count: number
          total_sales: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_reporter_only: { Args: { _user_id: string }; Returns: boolean }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      normalize_eg_phone: { Args: { raw: string }; Returns: string }
      phone_already_registered: { Args: { _phone: string }; Returns: boolean }
      recompute_product_year_coverage: { Args: never; Returns: undefined }
      search_products_by_year: {
        Args: { p_model?: string; p_query?: string; p_year?: number }
        Returns: {
          base_price: number
          brand: Database["public"]["Enums"]["product_brand"]
          category_id: string | null
          compatible_models: string[] | null
          created_at: string
          description_ar: string | null
          description_en: string | null
          erp_item_code: string | null
          id: string
          image_url: string | null
          is_active: boolean
          is_featured: boolean
          is_on_sale: boolean
          max_order_cap: number | null
          min_order_qty: number
          name_ar: string
          name_en: string | null
          safety_stock: number
          sale_price: number | null
          sku: string
          stock_quantity: number
          updated_at: string
          year_from: number | null
          year_to: number | null
        }[]
        SetofOptions: {
          from: "*"
          to: "products"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      user_team_ids: { Args: { _user_id: string }; Returns: string[] }
      validate_coupon: {
        Args: { _code: string }
        Returns: {
          applies_to_brands: string[]
          code: string
          description: string
          discount_type: string
          discount_value: number
          id: string
          max_discount_amount: number
          min_order_amount: number
        }[]
      }
      verify_otp_code: {
        Args: { _code: string; _phone: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user" | "reporter"
      application_status: "pending" | "approved" | "rejected" | "suspended"
      client_type: "wholesale" | "company" | "workshop" | "distributor"
      customer_tier:
        | "wholesale_tier1"
        | "wholesale_tier2"
        | "corporate"
        | "retail"
      product_brand:
        | "toyota_genuine"
        | "toyota_oils"
        | "mtx_aftermarket"
        | "denso"
        | "aisin"
        | "fbk"
      visitor_pipeline_stage:
        | "new"
        | "interested"
        | "quote_sent"
        | "contacted"
        | "not_interested"
        | "won"
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
      app_role: ["admin", "moderator", "user", "reporter"],
      application_status: ["pending", "approved", "rejected", "suspended"],
      client_type: ["wholesale", "company", "workshop", "distributor"],
      customer_tier: [
        "wholesale_tier1",
        "wholesale_tier2",
        "corporate",
        "retail",
      ],
      product_brand: [
        "toyota_genuine",
        "toyota_oils",
        "mtx_aftermarket",
        "denso",
        "aisin",
        "fbk",
      ],
      visitor_pipeline_stage: [
        "new",
        "interested",
        "quote_sent",
        "contacted",
        "not_interested",
        "won",
      ],
    },
  },
} as const
