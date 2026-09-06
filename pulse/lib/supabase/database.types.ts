/**
 * GENERATED FILE — do not edit by hand.
 *
 * Regenerate after every migration:
 *   supabase gen types typescript --project-id <ref> > lib/supabase/database.types.ts
 * or, offline (no Docker needed):
 *   node supabase/scripts/gen-types.mjs <postgres-url> 
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      achievements: {
        Row: {
          created_at: string;
          group_key: string;
          key: string;
          sort_order: number;
          target: number | null;
        };
        Insert: {
          created_at?: string;
          group_key: string;
          key: string;
          sort_order?: number;
          target?: number | null;
        };
        Update: {
          created_at?: string;
          group_key?: string;
          key?: string;
          sort_order?: number;
          target?: number | null;
        };
        Relationships: [];
      };
      bookings: {
        Row: {
          cancelled_at: string | null;
          checked_in_at: string | null;
          created_at: string;
          credit_cost: number;
          from_waitlist: boolean;
          id: string;
          member_id: string;
          payout_eur: number;
          qr_token: string;
          session_id: string;
          status: Database["public"]["Enums"]["pulse_booking_status"];
          studio_id: string;
        };
        Insert: {
          cancelled_at?: string | null;
          checked_in_at?: string | null;
          created_at?: string;
          credit_cost: number;
          from_waitlist?: boolean;
          id?: string;
          member_id: string;
          payout_eur?: number;
          qr_token?: string;
          session_id: string;
          status?: Database["public"]["Enums"]["pulse_booking_status"];
          studio_id: string;
        };
        Update: {
          cancelled_at?: string | null;
          checked_in_at?: string | null;
          created_at?: string;
          credit_cost?: number;
          from_waitlist?: boolean;
          id?: string;
          member_id?: string;
          payout_eur?: number;
          qr_token?: string;
          session_id?: string;
          status?: Database["public"]["Enums"]["pulse_booking_status"];
          studio_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "bookings_studio_id_fkey";
            columns: ["studio_id"];
            isOneToOne: false;
            referencedRelation: "studios";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bookings_member_id_fkey";
            columns: ["member_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bookings_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "sessions";
            referencedColumns: ["id"];
          },
        ];
      };
      categories: {
        Row: {
          id: string;
          name_el: string;
          name_en: string;
          palette: number;
        };
        Insert: {
          id: string;
          name_el: string;
          name_en: string;
          palette?: number;
        };
        Update: {
          id?: string;
          name_el?: string;
          name_en?: string;
          palette?: number;
        };
        Relationships: [];
      };
      cities: {
        Row: {
          id: string;
          lat: number;
          lng: number;
          name_el: string;
          name_en: string;
          zoom: number;
        };
        Insert: {
          id: string;
          lat: number;
          lng: number;
          name_el: string;
          name_en: string;
          zoom?: number;
        };
        Update: {
          id?: string;
          lat?: number;
          lng?: number;
          name_el?: string;
          name_en?: string;
          zoom?: number;
        };
        Relationships: [];
      };
      class_types: {
        Row: {
          category_id: string;
          created_at: string;
          description_el: string;
          description_en: string;
          duration_min: number;
          id: string;
          level: Database["public"]["Enums"]["pulse_class_level"];
          name: string;
          studio_id: string;
        };
        Insert: {
          category_id: string;
          created_at?: string;
          description_el?: string;
          description_en?: string;
          duration_min: number;
          id: string;
          level?: Database["public"]["Enums"]["pulse_class_level"];
          name: string;
          studio_id: string;
        };
        Update: {
          category_id?: string;
          created_at?: string;
          description_el?: string;
          description_en?: string;
          duration_min?: number;
          id?: string;
          level?: Database["public"]["Enums"]["pulse_class_level"];
          name?: string;
          studio_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "class_types_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "class_types_studio_id_fkey";
            columns: ["studio_id"];
            isOneToOne: false;
            referencedRelation: "studios";
            referencedColumns: ["id"];
          },
        ];
      };
      credit_transactions: {
        Row: {
          booking_id: string | null;
          created_at: string;
          delta: number;
          id: string;
          member_id: string;
          reason: Database["public"]["Enums"]["pulse_credit_tx_reason"];
          settled_at: string | null;
          status: Database["public"]["Enums"]["pulse_credit_tx_status"];
          studio_id: string | null;
          type: Database["public"]["Enums"]["pulse_credit_tx_type"];
        };
        Insert: {
          booking_id?: string | null;
          created_at?: string;
          delta: number;
          id?: string;
          member_id: string;
          reason: Database["public"]["Enums"]["pulse_credit_tx_reason"];
          settled_at?: string | null;
          status?: Database["public"]["Enums"]["pulse_credit_tx_status"];
          studio_id?: string | null;
          type: Database["public"]["Enums"]["pulse_credit_tx_type"];
        };
        Update: {
          booking_id?: string | null;
          created_at?: string;
          delta?: number;
          id?: string;
          member_id?: string;
          reason?: Database["public"]["Enums"]["pulse_credit_tx_reason"];
          settled_at?: string | null;
          status?: Database["public"]["Enums"]["pulse_credit_tx_status"];
          studio_id?: string | null;
          type?: Database["public"]["Enums"]["pulse_credit_tx_type"];
        };
        Relationships: [
          {
            foreignKeyName: "credit_transactions_studio_id_fkey";
            columns: ["studio_id"];
            isOneToOne: false;
            referencedRelation: "studios";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "credit_transactions_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: false;
            referencedRelation: "bookings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "credit_transactions_member_id_fkey";
            columns: ["member_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      engagement_prefs: {
        Row: {
          member_id: string;
          nudges_enabled: boolean;
          nudges_muted_until: string | null;
          updated_at: string;
        };
        Insert: {
          member_id: string;
          nudges_enabled?: boolean;
          nudges_muted_until?: string | null;
          updated_at?: string;
        };
        Update: {
          member_id?: string;
          nudges_enabled?: boolean;
          nudges_muted_until?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "engagement_prefs_member_id_fkey";
            columns: ["member_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      favorites: {
        Row: {
          created_at: string;
          member_id: string;
          studio_id: string;
        };
        Insert: {
          created_at?: string;
          member_id: string;
          studio_id: string;
        };
        Update: {
          created_at?: string;
          member_id?: string;
          studio_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "favorites_studio_id_fkey";
            columns: ["studio_id"];
            isOneToOne: false;
            referencedRelation: "studios";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "favorites_member_id_fkey";
            columns: ["member_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      goals: {
        Row: {
          member_id: string;
          updated_at: string;
          weekly_target: number;
        };
        Insert: {
          member_id: string;
          updated_at?: string;
          weekly_target?: number;
        };
        Update: {
          member_id?: string;
          updated_at?: string;
          weekly_target?: number;
        };
        Relationships: [
          {
            foreignKeyName: "goals_member_id_fkey";
            columns: ["member_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      member_achievements: {
        Row: {
          achievement_key: string;
          member_id: string;
          unlocked_at: string;
        };
        Insert: {
          achievement_key: string;
          member_id: string;
          unlocked_at?: string;
        };
        Update: {
          achievement_key?: string;
          member_id?: string;
          unlocked_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "member_achievements_achievement_key_fkey";
            columns: ["achievement_key"];
            isOneToOne: false;
            referencedRelation: "achievements";
            referencedColumns: ["key"];
          },
          {
            foreignKeyName: "member_achievements_member_id_fkey";
            columns: ["member_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      neighborhoods: {
        Row: {
          city_id: string;
          id: string;
          name_el: string;
          name_en: string;
        };
        Insert: {
          city_id: string;
          id: string;
          name_el: string;
          name_en: string;
        };
        Update: {
          city_id?: string;
          id?: string;
          name_el?: string;
          name_en?: string;
        };
        Relationships: [
          {
            foreignKeyName: "neighborhoods_city_id_fkey";
            columns: ["city_id"];
            isOneToOne: false;
            referencedRelation: "cities";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          body_el: string;
          body_en: string;
          created_at: string;
          href: string | null;
          id: string;
          kind: Database["public"]["Enums"]["pulse_notification_kind"];
          member_id: string;
          read: boolean;
          title_el: string;
          title_en: string;
        };
        Insert: {
          body_el?: string;
          body_en?: string;
          created_at?: string;
          href?: string | null;
          id?: string;
          kind: Database["public"]["Enums"]["pulse_notification_kind"];
          member_id: string;
          read?: boolean;
          title_el: string;
          title_en: string;
        };
        Update: {
          body_el?: string;
          body_en?: string;
          created_at?: string;
          href?: string | null;
          id?: string;
          kind?: Database["public"]["Enums"]["pulse_notification_kind"];
          member_id?: string;
          read?: boolean;
          title_el?: string;
          title_en?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_member_id_fkey";
            columns: ["member_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      nudge_deliveries: {
        Row: {
          delivered_at: string;
          member_id: string;
          nudge_id: string;
        };
        Insert: {
          delivered_at?: string;
          member_id: string;
          nudge_id: string;
        };
        Update: {
          delivered_at?: string;
          member_id?: string;
          nudge_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "nudge_deliveries_member_id_fkey";
            columns: ["member_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      payout_entries: {
        Row: {
          amount_eur: number;
          booking_id: string;
          confirmed_at: string | null;
          created_at: string;
          id: string;
          member_id: string;
          session_id: string;
          status: Database["public"]["Enums"]["pulse_payout_status"];
          studio_id: string;
        };
        Insert: {
          amount_eur: number;
          booking_id: string;
          confirmed_at?: string | null;
          created_at?: string;
          id?: string;
          member_id: string;
          session_id: string;
          status?: Database["public"]["Enums"]["pulse_payout_status"];
          studio_id: string;
        };
        Update: {
          amount_eur?: number;
          booking_id?: string;
          confirmed_at?: string | null;
          created_at?: string;
          id?: string;
          member_id?: string;
          session_id?: string;
          status?: Database["public"]["Enums"]["pulse_payout_status"];
          studio_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payout_entries_member_id_fkey";
            columns: ["member_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payout_entries_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payout_entries_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: false;
            referencedRelation: "bookings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payout_entries_studio_id_fkey";
            columns: ["studio_id"];
            isOneToOne: false;
            referencedRelation: "studios";
            referencedColumns: ["id"];
          },
        ];
      };
      plans: {
        Row: {
          blurb_el: string;
          blurb_en: string;
          credits_per_cycle: number;
          highlight: boolean;
          id: string;
          name_el: string;
          name_en: string;
          price_eur: number;
          sort_order: number;
        };
        Insert: {
          blurb_el: string;
          blurb_en: string;
          credits_per_cycle: number;
          highlight?: boolean;
          id: string;
          name_el: string;
          name_en: string;
          price_eur: number;
          sort_order?: number;
        };
        Update: {
          blurb_el?: string;
          blurb_en?: string;
          credits_per_cycle?: number;
          highlight?: boolean;
          id?: string;
          name_el?: string;
          name_en?: string;
          price_eur?: number;
          sort_order?: number;
        };
        Relationships: [];
      };
      platform_policy: {
        Row: {
          default_cancellation_cutoff_hours: number;
          id: boolean;
          late_cancel_fee_credits: number;
          no_show_fee_credits: number;
          rolling_window_days: number;
          top_up_packs: Json;
          updated_at: string;
          visit_cap_per_studio_per_month: number;
        };
        Insert: {
          default_cancellation_cutoff_hours: number;
          id?: boolean;
          late_cancel_fee_credits: number;
          no_show_fee_credits: number;
          rolling_window_days: number;
          top_up_packs: Json;
          updated_at?: string;
          visit_cap_per_studio_per_month: number;
        };
        Update: {
          default_cancellation_cutoff_hours?: number;
          id?: boolean;
          late_cancel_fee_credits?: number;
          no_show_fee_credits?: number;
          rolling_window_days?: number;
          top_up_packs?: Json;
          updated_at?: string;
          visit_cap_per_studio_per_month?: number;
        };
        Relationships: [];
      };
      pricing_config: {
        Row: {
          eur_per_credit: number;
          fill_bands: Json;
          id: boolean;
          max_credits: number;
          min_credits: number;
          off_peak_multiplier: number;
          peak_multiplier: number;
          updated_at: string;
        };
        Insert: {
          eur_per_credit: number;
          fill_bands: Json;
          id?: boolean;
          max_credits: number;
          min_credits: number;
          off_peak_multiplier: number;
          peak_multiplier: number;
          updated_at?: string;
        };
        Update: {
          eur_per_credit?: number;
          fill_bands?: Json;
          id?: boolean;
          max_credits?: number;
          min_credits?: number;
          off_peak_multiplier?: number;
          peak_multiplier?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          display_name: string;
          email: string | null;
          home_city_id: string | null;
          home_neighborhood_id: string | null;
          id: string;
          member_since: string;
          role: Database["public"]["Enums"]["pulse_role"];
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          display_name: string;
          email?: string | null;
          home_city_id?: string | null;
          home_neighborhood_id?: string | null;
          id: string;
          member_since?: string;
          role?: Database["public"]["Enums"]["pulse_role"];
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          display_name?: string;
          email?: string | null;
          home_city_id?: string | null;
          home_neighborhood_id?: string | null;
          id?: string;
          member_since?: string;
          role?: Database["public"]["Enums"]["pulse_role"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_home_neighborhood_id_fkey";
            columns: ["home_neighborhood_id"];
            isOneToOne: false;
            referencedRelation: "neighborhoods";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "profiles_home_city_id_fkey";
            columns: ["home_city_id"];
            isOneToOne: false;
            referencedRelation: "cities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "profiles_id_fkey";
            columns: ["id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      reviews: {
        Row: {
          author_name: string;
          body: string;
          created_at: string;
          id: string;
          lang: string;
          member_id: string | null;
          rating: number;
          studio_id: string;
        };
        Insert: {
          author_name: string;
          body: string;
          created_at?: string;
          id?: string;
          lang?: string;
          member_id?: string | null;
          rating: number;
          studio_id: string;
        };
        Update: {
          author_name?: string;
          body?: string;
          created_at?: string;
          id?: string;
          lang?: string;
          member_id?: string | null;
          rating?: number;
          studio_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reviews_member_id_fkey";
            columns: ["member_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reviews_studio_id_fkey";
            columns: ["studio_id"];
            isOneToOne: false;
            referencedRelation: "studios";
            referencedColumns: ["id"];
          },
        ];
      };
      sessions: {
        Row: {
          capacity: number;
          class_type_id: string;
          created_at: string;
          duration_min: number;
          end_at: string | null;
          floor_price_eur: number;
          id: string;
          instructor: string;
          is_peak: boolean;
          seed_booked: number;
          spots_released_to_platform: number;
          start_at: string;
          status: Database["public"]["Enums"]["pulse_session_status"];
          studio_id: string;
          updated_at: string;
        };
        Insert: {
          capacity: number;
          class_type_id: string;
          created_at?: string;
          duration_min: number;
          end_at?: string | null;
          floor_price_eur: number;
          id: string;
          instructor?: string;
          is_peak?: boolean;
          seed_booked?: number;
          spots_released_to_platform: number;
          start_at: string;
          status?: Database["public"]["Enums"]["pulse_session_status"];
          studio_id: string;
          updated_at?: string;
        };
        Update: {
          capacity?: number;
          class_type_id?: string;
          created_at?: string;
          duration_min?: number;
          end_at?: string | null;
          floor_price_eur?: number;
          id?: string;
          instructor?: string;
          is_peak?: boolean;
          seed_booked?: number;
          spots_released_to_platform?: number;
          start_at?: string;
          status?: Database["public"]["Enums"]["pulse_session_status"];
          studio_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sessions_class_type_id_fkey";
            columns: ["class_type_id"];
            isOneToOne: false;
            referencedRelation: "class_types";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sessions_studio_id_fkey";
            columns: ["studio_id"];
            isOneToOne: false;
            referencedRelation: "studios";
            referencedColumns: ["id"];
          },
        ];
      };
      studio_categories: {
        Row: {
          category_id: string;
          sort_order: number;
          studio_id: string;
        };
        Insert: {
          category_id: string;
          sort_order?: number;
          studio_id: string;
        };
        Update: {
          category_id?: string;
          sort_order?: number;
          studio_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "studio_categories_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "studio_categories_studio_id_fkey";
            columns: ["studio_id"];
            isOneToOne: false;
            referencedRelation: "studios";
            referencedColumns: ["id"];
          },
        ];
      };
      studios: {
        Row: {
          address: string;
          amenities: string[];
          art_seed: number;
          cancellation_cutoff_hours: number;
          city_id: string;
          created_at: string;
          default_floor_price_eur: number;
          description_el: string;
          description_en: string;
          featured: boolean;
          id: string;
          lat: number;
          lng: number;
          name: string;
          neighborhood_id: string;
          owner_id: string | null;
          photos: string[];
          rating: number;
          review_count: number;
          updated_at: string;
        };
        Insert: {
          address?: string;
          amenities?: string[];
          art_seed?: number;
          cancellation_cutoff_hours?: number;
          city_id: string;
          created_at?: string;
          default_floor_price_eur: number;
          description_el?: string;
          description_en?: string;
          featured?: boolean;
          id: string;
          lat: number;
          lng: number;
          name: string;
          neighborhood_id: string;
          owner_id?: string | null;
          photos?: string[];
          rating?: number;
          review_count?: number;
          updated_at?: string;
        };
        Update: {
          address?: string;
          amenities?: string[];
          art_seed?: number;
          cancellation_cutoff_hours?: number;
          city_id?: string;
          created_at?: string;
          default_floor_price_eur?: number;
          description_el?: string;
          description_en?: string;
          featured?: boolean;
          id?: string;
          lat?: number;
          lng?: number;
          name?: string;
          neighborhood_id?: string;
          owner_id?: string | null;
          photos?: string[];
          rating?: number;
          review_count?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "studios_neighborhood_id_fkey";
            columns: ["neighborhood_id"];
            isOneToOne: false;
            referencedRelation: "neighborhoods";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "studios_city_id_fkey";
            columns: ["city_id"];
            isOneToOne: false;
            referencedRelation: "cities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "studios_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      subscriptions: {
        Row: {
          created_at: string;
          credits_per_cycle: number;
          cycle_end: string;
          cycle_start: string;
          id: string;
          member_id: string;
          plan_id: string;
          price_eur: number;
          status: Database["public"]["Enums"]["pulse_subscription_status"];
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          credits_per_cycle: number;
          cycle_end: string;
          cycle_start: string;
          id?: string;
          member_id: string;
          plan_id: string;
          price_eur: number;
          status?: Database["public"]["Enums"]["pulse_subscription_status"];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          credits_per_cycle?: number;
          cycle_end?: string;
          cycle_start?: string;
          id?: string;
          member_id?: string;
          plan_id?: string;
          price_eur?: number;
          status?: Database["public"]["Enums"]["pulse_subscription_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_id_fkey";
            columns: ["plan_id"];
            isOneToOne: false;
            referencedRelation: "plans";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "subscriptions_member_id_fkey";
            columns: ["member_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      waitlist_entries: {
        Row: {
          created_at: string;
          hold_credits: number;
          id: string;
          member_id: string;
          position: number;
          session_id: string;
          studio_id: string;
        };
        Insert: {
          created_at?: string;
          hold_credits?: number;
          id?: string;
          member_id: string;
          position: number;
          session_id: string;
          studio_id: string;
        };
        Update: {
          created_at?: string;
          hold_credits?: number;
          id?: string;
          member_id?: string;
          position?: number;
          session_id?: string;
          studio_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "waitlist_entries_member_id_fkey";
            columns: ["member_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "waitlist_entries_studio_id_fkey";
            columns: ["studio_id"];
            isOneToOne: false;
            referencedRelation: "studios";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "waitlist_entries_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "sessions";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      session_view: {
        Row: {
          booked: number | null;
          capacity: number | null;
          class_type_id: string | null;
          credit_cost: number | null;
          duration_min: number | null;
          end_at: string | null;
          floor_price_eur: number | null;
          id: string | null;
          instructor: string | null;
          is_peak: boolean | null;
          seed_booked: number | null;
          spots_left: number | null;
          spots_released_to_platform: number | null;
          start_at: string | null;
          status: Database["public"]["Enums"]["pulse_session_status"] | null;
          studio_id: string | null;
          waitlist_count: number | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      assert: {
        Args: {
          cond: boolean;
          msg: string;
        };
        Returns: unknown;
      };
      become: {
        Args: {
          p: string;
        };
        Returns: unknown;
      };
      book_session: {
        Args: {
          p_session_id: string;
        };
        Returns: unknown;
      };
      cancel_booking: {
        Args: {
          p_booking_id: string;
        };
        Returns: unknown;
      };
      cancel_session: {
        Args: {
          p_session_id: string;
        };
        Returns: unknown;
      };
      change_plan: {
        Args: {
          p_plan_id: string;
        };
        Returns: unknown;
      };
      check_in: {
        Args: {
          p_booking_id: string;
        };
        Returns: unknown;
      };
      ensure_cycle_current: {
        Args: {
          p_member_id?: string;
        };
        Returns: unknown;
      };
      join_waitlist: {
        Args: {
          p_session_id: string;
        };
        Returns: unknown;
      };
      leave_waitlist: {
        Args: {
          p_session_id: string;
        };
        Returns: unknown;
      };
      mark_no_show: {
        Args: {
          p_booking_id: string;
        };
        Returns: unknown;
      };
      promote_waitlist: {
        Args: {
          p_session_id: string;
        };
        Returns: unknown;
      };
      pulse_balance: {
        Args: {
          p_member_id: string;
        };
        Returns: unknown;
      };
      pulse_cap_reached: {
        Args: {
          p_member_id: string;
          p_studio_id: string;
          p_at?: string;
        };
        Returns: unknown;
      };
      pulse_credit_cost: {
        Args: {
          p_floor_price_eur: number;
          p_is_peak: boolean;
          p_fill_ratio: number;
        };
        Returns: unknown;
      };
      pulse_is_studio_owner: {
        Args: {
          p_studio_id: string;
        };
        Returns: unknown;
      };
      pulse_notify: {
        Args: {
          p_member_id: string;
          p_kind: Database["public"]["Enums"]["pulse_notification_kind"];
          p_title_el: string;
          p_title_en: string;
          p_body_el: string;
          p_body_en: string;
          p_href?: string;
        };
        Returns: unknown;
      };
      pulse_owns_session: {
        Args: {
          p_session_id: string;
        };
        Returns: unknown;
      };
      pulse_renumber_waitlist: {
        Args: {
          p_session_id: string;
        };
        Returns: unknown;
      };
      pulse_session_booked: {
        Args: {
          p_session_id: string;
        };
        Returns: unknown;
      };
      pulse_session_credit_cost: {
        Args: {
          p_session_id: string;
        };
        Returns: unknown;
      };
      pulse_session_spots_left: {
        Args: {
          p_session_id: string;
        };
        Returns: unknown;
      };
      pulse_set_session_end_at: {
        Args: Record<PropertyKey, never>;
        Returns: unknown;
      };
      pulse_touch_updated_at: {
        Args: Record<PropertyKey, never>;
        Returns: unknown;
      };
      pulse_visits_in_window: {
        Args: {
          p_member_id: string;
          p_studio_id: string;
          p_at?: string;
        };
        Returns: unknown;
      };
      quote_cancellation: {
        Args: {
          p_booking_id: string;
        };
        Returns: unknown;
      };
      top_up: {
        Args: {
          p_pack_id: string;
        };
        Returns: unknown;
      };
      visit_cap_status: {
        Args: {
          p_studio_id: string;
          p_at?: string;
          p_member_id?: string;
        };
        Returns: unknown;
      };
    };
    Enums: {
      pulse_booking_status: "reserved" | "checked_in" | "completed" | "cancelled" | "late_cancelled" | "no_show";
      pulse_class_level: "all" | "beginner" | "intermediate" | "advanced";
      pulse_credit_tx_reason: "booking" | "late_cancel_fee" | "no_show_fee" | "cancel_refund" | "cycle_grant" | "topup_pack";
      pulse_credit_tx_status: "pending" | "confirmed" | "reversed";
      pulse_credit_tx_type: "spend" | "refund" | "topup" | "fee";
      pulse_notification_kind: "booking" | "wallet" | "payout" | "system" | "habit";
      pulse_payout_status: "pending" | "confirmed" | "reversed";
      pulse_role: "member" | "studio_owner";
      pulse_session_status: "scheduled" | "cancelled" | "completed";
      pulse_subscription_status: "active" | "paused" | "cancelled";
    };
    CompositeTypes: { [_ in never]: never };
  };
}

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type ViewRow<T extends keyof Database["public"]["Views"]> =
  Database["public"]["Views"][T]["Row"];
export type Enums<T extends keyof Database["public"]["Enums"]> =
  Database["public"]["Enums"][T];
