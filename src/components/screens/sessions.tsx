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
      <NewSessionDialog open={open} onOpenChange={setOpen} />
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

function NewSessionDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const router = useRouter();
  const { addSession } = useStore();
  const [title, setTitle] = React.useState("");
  const [date, setDate] = React.useState("");
  const [location, setLocation] = React.useState("");
  const [errors, setErrors] = React.useState<string[]>([]);
  // Formulier opnieuw vullen bij openen (state aanpassen tijdens render, geen effect).
  const [prevOpen, setPrevOpen] = React.useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
        setTitle("");
        setDate("");
        setLocation("");
        setErrors([]);
    }
  }
  const [busy, setBusy] = React.useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = [
      !title.trim() && "Geef de sessie een titel.",
      !date && "Kies een datum en tijd.",
      date && new Date(date) < new Date() && "De datum ligt in het verleden.",
    ].filter((x): x is string => !!x);
    setErrors(errs);
    if (errs.length) return;
    setBusy(true);
    const id = await notify.after(
      addSession({ title: title.trim(), date: new Date(date).toISOString(), location: location.trim() || "Nog te bepalen" }),
      "Sessie gepland",
    );
    setBusy(false);
    if (!id) return;
    onOpenChange(false);
    router.push(`/sessies/${id}`);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nieuwe sessie</DialogTitle>
          <DialogDescription>Daarna kun je deelnemers uitnodigen met een link of QR-code.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} noValidate className="flex flex-col gap-5">
          <ErrorSummary errors={errors} />
          <FormField label="Titel" error={errors.find((x) => x.includes("titel"))}>
            {(p) => <Input {...p} value={title} onChange={(e) => setTitle(e.target.value)} />}
          </FormField>
          <FormField label="Datum en tijd" error={errors.find((x) => x.includes("datum") || x.includes("Datum") || x.includes("verleden"))}>
            {(p) => <Input {...p} type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} />}
          </FormField>
          <FormField label="Locatie" optional>
            {(p) => <Input {...p} value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Bijvoorbeeld een buurthuis of ‘Online’" />}
          </FormField>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuleren
            </Button>
            <Button type="submit" disabled={busy}>{busy ? "Bezig…" : "Sessie plannen"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
