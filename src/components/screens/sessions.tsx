"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarPlus, MapPin, Presentation, Users } from "lucide-react";
import { useProjectData, useStore } from "@/lib/store";
import { PageHeader } from "@/components/km/page-header";
import { RequireProject } from "@/components/km/guards";
import { EmptyState } from "@/components/km/empty-state";
import { ErrorSummary, FormField } from "@/components/km/form-field";
import { SessionStateBadge } from "@/components/km/session-state-badge";
import { notify } from "@/components/km/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatDateTime, pluralize } from "@/lib/format";
import { SESSION_ROUNDS } from "@/lib/constants";
import type { Session } from "@/lib/types";

export function SessionsScreen() {
  return (
    <RequireProject>
      <Inner />
    </RequireProject>
  );
}

function Inner() {
  const { allowed } = useStore();
  const { sessions } = useProjectData();
  const [open, setOpen] = React.useState(false);
  const canFacilitate = allowed("sessies.begeleiden");
  const groups = [
    { title: "Nu actief", items: sessions.filter((s) => s.state === "actief") },
    { title: "Gepland", items: sessions.filter((s) => s.state === "gepland").sort((a, b) => a.date.localeCompare(b.date)) },
    { title: "Afgesloten", items: sessions.filter((s) => s.state === "afgesloten").sort((a, b) => b.date.localeCompare(a.date)) },
  ];
  return (
    <>
      <PageHeader
        title="Sessies"
        description={`Samen ideeën ontwikkelen in een begeleide werksessie van ongeveer ${SESSION_ROUNDS.reduce((t, r) => t + r.minutes, 0)} minuten, in zes rondes.`}
        actions={
          canFacilitate && (
            <Button onClick={() => setOpen(true)}>
              <CalendarPlus aria-hidden />
              Nieuwe sessie
            </Button>
          )
        }
      />
      {sessions.length === 0 ? (
        <EmptyState
          icon={Presentation}
          title="Nog geen sessies"
          description={canFacilitate ? "Plan een werksessie en nodig deelnemers uit met een link of QR-code." : "Je ziet hier sessies zodra een begeleider je uitnodigt."}
          action={canFacilitate && <Button onClick={() => setOpen(true)}>Nieuwe sessie</Button>}
        />
      ) : (
        <div className="flex flex-col gap-10">
          {groups.map(
            (g) =>
              g.items.length > 0 && (
                <section key={g.title} aria-labelledby={`g-${g.title}`}>
                  <h2 id={`g-${g.title}`} className="mb-4 text-2xl">
                    {g.title}
                  </h2>
                  <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {g.items.map((s) => (
                      <li key={s.id}>
                        <SessionCard session={s} canFacilitate={canFacilitate} />
                      </li>
                    ))}
                  </ul>
                </section>
              ),
          )}
        </div>
      )}
      <SessionDialog open={open} onOpenChange={setOpen} />
    </>
  );
}

function SessionCard({ session: s, canFacilitate }: { session: Session; canFacilitate: boolean }) {
  const { userName } = useStore();
  return (
    <article className={`flex h-full flex-col rounded-2xl p-6 ${s.state === "actief" ? "bg-km-softgreen" : "border border-km-line bg-white"}`}>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <SessionStateBadge state={s.state} />
        {s.state === "actief" && <span className="text-sm font-semibold text-km-green">Ronde {s.activeRound} van 6</span>}
      </div>
      <h3 className="text-xl">
        <Link href={`/sessies/${s.id}`} className="underline-offset-4 hover:underline">
          {s.title}
        </Link>
      </h3>
      <ul className="mt-3 flex flex-col gap-1 text-sm text-km-text">
        <li>{formatDateTime(s.date)}</li>
        <li className="inline-flex items-center gap-1.5">
          <MapPin className="size-4" aria-hidden /> {s.location}
        </li>
        <li className="inline-flex items-center gap-1.5">
          <Users className="size-4" aria-hidden /> {pluralize(s.participantIds.length, "deelnemer", "deelnemers")} · begeleider {userName(s.facilitatorId)}
        </li>
      </ul>
      <div className="mt-5 flex flex-wrap gap-2">
        {s.state === "actief" && (
          <Button asChild>
            <Link href={`/sessie/${s.id}`}>Doe mee</Link>
          </Button>
        )}
        {canFacilitate && s.state !== "afgesloten" && (
          <Button asChild variant="outline">
            <Link href={`/sessies/${s.id}/begeleiden`}>Begeleiden</Link>
          </Button>
        )}
        {s.state === "afgesloten" && (
          <Button asChild variant="outline">
            <Link href={`/sessies/${s.id}`}>Bekijk resultaten</Link>
          </Button>
        )}
      </div>
    </article>
  );
}

