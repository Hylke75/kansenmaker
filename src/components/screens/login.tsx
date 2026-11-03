"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Mail, KeyRound, ArrowLeft, LogIn } from "lucide-react";
import { getSupabase } from "@/lib/supabase/client";
import { SUPABASE_KEY, SUPABASE_URL } from "@/lib/supabase/env";
import { ErrorSummary, FormField } from "@/components/km/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Inloggen met een inloglink of code per e-mail, of met e-mailadres en wachtwoord. */
export function LoginScreen({ next, linkError }: { next: string; linkError: boolean }) {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [code, setCode] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [mode, setMode] = React.useState<"link" | "password">("link");
  const [step, setStep] = React.useState<"email" | "sent">("email");
  const [busy, setBusy] = React.useState(false);
  const [errors, setErrors] = React.useState<string[]>(
    linkError ? ["De inloglink is verlopen of al gebruikt. Vraag hieronder een nieuwe aan."] : [],
  );
  const errorRef = React.useRef<HTMLDivElement>(null);
  const headingRef = React.useRef<HTMLHeadingElement>(null);

  const fail = (msg: string) => {
    setErrors([msg]);
    requestAnimationFrame(() => errorRef.current?.focus());
  };

  const sendLink = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = email.trim().toLowerCase();
    if (!value) return fail("Vul je e-mailadres in.");
    if (!EMAIL_RE.test(value)) return fail("Dit e-mailadres lijkt niet te kloppen, bijvoorbeeld naam@organisatie.nl.");
    setBusy(true);
    // Inlogmail via de Edge Function `inloglink` (Resend), zie supabase/functions/inloglink.
    let status = 0;
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/inloglink`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: SUPABASE_KEY },
        body: JSON.stringify({ email: value, next }),
      });
      status = res.status;
    } catch {
      status = 0;
    }
    setBusy(false);
    if (status !== 200) {
      return fail(
        status === 429
          ? "Je hebt net al een inloglink gekregen. Wacht een minuut en probeer het opnieuw, of gebruik de link uit de vorige e-mail."
          : "De inloglink kon niet worden verstuurd. Probeer het later opnieuw.",
      );
    }
    setErrors([]);
    setStep("sent");
    requestAnimationFrame(() => headingRef.current?.focus());
  };

  const signInWithPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = email.trim().toLowerCase();
    if (!value) return fail("Vul je e-mailadres in.");
    if (!EMAIL_RE.test(value)) return fail("Dit e-mailadres lijkt niet te kloppen, bijvoorbeeld naam@organisatie.nl.");
    if (!password) return fail("Vul je wachtwoord in.");
    setBusy(true);
    const { error } = await getSupabase().auth.signInWithPassword({ email: value, password });
    if (error) {
      setBusy(false);
      return fail(
        error.status === 429
          ? "Er zijn te veel inlogpogingen gedaan. Wacht een paar minuten en probeer het opnieuw."
          : "Dit e-mailadres of wachtwoord klopt niet.",
      );
    }
    router.replace(next);
    router.refresh();
  };

  const verifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = code.replace(/\s/g, "");
    if (!/^\d{6,10}$/.test(token)) return fail("Vul de code uit de e-mail in (alleen cijfers).");
    setBusy(true);
    const { error } = await getSupabase().auth.verifyOtp({ email: email.trim().toLowerCase(), token, type: "email" });
    setBusy(false);
    if (error) return fail("Deze code klopt niet of is verlopen. Vraag een nieuwe inloglink aan.");
    router.replace(next);
    router.refresh();
  };

  return (
    <main id="inhoud" tabIndex={-1} className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-4 py-12 outline-none">
      <p className="text-sm font-bold tracking-[0.18em] text-km-muted">HAAGS VERHAAL</p>
      <p className="mt-1 font-heading text-2xl font-bold text-km-green">De Kansenmaker</p>

      {step === "email" ? (
        <>
          <h1 className="mt-10 text-3xl md:text-4xl">Inloggen</h1>
          <p className="mt-3 text-lg">
            {mode === "link"
              ? "Je hebt geen wachtwoord nodig. We sturen je een inloglink per e-mail."
              : "Log in met je e-mailadres en wachtwoord."}
          </p>
          <form
            onSubmit={mode === "link" ? sendLink : signInWithPassword}
            noValidate
            className="mt-8 flex flex-col gap-5 rounded-2xl border border-km-line bg-white p-6"
          >
            <ErrorSummary ref={errorRef} errors={errors} />
            <FormField label="E-mailadres" error={errors[0]?.includes("e-mailadres") ? errors[0] : undefined}>
              {(p) => (
                <Input {...p} type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              )}
            </FormField>
            {mode === "password" && (
              <FormField label="Wachtwoord" error={errors[0]?.includes("wachtwoord") ? errors[0] : undefined}>
                {(p) => (
                  <Input
                    {...p}
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                )}
              </FormField>
            )}
            <Button type="submit" size="lg" disabled={busy}>
              {mode === "link" ? <Mail aria-hidden /> : <LogIn aria-hidden />}
              {mode === "link"
                ? busy
                  ? "Bezig met versturen…"
                  : "Stuur mij een inloglink"
                : busy
                  ? "Bezig met inloggen…"
                  : "Inloggen"}
            </Button>
          </form>
          <Button
            variant="ghost"
            className="mt-4 self-start"
            onClick={() => {
              setMode(mode === "link" ? "password" : "link");
              setErrors([]);
              setPassword("");
            }}
          >
            <KeyRound aria-hidden />
            {mode === "link" ? "Inloggen met wachtwoord" : "Inloggen zonder wachtwoord (inloglink)"}
          </Button>
          <p className="mt-6 text-sm text-km-muted">
            Nog geen uitnodiging? Je kunt inloggen, maar je ziet pas inhoud zodra een begeleider of beheerder je uitnodigt
            voor een project.
          </p>
        </>
      ) : (
        <>
          <h1 ref={headingRef} tabIndex={-1} className="mt-10 text-3xl outline-none md:text-4xl">
            Check je e-mail
          </h1>
          <p className="mt-3 text-lg" role="status">
            We hebben een inloglink gestuurd naar <strong className="text-km-green">{email.trim().toLowerCase()}</strong>.
            Klik op de link in de e-mail om in te loggen. Kijk ook even in je map met ongewenste e-mail.
          </p>
          <form onSubmit={verifyCode} noValidate className="mt-8 flex flex-col gap-5 rounded-2xl border border-km-line bg-white p-6">
            <ErrorSummary ref={errorRef} errors={errors} />
            <FormField
              label="Staat er een code in de e-mail?"
              optional
              hint="Handig als je de e-mail op een ander apparaat leest."
              error={errors[0]?.includes("code") ? errors[0] : undefined}
            >
              {(p) => (
                <Input {...p} inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value)} />
              )}
            </FormField>
            <Button type="submit" variant="outline" disabled={busy}>
              <KeyRound aria-hidden />
              Inloggen met code
            </Button>
          </form>
          <Button
            variant="ghost"
            className="mt-4 self-start"
            onClick={() => {
              setStep("email");
              setErrors([]);
              setCode("");
            }}
          >
            <ArrowLeft aria-hidden />
            Ander e-mailadres of opnieuw versturen
          </Button>
        </>
      )}
    </main>
  );
}
