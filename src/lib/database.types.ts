// Gegenereerd door scripts/gen-db-types.py — niet handmatig wijzigen.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  __InternalSupabase: { PostgrestVersion: "14.18" };
  public: {
    Tables: {
      profiles: {
        Row: { id: string; email: string; full_name: string; organisation: string; created_at: string };
        Insert: { id: string; email: string; full_name?: string; organisation?: string; created_at?: string };
        Update: { id?: string; email?: string; full_name?: string; organisation?: string; created_at?: string };
        Relationships: [];
      };
      projects: {
        Row: { id: string; name: string; description: string; owner_id: string | null; visibility: string; archived: boolean; invite_only: boolean; ideas_visible_immediately: boolean; allow_comments: boolean; allow_voting: boolean; require_approval: boolean; created_at: string };
        Insert: { id?: string; name: string; description?: string; owner_id?: string | null; visibility?: string; archived?: boolean; invite_only?: boolean; ideas_visible_immediately?: boolean; allow_comments?: boolean; allow_voting?: boolean; require_approval?: boolean; created_at?: string };
        Update: { id?: string; name?: string; description?: string; owner_id?: string | null; visibility?: string; archived?: boolean; invite_only?: boolean; ideas_visible_immediately?: boolean; allow_comments?: boolean; allow_voting?: boolean; require_approval?: boolean; created_at?: string };
        Relationships: [];
      };
      project_members: {
        Row: { project_id: string; user_id: string; role: string; created_at: string };
        Insert: { project_id: string; user_id: string; role: string; created_at?: string };
        Update: { project_id?: string; user_id?: string; role?: string; created_at?: string };
        Relationships: [];
      };
      audiences: {
        Row: { id: string; project_id: string; name: string; description: string; category: string; created_by: string | null; created_at: string };
        Insert: { id?: string; project_id: string; name: string; description?: string; category?: string; created_by?: string | null; created_at?: string };
        Update: { id?: string; project_id?: string; name?: string; description?: string; category?: string; created_by?: string | null; created_at?: string };
        Relationships: [];
      };
      needs: {
        Row: { id: string; project_id: string; audience_id: string; description: string; created_at: string };
        Insert: { id?: string; project_id?: string; audience_id: string; description: string; created_at?: string };
        Update: { id?: string; project_id?: string; audience_id?: string; description?: string; created_at?: string };
        Relationships: [];
      };
      ideas: {
        Row: { id: string; project_id: string; title: string; description: string; problem: string | null; author_id: string | null; status: string; archived: boolean; pending: boolean; created_at: string; updated_at: string };
        Insert: { id?: string; project_id: string; title: string; description: string; problem?: string | null; author_id?: string | null; status?: string; archived?: boolean; pending?: boolean; created_at?: string; updated_at?: string };
        Update: { id?: string; project_id?: string; title?: string; description?: string; problem?: string | null; author_id?: string | null; status?: string; archived?: boolean; pending?: boolean; created_at?: string; updated_at?: string };
        Relationships: [];
      };
      idea_audiences: {
        Row: { idea_id: string; audience_id: string };
        Insert: { idea_id: string; audience_id: string };
        Update: { idea_id?: string; audience_id?: string };
        Relationships: [];
      };
      idea_needs: {
        Row: { idea_id: string; need_id: string };
        Insert: { idea_id: string; need_id: string };
        Update: { idea_id?: string; need_id?: string };
        Relationships: [];
      };
      idea_relations: {
        Row: { idea_id: string; related_idea_id: string };
        Insert: { idea_id: string; related_idea_id: string };
        Update: { idea_id?: string; related_idea_id?: string };
        Relationships: [];
      };
      contributions: {
        Row: { id: string; project_id: string; idea_id: string; author_id: string | null; kind: string; text: string; hidden: boolean; pending: boolean; created_at: string };
        Insert: { id?: string; project_id?: string; idea_id: string; author_id?: string | null; kind: string; text: string; hidden?: boolean; pending?: boolean; created_at?: string };
        Update: { id?: string; project_id?: string; idea_id?: string; author_id?: string | null; kind?: string; text?: string; hidden?: boolean; pending?: boolean; created_at?: string };
        Relationships: [];
      };
      concepts: {
        Row: { id: string; project_id: string; name: string; description: string; status: string; owner_id: string | null; distinctiveness: string; mission_contribution: string; feasibility_people: string; feasibility_resources: string; feasibility_partners: string; feasibility_mission: string; feasibility_missing_knowledge: string; assessment: Json; ready_confirmed_by: string | null; ready_confirmed_at: string | null; created_at: string };
        Insert: { id?: string; project_id: string; name: string; description?: string; status?: string; owner_id?: string | null; distinctiveness?: string; mission_contribution?: string; feasibility_people?: string; feasibility_resources?: string; feasibility_partners?: string; feasibility_mission?: string; feasibility_missing_knowledge?: string; assessment?: Json; ready_confirmed_by?: string | null; ready_confirmed_at?: string | null; created_at?: string };
        Update: { id?: string; project_id?: string; name?: string; description?: string; status?: string; owner_id?: string | null; distinctiveness?: string; mission_contribution?: string; feasibility_people?: string; feasibility_resources?: string; feasibility_partners?: string; feasibility_mission?: string; feasibility_missing_knowledge?: string; assessment?: Json; ready_confirmed_by?: string | null; ready_confirmed_at?: string | null; created_at?: string };
        Relationships: [];
      };
      concept_ideas: {
        Row: { concept_id: string; idea_id: string };
        Insert: { concept_id: string; idea_id: string };
        Update: { concept_id?: string; idea_id?: string };
        Relationships: [];
      };
      concept_audiences: {
        Row: { concept_id: string; audience_id: string };
        Insert: { concept_id: string; audience_id: string };
        Update: { concept_id?: string; audience_id?: string };
        Relationships: [];
      };
      concept_needs: {
        Row: { concept_id: string; need_id: string };
        Insert: { concept_id: string; need_id: string };
        Update: { concept_id?: string; need_id?: string };
        Relationships: [];
      };
      risks: {
        Row: { id: string; project_id: string; concept_id: string; kind: string; text: string; created_at: string };
        Insert: { id?: string; project_id?: string; concept_id: string; kind: string; text: string; created_at?: string };
        Update: { id?: string; project_id?: string; concept_id?: string; kind?: string; text?: string; created_at?: string };
        Relationships: [];
      };
      research_items: {
        Row: { id: string; project_id: string; concept_id: string; assumption: string; method: string; status: string; result: string | null; created_at: string };
        Insert: { id?: string; project_id?: string; concept_id: string; assumption: string; method?: string; status?: string; result?: string | null; created_at?: string };
        Update: { id?: string; project_id?: string; concept_id?: string; assumption?: string; method?: string; status?: string; result?: string | null; created_at?: string };
        Relationships: [];
      };
      sessions: {
        Row: { id: string; project_id: string; title: string; starts_at: string; location: string; facilitator_id: string | null; state: string; active_round: number; created_at: string };
        Insert: { id?: string; project_id: string; title: string; starts_at: string; location?: string; facilitator_id?: string | null; state?: string; active_round?: number; created_at?: string };
        Update: { id?: string; project_id?: string; title?: string; starts_at?: string; location?: string; facilitator_id?: string | null; state?: string; active_round?: number; created_at?: string };
        Relationships: [];
      };
      session_participants: {
        Row: { session_id: string; user_id: string; project_id: string; joined_at: string };
        Insert: { session_id: string; user_id?: string; project_id?: string; joined_at?: string };
        Update: { session_id?: string; user_id?: string; project_id?: string; joined_at?: string };
        Relationships: [];
      };
      session_answers: {
        Row: { id: string; project_id: string; session_id: string; round: number; author_id: string | null; text: string; hidden: boolean; idea_id: string | null; created_at: string };
        Insert: { id?: string; project_id?: string; session_id: string; round: number; author_id?: string | null; text: string; hidden?: boolean; idea_id?: string | null; created_at?: string };
        Update: { id?: string; project_id?: string; session_id?: string; round?: number; author_id?: string | null; text?: string; hidden?: boolean; idea_id?: string | null; created_at?: string };
        Relationships: [];
      };
      session_votes: {
        Row: { answer_id: string; user_id: string; session_id: string; project_id: string; created_at: string };
        Insert: { answer_id: string; user_id?: string; session_id?: string; project_id?: string; created_at?: string };
        Update: { answer_id?: string; user_id?: string; session_id?: string; project_id?: string; created_at?: string };
        Relationships: [];
      };
      actions: {
        Row: { id: string; project_id: string; concept_id: string | null; session_id: string | null; description: string; owner_id: string | null; deadline: string | null; status: string; created_at: string };
        Insert: { id?: string; project_id?: string; concept_id?: string | null; session_id?: string | null; description: string; owner_id?: string | null; deadline?: string | null; status?: string; created_at?: string };
        Update: { id?: string; project_id?: string; concept_id?: string | null; session_id?: string | null; description?: string; owner_id?: string | null; deadline?: string | null; status?: string; created_at?: string };
        Relationships: [];
      };
      invitations: {
        Row: { id: string; project_id: string; token: string; email: string | null; role: string; kind: string; session_id: string | null; expires_at: string; revoked: boolean; created_by: string | null; accepted_by: string | null; accepted_at: string | null; created_at: string };
        Insert: { id?: string; project_id: string; token?: string; email?: string | null; role?: string; kind: string; session_id?: string | null; expires_at: string; revoked?: boolean; created_by?: string | null; accepted_by?: string | null; accepted_at?: string | null; created_at?: string };
        Update: { id?: string; project_id?: string; token?: string; email?: string | null; role?: string; kind?: string; session_id?: string | null; expires_at?: string; revoked?: boolean; created_by?: string | null; accepted_by?: string | null; accepted_at?: string | null; created_at?: string };
        Relationships: [];
      };
      activities: {
        Row: { id: string; project_id: string; actor_id: string | null; text: string; href: string; created_at: string };
        Insert: { id?: string; project_id: string; actor_id?: string | null; text: string; href: string; created_at?: string };
        Update: { id?: string; project_id?: string; actor_id?: string | null; text?: string; href?: string; created_at?: string };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      accept_invitation: { Args: { p_token: string }; Returns: { project_id: string; session_id: string | null }[] };
      create_project: { Args: { p_name: string; p_description?: string }; Returns: string };
      invitation_preview: { Args: { p_token: string }; Returns: { project_name: string | null; role: string | null; session_title: string | null; valid: boolean; reason: string | null }[] };
      merge_audiences: { Args: { p_source: string; p_target: string }; Returns: undefined };
      set_assessment: { Args: { p_concept: string; p_question: string; p_value: string | null }; Returns: boolean };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

type PublicTables = Database["public"]["Tables"];
export type Row<T extends keyof PublicTables> = PublicTables[T]["Row"];
