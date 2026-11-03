/**
 * Supabase-verbinding. De URL en de publiceerbare sleutel zijn openbaar (ze staan ook in de browser);
 * Row Level Security in de database beschermt de gegevens. Omgevingsvariabelen gaan voor, zodat een
 * ander project (bijv. test of productie) zonder codewijziging kan worden gekoppeld.
 */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://taonpzydehufcqyouzyp.supabase.co";
export const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_vbDuAgsT38aC8fLerGM4Ig_ZWCw1m3D";
