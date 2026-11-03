"use client";

import { authorName } from "@/lib/authors";
import * as React from "react";
import Link from "next/link";
import { Link2, X, Archive, ArchiveRestore, Check, EyeOff, Eye, Layers, MessageSquare, Pencil, PlusCircle } from "lucide-react";
import { useProjectData, useStore } from "@/lib/store";
import { PageHeader } from "@/components/km/page-header";
import { StatusBadge, STATUS_META, STATUSES, Tag } from "@/components/km/status-badge";
import { NotInProject, RequireProject } from "@/components/km/guards";
import { ConfirmDialog } from "@/components/km/confirm-dialog";
import { ConceptCreateDialog } from "@/components/km/concept-create-dialog";
import { IdeaLinksDialog } from "@/components/km/link-dialogs";
import { EmptyState } from "@/components/km/empty-state";
import { ErrorSummary, FormField } from "@/components/km/form-field";
import { notify } from "@/components/km/toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDate, formatDateTime, initials } from "@/lib/format";
import type { ContributionKind, Status } from "@/lib/types";
import { cn } from "@/lib/utils";

export function IdeaDetailScreen({ id }: { id: string }) {
  return (
    <RequireProject>
      <IdeaDetailInner id={id} />
    </RequireProject>
  );
}

function IdeaDetailInner({ id }: { id: string }) {
  const { state, currentUser, allowed, project, userName, updateIdea, removeRelation } = useStore();
  const { audiences, needs, ideas, concepts } = useProjectData();
  const idea = ideas.find((i) => i.id === id);
  const [editOpen, setEditOpen] = React.useState(false);
  const [conceptOpen, setConceptOpen] = React.useState(false);
  const [linksOpen, setLinksOpen] = React.useState(false);

  const canModerate = allowed("bijdragen.modereren");
  if (!idea || (idea.pending && !canModerate && idea.authorId !== currentUser.id)) {
    return <NotInProject kind="idee" backHref="/ideeen" backLabel="Naar alle ideeën" />;
  }

  const isAuthor = idea.authorId === currentUser.id;
  const canEdit = isAuthor || canModerate;
  const canConcept = allowed("concepten.beheren");
  const canLink = (isAuthor || canConcept) && !idea.archived;
  const linkedAudiences = audiences.filter((a) => idea.audienceIds.includes(a.id));
  const linkedNeeds = needs.filter((n) => idea.needIds.includes(n.id));
  const linkedConcepts = concepts.filter((c) => c.ideaIds.includes(idea.id));
  const related = ideas.filter((i) => idea.relatedIdeaIds.includes(i.id) && !i.archived);
  const relatable = ideas.filter((i) => i.id !== idea.id && !i.archived && !i.pending && !idea.relatedIdeaIds.includes(i.id));
  const contributions = state.contributions
    .filter((c) => c.ideaId === idea.id)
    .filter((c) => (!c.hidden && !c.pending) || canModerate || c.authorId === currentUser.id)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  return (
    <article>
      <PageHeader
        back={{ href: "/ideeen", label: "Terug naar ideeën" }}
        title={idea.title}
        meta={
          <>
            {idea.archived ? <StatusBadge status="gearchiveerd" /> : idea.pending ? <StatusBadge status="wacht-op-goedkeuring" /> : <StatusBadge status={idea.status} />}
            {linkedAudiences.map((a) => (
              <Tag key={a.id}>{a.name}</Tag>
            ))}
            <span className="text-sm text-km-muted">
              Gedeeld door {authorName(idea, userName)} op {formatDate(idea.createdAt)}
            </span>
          </>
        }
        actions={
          <>
            {canEdit && !idea.archived && (
              <Button variant="outline" onClick={() => setEditOpen(true)}>
                <Pencil aria-hidden />
                Bewerken
              </Button>
            )}
            {canConcept && !idea.archived && !idea.pending && (
              <Button variant="outline" onClick={() => setConceptOpen(true)}>
                <Layers aria-hidden />
                Maak er een concept van
              </Button>
            )}
          </>
        }
      />

      {idea.pending && (
        <div className="mb-8 flex flex-col gap-3 rounded-2xl bg-km-warning-soft p-5 text-km-warning-text sm:flex-row sm:items-center sm:justify-between">
          <p>Dit idee wacht op goedkeuring en is nog niet zichtbaar voor andere deelnemers.</p>
          {canModerate && (
            <Button
              onClick={() => {
                void notify.after(updateIdea(idea.id, { pending: undefined }), "Idee goedgekeurd");
              }}
            >
              <Check aria-hidden />
              Goedkeuren
            </Button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex flex-col gap-10">
          <section aria-labelledby="beschrijving">
            <h2 id="beschrijving" className="sr-only">
              Beschrijving
            </h2>
            <p className="text-lg whitespace-pre-line">{idea.description}</p>
            {idea.problem && (
              <div className="mt-6 rounded-2xl bg-km-softgreen p-5">
                <h3 className="text-lg">Welke behoefte of welk probleem lost dit op?</h3>
                <p className="mt-1">{idea.problem}</p>
              </div>
            )}
          </section>

          <Contributions ideaId={idea.id} contributions={contributions} canModerate={canModerate} allowComments={project!.settings.allowComments} requireApproval={project!.settings.requireApproval} archived={!!idea.archived} />
        </div>

        <aside className="flex flex-col gap-8" aria-label="Verbanden">
          {canConcept && !idea.archived && (
            <section aria-labelledby="status-label" className="rounded-2xl border border-km-line bg-white p-5">
              <h2 id="status-label" className="mb-3 text-lg">Status</h2>
              <Select
                value={idea.status}
                onValueChange={(v) => {
                  void notify.after(updateIdea(idea.id, { status: v as Status }), `Status gewijzigd naar ‘${STATUS_META[v as Status].label}’`);
                }}
              >
                <SelectTrigger className="w-full" aria-labelledby="status-label">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {STATUS_META[s].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </section>
          )}
          <SideList
            title="Behoeften"
            empty="Nog niet gekoppeld aan een behoefte."
            action={
              canLink && (
                <Button variant="ghost" size="sm" onClick={() => setLinksOpen(true)}>
                  <Link2 className="size-4" aria-hidden />
                  Koppelen<span className="sr-only"> doelgroepen en behoeften</span>
                </Button>
              )
            }
          >
            {linkedNeeds.map((n) => (
              <li key={n.id}>
                <Link href={`/doelgroepen/${n.audienceId}`} className="text-km-green underline underline-offset-4 hover:no-underline">
                  {n.description}
                </Link>
              </li>
            ))}
          </SideList>
          <SideList title="Onderdeel van concepten" empty="Nog geen concept. Het idee blijft altijd zelfstandig bestaan.">
            {linkedConcepts.map((c) => (
              <li key={c.id} className="flex flex-col gap-1">
                <Link href={`/concepten/${c.id}`} className="font-semibold text-km-green underline underline-offset-4 hover:no-underline">
                  {c.name}
                </Link>
                <StatusBadge status={c.status} className="w-fit" />
              </li>
            ))}
          </SideList>
          <SideList title="Gerelateerde ideeën" empty="Nog geen gerelateerde ideeën.">
            {related.map((r) => (
              <li key={r.id} className="flex items-start justify-between gap-2">
                <Link href={`/ideeen/${r.id}`} className="py-2 text-km-green underline underline-offset-4 hover:no-underline">
                  {r.title}
                </Link>
                {canLink && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0"
                    aria-label={`Koppeling met ‘${r.title}’ verwijderen`}
                    onClick={() => void notify.after(removeRelation(idea.id, r.id), "Koppeling verwijderd")}
                  >
                    <X aria-hidden />
                  </Button>
                )}
              </li>
            ))}
          </SideList>
          {canLink && !idea.archived && relatable.length > 0 && <RelateForm ideaId={idea.id} options={relatable} />}
          {canEdit && (
            <div className="border-t border-km-line pt-6">
              {idea.archived ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    void notify.after(updateIdea(idea.id, { archived: false }), "Idee teruggezet");
                  }}
                >
                  <ArchiveRestore aria-hidden />
                  Terugzetten
                </Button>
              ) : (
                <ConfirmDialog
                  title="Idee archiveren?"
                  description="Het idee verdwijnt uit de gewone overzichten. Bijdragen en koppelingen met concepten blijven bewaard. Je kunt het later terugzetten."
                  confirmLabel="Archiveren"
                  destructive
                  onConfirm={() => {
                    void notify.after(updateIdea(idea.id, { archived: true }), "Idee gearchiveerd");
                  }}
                  trigger={
                    <Button variant="ghost" className="text-km-danger hover:bg-km-danger-soft">
                      <Archive aria-hidden />
                      Archiveren
                    </Button>
                  }
                />
              )}
            </div>
          )}
        </aside>
      </div>

      <EditIdeaDialog open={editOpen} onOpenChange={setEditOpen} ideaId={idea.id} />
      <ConceptCreateDialog open={conceptOpen} onOpenChange={setConceptOpen} initialIdeaIds={[idea.id]} />
      <IdeaLinksDialog ideaId={idea.id} open={linksOpen} onOpenChange={setLinksOpen} />
    </article>
  );
}

function SideList({ title, empty, children, action }: { title: string; empty: string; children: React.ReactNode[]; action?: React.ReactNode }) {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-lg">{title}</h2>
        {action}
      </div>
      {children.length === 0 ? <p className="text-sm text-km-muted">{empty}</p> : <ul className="flex flex-col gap-3">{children}</ul>}
    </section>
  );
}

