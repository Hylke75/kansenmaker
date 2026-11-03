"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MailOpen, CircleAlert } from "lucide-react";
import { getSupabase } from "@/lib/supabase/client";
import { useStore } from "@/lib/store";
import { ROLE_LABELS } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/km/guards";
import type { Role } from "@/lib/types";

type Preview = { project_name: string | null; role: string | null; session_title: string | null; valid: boolean; reason: string | null };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Landingspagina van een uitnodiging: bekijken (ook zonder account) en accepteren. */
export function InvitationScreen({ token }: { token: string }) {
  const router = useRouter();
  const { state, acceptInvitation } = useStore();
  const [fetched, setFetched] = React.useState<Preview | null | "error">(null);
  const wellFormed = UUID_RE.test(token);
  const preview: Preview | null | "error" = wellFormed
    ? fetched
    : { project_name: null, role: null, session_title: null, valid: false, reason: "Deze uitnodiging bestaat niet." };
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!wellFormed) return;
    let active = true;
    getSupabase()
      .rpc("invitation_preview", { p_token: token })
      .then(({ data, error }) => {
        if (!active) return;
        if (error || !data?.[0]) setFetched("error");
        else setFetched(data[0]);
      });
    return () => {
      active = false;
    };
  }, [token, wellFormed]);

  const accept = async () => {
    setBusy(true);
    const res = await acceptInvitation(token);
    setBusy(false);
    if (res) router.push(res.sessionId ? `/sessie/${res.sessionId}` : "/");
  };

  const loggedIn = state.status === "ready";

  return (
    <main id="inhoud" tabIndex={-1} className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center px-6 py-12 outline-none">
      <p className="text-sm font-bold tracking-[0.18em] text-km-muted">HAAGS VERHAAL · KANSENKAMER</p>
      {preview === null || state.status === "loading" ? (
        <div className="mt-8">
          <LoadingState label="Uitnodiging controleren…" />
        </div>
      ) : preview === "error" ? (
        <Problem title="De uitnodiging kon niet worden gecontroleerd" text="Controleer je internetverbinding en probeer het opnieuw." />
      ) : !preview.valid ? (
        <Problem title="Deze uitnodiging werkt niet (meer)" text={`${preview.reason ?? ""} Vraag de begeleider of beheerder om een nieuwe uitnodiging.`} />
      ) : (
        <>
          <h1 className="mt-2 text-4xl">Je bent uitgenodigd</h1>
          <div className="mt-8 rounded-2xl bg-km-softgreen p-6">
            <p className="flex items-center gap-2 text-km-green">
              <MailOpen className="size-5" aria-hidden />
              Project
            </p>
            <p className="font-heading text-2xl font-bold text-km-green">{preview.project_name}</p>
            {preview.session_title && <p className="mt-2">Werksessie: {preview.session_title}</p>}
            <p className="mt-2">Je doet mee als {ROLE_LABELS[(preview.role ?? "deelnemer") as Role].toLowerCase()}.</p>
          </div>
          {loggedIn ? (
            <Button size="lg" className="mt-8 self-start" onClick={accept} disabled={busy}>
              {busy ? "Bezig…" : "Uitnodiging accepteren"}
            </Button>
          ) : (
            <>
              <p className="mt-8">Log eerst in met je e-mailadres. Je hebt geen wachtwoord nodig.</p>
              <Button asChild size="lg" className="mt-4 self-start">
                <Link href={`/inloggen?next=${encodeURIComponent(`/uitnodiging/${token}`)}`}>Inloggen en accepteren</Link>
              </Button>
            </>
          )}
        </>
      )}
    </main>
  );
}

function Problem({ title, text }: { title: string; text: string }) {
  return (
    <>
      <h1 className="mt-2 text-3xl">{title}</h1>
      <p className="mt-6 flex items-start gap-2 rounded-2xl border-2 border-km-danger bg-km-danger-soft p-5" role="alert">
        <CircleAlert className="mt-0.5 size-5 shrink-0 text-km-danger" aria-hidden />
        {text}
      </p>
      <Button asChild variant="outline" className="mt-8 self-start">
        <Link href="/">Naar de KansenKamer</Link>
      </Button>
    </>
  );
}
