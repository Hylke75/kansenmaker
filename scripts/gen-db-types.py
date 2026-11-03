"""Compacte Database-types genereren uit een beschrijving van de tabellen.
Bron: `generate_typescript_types` van Supabase (uitgevoerd op 3 nov 2026).
Opnieuw genereren na een schemawijziging: pas TABLES aan en draai `python3 scripts/gen-db-types.py`."""
TABLES = {
 "profiles": [("id","string",0),("email","string",0),("full_name","string",1),("organisation","string",1),("created_at","string",1)],
 "projects": [("id","string",1),("name","string",0),("description","string",1),("owner_id","string | null",1),("visibility","string",1),("archived","boolean",1),("invite_only","boolean",1),("ideas_visible_immediately","boolean",1),("allow_comments","boolean",1),("allow_voting","boolean",1),("require_approval","boolean",1),("created_at","string",1)],
 "project_members": [("project_id","string",0),("user_id","string",0),("role","string",0),("created_at","string",1)],
 "audiences": [("id","string",1),("project_id","string",0),("name","string",0),("description","string",1),("category","string",1),("created_by","string | null",1),("created_at","string",1)],
 "needs": [("id","string",1),("project_id","string",0),("audience_id","string",0),("description","string",0),("created_by","string | null",1),("created_at","string",1)],
 "ideas": [("id","string",1),("project_id","string",0),("title","string",0),("description","string",0),("problem","string | null",1),("author_id","string | null",1),("status","string",1),("archived","boolean",1),("pending","boolean",1),("guest_name","string | null",1),("created_at","string",1),("updated_at","string",1)],
 "idea_audiences": [("idea_id","string",0),("audience_id","string",0)],
 "idea_needs": [("idea_id","string",0),("need_id","string",0)],
 "idea_relations": [("idea_id","string",0),("related_idea_id","string",0)],
 "contributions": [("id","string",1),("project_id","string",0),("idea_id","string",0),("author_id","string | null",1),("kind","string",0),("text","string",0),("hidden","boolean",1),("pending","boolean",1),("created_at","string",1)],
 "concepts": [("id","string",1),("project_id","string",0),("name","string",0),("description","string",1),("status","string",1),("owner_id","string | null",1),("distinctiveness","string",1),("mission_contribution","string",1),("feasibility_people","string",1),("feasibility_resources","string",1),("feasibility_partners","string",1),("feasibility_mission","string",1),("feasibility_missing_knowledge","string",1),("assessment","Json",1),("ready_confirmed_by","string | null",1),("ready_confirmed_at","string | null",1),("created_at","string",1)],
 "concept_ideas": [("concept_id","string",0),("idea_id","string",0)],
 "concept_audiences": [("concept_id","string",0),("audience_id","string",0)],
 "concept_needs": [("concept_id","string",0),("need_id","string",0)],
 "risks": [("id","string",1),("project_id","string",0),("concept_id","string",0),("kind","string",0),("text","string",0),("created_at","string",1)],
 "research_items": [("id","string",1),("project_id","string",0),("concept_id","string",0),("assumption","string",0),("method","string",1),("status","string",1),("result","string | null",1),("created_at","string",1)],
 "sessions": [("id","string",1),("project_id","string",0),("title","string",0),("starts_at","string",0),("location","string",1),("facilitator_id","string | null",1),("state","string",1),("active_round","number",1),("created_at","string",1)],
 "session_participants": [("session_id","string",0),("user_id","string",0),("project_id","string",0),("joined_at","string",1)],
 "session_answers": [("id","string",1),("project_id","string",0),("session_id","string",0),("round","number",0),("author_id","string | null",1),("text","string",0),("hidden","boolean",1),("idea_id","string | null",1),("guest_id","string | null",1),("created_at","string",1)],
 "session_votes": [("answer_id","string",0),("user_id","string",0),("session_id","string",0),("project_id","string",0),("created_at","string",1)],
 "actions": [("id","string",1),("project_id","string",0),("concept_id","string | null",1),("session_id","string | null",1),("description","string",0),("owner_id","string | null",1),("deadline","string | null",1),("status","string",1),("created_at","string",1)],
 "invitations": [("id","string",1),("project_id","string",0),("token","string",1),("email","string | null",1),("role","string",1),("kind","string",0),("session_id","string | null",1),("expires_at","string",0),("revoked","boolean",1),("created_by","string | null",1),("accepted_by","string | null",1),("accepted_at","string | null",1),("purpose","string",1),("created_at","string",1)],
 "guests": [("id","string",1),("project_id","string",0),("session_id","string | null",1),("invitation_id","string | null",1),("name","string",0),("key_hash","string",0),("created_at","string",1)],
 "session_guest_votes": [("answer_id","string",0),("guest_id","string",0),("session_id","string",0),("project_id","string",0),("created_at","string",1)],
 "strengths": [("id","string",1),("project_id","string",0),("text","string",0),("created_by","string | null",1),("created_at","string",1)],
 "idea_insights": [("id","string",1),("project_id","string",1),("idea_id","string",0),("kind","string",0),("text","string",0),("created_by","string | null",1),("created_at","string",1)],
 "idea_picks": [("id","string",1),("project_id","string",1),("idea_id","string",0),("next_step","string",1),("created_by","string | null",1),("created_at","string",1)],
 "activities": [("id","string",1),("project_id","string",0),("actor_id","string | null",1),("text","string",0),("href","string",0),("created_at","string",1)],
}
# Kolommen die door triggers worden gevuld zijn bij insert optioneel
TRIGGER_FILLED = {("needs","project_id"),("contributions","project_id"),("risks","project_id"),("research_items","project_id"),("session_participants","project_id"),("session_participants","user_id"),("session_answers","project_id"),("session_votes","project_id"),("session_votes","session_id"),("session_votes","user_id"),("actions","project_id")}