const KIND_LABEL: Record<ContributionKind, string> = { reactie: "Reactie", aanvulling: "Aanvulling" };

function Contributions({
  ideaId,
  contributions,
  canModerate,
  allowComments,
  archived,
  requireApproval,
}: {
  ideaId: string;
  contributions: ReturnType<typeof useStore>["state"]["contributions"];
  canModerate: boolean;
  allowComments: boolean;
  requireApproval: boolean;
  archived: boolean;
}) {
  const { userName, addContribution, updateContribution, currentUser } = useStore();
  const [kind, setKind] = React.useState<ContributionKind>("reactie");
  const [text, setText] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [errors, setErrors] = React.useState<string[]>([]);
  const errorRef = React.useRef<HTMLDivElement>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = !text.trim()
      ? ["Schrijf eerst je bijdrage."]
      : text.length > 1000
        ? ["Je bijdrage mag maximaal 1000 tekens zijn."]
        : [];
    setErrors(errs);
    if (errs.length) {
      requestAnimationFrame(() => errorRef.current?.focus());
      return;
    }
    setBusy(true);
    const ok = await notify.after(
      addContribution(ideaId, kind, text),
      requireApproval
        ? "Je bijdrage is geplaatst en wacht op goedkeuring"
        : kind === "aanvulling"
          ? "Je aanvulling is toegevoegd"
          : "Je reactie is geplaatst",
    );
    setBusy(false);
    if (ok) setText("");
  };

  return (
    <section aria-labelledby="bijdragen">
      <h2 id="bijdragen" className="mb-6 text-2xl">
        Reacties en aanvullingen <span className="text-km-muted">({contributions.length})</span>
      </h2>
      {contributions.length === 0 ? (
        <EmptyState as="h3" icon={MessageSquare} title="Nog geen bijdragen" description="Help dit idee verder met een reactie of een aanvulling." />
      ) : (
        <ol className="flex flex-col gap-4">
          {contributions.map((c) => (
            <li key={c.id} className={cn("rounded-2xl border bg-white p-5", c.kind === "aanvulling" ? "border-km-green/40" : "border-km-line", c.hidden && "border-dashed bg-km-offwhite")}>
              <div className="flex flex-wrap items-center gap-3">
                <span aria-hidden className="flex size-9 items-center justify-center rounded-full bg-km-softgreen text-sm font-bold text-km-green">
                  {initials(userName(c.authorId))}
                </span>
                <span className="font-semibold text-km-green">{userName(c.authorId)}</span>
                <span className={cn("rounded-full px-2 py-0.5 text-xs font-bold", c.kind === "aanvulling" ? "bg-km-green text-white" : "bg-km-softgreen text-km-green")}>
                  {KIND_LABEL[c.kind]}
                </span>
                <span className="text-sm text-km-muted">{formatDateTime(c.createdAt)}</span>
                {c.hidden && <span className="text-sm font-semibold text-km-danger">Verborgen</span>}
                {c.pending && <StatusBadge status="wacht-op-goedkeuring" />}
              </div>
              <p className="mt-3 whitespace-pre-line">{c.text}</p>
              {canModerate && c.authorId !== currentUser.id && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {c.pending && (
                    <Button size="sm" variant="secondary" onClick={() => void notify.after(updateContribution(c.id, { pending: undefined }), "Bijdrage goedgekeurd")}>
                      <Check aria-hidden /> Goedkeuren
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => void notify.after(updateContribution(c.id, { hidden: !c.hidden }), c.hidden ? "Bijdrage weer zichtbaar" : "Bijdrage verborgen")}>
                    {c.hidden ? <Eye aria-hidden /> : <EyeOff aria-hidden />}
                    {c.hidden ? "Tonen" : "Verbergen"}
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ol>
      )}

      {archived ? (
        <p className="mt-6 rounded-xl bg-white p-4 text-km-muted ring-1 ring-km-line">Dit idee is gearchiveerd. Je kunt geen bijdragen meer toevoegen.</p>
      ) : !allowComments ? (
        <p className="mt-6 rounded-xl bg-white p-4 text-km-muted ring-1 ring-km-line">Reageren is in dit project uitgeschakeld door de beheerder.</p>
      ) : (
        <form onSubmit={submit} noValidate className="mt-8 flex flex-col gap-5 rounded-2xl bg-km-softgreen p-5 md:p-6">
          <h3 className="text-xl">Draag bij</h3>
          <ErrorSummary ref={errorRef} errors={errors} />
          <fieldset>
            <legend className="mb-2 font-semibold text-km-green">Wat voor bijdrage is het?</legend>
            <RadioGroup value={kind} onValueChange={(v) => setKind(v as ContributionKind)} className="flex flex-wrap gap-3">
              {(["reactie", "aanvulling"] as const).map((k) => (
                <Label key={k} htmlFor={`kind-${k}`} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl bg-white px-4 font-normal ring-1 ring-km-line has-[[data-state=checked]]:ring-2 has-[[data-state=checked]]:ring-km-green">
                  <RadioGroupItem id={`kind-${k}`} value={k} />
                  <span>
                    <span className="font-semibold">{KIND_LABEL[k]}</span>
                    <span className="text-sm text-km-muted"> — {k === "reactie" ? "een vraag of mening" : "maak het idee sterker"}</span>
                  </span>
                </Label>
              ))}
            </RadioGroup>
          </fieldset>
          <FormField label="Jouw bijdrage" error={errors[0]}>
            {(p) => <Textarea {...p} value={text} onChange={(e) => setText(e.target.value)} rows={4} className="bg-white" />}
          </FormField>
          <Button type="submit" className="self-start" disabled={busy}>
            <PlusCircle aria-hidden />
            {busy ? "Bezig…" : "Plaats bijdrage"}
          </Button>
        </form>
      )}
    </section>
  );
}

function EditIdeaDialog({ open, onOpenChange, ideaId }: { open: boolean; onOpenChange: (o: boolean) => void; ideaId: string }) {
  const { state, updateIdea } = useStore();
  const idea = state.ideas.find((i) => i.id === ideaId)!;
  const [title, setTitle] = React.useState(idea.title);
  const [description, setDescription] = React.useState(idea.description);
  const [problem, setProblem] = React.useState(idea.problem ?? "");
  const [errors, setErrors] = React.useState<string[]>([]);

  // Formulier opnieuw vullen bij openen (state aanpassen tijdens render, geen effect).
  const [prevOpen, setPrevOpen] = React.useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
        setTitle(idea.title);
        setDescription(idea.description);
        setProblem(idea.problem ?? "");
        setErrors([]);
    }
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = [!title.trim() && "Geef je idee een naam.", !description.trim() && "De beschrijving mag niet leeg zijn."].filter(
      (x): x is string => !!x,
    );
    setErrors(errs);
    if (errs.length) return;
    if (await notify.after(updateIdea(ideaId, { title: title.trim(), description: description.trim(), problem: problem.trim() || undefined }), "Wijzigingen bewaard"))
      onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Idee bewerken</DialogTitle>
          <DialogDescription>Pas de naam of beschrijving aan.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} noValidate className="flex flex-col gap-5">
          <ErrorSummary errors={errors} />
          <FormField label="Naam" error={errors.find((x) => x.includes("naam"))}>
            {(p) => <Input {...p} value={title} onChange={(e) => setTitle(e.target.value)} />}
          </FormField>
          <FormField label="Beschrijving" error={errors.find((x) => x.includes("beschrijving"))}>
            {(p) => <Textarea {...p} value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />}
          </FormField>
          <FormField label="Welke behoefte of welk probleem lost dit op?" optional>
            {(p) => <Textarea {...p} value={problem} onChange={(e) => setProblem(e.target.value)} rows={2} />}
          </FormField>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuleren
            </Button>
            <Button type="submit">Wijzigingen bewaren</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Een gerelateerd idee koppelen (bijvoorbeeld om later te combineren). */
function RelateForm({ ideaId, options }: { ideaId: string; options: { id: string; title: string }[] }) {
  const { addRelation } = useStore();
  const [other, setOther] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const id = React.useId();
  return (
    <form
      className="-mt-4 flex flex-col gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!other) return;
        setBusy(true);
        const ok = await notify.after(addRelation(ideaId, other), "Ideeën aan elkaar gekoppeld");
        setBusy(false);
        if (ok) setOther("");
      }}
    >
      <Label htmlFor={id} className="text-sm font-semibold text-km-green">
        Koppel een gerelateerd idee
      </Label>
      <div className="flex gap-2">
        <Select value={other} onValueChange={setOther}>
          <SelectTrigger id={id} className="w-full min-w-0">
            <SelectValue placeholder="Kies een idee" />
          </SelectTrigger>
          <SelectContent>
            {options.map((o) => (
              <SelectItem key={o.id} value={o.id}>
                {o.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="submit" variant="outline" disabled={!other || busy} className="shrink-0">
          Koppel
        </Button>
      </div>
    </form>
  );
}
