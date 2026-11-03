// Edge Function `inloglink`: verstuurt de inlogmail via Resend in plaats van via de
// ingebouwde Supabase-mail. Maakt met de admin-API een inloglink + code aan en stuurt
// een Nederlandse e-mail met een link naar <origin>/auth/confirm?token_hash=…
//
// Resend-sleutel: secret RESEND_API_KEY, of anders uit Supabase Vault via de RPC
// public.resend_api_key() (alleen service-rol). MAIL_FROM is optioneel.
// SUPABASE_URL en SUPABASE_SERVICE_ROLE_KEY zijn standaard aanwezig.
// verify_jwt staat uit: de functie wordt zonder sessie aangeroepen vanaf /inloggen.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const ALLOWED_ORIGIN = [
  /^https:\/\/kansenmaker\.vercel\.app$/,
  /^https:\/\/kansenmaker(-[a-z0-9-]+)?-hylke-s-projects\.vercel\.app$/,
  /^http:\/\/localhost:\d+$/,
];
const DEFAULT_ORIGIN = "https://kansenmaker.vercel.app";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FROM = Deno.env.get("MAIL_FROM") ?? "De Kansenmaker <kansenmaker@linkandlead.nl>";

const allowed = (origin: string | null) => !!origin && ALLOWED_ORIGIN.some((re) => re.test(origin));

function cors(origin: string | null): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": allowed(origin) ? origin! : DEFAULT_ORIGIN,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}

function safeNext(next: unknown): string {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//") && !next.includes("\\")
    ? next
    : "/";
}

function mailHtml(link: string, code: string) {
  return `<!doctype html><html lang="nl"><body style="margin:0;background:#FAF8F3;font-family:Arial,Helvetica,sans-serif;color:#303B34">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FAF8F3;padding:32px 16px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;padding:32px">
<tr><td>
<p style="margin:0;font-size:12px;font-weight:bold;letter-spacing:3px;color:#5b665f">HAAGS VERHAAL</p>
<p style="margin:4px 0 24px;font-size:22px;font-weight:bold;color:#103E30">De Kansenmaker</p>
<h1 style="margin:0 0 12px;font-size:24px;color:#103E30">Je inloglink</h1>
<p style="margin:0 0 24px;font-size:16px;line-height:1.5">Klik op de knop om in te loggen. De link is één uur geldig en werkt één keer.</p>
<p style="margin:0 0 24px"><a href="${link}" style="display:inline-block;background:#103E30;color:#ffffff;text-decoration:none;font-weight:bold;font-size:16px;padding:14px 24px;border-radius:10px">Inloggen bij De Kansenmaker</a></p>
<p style="margin:0 0 8px;font-size:16px;line-height:1.5">Lees je deze e-mail op een ander apparaat? Vul dan deze code in op het inlogscherm:</p>
<p style="margin:0 0 24px;font-size:28px;font-weight:bold;letter-spacing:6px;color:#103E30">${code}</p>
<p style="margin:0;font-size:14px;line-height:1.5;color:#5b665f">Heb je niet geprobeerd in te loggen? Dan kun je deze e-mail negeren.</p>
</td></tr></table></td></tr></table></body></html>`;
}

const mailText = (link: string, code: string) =>
  `De Kansenmaker – Haags Verhaal\n\nKlik op deze link om in te loggen (één uur geldig, werkt één keer):\n${link}\n\nOf vul deze code in op het inlogscherm: ${code}\n\nHeb je niet geprobeerd in te loggen? Dan kun je deze e-mail negeren.\n`;

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const headers = { ...cors(origin), "Content-Type": "application/json" };
  const reply = (status: number, body: Record<string, unknown>) =>
    new Response(JSON.stringify(body), { status, headers });

  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(origin) });
  if (req.method !== "POST") return reply(405, { error: "method" });
  if (!allowed(origin)) return reply(403, { error: "origin" });

  let body: { email?: unknown; next?: unknown };
  try {
    body = await req.json();
  } catch {
    return reply(400, { error: "body" });
  }
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!EMAIL_RE.test(email) || email.length > 254) return reply(400, { error: "email" });
  const next = safeNext(body.next);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const apiKey = Deno.env.get("RESEND_API_KEY") ?? (await admin.rpc("resend_api_key")).data;
  if (!apiKey) return reply(500, { error: "config" });

  // Rate limiting: max 1 mail per minuut en 5 per uur per e-mailadres.
  const hourAgo = new Date(Date.now() - 3600_000).toISOString();
  const { data: recent, error: logError } = await admin
    .from("login_mail_log")
    .select("sent_at")
    .eq("email", email)
    .gte("sent_at", hourAgo)
    .order("sent_at", { ascending: false });
  if (logError) return reply(500, { error: "log" });
  if (recent.length >= 5 || (recent[0] && Date.now() - Date.parse(recent[0].sent_at) < 60_000)) {
    return reply(429, { error: "rate" });
  }

  // Inloglink aanmaken; bestaat het account nog niet, dan eerst aanmaken (zoals shouldCreateUser).
  let link = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (link.error) {
    const created = await admin.auth.admin.createUser({ email, email_confirm: true });
    if (created.error) return reply(500, { error: "user" });
    link = await admin.auth.admin.generateLink({ type: "magiclink", email });
    if (link.error) return reply(500, { error: "link" });
  }
  const { hashed_token, email_otp } = link.data.properties;

  const url = new URL("/auth/confirm", origin!);
  url.searchParams.set("token_hash", hashed_token);
  url.searchParams.set("type", "email");
  if (next !== "/") url.searchParams.set("next", next);

  const sent = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: FROM,
      to: [email],
      subject: "Je inloglink voor De Kansenmaker",
      html: mailHtml(url.toString(), email_otp),
      text: mailText(url.toString(), email_otp),
    }),
  });
  if (!sent.ok) {
    console.error("resend", sent.status, await sent.text());
    return reply(502, { error: "mail" });
  }

  await admin.from("login_mail_log").insert({ email });
  return reply(200, { ok: true });
});
