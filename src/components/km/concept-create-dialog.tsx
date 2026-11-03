"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useProjectData, useStore } from "@/lib/store";
import { ErrorSummary, FormField } from "./form-field";
import { notify } from "./toast";

/** Ideeën combineren tot een concept. Het idee zelf blijft bestaan. */
export function ConceptCreateDialog({
  open,
  onOpenChange,
  initialIdeaIds = [],
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initialIdeaIds?: string[];
}) {
  const router = useRouter();
  const { addConcept } = useStore();
  const { ideas } = useProjectData();
  const options = ideas.filter((i) => !i.archived && !i.pending);
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [ideaIds, setIdeaIds] = React.useState<string[]>(initialIdeaIds);
  const [errors, setErrors] = React.useState<string[]>([]);
  const errorRef = React.useRef<HTMLDivElement>(null);

  // Formulier opnieuw vullen bij openen (state aanpassen tijdens render, geen effect).
  const [prevOpen, setPrevOpen] = React.useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
        const first = ideas.find((i) => i.id === initialIdeaIds[0]);
        setName(first?.title ?? "");
        setDescription(first?.description ?? "");
        setIdeaIds(initialIdeaIds);
        setErrors([]);
    }
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = [
      !name.trim() && "Geef het concept een naam.",
      !description.trim() && "Beschrijf het concept in een paar zinnen.",
      ideaIds.length === 0 && "Kies minstens één idee waar het concept op voortbouwt.",
    ].filter((x): x is string => !!x);
    setErrors(errs);
    if (errs.length) {
      requestAnimationFrame(() => errorRef.current?.focus());
      return;
    }
    const id = addConcept({ name, description, ideaIds });
    notify.prototype("Concept aangemaakt in de voorbeeldgegevens");
    onOpenChange(false);
    router.push(`/concepten/${id}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nieuw concept</DialogTitle>
          <DialogDescription>Combineer één of meer ideeën tot een concept. De ideeën zelf blijven gewoon bestaan.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} noValidate className="flex flex-col gap-5">
          <ErrorSummary ref={errorRef} errors={errors} />
          <FormField label="Naam van het concept" error={errors.find((x) => x.includes("naam"))}>
            {(p) => <Input {...p} value={name} onChange={(e) => setName(e.target.value)} />}
          </FormField>
          <FormField label="Korte beschrijving" error={errors.find((x) => x.includes("Beschrijf"))}>
            {(p) => <Textarea {...p} value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />}
          </FormField>
          <fieldset>
            <legend className="mb-2 font-semibold text-km-green">Gebaseerd op ideeën</legend>
            <div className="flex max-h-56 flex-col gap-2 overflow-y-auto rounded-xl border border-km-line p-2">
              {options.map((i) => (
                <Label key={i.id} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-2 font-normal hover:bg-km-offwhite">
                  <Checkbox
                    checked={ideaIds.includes(i.id)}
                    onCheckedChange={() => setIdeaIds((l) => (l.includes(i.id) ? l.filter((x) => x !== i.id) : [...l, i.id]))}
                  />
                  {i.title}
                </Label>
              ))}
            </div>
          </fieldset>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuleren
            </Button>
            <Button type="submit">Concept maken</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
