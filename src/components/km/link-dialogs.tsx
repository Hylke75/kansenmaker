"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useProjectData, useStore } from "@/lib/store";
import { notify } from "./toast";

interface Option {
  id: string;
  label: string;
  hint?: string;
}

/** Lijst met selectievakjes in een fieldset (meerdere keuzes). */
export function ChecklistField({
  legend,
  hint,
  options,
  selected,
  onChange,
  empty,
}: {
  legend: string;
  hint?: string;
  options: Option[];
  selected: string[];
  onChange: (ids: string[]) => void;
  empty: string;
}) {
  const hintId = React.useId();
  return (
    <fieldset aria-describedby={hint ? hintId : undefined}>
      <legend className="font-semibold text-km-green">{legend}</legend>
      {hint && (
        <p id={hintId} className="text-sm text-km-muted">
          {hint}
        </p>
      )}
      {options.length === 0 ? (
        <p className="mt-2 text-sm text-km-muted">{empty}</p>
      ) : (
        <div className="mt-2 flex max-h-56 flex-col gap-1 overflow-y-auto rounded-xl border border-km-line p-2">
          {options.map((o) => (
            <Label key={o.id} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-2 font-normal hover:bg-km-offwhite">
              <Checkbox
                checked={selected.includes(o.id)}
                onCheckedChange={() => onChange(selected.includes(o.id) ? selected.filter((x) => x !== o.id) : [...selected, o.id])}
              />
              <span className="flex flex-col">
                <span>{o.label}</span>
                {o.hint && <span className="text-sm text-km-muted">{o.hint}</span>}
              </span>
            </Label>
          ))}
        </div>
      )}
    </fieldset>
  );
}

/** Doelgroepen en behoeften van een idee wijzigen. */
export function IdeaLinksDialog({ ideaId, open, onOpenChange }: { ideaId: string; open: boolean; onOpenChange: (o: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Doelgroepen en behoeften koppelen</DialogTitle>
          <DialogDescription>Voor wie is dit idee, en welke behoefte past erbij?</DialogDescription>
        </DialogHeader>
        {open && <IdeaLinksForm ideaId={ideaId} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function IdeaLinksForm({ ideaId, onDone }: { ideaId: string; onDone: () => void }) {
  const { setIdeaLinks } = useStore();
  const { ideas, audiences, needs } = useProjectData();
  const idea = ideas.find((i) => i.id === ideaId)!;
  const [aud, setAud] = React.useState(idea.audienceIds);
  const [nds, setNds] = React.useState(idea.needIds);
  const [busy, setBusy] = React.useState(false);
  const availableNeeds = needs.filter((n) => aud.includes(n.audienceId));
  const audName = (id: string) => audiences.find((a) => a.id === id)?.name;

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        // Behoeften van niet (meer) gekozen doelgroepen vallen weg
        const keepNeeds = nds.filter((n) => availableNeeds.some((x) => x.id === n));
        const ok = await notify.after(setIdeaLinks(ideaId, aud, keepNeeds), "Koppelingen bewaard");
        setBusy(false);
        if (ok) onDone();
      }}
    >
      <ChecklistField
        legend="Doelgroepen"
        options={audiences.map((a) => ({ id: a.id, label: a.name }))}
        selected={aud}
        onChange={setAud}
        empty="Er zijn nog geen doelgroepen in dit project."
      />
      <ChecklistField
        legend="Behoeften"
        hint="Alleen behoeften van de gekozen doelgroepen."
        options={availableNeeds.map((n) => ({ id: n.id, label: n.description, hint: audName(n.audienceId) }))}
        selected={nds}
        onChange={setNds}
        empty="Kies eerst een doelgroep met behoeften."
      />
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Annuleren
        </Button>
        <Button type="submit" disabled={busy}>
          {busy ? "Bezig…" : "Bewaren"}
        </Button>
      </DialogFooter>
    </form>
  );
}

/** Ideeën, doelgroepen en behoeften van een concept wijzigen. */
export function ConceptLinksDialog({ conceptId, open, onOpenChange }: { conceptId: string; open: boolean; onOpenChange: (o: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Koppelingen van het concept</DialogTitle>
          <DialogDescription>Op welke ideeën bouwt dit concept voort, en voor wie is het? Ideeën blijven altijd zelfstandig bestaan.</DialogDescription>
        </DialogHeader>
        {open && <ConceptLinksForm conceptId={conceptId} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function ConceptLinksForm({ conceptId, onDone }: { conceptId: string; onDone: () => void }) {
  const { setConceptLinks } = useStore();
  const { concepts, ideas, audiences, needs } = useProjectData();
  const c = concepts.find((x) => x.id === conceptId)!;
  const [ideaIds, setIdeaIds] = React.useState(c.ideaIds);
  const [aud, setAud] = React.useState(c.audienceIds);
  const [nds, setNds] = React.useState(c.needIds);
  const [error, setError] = React.useState<string>();
  const [busy, setBusy] = React.useState(false);
  const availableNeeds = needs.filter((n) => aud.includes(n.audienceId));
  const audName = (id: string) => audiences.find((a) => a.id === id)?.name;

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={async (e) => {
        e.preventDefault();
        if (ideaIds.length === 0) return setError("Een concept bouwt voort op minstens één idee.");
        setError(undefined);
        setBusy(true);
        const keepNeeds = nds.filter((n) => availableNeeds.some((x) => x.id === n));
        const ok = await notify.after(setConceptLinks(conceptId, { ideaIds, audienceIds: aud, needIds: keepNeeds }), "Koppelingen bewaard");
        setBusy(false);
        if (ok) onDone();
      }}
    >
      {error && (
        <p role="alert" className="rounded-xl bg-km-danger-soft p-3 font-semibold text-km-danger">
          {error}
        </p>
      )}
      <ChecklistField
        legend="Gebaseerd op ideeën"
        options={ideas.filter((i) => !i.archived && !i.pending).map((i) => ({ id: i.id, label: i.title }))}
        selected={ideaIds}
        onChange={setIdeaIds}
        empty="Er zijn nog geen ideeën."
      />
      <ChecklistField
        legend="Doelgroepen"
        options={audiences.map((a) => ({ id: a.id, label: a.name }))}
        selected={aud}
        onChange={setAud}
        empty="Er zijn nog geen doelgroepen."
      />
      <ChecklistField
        legend="Behoeften"
        hint="Alleen behoeften van de gekozen doelgroepen."
        options={availableNeeds.map((n) => ({ id: n.id, label: n.description, hint: audName(n.audienceId) }))}
        selected={nds}
        onChange={setNds}
        empty="Kies eerst een doelgroep met behoeften."
      />
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Annuleren
        </Button>
        <Button type="submit" disabled={busy}>
          {busy ? "Bezig…" : "Bewaren"}
        </Button>
      </DialogFooter>
    </form>
  );
}
