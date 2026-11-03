"use client";

import * as React from "react";
import { QrCode } from "lucide-react";
import { useProjectData, useStore } from "@/lib/store";
import { useToday } from "@/hooks/use-today";
import { Button } from "@/components/ui/button";
import { InviteLink } from "./invite-link";
import { notify } from "./toast";

/**
 * Deelnamelink + QR-code voor een werksessie. De link is een uitnodiging (rol: deelnemer)
 * die ook nieuwe mensen toegang geeft tot het project en ze direct naar de sessieruimte brengt.
 */
export function SessionInvite({ sessionId }: { sessionId: string }) {
  const { addInvitation, project } = useStore();
  const { invitations } = useProjectData();
  const today = useToday() ?? "";
  const [busy, setBusy] = React.useState(false);
  const active = invitations.find((i) => i.sessionId === sessionId && i.kind === "link" && !i.revoked && (!today || i.expiresAt >= today));

  if (active) {
    return (
      <InviteLink
        path={`/uitnodiging/${active.token}`}
        note={`Geldig tot en met ${new Date(active.expiresAt).toLocaleDateString("nl-NL", { day: "numeric", month: "long" })}. Deelnemers loggen in met hun e-mailadres en komen daarna direct in de sessie.`}
      />
    );
  }
  return (
    <div className="flex flex-col items-start gap-3">
      <p className="text-km-muted">Er is nog geen deelnamelink voor deze sessie.</p>
      <Button
        variant="outline"
        disabled={busy || !project}
        onClick={async () => {
          setBusy(true);
          const expires = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
          await notify.after(
            addInvitation({ projectId: project!.id, role: "deelnemer", kind: "link", sessionId, expiresAt: expires }),
            "Deelnamelink aangemaakt",
          );
          setBusy(false);
        }}
      >
        <QrCode aria-hidden />
        {busy ? "Bezig…" : "Maak deelnamelink en QR-code"}
      </Button>
    </div>
  );
}
