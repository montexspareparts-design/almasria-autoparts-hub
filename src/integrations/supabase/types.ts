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
      dealer_accounts: {
        Row: {
          application_id: string | null
          created_at: string
          credit_limit: number | null
          custom_discount: number | null
          id: string
          is_active: boolean
          min_order_amount: number | null
          notes: string | null
          tier: Database["public"]["Enums"]["customer_tier"]
          updated_at: string
          user_id: string
        }
        Insert: {
          application_id?: string | null
          created_at?: string
          credit_limit?: number | null
          custom_discount?: number | null
          id?: string
          is_active?: boolean
          min_order_amount?: number | null
          notes?: string | null
          tier?: Database["public"]["Enums"]["customer_tier"]
          updated_at?: string
          user_id: string
        }
        Update: {
          application_id?: string | null
          created_at?: string
          credit_limit?: number | null
          custom_discount?: number | null
          id?: string
          is_active?: boolean
          min_order_amount?: number | null
          notes?: string | null
          tier?: Database["public"]["Enums"]["customer_tier"]
          updated_at?: string
          user_id?: string
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
          created_at: string
          id: string
          invoice_url: string | null
          notes: string | null
          order_number: string
          payment_method: string | null
          shipping_address: string | null
          shipping_governorate: string | null
          status: string
          total_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invoice_url?: string | null
          notes?: string | null
          order_number: string
          payment_method?: string | null
          shipping_address?: string | null
          shipping_governorate?: string | null
          status?: string
          total_amount?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invoice_url?: string | null
          notes?: string | null
          order_number?: string
          payment_method?: string | null
          shipping_address?: string | null
          shipping_governorate?: string | null
          status?: string
          total_amount?: number
          updated_at?: string
          user_id?: string
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
          created_at: string
          description_ar: string | null
          description_en: string | null
          id: string
          image_url: string | null
          is_active: boolean
          min_order_qty: number
          name_ar: string
          name_en: string | null
          sku: string
          stock_quantity: number
          updated_at: string
        }
        Insert: {
          base_price?: number
          brand: Database["public"]["Enums"]["product_brand"]
          category_id?: string | null
          created_at?: string
          description_ar?: string | null
          description_en?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          min_order_qty?: number
          name_ar: string
          name_en?: string | null
          sku: string
          stock_quantity?: number
          updated_at?: string
        }
        Update: {
          base_price?: number
          brand?: Database["public"]["Enums"]["product_brand"]
          category_id?: string | null
          created_at?: string
          description_ar?: string | null
          description_en?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          min_order_qty?: number
          name_ar?: string
          name_en?: string | null
          sku?: string
          stock_quantity?: number
          updated_at?: string
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
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_daily_view_count: { Args: { _user_id: string }; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      application_status: "pending" | "approved" | "rejected" | "suspended"
      client_type: "wholesale" | "company" | "workshop" | "distributor"
      customer_tier:
        | "wholesale_tier1"
        | "wholesale_tier2"
        | "corporate"
        | "retail"
      product_brand: "toyota_genuine" | "toyota_oils" | "mtx_aftermarket"
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
      app_role: ["admin", "moderator", "user"],
      application_status: ["pending", "approved", "rejected", "suspended"],
      client_type: ["wholesale", "company", "workshop", "distributor"],
      customer_tier: [
        "wholesale_tier1",
        "wholesale_tier2",
        "corporate",
        "retail",
      ],
      product_brand: ["toyota_genuine", "toyota_oils", "mtx_aftermarket"],
    },
  },
} as const
