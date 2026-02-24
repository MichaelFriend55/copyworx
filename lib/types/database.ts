/**
 * @file lib/types/database.ts
 * @description TypeScript types for Supabase database schema
 * 
 * This file defines the database schema types for type-safe
 * Supabase operations. Update this file when schema changes.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

/**
 * Database schema types for Supabase
 */
export interface Database {
  public: {
    Tables: {
      /**
       * Projects table - Top-level organizational unit
       */
      projects: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          created_at?: string;
          updated_at?: string;
        };
      };

      /**
       * Documents table - Copywriting content with version control
       */
      documents: {
        Row: {
          id: string;
          project_id: string;
          user_id: string;
          base_title: string;
          title: string;
          version: number;
          parent_version_id: string | null;
          folder_id: string | null;
          content: string;
          metadata: Json | null;
          template_progress: Json | null;
          created_at: string;
          modified_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          user_id: string;
          base_title: string;
          title: string;
          version?: number;
          parent_version_id?: string | null;
          folder_id?: string | null;
          content?: string;
          metadata?: Json | null;
          template_progress?: Json | null;
          created_at?: string;
          modified_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          user_id?: string;
          base_title?: string;
          title?: string;
          version?: number;
          parent_version_id?: string | null;
          folder_id?: string | null;
          content?: string;
          metadata?: Json | null;
          template_progress?: Json | null;
          created_at?: string;
          modified_at?: string;
        };
      };

      /**
       * Brand voices table - Brand configuration per project
       */
      brand_voices: {
        Row: {
          id: string;
          project_id: string;
          user_id: string;
          brand_name: string;
          brand_tone: string;
          approved_phrases: string[];
          forbidden_words: string[];
          brand_values: string[];
          mission_statement: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          user_id: string;
          brand_name: string;
          brand_tone?: string;
          approved_phrases?: string[];
          forbidden_words?: string[];
          brand_values?: string[];
          mission_statement?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          user_id?: string;
          brand_name?: string;
          brand_tone?: string;
          approved_phrases?: string[];
          forbidden_words?: string[];
          brand_values?: string[];
          mission_statement?: string;
          created_at?: string;
          updated_at?: string;
        };
      };

      /**
       * Personas table - Target audience profiles
       */
      personas: {
        Row: {
          id: string;
          project_id: string;
          user_id: string;
          name: string;
          photo_url: string | null;
          demographics: string;
          psychographics: string;
          pain_points: string;
          language_patterns: string;
          goals: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          user_id: string;
          name: string;
          photo_url?: string | null;
          demographics?: string;
          psychographics?: string;
          pain_points?: string;
          language_patterns?: string;
          goals?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          user_id?: string;
          name?: string;
          photo_url?: string | null;
          demographics?: string;
          psychographics?: string;
          pain_points?: string;
          language_patterns?: string;
          goals?: string;
          created_at?: string;
          updated_at?: string;
        };
      };

      /**
       * Folders table - Document organization
       */
      folders: {
        Row: {
          id: string;
          project_id: string;
          user_id: string;
          name: string;
          parent_folder_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          user_id: string;
          name: string;
          parent_folder_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          user_id?: string;
          name?: string;
          parent_folder_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };

      /**
       * Snippets table - Reusable copy elements
       */
      snippets: {
        Row: {
          id: string;
          project_id: string;
          user_id: string;
          name: string;
          content: string;
          description: string | null;
          tags: string[] | null;
          usage_count: number;
          created_at: string;
          modified_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          user_id: string;
          name: string;
          content: string;
          description?: string | null;
          tags?: string[] | null;
          usage_count?: number;
          created_at?: string;
          modified_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          user_id?: string;
          name?: string;
          content?: string;
          description?: string | null;
          tags?: string[] | null;
          usage_count?: number;
          created_at?: string;
          modified_at?: string;
        };
      };

      /**
       * Users table - Stripe subscription data keyed by Clerk user ID
       */
      users: {
        Row: {
          id: string;
          user_id: string;
          stripe_customer_id: string | null;
          subscription_status: string;
          subscription_end_date: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          stripe_customer_id?: string | null;
          subscription_status?: string;
          subscription_end_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          stripe_customer_id?: string | null;
          subscription_status?: string;
          subscription_end_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };

      /**
       * User settings table - Per-user preferences
       */
      user_settings: {
        Row: {
          id: string;
          user_id: string;
          active_project_id: string | null;
          settings: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          active_project_id?: string | null;
          settings?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          active_project_id?: string | null;
          settings?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };

      /**
       * API usage logs table - Tracks Claude API token usage per user
       */
      api_usage_logs: {
        Row: {
          id: string;
          user_id: string;
          timestamp: string;
          model: string;
          input_tokens: number;
          output_tokens: number;
          total_tokens: number;
          feature: string;
          cost_usd: number;
        };
        Insert: {
          id?: string;
          user_id: string;
          timestamp?: string;
          model: string;
          input_tokens: number;
          output_tokens: number;
          feature: string;
          cost_usd: number;
        };
        Update: {
          id?: string;
          user_id?: string;
          timestamp?: string;
          model?: string;
          input_tokens?: number;
          output_tokens?: number;
          feature?: string;
          cost_usd?: number;
        };
      };
    };
    Views: {
      /**
       * User usage summary view - Aggregated usage statistics per user
       */
      user_usage_summary: {
        Row: {
          user_id: string;
          total_api_calls: number;
          total_input_tokens: number;
          total_output_tokens: number;
          total_tokens_used: number;
          total_cost_usd: number;
          last_api_call: string | null;
        };
      };
      /**
       * User usage current month view - Monthly usage for limit enforcement
       */
      user_usage_current_month: {
        Row: {
          user_id: string;
          api_calls_this_month: number;
          input_tokens_this_month: number;
          output_tokens_this_month: number;
          total_tokens_this_month: number;
          cost_this_month: number;
          last_api_call: string | null;
        };
      };
      /**
       * User usage today view - Daily usage for rate limiting
       */
      user_usage_today: {
        Row: {
          user_id: string;
          api_calls_today: number;
          tokens_today: number;
          cost_today: number;
        };
      };
    };
    Functions: {
      /**
       * Get user usage for a specific period
       */
      get_user_usage: {
        Args: {
          p_user_id: string;
          p_start_date?: string | null;
          p_end_date?: string | null;
        };
        Returns: {
          total_api_calls: number;
          total_input_tokens: number;
          total_output_tokens: number;
          total_tokens: number;
          total_cost: number;
        }[];
      };
      /**
       * Check if user is within beta limits
       */
      check_user_within_limits: {
        Args: {
          p_user_id: string;
          p_monthly_token_limit?: number;
          p_daily_token_limit?: number;
        };
        Returns: {
          within_monthly_limit: boolean;
          within_daily_limit: boolean;
          monthly_tokens_used: number;
          daily_tokens_used: number;
          monthly_tokens_remaining: number;
          daily_tokens_remaining: number;
        }[];
      };
    };
    Enums: {
      [_ in never]: never;
    };
  };
}

/**
 * Helper type to extract Row type from a table
 */
export type TableRow<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];

/**
 * Helper type to extract Insert type from a table
 */
export type TableInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];

/**
 * Helper type to extract Update type from a table
 */
export type TableUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];
