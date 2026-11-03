import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createServerSupabase } from "@/lib/supabase/server";
import { safeNext } from "@/lib/supabase/proxy";

/**
 * Landing van de inloglink uit de e-mail.
 * - PKCE: ?code=… (standaard e-mailsjabloon)
 * - token_hash: ?token_hash=…&type=email (aangepast sjabloon, werkt ook op een ander apparaat)
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const next = safeNext(searchParams.get("next"));
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const supabase = await createServerSupabase();

  let error: string | null = null;
  if (code) {
    const res = await supabase.auth.exchangeCodeForSession(code);
    error = res.error?.message ?? null;
  } else if (tokenHash && type) {
    const res = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    error = res.error?.message ?? null;
  } else {
    error = "missing";
  }

  if (error) {
    const url = new URL("/inloggen", origin);
    url.searchParams.set("fout", "link");
    if (next !== "/") url.searchParams.set("next", next);
    return NextResponse.redirect(url);
  }
  return NextResponse.redirect(new URL(next, origin));
}