/** ISO-tijdstip → waarde voor <input type="datetime-local"> in lokale tijd. */
function toLocalInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Sessie plannen of bewerken. Een datum in het verleden mag (bijv. om een eerdere sessie vast te leggen). */
export function SessionDialog({ open, onOpenChange, session }: { open: boolean; onOpenChange: (o: boolean) => void; session?: Session }) {
  const router = useRouter();
  const { addSession, updateSession } = useStore();
  const [title, setTitle] = React.useState("");
  const [date, setDate] = React.useState("");
  const [location, setLocation] = React.useState("");
  const [selfPaced, setSelfPaced] = React.useState(false);
  const [errors, setErrors] = React.useState<string[]>([]);
  // Formulier opnieuw vullen bij openen (state aanpassen tijdens render, geen effect).
  const [prevOpen, setPrevOpen] = React.useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setTitle(session?.title ?? "");
      setDate(session ? toLocalInput(session.date) : "");
      setLocation(session?.location ?? "");
      setSelfPaced(session?.selfPaced ?? false);
      setErrors([]);
    }
  }
  const [busy, setBusy] = React.useState(false);
  const isPast = date !== "" && new Date(date) < new Date();
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = [
      !title.trim() && "Geef de sessie een titel.",
      (!date || Number.isNaN(new Date(date).getTime())) && "Kies een datum en tijd.",
    ].filter((x): x is string => !!x);
    setErrors(errs);
    if (errs.length) return;
    const input = { title: title.trim(), date: new Date(date).toISOString(), location: location.trim() || (selfPaced ? "Online" : "Nog te bepalen"), selfPaced };
    setBusy(true);
    if (session) {
      const ok = await notify.after(updateSession(session.id, input), "Sessie bijgewerkt");
      setBusy(false);
      if (ok) onOpenChange(false);
      return;
    }
    const id = await notify.after(addSession(input), "Sessie gepland");
    setBusy(false);
    if (!id) return;
    onOpenChange(false);
    router.push(`/sessies/${id}`);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{session ? "Sessie bewerken" : "Nieuwe sessie"}</DialogTitle>
          <DialogDescription>
            {session ? "Wijzig de titel, de startdatum of de locatie." : "Daarna kun je deelnemers uitnodigen met een link of QR-code."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} noValidate className="flex flex-col gap-5">
          <ErrorSummary errors={errors} />
          <FormField label="Titel" error={errors.find((x) => x.includes("titel"))}>
            {(p) => <Input {...p} value={title} onChange={(e) => setTitle(e.target.value)} />}
          </FormField>
          <FormField
            label="Startdatum en tijd"
            hint={isPast ? "Deze datum ligt in het verleden. Dat kan, bijvoorbeeld om een eerdere sessie vast te leggen." : undefined}
            error={errors.find((x) => x.includes("datum"))}
          >
            {(p) => <Input {...p} type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} />}
          </FormField>
          <FormField label="Locatie" optional>
            {(p) => (
              <Input
                {...p}
                value={location}
                onChange={(e) => {
                  setLocation(e.target.value);
                  // ‘Online’ betekent meestal: ieder in eigen tempo
                  if (/online/i.test(e.target.value) && !/online/i.test(location)) setSelfPaced(true);
                }}
                placeholder="Bijvoorbeeld een buurthuis of ‘Online’"
              />
            )}
          </FormField>
          <Label className="flex cursor-pointer items-start gap-3 rounded-xl border border-km-line p-3 font-normal has-[[data-state=checked]]:border-km-green has-[[data-state=checked]]:bg-km-softgreen">
            <Checkbox checked={selfPaced} onCheckedChange={(v) => setSelfPaced(v === true)} className="mt-0.5" />
            <span>
              <span className="font-semibold text-km-green">Online, ieder in eigen tempo</span>
              <span className="block text-sm text-km-muted">
                Deelnemers doorlopen de rondes zelf via de link, zonder begeleider. Ze kunnen vrij vooruit en terug.
              </span>
            </span>
          </Label>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuleren
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Bezig…" : session ? "Wijzigingen bewaren" : "Sessie plannen"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
