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
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
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
