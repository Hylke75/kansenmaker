"use client";

import * as React from "react";
import { Combine, Plus, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useProjectData, useStore } from "@/lib/store";
import { PageHeader } from "@/components/km/page-header";
import { FilterBar } from "@/components/km/filter-bar";
import { AudienceCard } from "@/components/km/audience-card";
import { EmptyState } from "@/components/km/empty-state";
import { ErrorSummary, FormField } from "@/components/km/form-field";
import { RequireProject } from "@/components/km/guards";
import { ConfirmDialog } from "@/components/km/confirm-dialog";
import { notify } from "@/components/km/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { pluralize } from "@/lib/format";
import type { Audience } from "@/lib/types";

export function AudiencesScreen() {
  return (
    <RequireProject>
      <AudiencesInner />
    </RequireProject>
  );
}

function AudiencesInner() {
  const { allowed, role } = useStore();
  const { audiences, needs, ideas, concepts } = useProjectData();
  const [query, setQuery] = React.useState("");
  const [category, setCategory] = React.useState("alle");
  const [addOpen, setAddOpen] = React.useState(false);
  const [mergeOpen, setMergeOpen] = React.useState(false);
  const canManage = allowed("concepten.beheren");
  const categories = Array.from(new Set(audiences.map((a) => a.category))).sort();

  const filtered = audiences.filter(
    (a) =>
      (category === "alle" || a.category === category) &&
      `${a.name} ${a.description}`.toLowerCase().includes(query.trim().toLowerCase()),
  );
  const active = query !== "" || category !== "alle";

  return (
    <>
      <PageHeader
        title="Doelgroepen"
        description="Voor wie kunnen we iets betekenen, en wat hebben zij nodig?"
        actions={
          canManage && (
            <>
              {role === "beheerder" && audiences.length > 1 && (
                <Button variant="outline" onClick={() => setMergeOpen(true)}>
                  <Combine aria-hidden />
                  Samenvoegen
                </Button>
              )}
              <Button onClick={() => setAddOpen(true)}>
                <Plus aria-hidden />
                Doelgroep toevoegen
              </Button>
            </>
          )
        }
      />
      {audiences.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Nog geen doelgroepen"
          description={canManage ? "Voeg de eerste doelgroep toe en beschrijf hun behoeften." : "Een redacteur of begeleider voegt hier binnenkort doelgroepen toe."}
          action={canManage && <Button onClick={() => setAddOpen(true)}>Doelgroep toevoegen</Button>}
        />
      ) : (
        <>
          <FilterBar
            search={{ value: query, onChange: setQuery, label: "Zoek een doelgroep" }}
            chips={{
              label: "Filter op categorie",
              value: category,
              onChange: setCategory,
              options: [{ value: "alle", label: "Alle" }, ...categories.map((c) => ({ value: c, label: c }))],
            }}
            resultText={`${pluralize(filtered.length, "doelgroep", "doelgroepen")} gevonden`}
            onReset={active ? () => { setQuery(""); setCategory("alle"); } : undefined}
          />
          {filtered.length === 0 ? (
            <EmptyState icon={Users} title="Geen doelgroepen gevonden" description="Probeer een andere zoekterm." />
          ) : (
            <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filtered.map((a) => (
                <li key={a.id}>
                  <AudienceCard
                    headingLevel="h2"
                    audience={a}
                    needCount={needs.filter((n) => n.audienceId === a.id).length}
                    ideaCount={ideas.filter((i) => i.audienceIds.includes(a.id) && !i.archived).length}
                    conceptCount={concepts.filter((c) => c.audienceIds.includes(a.id)).length}
                  />
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      <AudienceDialog open={addOpen} onOpenChange={setAddOpen} />
      <MergeDialog open={mergeOpen} onOpenChange={setMergeOpen} audiences={audiences} />
    </>
  );
}

/** Toevoegen of bewerken van een doelgroep (drie velden). */
export function AudienceDialog({ open, onOpenChange, audience }: { open: boolean; onOpenChange: (o: boolean) => void; audience?: Audience }) {
  const router = useRouter();
  const { addAudience, updateAudience } = useStore();
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [category, setCategory] = React.useState("");
  const [errors, setErrors] = React.useState<string[]>([]);

  // Formulier opnieuw vullen bij openen (state aanpassen tijdens render, geen effect).
  const [prevOpen, setPrevOpen] = React.useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
        setName(audience?.name ?? "");
        setDescription(audience?.description ?? "");
        setCategory(audience?.category ?? "");
        setErrors([]);
    }
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = [!name.trim() && "Geef de doelgroep een naam.", !description.trim() && "Beschrijf de doelgroep kort."].filter(
      (x): x is string => !!x,
    );
    setErrors(errs);
    if (errs.length) return;
    const input = { name: name.trim(), description: description.trim(), category: category.trim() || "Overig" };
    if (audience) {
      if (await notify.after(updateAudience(audience.id, input), "Doelgroep bijgewerkt")) onOpenChange(false);
    } else {
      const id = await notify.after(addAudience(input), "Doelgroep toegevoegd");
      if (!id) return;
      onOpenChange(false);
      router.push(`/doelgroepen/${id}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{audience ? "Doelgroep bewerken" : "Doelgroep toevoegen"}</DialogTitle>
          <DialogDescription>Behoeften voeg je daarna toe op de pagina van de doelgroep.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} noValidate className="flex flex-col gap-5">
          <ErrorSummary errors={errors} />
          <FormField label="Naam" error={errors.find((x) => x.includes("naam"))}>
            {(p) => <Input {...p} value={name} onChange={(e) => setName(e.target.value)} />}
          </FormField>
          <FormField label="Beschrijving" error={errors.find((x) => x.includes("Beschrijf"))}>
            {(p) => <Textarea {...p} value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />}
          </FormField>
          <FormField label="Categorie" optional hint="Bijvoorbeeld Inwoners, Organisaties of Onderwijs.">
            {(p) => <Input {...p} value={category} onChange={(e) => setCategory(e.target.value)} />}
          </FormField>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuleren
            </Button>
            <Button type="submit">{audience ? "Wijzigingen bewaren" : "Toevoegen"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function MergeDialog({ open, onOpenChange, audiences }: { open: boolean; onOpenChange: (o: boolean) => void; audiences: Audience[] }) {
  const { mergeAudiences } = useStore();
  const [source, setSource] = React.useState("");
  const [target, setTarget] = React.useState("");
  const [error, setError] = React.useState("");
  const [confirm, setConfirm] = React.useState(false);

  // Formulier opnieuw vullen bij openen (state aanpassen tijdens render, geen effect).
  const [prevOpen, setPrevOpen] = React.useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
        setSource(audiences.find((a) => a.id === "a6")?.id ?? "");
        setTarget(audiences.find((a) => a.id === "a1")?.id ?? "");
        setError("");
    }
  }

  const name = (id: string) => audiences.find((a) => a.id === id)?.name ?? "";
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!source || !target) return setError("Kies beide doelgroepen.");
    if (source === target) return setError("Kies twee verschillende doelgroepen.");
    setError("");
    setConfirm(true);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Doelgroepen samenvoegen</DialogTitle>
            <DialogDescription>
              Behoeften, ideeën en concepten van de eerste doelgroep gaan over naar de tweede. De eerste doelgroep verdwijnt.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} noValidate className="flex flex-col gap-5">
            <ErrorSummary errors={error ? [error] : []} />
            {(
              [
                ["Voeg deze doelgroep…", source, setSource],
                ["…samen met", target, setTarget],
              ] as const
            ).map(([label, value, set]) => (
              <FormField key={label} label={label}>
                {(p) => (
                  <Select value={value} onValueChange={set}>
                    <SelectTrigger id={p.id} aria-describedby={p["aria-describedby"]} className="w-full">
                      <SelectValue placeholder="Kies een doelgroep" />
                    </SelectTrigger>
                    <SelectContent>
                      {audiences.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </FormField>
            ))}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Annuleren
              </Button>
              <Button type="submit">Samenvoegen…</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title={`‘${name(source)}’ samenvoegen met ‘${name(target)}’?`}
        description="Dit kan niet ongedaan worden gemaakt."
        confirmLabel="Ja, samenvoegen"
        destructive
        onConfirm={() => {
          void notify
            .after(mergeAudiences(source, target), `‘${name(source)}’ is samengevoegd met ‘${name(target)}’`)
            .then((ok) => ok && onOpenChange(false));
        }}
      />
    </>
  );
}
