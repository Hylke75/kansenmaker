"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ClipboardCheck, ListChecks, Pencil, Plus, Search, Trash2, TriangleAlert, Check } from "lucide-react";
import { useProjectData, useStore } from "@/lib/store";
import { PageHeader } from "@/components/km/page-header";
import { NotInProject, RequireProject } from "@/components/km/guards";
import { StatusBadge, STATUS_META, STATUSES, Tag } from "@/components/km/status-badge";
import { ConfirmDialog } from "@/components/km/confirm-dialog";
import { EmptyState } from "@/components/km/empty-state";
import { ErrorSummary, FormField, SampleDataNotice } from "@/components/km/form-field";
import { assessmentOutcome } from "@/components/km/assessment-outcome";
import { notify } from "@/components/km/toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatDate } from "@/lib/format";
import type { ActionStatus, Concept, Feasibility, ResearchStatus, RiskKind, Status } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useToday } from "@/hooks/use-today";

export const CONCEPT_TABS = [
  { value: "overzicht", label: "Overzicht" },
  { value: "kansen", label: "Kansen en risico’s" },
  { value: "haalbaarheid", label: "Haalbaarheid" },
  { value: "onderzoek", label: "Onderzoek" },
  { value: "acties", label: "Acties" },
] as const;

export function ConceptDetailScreen({ id, initialTab }: { id: string; initialTab?: string }) {
  return (
    <RequireProject>
      <Inner id={id} initialTab={initialTab} />
    </RequireProject>
  );
}