out = ["// Gegenereerd door scripts/gen-db-types.py — niet handmatig wijzigen.",
"export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];","",
"export type Database = {","  __InternalSupabase: { PostgrestVersion: \"14.18\" };","  public: {","    Tables: {"]
for t, cols in TABLES.items():
    out.append(f"      {t}: {{")
    out.append("        Row: { " + "; ".join(f"{c}: {ty}" for c,ty,_ in cols) + " };")
    out.append("        Insert: { " + "; ".join(f"{c}{'?' if (opt or (t,c) in TRIGGER_FILLED) else ''}: {ty}" for c,ty,opt in cols) + " };")
    out.append("        Update: { " + "; ".join(f"{c}?: {ty}" for c,ty,_ in cols) + " };")
    out.append("        Relationships: [];")
    out.append("      };")
out += ["    };","    Views: { [_ in never]: never };","    Functions: {",
"      accept_invitation: { Args: { p_token: string }; Returns: { project_id: string; session_id: string | null }[] };",
"      create_project: { Args: { p_name: string; p_description?: string }; Returns: string };",
"      invitation_preview: { Args: { p_token: string }; Returns: { project_name: string | null; role: string | null; session_title: string | null; valid: boolean; reason: string | null }[] };",
"      merge_audiences: { Args: { p_source: string; p_target: string }; Returns: undefined };",
"      guest_join_session: { Args: { p_token: string; p_name: string }; Returns: { guest_id: string; guest_key: string }[] };",
"      guest_session_state: { Args: { p_token: string; p_key: string | null }; Returns: Json };",
"      guest_submit_answer: { Args: { p_token: string; p_key: string; p_text: string; p_round: number }; Returns: string };",
"      guest_toggle_vote: { Args: { p_token: string; p_key: string; p_answer: string }; Returns: boolean };",
"      submission_preview: { Args: { p_token: string }; Returns: { project_name: string | null; valid: boolean; reason: string | null }[] };",
"      guest_submit_idea: { Args: { p_token: string; p_name: string; p_title: string; p_description: string; p_problem?: string | null }; Returns: boolean };",
"      set_assessment: { Args: { p_concept: string; p_question: string; p_value: string | null }; Returns: boolean };",
"    };","    Enums: { [_ in never]: never };","    CompositeTypes: { [_ in never]: never };","  };","};","",
"type PublicTables = Database[\"public\"][\"Tables\"];",
"export type Row<T extends keyof PublicTables> = PublicTables[T][\"Row\"];",""]
open("src/lib/database.types.ts","w").write("\n".join(out))
