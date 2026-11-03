"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Lightbulb } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useStore } from "@/lib/store";
import type { Session, SessionAnswer } from "@/lib/types";
import { ErrorSummary, FormField } from "./form-field";
import { notify } from "./toast";

/** Mag de huidige gebruiker deze sessie begeleiden (beheerder, of begeleider die de sessie leidt)? */
export function useCanFacilitate(session: Session) {
  const { role, currentUser } = useStore();
  return role === "beheerder" || (role === "begeleider" && session.facilitatorId === currentUser.id);
}

/**
 * Sessie-antwoord omzetten in een idee, of de link naar het idee tonen als dat al is gebeurd.
 * Het oorspronkelijke antwoord blijft bestaan en verwijst naar het idee.
 */
export function AnswerToIdea({ answer, session }: { answer: SessionAnswer; session: Session }) {
  const { state, userName } = useStore();
  const canFacilitate = useCanFacilitate(session);
  const [open, setOpen] = React.useState(false);
  const idea = answer.ideaId ? state.ideas.find((i) => i.id === answer.ideaId) : undefined;

  if (answer.ideaId) {
    return idea ? (
      <Link href={`/ideeen/${idea.id}`} className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-km-green underline underline-offset-4">
        Omgezet naar idee <ArrowRight className="size-4" aria-hidden />
      </Link>
    ) : (
      <span className="text-sm text-km-muted">Omgezet naar idee</span>
    );
  }
  if (!canFacilitate || answer.hidden) return null;
  return (
    <>
      <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>
        <Lightbulb aria-hidden />
        Maak er een idee van<span className="sr-only">: {answer.text}</span>
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Maak er een idee van</DialogTitle>
            <DialogDescription>
              Het idee komt in het ideeënoverzicht. Jij staat als deler genoemd; de beschrijving vermeldt wie het in de sessie inbracht.
            </DialogDescription>
          </DialogHeader>
          {open && (
            <AnswerForm
              answer={answer}
              defaultDescription={`${answer.text}\n\nIngebracht door ${userName(answer.authorId)} tijdens de werksessie ‘${session.title}’.`}
              onDone={() => setOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function AnswerForm({ answer, defaultDescription, onDone }: { answer: SessionAnswer; defaultDescription: string; onDone: () => void }) {
  const { answerToIdea } = useStore();
  const [title, setTitle] = React.useState(answer.text.length <= 80 ? answer.text : `${answer.text.slice(0, 77).trimEnd()}…`);
  const [description, setDescription] = React.useState(defaultDescription);
  const [errors, setErrors] = React.useState<string[]>([]);
  const [busy, setBusy] = React.useState(false);
  return (
    <form
      noValidate
      className="flex flex-col gap-5"
      onSubmit={async (e) => {
        e.preventDefault();
        const errs = [
          !title.trim() && "Geef het idee een naam.",
          title.length > 80 && "De naam mag maximaal 80 tekens zijn.",
          !description.trim() && "De beschrijving mag niet leeg zijn.",
          description.length > 1000 && "De beschrijving mag maximaal 1000 tekens zijn.",
        ].filter((x): x is string => !!x);
        setErrors(errs);
        if (errs.length) return;
        setBusy(true);
        const id = await notify.after(answerToIdea(answer.id, { title, description }), "Idee aangemaakt");
        setBusy(false);
        if (id) onDone();
      }}
    >
      <ErrorSummary errors={errors} />
      <FormField label="Naam van het idee" hint={`${title.length}/80 tekens`} error={errors.find((x) => x.includes("naam"))}>
        {(p) => <Input {...p} value={title} onChange={(e) => setTitle(e.target.value)} />}
      </FormField>
      <FormField label="Beschrijving" error={errors.find((x) => x.includes("beschrijving"))}>
        {(p) => <Textarea {...p} value={description} onChange={(e) => setDescription(e.target.value)} rows={5} />}
      </FormField>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Annuleren
        </Button>
        <Button type="submit" disabled={busy}>
          {busy ? "Bezig…" : "Idee aanmaken"}
        </Button>
      </DialogFooter>
    </form>
  );
}
