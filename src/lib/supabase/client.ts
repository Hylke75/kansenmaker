"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { SUPABASE_KEY, SUPABASE_URL } from "./env";

export type DB = SupabaseClient<Database>;

let client: DB | null = null;

/** Eén Supabase-client per browsertab. Sessie staat in cookies (gedeeld met de proxy). */
export function getSupabase(): DB {
  client ??= createBrowserClient<Database>(SUPABASE_URL, SUPABASE_KEY);
  return client;
}