function Inner({ id, initialTab }: { id: string; initialTab?: string }) {
  const router = useRouter();
  const { allowed, role, userName, updateConcept, currentUser } = useStore();
  const { concepts, members } = useProjectData();
  const concept = concepts.find((c) => c.id === id);
  const [tab, setTab] = React.useState<string>(CONCEPT_TABS.some((t) => t.value === initialTab) ? initialTab! : "overzicht");
  const [pendingStatus, setPendingStatus] = React.useState<Status | null>(null);
  const [statusError, setStatusError] = React.useState<string>();

  if (!concept) return <NotInProject kind="concept" backHref="/concepten" backLabel="Naar alle concepten" />;
  const canManage = allowed("concepten.beheren");
  const canConfirm = allowed("concepten.klaarVoorProefBevestigen");

  const changeTab = (v: string) => {
    setTab(v);
    router.replace(`/concepten/${concept.id}?tab=${v}`, { scroll: false });
  };

  const changeStatus = (s: Status) => {
    setStatusError(undefined);
    if (s === "klaar-voor-proef") {
      if (!canConfirm) {
        setStatusError("Alleen een beheerder kan bevestigen dat een concept klaar is voor een proef. Vraag de beheerder om dit te beoordelen.");
        return;
      }
      setPendingStatus(s);
      return;
    }
    updateConcept(concept.id, { status: s, readyConfirmedBy: undefined });
    notify.prototype(`Status gewijzigd naar ‘${STATUS_META[s].label}’`);
  };

  const outcome = assessmentOutcome(concept.assessment);

  return (
    <>
      <PageHeader
        back={{ href: "/concepten", label: "Terug naar concepten" }}
        eyebrow="Concept"
        title={concept.name}
        meta={
          <>
            <StatusBadge status={concept.status} />
            <span className="text-sm text-km-muted">Eigenaar: {userName(concept.ownerId)}</span>
            {concept.readyConfirmedBy && concept.status === "klaar-voor-proef" && (
              <span className="text-sm text-km-muted">· Bevestigd door {userName(concept.readyConfirmedBy)}</span>
            )}
            <SampleDataNotice />
          </>
        }
        actions={
          <Button asChild variant="outline">
            <Link href={`/concepten/${concept.id}/realiteitstoets`}>
              <ClipboardCheck aria-hidden />
              Realiteitstoets
            </Link>
          </Button>
        }
      />

      {canManage && (
        <section aria-label="Status en eigenaar" className="mb-8 grid gap-4 rounded-2xl border border-km-line bg-white p-5 md:grid-cols-2">
          <FormField label="Status" error={statusError}>
            {(p) => (
              <Select value={concept.status} onValueChange={(v) => changeStatus(v as Status)}>
                <SelectTrigger id={p.id} aria-describedby={p["aria-describedby"]} className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {STATUS_META[s].label}
                      {s === "klaar-voor-proef" && !canConfirm ? " (bevestiging beheerder)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </FormField>
          <FormField label="Verantwoordelijke" hint={role !== "beheerder" ? "Alleen de beheerder kan dit wijzigen." : undefined}>
            {(p) => (
              <Select
                value={concept.ownerId}
                disabled={role !== "beheerder"}
                onValueChange={(v) => {
                  updateConcept(concept.id, { ownerId: v });
                  notify.prototype(`${userName(v)} is nu verantwoordelijk`);
                }}
              >
                <SelectTrigger id={p.id} aria-describedby={p["aria-describedby"]} className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {members.map((m) => (
                    <SelectItem key={m.userId} value={m.userId}>
                      {userName(m.userId)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </FormField>
        </section>
      )}

      <Tabs value={tab} onValueChange={changeTab}>
        <TabsList className="mb-8 h-auto w-full flex-wrap justify-start gap-1 rounded-none border-b border-km-line bg-transparent p-0">
          {CONCEPT_TABS.map((t) => (
            <TabsTrigger
              key={t.value}
              value={t.value}
              className="h-auto min-h-12 flex-none rounded-none border-0 border-b-4 border-transparent px-4 text-base font-semibold text-km-muted hover:text-km-green data-[state=active]:border-km-yellow data-[state=active]:bg-transparent data-[state=active]:text-km-green data-[state=active]:shadow-none"
            >
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="overzicht">
          <OverviewTab concept={concept} canManage={canManage} />
        </TabsContent>
        <TabsContent value="kansen">
          <RisksTab concept={concept} canManage={canManage} />
        </TabsContent>
        <TabsContent value="haalbaarheid">
          <FeasibilityTab concept={concept} canManage={canManage} />
        </TabsContent>
        <TabsContent value="onderzoek">
          <ResearchTab concept={concept} canManage={canManage} outcomeTitle={outcome.title} />
        </TabsContent>
        <TabsContent value="acties">
          <ActionsTab concept={concept} canManage={canManage} />
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={pendingStatus !== null}
        onOpenChange={(o) => !o && setPendingStatus(null)}
        title="Klaar voor proef bevestigen?"
        description={
          <>
            Realiteitstoets: <strong>{outcome.title.toLowerCase()}</strong>. Met deze bevestiging geef je als beheerder akkoord dat het concept in een
            proef wordt getest. Dit is een bewuste keuze, geen automatische goedkeuring.
          </>
        }
        confirmLabel="Ja, klaar voor proef"
        onConfirm={() => {
          updateConcept(concept.id, { status: "klaar-voor-proef", readyConfirmedBy: currentUser.id });
          notify.prototype("Concept is klaar voor proef");
          setPendingStatus(null);
        }}
      />
    </>
  );
}

function Section({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-lg">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

const Empty = ({ children }: { children: React.ReactNode }) => <p className="text-km-muted italic">{children}</p>;

/* ---------------- Overzicht ---------------- */
function OverviewTab({ concept, canManage }: { concept: Concept; canManage: boolean }) {
  const { audiences, needs, ideas } = useProjectData();
  const [editOpen, setEditOpen] = React.useState(false);
  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="flex flex-col gap-8">
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-2xl">Overzicht</h2>
          {canManage && (
            <Button variant="outline" onClick={() => setEditOpen(true)}>
              <Pencil aria-hidden />
              Bewerken
            </Button>
          )}
        </div>
        <Section title="Beschrijving">
          <p className="text-lg">{concept.description}</p>
        </Section>
        <Section title="Onderscheidend vermogen">
          {concept.distinctiveness ? <p>{concept.distinctiveness}</p> : <Empty>Nog niet ingevuld. Wat maakt dit anders dan wat er al is?</Empty>}
        </Section>
        <div className="rounded-2xl bg-km-softgreen p-5">
          <Section title="Bijdrage aan ontmoeting en verbinding">
            <p className="text-sm text-km-muted">
              Hoe draagt dit idee bij aan ontmoeting, verbinding of het zichtbaar maken van verhalen die anders niet gehoord worden?
            </p>
            {concept.missionContribution ? <p className="mt-1">{concept.missionContribution}</p> : <Empty>Nog niet ingevuld.</Empty>}
          </Section>
        </div>
      </div>
      <aside className="flex flex-col gap-6" aria-label="Koppelingen">
        <Section title="Doelgroepen">
          {concept.audienceIds.length === 0 ? (
            <Empty>Geen doelgroep gekoppeld.</Empty>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {audiences
                .filter((a) => concept.audienceIds.includes(a.id))
                .map((a) => (
                  <li key={a.id}>
                    <Link href={`/doelgroepen/${a.id}`} className="inline-flex min-h-11 items-center">
                      <Tag className="underline-offset-4 hover:underline">{a.name}</Tag>
                    </Link>
                  </li>
                ))}
            </ul>
          )}
        </Section>
        <Section title="Behoeften">
          {concept.needIds.length === 0 ? (
            <Empty>Geen behoefte gekoppeld.</Empty>
          ) : (
            <ul className="list-disc pl-5">
              {needs.filter((n) => concept.needIds.includes(n.id)).map((n) => (
                <li key={n.id}>{n.description}</li>
              ))}
            </ul>
          )}
        </Section>
        <Section title="Gebaseerd op ideeën">
          <ul className="flex flex-col gap-2">
            {ideas.filter((i) => concept.ideaIds.includes(i.id)).map((i) => (
              <li key={i.id}>
                <Link href={`/ideeen/${i.id}`} className="text-km-green underline underline-offset-4 hover:no-underline">
                  {i.title}
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      </aside>
      <EditOverviewDialog open={editOpen} onOpenChange={setEditOpen} concept={concept} />
    </div>
  );
}

function EditOverviewDialog({ open, onOpenChange, concept }: { open: boolean; onOpenChange: (o: boolean) => void; concept: Concept }) {
  const { updateConcept } = useStore();
  const [description, setDescription] = React.useState(concept.description);
  const [distinct, setDistinct] = React.useState(concept.distinctiveness);
  const [mission, setMission] = React.useState(concept.missionContribution);
  const [error, setError] = React.useState<string>();
  // Formulier opnieuw vullen bij openen (state aanpassen tijdens render, geen effect).
  const [prevOpen, setPrevOpen] = React.useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
        setDescription(concept.description);
        setDistinct(concept.distinctiveness);
        setMission(concept.missionContribution);
        setError(undefined);
    }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Overzicht bewerken</DialogTitle>
          <DialogDescription>Beschrijving, onderscheidend vermogen en bijdrage aan de missie.</DialogDescription>
        </DialogHeader>
        <form
          noValidate
          className="flex flex-col gap-5"
          onSubmit={(e) => {
            e.preventDefault();
            if (!description.trim()) return setError("De beschrijving mag niet leeg zijn.");
            updateConcept(concept.id, { description: description.trim(), distinctiveness: distinct.trim(), missionContribution: mission.trim() });
            notify.prototype("Overzicht bijgewerkt");
            onOpenChange(false);
          }}
        >
          <FormField label="Beschrijving" error={error}>
            {(p) => <Textarea {...p} value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />}
          </FormField>
          <FormField label="Onderscheidend vermogen" optional>
            {(p) => <Textarea {...p} value={distinct} onChange={(e) => setDistinct(e.target.value)} rows={2} />}
          </FormField>
          <FormField label="Bijdrage aan ontmoeting en verbinding" optional hint="Hoe draagt dit bij aan ontmoeting, verbinding of verhalen die anders niet gehoord worden?">
            {(p) => <Textarea {...p} value={mission} onChange={(e) => setMission(e.target.value)} rows={2} />}
          </FormField>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuleren
            </Button>
            <Button type="submit">Bewaren</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- Kansen en risico's ---------------- */
const RISK_META: Record<RiskKind, { title: string; help: string; className: string }> = {
  kans: { title: "Kansen", help: "Ontwikkelingen buiten ons die helpen", className: "bg-[#dcefe4]" },
  bedreiging: { title: "Bedreigingen", help: "Ontwikkelingen buiten ons die tegenwerken", className: "bg-km-danger-soft" },
  belemmering: { title: "Belemmeringen", help: "Wat ons zelf tegenhoudt", className: "bg-km-warning-soft" },
};

function RisksTab({ concept, canManage }: { concept: Concept; canManage: boolean }) {
  const { addRisk, removeRisk } = useStore();
  const [kind, setKind] = React.useState<RiskKind>("kans");
  const [text, setText] = React.useState("");
  const [error, setError] = React.useState<string>();
  return (
    <div className="flex flex-col gap-8">
      <h2 className="text-2xl">Kansen en risico’s</h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {(Object.keys(RISK_META) as RiskKind[]).map((k) => {
          const items = concept.risks.filter((r) => r.kind === k);
          return (
            <section key={k} className={cn("rounded-2xl p-5", RISK_META[k].className)} aria-labelledby={`risk-${k}`}>
              <h3 id={`risk-${k}`} className="text-xl">
                {RISK_META[k].title} <span className="text-base font-normal text-km-muted">({items.length})</span>
              </h3>
              <p className="mb-4 text-sm text-km-text">{RISK_META[k].help}</p>
              {items.length === 0 ? (
                <Empty>Nog niets genoteerd.</Empty>
              ) : (
                <ul className="flex flex-col gap-2">
                  {items.map((r) => (
                    <li key={r.id} className="flex items-start justify-between gap-2 rounded-xl bg-white p-3">
                      <span>{r.text}</span>
                      {canManage && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="-my-2 -mr-2 shrink-0"
                          aria-label={`Verwijder ‘${r.text}’`}
                          onClick={() => {
                            removeRisk(concept.id, r.id);
                            notify.prototype("Verwijderd");
                          }}
                        >
                          <Trash2 aria-hidden />
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
      {canManage && (
        <form
          noValidate
          className="flex flex-col gap-4 rounded-2xl border border-km-line bg-white p-5 md:flex-row md:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            if (!text.trim()) return setError("Beschrijf de kans of het risico.");
            setError(undefined);
            addRisk(concept.id, { kind, text: text.trim() });
            setText("");
            notify.prototype(`${{ kans: "Kans", bedreiging: "Bedreiging", belemmering: "Belemmering" }[kind]} toegevoegd`);
          }}
        >
          <FormField label="Soort" className="md:w-52">
            {(p) => (
              <Select value={kind} onValueChange={(v) => setKind(v as RiskKind)}>
                <SelectTrigger id={p.id} className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="kans">Kans</SelectItem>
                  <SelectItem value="bedreiging">Bedreiging</SelectItem>
                  <SelectItem value="belemmering">Belemmering</SelectItem>
                </SelectContent>
              </Select>
            )}
          </FormField>
          <FormField label="Omschrijving" error={error} className="flex-1">
            {(p) => <Input {...p} value={text} onChange={(e) => setText(e.target.value)} />}
          </FormField>
          <Button type="submit" variant="outline" className={error ? "md:mb-7" : ""}>
            <Plus aria-hidden />
            Toevoegen
          </Button>
        </form>
      )}
    </div>
  );
}

/* ---------------- Haalbaarheid ---------------- */
const FEAS: { key: keyof Feasibility; label: string; help: string }[] = [
  { key: "people", label: "Mensen", help: "Wie is er nodig en wie is beschikbaar?" },
  { key: "resources", label: "Middelen", help: "Geld, ruimte, materiaal." },
  { key: "partners", label: "Partners", help: "Met wie werken we samen?" },
  { key: "mission", label: "Missie", help: "Hoe past dit bij Haags Verhaal?" },
  { key: "missingKnowledge", label: "Ontbrekende kennis", help: "Wat weten we nog niet?" },
];

function FeasibilityTab({ concept, canManage }: { concept: Concept; canManage: boolean }) {
  const { updateConcept } = useStore();
  const [editing, setEditing] = React.useState<keyof Feasibility | null>(null);
  const [draft, setDraft] = React.useState("");
  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-2xl">Haalbaarheid</h2>
      <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {FEAS.map((f) => (
          <li key={f.key} className="rounded-2xl border border-km-line bg-white p-5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-lg">{f.label}</h3>
                <p className="text-sm text-km-muted">{f.help}</p>
              </div>
              {canManage && editing !== f.key && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditing(f.key);
                    setDraft(concept.feasibility[f.key]);
                  }}
                >
                  <Pencil className="size-4" aria-hidden />
                  Wijzig<span className="sr-only"> {f.label}</span>
                </Button>
              )}
            </div>
            <div className="mt-3">
              {editing === f.key ? (
                <form
                  className="flex flex-col gap-3"
                  onSubmit={(e) => {
                    e.preventDefault();
                    updateConcept(concept.id, { feasibility: { ...concept.feasibility, [f.key]: draft.trim() } });
                    setEditing(null);
                    notify.prototype(`${f.label} bijgewerkt`);
                  }}
                >
                  <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} aria-label={f.label} rows={3} autoFocus />
                  <div className="flex gap-2">
                    <Button type="submit" size="sm">
                      Bewaren
                    </Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(null)}>
                      Annuleren
                    </Button>
                  </div>
                </form>
              ) : concept.feasibility[f.key] ? (
                concept.feasibility[f.key]
              ) : (
                <Empty>Nog niet ingevuld.</Empty>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------------- Onderzoek ---------------- */
const RESEARCH_LABEL: Record<ResearchStatus, string> = { open: "Nog te doen", bezig: "Bezig", afgerond: "Afgerond" };

function ResearchTab({ concept, canManage, outcomeTitle }: { concept: Concept; canManage: boolean; outcomeTitle: string }) {
  const { addResearch, updateResearch } = useStore();
  const [assumption, setAssumption] = React.useState("");
  const [method, setMethod] = React.useState("");
  const [errors, setErrors] = React.useState<string[]>([]);
  const [resultFor, setResultFor] = React.useState<string | null>(null);
  const [result, setResult] = React.useState("");

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h2 className="text-2xl">Onderzoek</h2>
        <Link
          href={`/concepten/${concept.id}/realiteitstoets`}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-km-softgreen px-4 font-semibold text-km-green hover:underline"
        >
          <ClipboardCheck className="size-5" aria-hidden />
          Realiteitstoets: {outcomeTitle.toLowerCase()}
        </Link>
      </div>
      <p className="-mt-4 text-km-muted">Aannames, gesprekken, resultaten en bewijs.</p>
      {concept.research.length === 0 ? (
        <EmptyState as="h3" icon={Search} title="Nog geen onderzoeksvragen" description="Zet ‘onbekende’ punten uit de realiteitstoets om in onderzoeksvragen, of voeg er zelf een toe." />
      ) : (
        <ul className="flex flex-col gap-3">
          {concept.research.map((r) => (
            <li key={r.id} className="flex flex-col gap-3 rounded-2xl border border-km-line bg-white p-5 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-km-muted">Aanname</p>
                <h3 className="text-lg">{r.assumption}</h3>
                <p className="mt-1">
                  <span className="text-km-muted">Methode: </span>
                  {r.method || "Nog te bepalen"}
                </p>
                {r.result && (
                  <p className="mt-2 rounded-xl bg-km-softgreen p-3">
                    <span className="font-semibold text-km-green">Resultaat: </span>
                    {r.result}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 flex-col gap-2 md:w-48">
                {canManage ? (
                  <Select
                    value={r.status}
                    onValueChange={(v) => {
                      if (v === "afgerond" && !r.result) {
                        setResultFor(r.id);
                        setResult("");
                        return;
                      }
                      updateResearch(concept.id, r.id, { status: v as ResearchStatus });
                      notify.prototype(`Onderzoek: ${RESEARCH_LABEL[v as ResearchStatus].toLowerCase()}`);
                    }}
                  >
                    <SelectTrigger className="w-full" aria-label={`Status van ‘${r.assumption}’`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(RESEARCH_LABEL) as ResearchStatus[]).map((s) => (
                        <SelectItem key={s} value={s}>
                          {RESEARCH_LABEL[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <span className="font-semibold">{RESEARCH_LABEL[r.status]}</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      {canManage && (
        <form
          noValidate
          className="flex flex-col gap-4 rounded-2xl border border-km-line bg-white p-5"
          onSubmit={(e) => {
            e.preventDefault();
            const errs = !assumption.trim() ? ["Beschrijf de aanname die je wilt toetsen."] : [];
            setErrors(errs);
            if (errs.length) return;
            addResearch(concept.id, [{ assumption: assumption.trim(), method: method.trim(), status: "open" }]);
            setAssumption("");
            setMethod("");
            notify.prototype("Onderzoeksvraag toegevoegd");
          }}
        >
          <h3 className="text-lg">Onderzoeksvraag toevoegen</h3>
          <FormField label="Aanname" error={errors[0]} hint="Wat denken we, maar weten we nog niet zeker?">
            {(p) => <Input {...p} value={assumption} onChange={(e) => setAssumption(e.target.value)} />}
          </FormField>
          <FormField label="Methode" optional hint="Bijvoorbeeld vijf gesprekken, een enquête of een kleine proef.">
            {(p) => <Input {...p} value={method} onChange={(e) => setMethod(e.target.value)} />}
          </FormField>
          <Button type="submit" variant="outline" className="self-start">
            <Plus aria-hidden />
            Toevoegen
          </Button>
        </form>
      )}
      <Dialog open={resultFor !== null} onOpenChange={(o) => !o && setResultFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Wat is het resultaat?</DialogTitle>
            <DialogDescription>Leg kort vast wat het onderzoek heeft opgeleverd, zodat anderen het bewijs kunnen terugvinden.</DialogDescription>
          </DialogHeader>
          <form
            noValidate
            className="flex flex-col gap-5"
            onSubmit={(e) => {
              e.preventDefault();
              if (!result.trim()) return;
              updateResearch(concept.id, resultFor!, { status: "afgerond", result: result.trim() });
              notify.prototype("Onderzoek afgerond");
              setResultFor(null);
            }}
          >
            <FormField label="Resultaat" error={result.trim() ? undefined : "Vul het resultaat in om af te ronden."}>
              {(p) => <Textarea {...p} value={result} onChange={(e) => setResult(e.target.value)} rows={3} />}
            </FormField>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setResultFor(null)}>
                Annuleren
              </Button>
              <Button type="submit" disabled={!result.trim()}>
                Afronden
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ---------------- Acties ---------------- */
const ACTION_LABEL: Record<ActionStatus, string> = { open: "Open", bezig: "Bezig", klaar: "Klaar" };

function ActionsTab({ concept, canManage }: { concept: Concept; canManage: boolean }) {
  const { state, userName, addAction, updateAction, currentUser } = useStore();
  const { members } = useProjectData();
  const actions = state.actions.filter((a) => a.conceptId === concept.id).sort((a, b) => (a.deadline ?? "9").localeCompare(b.deadline ?? "9"));
  const [description, setDescription] = React.useState("");
  const [owner, setOwner] = React.useState(currentUser.id);
  const [deadline, setDeadline] = React.useState("");
  const [errors, setErrors] = React.useState<string[]>([]);
  const today = useToday() ?? "";

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="text-2xl">Acties</h2>
        <p className="text-km-muted">Verantwoordelijken, deadlines en vervolgstappen.</p>
      </div>
      {actions.length === 0 ? (
        <EmptyState as="h3" icon={ListChecks} title="Nog geen acties" description="Wat is de eerstvolgende stap, en wie pakt die op?" />
      ) : (
        <ul className="flex flex-col divide-y divide-km-line rounded-2xl border border-km-line bg-white">
          {actions.map((a) => {
            const overdue = a.status !== "klaar" && !!today && !!a.deadline && a.deadline < today;
            const mayEdit = canManage || a.ownerId === currentUser.id;
            return (
              <li key={a.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                <label className="flex flex-1 cursor-pointer items-start gap-3">
                  <Checkbox
                    className="mt-1"
                    checked={a.status === "klaar"}
                    disabled={!mayEdit}
                    onCheckedChange={(v) => {
                      updateAction(a.id, { status: v ? "klaar" : "open" });
                      notify.prototype(v ? "Actie afgevinkt" : "Actie heropend");
                    }}
                  />
                  <span className="flex flex-col">
                    <span className={cn("font-semibold text-km-green", a.status === "klaar" && "line-through opacity-70")}>{a.description}</span>
                    <span className="text-sm text-km-muted">
                      {userName(a.ownerId)}
                      {a.deadline && (
                        <>
                          {" · "}
                          <span className={cn(overdue && "font-semibold text-km-danger")}>
                            {overdue && <TriangleAlert className="mr-1 inline size-4" aria-hidden />}
                            {overdue ? "Te laat, deadline " : "Deadline "}
                            {formatDate(a.deadline)}
                          </span>
                        </>
                      )}
                    </span>
                  </span>
                </label>
                {mayEdit && a.status !== "klaar" && (
                  <Select value={a.status} onValueChange={(v) => updateAction(a.id, { status: v as ActionStatus })}>
                    <SelectTrigger className="w-full sm:w-36" aria-label={`Status van ‘${a.description}’`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(ACTION_LABEL) as ActionStatus[]).map((s) => (
                        <SelectItem key={s} value={s}>
                          {ACTION_LABEL[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {a.status === "klaar" && (
                  <span className="inline-flex items-center gap-1 text-sm font-semibold text-[#0c5536]">
                    <Check className="size-4" aria-hidden />
                    Klaar
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {canManage && (
        <form
          noValidate
          className="flex flex-col gap-4 rounded-2xl border border-km-line bg-white p-5"
          onSubmit={(e) => {
            e.preventDefault();
            const errs = [
              !description.trim() && "Beschrijf de actie.",
              deadline && deadline < today && "De deadline ligt in het verleden.",
            ].filter((x): x is string => !!x);
            setErrors(errs);
            if (errs.length) return;
            addAction({ description: description.trim(), ownerId: owner, deadline: deadline || undefined, status: "open", conceptId: concept.id });
            setDescription("");
            setDeadline("");
            notify.prototype(`Actie toegewezen aan ${userName(owner)}`);
          }}
        >
          <h3 className="text-lg">Actie toevoegen</h3>
          <ErrorSummary errors={errors} />
          <FormField label="Wat moet er gebeuren?" error={errors.find((x) => x.includes("Beschrijf"))}>
            {(p) => <Input {...p} value={description} onChange={(e) => setDescription(e.target.value)} />}
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Verantwoordelijke">
              {(p) => (
                <Select value={owner} onValueChange={setOwner}>
                  <SelectTrigger id={p.id} className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {members.map((m) => (
                      <SelectItem key={m.userId} value={m.userId}>
                        {userName(m.userId)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </FormField>
            <FormField label="Deadline" optional error={errors.find((x) => x.includes("deadline"))}>
              {(p) => <Input {...p} type="date" min={today} value={deadline} onChange={(e) => setDeadline(e.target.value)} />}
            </FormField>
          </div>
          <Button type="submit" variant="outline" className="self-start">
            <Plus aria-hidden />
            Actie toevoegen
          </Button>
        </form>
      )}
    </div>
  );
}

