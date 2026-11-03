"use client";

import { authorName } from "@/lib/authors";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lightbulb, Copy, Archive, ArchiveRestore, Check, Download, EyeOff, Eye, FolderPlus, Inbox, Link2, Mail, Pencil, Printer, Trash2, UserPlus } from "lucide-react";
import { useProjectData, useStore } from "@/lib/store";
import { PageHeader } from "@/components/km/page-header";
import { AccessDenied, RequireProject } from "@/components/km/guards";
import { ConfirmDialog } from "@/components/km/confirm-dialog";
import { EmptyState } from "@/components/km/empty-state";
import { ErrorSummary, FormField } from "@/components/km/form-field";
import { SessionStateBadge } from "@/components/km/session-state-badge";
import { STATUS_META, STATUSES, StatusBadge } from "@/components/km/status-badge";
import { assessmentOutcome } from "@/components/km/assessment-outcome";
import { InviteLink } from "@/components/km/invite-link";
import { notify } from "@/components/km/toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ROLE_LABELS, ROLES } from "@/lib/permissions";
import { formatDate, formatDateTime } from "@/lib/format";
import { downloadCsv } from "@/lib/csv";
import { useOrigin } from "@/hooks/use-origin";
import type { Project, ProjectSettings, Role } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useToday } from "@/hooks/use-today";

type TabDef = { value: string; label: string; roles: Role[] };
const TABS: TabDef[] = [
  { value: "overzicht", label: "Overzicht", roles: ["redacteur", "begeleider", "beheerder"] },
  { value: "projecten", label: "Projecten", roles: ["beheerder"] },
  { value: "gebruikers", label: "Gebruikers", roles: ["begeleider", "beheerder"] },
  { value: "sessies", label: "Sessies", roles: ["begeleider", "beheerder"] },
  { value: "inhoud", label: "Inhoud", roles: ["redacteur", "beheerder"] },
  { value: "instellingen", label: "Instellingen en export", roles: ["beheerder"] },
];

export function AdminScreen({ initialTab }: { initialTab?: string }) {
  return (
    <RequireProject>
      <Inner initialTab={initialTab} />
    </RequireProject>
  );
}

function Inner({ initialTab }: { initialTab?: string }) {
  const router = useRouter();
  const { role, project } = useStore();
  const tabs = TABS.filter((t) => role && t.roles.includes(role));
  const [tab, setTab] = React.useState(initialTab && tabs.some((t) => t.value === initialTab) ? initialTab : "overzicht");

  if (tabs.length === 0) {
    return (
      <>
        <PageHeader title="Beheer" />
        <AccessDenied description="Beheer is voor redacteuren, begeleiders en beheerders. Neem contact op met de beheerder van je project als je meer rechten nodig hebt." />
      </>
    );
  }
  const current = tabs.some((t) => t.value === tab) ? tab : tabs[0].value;

  return (
    <>
      <PageHeader title="Beheer" description={`Project: ${project!.name}`} />
      <Tabs
        value={current}
        onValueChange={(v) => {
          setTab(v);
          router.replace(`/beheer?tab=${v}`, { scroll: false });
        }}
      >
        <TabsList className="mb-8 h-auto w-full flex-wrap justify-start gap-1 rounded-none border-b border-km-line bg-transparent p-0">
          {tabs.map((t) => (
            <TabsTrigger
              key={t.value}
              value={t.value}
              className="h-auto min-h-12 flex-none rounded-none border-0 border-b-4 border-transparent px-4 text-base font-semibold text-km-muted hover:text-km-green data-[state=active]:border-km-yellow data-[state=active]:bg-transparent data-[state=active]:text-km-green data-[state=active]:shadow-none"
            >
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="overzicht"><OverviewTab /></TabsContent>
        <TabsContent value="projecten"><ProjectsTab /></TabsContent>
        <TabsContent value="gebruikers"><UsersTab /></TabsContent>
        <TabsContent value="sessies"><SessionsTab /></TabsContent>
        <TabsContent value="inhoud"><ContentTab /></TabsContent>
        <TabsContent value="instellingen"><SettingsTab /></TabsContent>
      </Tabs>
    </>
  );
}

/* ---------------- Overzicht ---------------- */
function OverviewTab() {
  const { state } = useStore();
  const { ideas, concepts, members, sessions, activities } = useProjectData();
  const pendingIdeas = ideas.filter((i) => i.pending).length;
  const pendingContribs = state.contributions.filter((c) => c.pending && ideas.some((i) => i.id === c.ideaId)).length;
  const stats = [
    ["Ideeën", ideas.filter((i) => !i.archived).length],
    ["Concepten", concepts.length],
    ["Deelnemers", members.length],
    ["Komende sessies", sessions.filter((s) => s.state !== "afgesloten").length],
  ] as const;
  return (
    <div className="flex flex-col gap-10">
      <h2 className="sr-only">Overzicht</h2>
      <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map(([label, n]) => (
          <div key={label} className="rounded-2xl bg-km-softgreen p-5">
            <dt className="text-km-text">{label}</dt>
            <dd className="font-heading text-4xl font-bold text-km-green">{n}</dd>
          </div>
        ))}
      </dl>
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
        <section>
          <h3 className="mb-3 text-xl">Openstaande beoordelingen</h3>
          {pendingIdeas + pendingContribs === 0 ? (
            <p className="text-km-muted">Niets te beoordelen.</p>
          ) : (
            <p>
              {pendingIdeas} ideeën en {pendingContribs} bijdragen wachten op goedkeuring.{" "}
              <Link href="/beheer?tab=inhoud" className="font-semibold text-km-green underline underline-offset-4">
                Naar inhoud
              </Link>
            </p>
          )}
        </section>
        <section>
          <h3 className="mb-3 text-xl">Conceptstatussen</h3>
          <ul className="flex flex-col gap-2">
            {STATUSES.map((s) => (
              <li key={s} className="flex items-center justify-between gap-3">
                <StatusBadge status={s} />
                <span className="font-semibold">{concepts.filter((c) => c.status === s).length}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
      <section>
        <h3 className="mb-3 text-xl">Recente activiteit</h3>
        <ul className="flex flex-col gap-2">
          {activities.slice(0, 8).map((a) => (
            <li key={a.id} className="flex flex-col sm:flex-row sm:gap-4">
              <span className="w-44 shrink-0 text-sm text-km-muted">{formatDateTime(a.at)}</span>
              <Link href={a.href} className="underline-offset-4 hover:underline">
                {a.text}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

/* ---------------- Projecten ---------------- */
function ProjectsTab() {
  const { state, currentUser, updateProject, setProject } = useStore();
  const router = useRouter();
  const mine = state.projects.filter((p) => state.memberships.some((m) => m.userId === currentUser.id && m.projectId === p.id && m.role === "beheerder"));
  const [edit, setEdit] = React.useState<Project | null | "nieuw">(null);
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl">Projecten</h2>
        <Button onClick={() => setEdit("nieuw")}>
          <FolderPlus aria-hidden />
          Nieuw project
        </Button>
      </div>
      <ul className="flex flex-col gap-3">
        {mine.map((p) => (
          <li key={p.id} className={cn("flex flex-col gap-4 rounded-2xl border border-km-line bg-white p-5 md:flex-row md:items-center md:justify-between", p.archived && "bg-km-offwhite")}>
            <div>
              <h3 className="text-lg">
                {p.name} {p.archived && <span className="ml-2 text-sm font-normal text-km-muted">(gearchiveerd)</span>}
              </h3>
              <p className="text-km-muted">{p.description}</p>
              <p className="mt-1 text-sm text-km-muted">{p.visibility === "besloten" ? "Besloten project" : "Open project"} · {state.memberships.filter((m) => m.projectId === p.id).length} leden</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {!p.archived && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setProject(p.id);
                    router.push("/");
                  }}
                >
                  Openen
                </Button>
              )}
              <Button variant="ghost" onClick={() => setEdit(p)}>
                <Pencil aria-hidden />
                Wijzigen
              </Button>
              {p.archived ? (
                <Button variant="ghost" onClick={() => void notify.after(updateProject(p.id, { archived: false }), "Project hersteld")}>
                  <ArchiveRestore aria-hidden />
                  Herstellen
                </Button>
              ) : (
                <ConfirmDialog
                  title={`‘${p.name}’ archiveren?`}
                  description="Deelnemers kunnen het project dan alleen nog bekijken, niet meer aanvullen. Je kunt het later herstellen."
                  confirmLabel="Archiveren"
                  destructive
                  onConfirm={() => {
                    void notify.after(updateProject(p.id, { archived: true }), "Project gearchiveerd");
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
          </li>
        ))}
      </ul>
      <ProjectDialog value={edit} onClose={() => setEdit(null)} />
    </div>
  );
}

function ProjectDialog({ value, onClose }: { value: Project | null | "nieuw"; onClose: () => void }) {
  const { addProject, updateProject } = useStore();
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [error, setError] = React.useState<string>();
  const open = value !== null;
  // Formulier opnieuw vullen bij openen (state aanpassen tijdens render, geen effect).
  const [prevValue, setPrevValue] = React.useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    if (value) {
        setName(value === "nieuw" ? "" : value.name);
        setDescription(value === "nieuw" ? "" : value.description);
        setError(undefined);
    }
  }
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{value === "nieuw" ? "Nieuw project" : "Project wijzigen"}</DialogTitle>
          <DialogDescription>Nieuwe projecten zijn standaard besloten: alleen genodigden doen mee.</DialogDescription>
        </DialogHeader>
        <form
          noValidate
          className="flex flex-col gap-5"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!name.trim()) return setError("Geef het project een naam.");
            let ok: unknown = null;
            if (value === "nieuw") {
              ok = await notify.after(addProject({ name: name.trim(), description: description.trim() }), "Project aangemaakt");
            } else if (value) {
              ok = await notify.after(updateProject(value.id, { name: name.trim(), description: description.trim() }), "Project gewijzigd");
            }
            if (ok) onClose();
          }}
        >
          <FormField label="Naam" error={error}>
            {(p) => <Input {...p} value={name} onChange={(e) => setName(e.target.value)} />}
          </FormField>
          <FormField label="Omschrijving" optional>
            {(p) => <Textarea {...p} value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />}
          </FormField>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Annuleren
            </Button>
            <Button type="submit">{value === "nieuw" ? "Aanmaken" : "Bewaren"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- Gebruikers en uitnodigingen ---------------- */
function UsersTab() {
  const { state, project, role, currentUser, setMemberRole, removeMember, revokeInvitation } = useStore();
  const { members, invitations } = useProjectData();
  const [inviteOpen, setInviteOpen] = React.useState(false);
  const canManageRoles = role === "beheerder";
  const today = useToday() ?? "";

  return (
    <div className="flex flex-col gap-10">
      <section aria-labelledby="leden" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="leden" className="text-2xl">Gebruikers ({members.length})</h2>
          <Button onClick={() => setInviteOpen(true)}>
            <UserPlus aria-hidden />
            Uitnodigen
          </Button>
        </div>
        {!canManageRoles && <p className="text-km-muted">Als begeleider kun je deelnemers uitnodigen. Rollen wijzigen kan alleen de beheerder.</p>}
        <ul className="flex flex-col divide-y divide-km-line rounded-2xl border border-km-line bg-white">
          {members.map((m) => {
            const u = state.users.find((x) => x.id === m.userId)!;
            const self = m.userId === currentUser.id;
            return (
              <li key={m.userId} className="flex flex-col gap-3 p-4 md:flex-row md:items-center">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-km-green">
                    {u.name} {self && <span className="font-normal text-km-muted">(jij)</span>}
                  </p>
                  <p className="truncate text-sm text-km-muted">
                    {u.email}
                    {u.organisation && ` · ${u.organisation}`}
                  </p>
                </div>
                {canManageRoles && !self ? (
                  <Select
                    value={m.role}
                    onValueChange={(v) => {
                      void notify.after(setMemberRole(m.userId, project!.id, v as Role), `${u.name} is nu ${ROLE_LABELS[v as Role].toLowerCase()}`);
                    }}
                  >
                    <SelectTrigger className="w-full md:w-44" aria-label={`Rol van ${u.name}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map((r) => (
                        <SelectItem key={r} value={r}>
                          {ROLE_LABELS[r]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <span className="text-sm font-semibold md:w-44">{ROLE_LABELS[m.role]}</span>
                )}
                {canManageRoles && !self && (
                  <ConfirmDialog
                    title={`${u.name} uit het project halen?`}
                    description="Hun bijdragen blijven bestaan. Het verwijderen van persoonsgegevens is een aparte handeling (via de beheerder van de database)."
                    confirmLabel="Uit project halen"
                    destructive
                    onConfirm={() => {
                      void notify.after(removeMember(m.userId, project!.id), `${u.name} is uit het project gehaald`);
                    }}
                    trigger={
                      <Button variant="ghost" size="icon" aria-label={`${u.name} uit het project halen`}>
                        <Trash2 aria-hidden />
                      </Button>
                    }
                  />
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="uitnodigingen" className="flex flex-col gap-4">
        <h2 id="uitnodigingen" className="text-2xl">Uitnodigingen</h2>
        {invitations.length === 0 ? (
          <EmptyState as="h3" icon={Inbox} title="Geen uitnodigingen" description="Nodig mensen uit via e-mail of een toegangslink." />
        ) : (
          <ul className="flex flex-col divide-y divide-km-line rounded-2xl border border-km-line bg-white">
            {invitations.map((inv) => {
              const expired = !!today && inv.expiresAt < today;
              const status = inv.revoked ? "Ingetrokken" : expired ? "Verlopen" : "Actief";
              return (
                <li key={inv.id} className="flex flex-col gap-2 p-4 md:flex-row md:items-center">
                  <div className="min-w-0 flex-1">
                    <p className="inline-flex items-center gap-2 font-semibold text-km-green">
                      {inv.kind === "e-mail" ? <Mail className="size-4" aria-hidden /> : <Link2 className="size-4" aria-hidden />}
                      {inv.kind === "e-mail"
                        ? inv.email
                        : inv.purpose === "inzending"
                          ? "Inzendlink (ideeën insturen zonder account)"
                          : `Toegangslink${inv.sessionId ? " voor sessie" : ""}`}
                    </p>
                    <p className="text-sm text-km-muted">
                      {inv.purpose === "inzending" ? "Zonder account" : ROLE_LABELS[inv.role]} · geldig tot {formatDate(inv.expiresAt)}
                    </p>
                    {!inv.revoked && (!today || inv.expiresAt >= today) && (
                      <CopyLinkButton
                        path={inv.purpose === "inzending" ? `/insturen/${inv.token}` : inv.sessionId ? `/doe-mee/${inv.token}` : `/uitnodiging/${inv.token}`}
                      />
                    )}
                  </div>
                  <span className={cn("text-sm font-semibold", status === "Actief" ? "text-[#0c5536]" : "text-km-muted")}>{status}</span>
                  {status === "Actief" && (
                    <ConfirmDialog
                      title="Uitnodiging intrekken?"
                      description="De link of e-mailuitnodiging werkt daarna niet meer."
                      confirmLabel="Intrekken"
                      destructive
                      onConfirm={() => {
                        void notify.after(revokeInvitation(inv.id), "Uitnodiging ingetrokken");
                      }}
                      trigger={
                        <Button variant="ghost" size="sm">
                          Intrekken
                        </Button>
                      }
                    />
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
      <InviteDialog open={inviteOpen} onOpenChange={setInviteOpen} />
    </div>
  );
}

function InviteDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { role, project, addInvitation } = useStore();
  const allowedRoles: Role[] = role === "beheerder" ? ROLES : ["deelnemer"];
  const [method, setMethod] = React.useState<"e-mail" | "link" | "inzending">("e-mail");
  const [email, setEmail] = React.useState("");
  const [inviteRole, setInviteRole] = React.useState<Role>("deelnemer");
  const [days, setDays] = React.useState("14");
  const [errors, setErrors] = React.useState<string[]>([]);
  const [created, setCreated] = React.useState<string | null>(null);
  const errRef = React.useRef<HTMLDivElement>(null);

  // Formulier opnieuw vullen bij openen (state aanpassen tijdens render, geen effect).
  const [prevOpen, setPrevOpen] = React.useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
        setEmail("");
        setErrors([]);
        setCreated(null);
        setInviteRole("deelnemer");
    }
  }

  const [busy, setBusy] = React.useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (method === "e-mail") {
      const errs = !email.trim()
        ? ["Vul een e-mailadres in."]
        : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
          ? ["Dit e-mailadres lijkt niet te kloppen. Controleer het, bijvoorbeeld naam@organisatie.nl."]
          : [];
      setErrors(errs);
      if (errs.length) {
        requestAnimationFrame(() => errRef.current?.focus());
        return;
      }
    }
    setBusy(true);
    const expires = new Date(Date.now() + Number(days) * 86400000).toISOString().slice(0, 10);
    const token = await notify.after(
      addInvitation({
        projectId: project!.id,
        role: method === "inzending" ? "deelnemer" : inviteRole,
        kind: method === "e-mail" ? "e-mail" : "link",
        purpose: method === "inzending" ? "inzending" : "deelname",
        email: method === "e-mail" ? email.trim().toLowerCase() : undefined,
        expiresAt: expires,
      }),
      method === "e-mail" ? "Persoonlijke uitnodiging aangemaakt" : method === "inzending" ? "Inzendlink aangemaakt" : "Toegangslink aangemaakt",
    );
    setBusy(false);
    if (token) setCreated(token);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Iemand uitnodigen</DialogTitle>
          <DialogDescription>
            Voor ‘{project?.name}’. Een inzendlink laat mensen zonder account ideeën insturen; alle links hebben een vervaldatum.
          </DialogDescription>
        </DialogHeader>
        {created ? (
          <div className="flex flex-col gap-4">
            <p className="font-semibold text-km-green">
              {method === "e-mail"
                ? `De uitnodiging voor ${email.trim().toLowerCase()} is klaar. Er is nog geen e-maildienst gekoppeld: stuur deze link zelf. Alleen dit e-mailadres kan hem gebruiken.`
                : method === "inzending"
                  ? "De inzendlink is klaar. Iedereen met deze link kan zonder account ideeën insturen tot de vervaldatum. Ingestuurde ideeën wachten eerst op goedkeuring (Beheer → Inhoud)."
                  : "De toegangslink is klaar. Iedereen met deze link kan meedoen tot de vervaldatum. Deel hem dus alleen met wie je wilt uitnodigen."}
            </p>
            <InviteLink
              path={method === "inzending" ? `/insturen/${created}` : `/uitnodiging/${created}`}
              qr={method === "inzending"}
              note={method === "inzending" ? "Deel deze link bijvoorbeeld in een nieuwsbrief of op een flyer (QR-code)." : "Deel deze link alleen met de bedoelde persoon of groep."}
            />
            <DialogFooter>
              <Button onClick={() => onOpenChange(false)}>Klaar</Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={submit} noValidate className="flex flex-col gap-5">
            <div role="group" aria-label="Manier van uitnodigen" className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {(["e-mail", "link", "inzending"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  aria-pressed={method === m}
                  onClick={() => { setMethod(m); setErrors([]); }}
                  className={cn("flex min-h-12 items-center justify-center gap-2 rounded-xl border-2 font-semibold", method === m ? "border-km-green bg-km-softgreen text-km-green" : "border-km-line text-km-muted")}
                >
                  {m === "e-mail" ? <Mail className="size-4" aria-hidden /> : m === "inzending" ? <Lightbulb className="size-4" aria-hidden /> : <Link2 className="size-4" aria-hidden />}
                  {m === "e-mail" ? "Via e-mail" : m === "inzending" ? "Inzendlink" : "Toegangslink"}
                </button>
              ))}
            </div>
            <ErrorSummary ref={errRef} errors={errors} />
            {method === "e-mail" && (
              <FormField label="E-mailadres" error={errors[0]?.includes("e-mailadres") ? errors[0] : undefined}>
                {(p) => <Input {...p} type="email" autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} />}
              </FormField>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              {method !== "inzending" && (
                <FormField label="Rol" hint={allowedRoles.length === 1 ? "Begeleiders nodigen alleen deelnemers uit." : undefined}>
                  {(p) => (
                    <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as Role)}>
                      <SelectTrigger id={p.id} aria-describedby={p["aria-describedby"]} className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {allowedRoles.map((r) => (
                          <SelectItem key={r} value={r}>
                            {ROLE_LABELS[r]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </FormField>
              )}
              <FormField label="Geldig">
                {(p) => (
                  <Select value={days} onValueChange={setDays}>
                    <SelectTrigger id={p.id} className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">7 dagen</SelectItem>
                      <SelectItem value="14">14 dagen</SelectItem>
                      <SelectItem value="30">30 dagen</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </FormField>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Annuleren
              </Button>
              <Button type="submit" disabled={busy}>
                {busy ? "Bezig…" : method === "e-mail" ? "Maak persoonlijke uitnodiging" : method === "inzending" ? "Maak inzendlink" : "Maak toegangslink"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- Sessies ---------------- */
function SessionsTab() {
  const { updateSession, userName } = useStore();
  const { sessions } = useProjectData();
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-2xl">Sessies</h2>
      {sessions.length === 0 ? (
        <EmptyState as="h3" icon={Inbox} title="Nog geen sessies" action={<Button asChild variant="outline"><Link href="/sessies">Naar sessies</Link></Button>} />
      ) : (
        <ul className="flex flex-col divide-y divide-km-line rounded-2xl border border-km-line bg-white">
          {sessions.map((s) => (
            <li key={s.id} className="flex flex-col gap-3 p-4 md:flex-row md:items-center">
              <div className="flex-1">
                <Link href={`/sessies/${s.id}`} className="font-semibold text-km-green underline-offset-4 hover:underline">
                  {s.title}
                </Link>
                <p className="text-sm text-km-muted">
                  {formatDateTime(s.date)} · {userName(s.facilitatorId)}
                </p>
              </div>
              <SessionStateBadge state={s.state} />
              {s.state !== "afgesloten" && (
                <ConfirmDialog
                  title={`‘${s.title}’ afsluiten?`}
                  description="Deelnemers kunnen daarna niets meer toevoegen."
                  confirmLabel="Afsluiten"
                  destructive
                  onConfirm={() => {
                    void notify.after(updateSession(s.id, { state: "afgesloten" }), "Sessie afgesloten");
                  }}
                  trigger={<Button variant="ghost" size="sm">Afsluiten</Button>}
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ---------------- Inhoud (moderatie) ---------------- */
function ContentTab() {
  const { state, userName, updateIdea, updateContribution } = useStore();
  const { ideas } = useProjectData();
  const pendingIdeas = ideas.filter((i) => i.pending && !i.archived);
  const projectIdeaIds = new Set(ideas.map((i) => i.id));
  const contribs = state.contributions.filter((c) => projectIdeaIds.has(c.ideaId) && (c.pending || c.hidden));
  const ideaTitle = (id: string) => ideas.find((i) => i.id === id)?.title ?? "";
  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-4">
        <h2 className="text-2xl">Ideeën die wachten op goedkeuring</h2>
        {pendingIdeas.length === 0 ? (
          <p className="text-km-muted">Geen ideeën om te beoordelen. Zet ‘Bijdragen eerst goedkeuren’ aan bij Instellingen om nieuwe ideeën eerst te bekijken.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {pendingIdeas.map((i) => (
              <li key={i.id} className="flex flex-col gap-3 rounded-2xl border border-km-line bg-white p-4 md:flex-row md:items-center">
                <div className="flex-1">
                  <Link href={`/ideeen/${i.id}`} className="font-semibold text-km-green underline underline-offset-4">
                    {i.title}
                  </Link>
                  <p className="text-sm text-km-muted">door {authorName(i, userName)}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => void notify.after(updateIdea(i.id, { pending: undefined }), "Idee goedgekeurd")}>
                    <Check aria-hidden /> Goedkeuren
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => void notify.after(updateIdea(i.id, { archived: true }), "Idee gearchiveerd")}>
                    <Archive aria-hidden /> Archiveren
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="flex flex-col gap-4">
        <h2 className="text-2xl">Bijdragen om te beoordelen</h2>
        {contribs.length === 0 ? (
          <p className="text-km-muted">Geen wachtende of verborgen bijdragen.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {contribs.map((c) => (
              <li key={c.id} className="flex flex-col gap-3 rounded-2xl border border-km-line bg-white p-4">
                <p>{c.text}</p>
                <p className="text-sm text-km-muted">
                  {userName(c.authorId)} bij <Link href={`/ideeen/${c.ideaId}`} className="underline">{ideaTitle(c.ideaId)}</Link> · {c.pending ? "wacht op goedkeuring" : "verborgen"}
                </p>
                <div className="flex gap-2">
                  {c.pending && (
                    <Button size="sm" variant="secondary" onClick={() => void notify.after(updateContribution(c.id, { pending: undefined }), "Bijdrage goedgekeurd")}>
                      <Check aria-hidden /> Goedkeuren
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => void notify.after(updateContribution(c.id, { hidden: !c.hidden }), c.hidden ? "Bijdrage weer zichtbaar" : "Bijdrage verborgen")}>
                    {c.hidden ? <Eye aria-hidden /> : <EyeOff aria-hidden />} {c.hidden ? "Tonen" : "Verbergen"}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="rounded-2xl bg-km-softgreen p-5">
        <h2 className="text-xl">Doelgroepen opschonen</h2>
        <p className="mt-1">Vergelijkbare doelgroepen voeg je samen op de pagina Doelgroepen.</p>
        <Button asChild variant="outline" className="mt-3">
          <Link href="/doelgroepen">Naar doelgroepen</Link>
        </Button>
      </section>
    </div>
  );
}

/* ---------------- Instellingen en export ---------------- */
const SETTINGS: { key: keyof ProjectSettings; label: string; help: string }[] = [
  { key: "inviteOnly", label: "Deelname alleen op uitnodiging", help: "Alleen mensen met een uitnodiging kunnen meedoen." },
  { key: "ideasVisibleImmediately", label: "Ideeën direct zichtbaar", help: "Nieuwe ideeën zijn meteen zichtbaar voor alle deelnemers." },
  { key: "allowComments", label: "Deelnemers mogen op elkaar reageren", help: "Reacties en aanvullingen bij ideeën." },
  { key: "allowVoting", label: "Stemmen toegestaan", help: "Bijvoorbeeld in de laatste ronde van een sessie." },
  { key: "requireApproval", label: "Bijdragen eerst goedkeuren", help: "Een redacteur keurt nieuwe ideeën en bijdragen goed voordat anderen ze zien." },
];

function SettingsTab() {
  const { project, updateSettings, state, userName } = useStore();
  const { ideas, concepts, audiences } = useProjectData();
  const p = project!;
  const date = useToday() ?? "export";
  const audienceNames = (ids: string[]) => audiences.filter((a) => ids.includes(a.id)).map((a) => a.name).join(", ");

  return (
    <div className="flex flex-col gap-10">
      <section aria-labelledby="instellingen" className="flex flex-col gap-4">
        <h2 id="instellingen" className="text-2xl">Instellingen</h2>
        <ul className="flex flex-col divide-y divide-km-line rounded-2xl border border-km-line bg-white">
          {SETTINGS.map((s) => (
            <li key={s.key} className="flex items-center justify-between gap-4 p-4">
              <Label htmlFor={`set-${s.key}`} className="flex cursor-pointer flex-col items-start gap-0.5">
                <span className="text-base font-semibold text-km-green">{s.label}</span>
                <span className="text-sm font-normal text-km-muted">{s.help}</span>
              </Label>
              <Switch
                id={`set-${s.key}`}
                checked={p.settings[s.key]}
                onCheckedChange={(v) => void notify.after(updateSettings(p.id, { [s.key]: v }), `${s.label}: ${v ? "aan" : "uit"}`)}
              />
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="export" className="flex flex-col gap-4">
        <h2 id="export" className="text-2xl">Exporteren</h2>
        <p className="text-km-muted">De export bevat de voorbeeldgegevens zoals ze nu in dit browservenster staan.</p>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            onClick={() =>
              downloadCsv(
                `kansenmaker-voorbeeld-ideeen-${date}.csv`,
                ["Titel", "Beschrijving", "Status", "Doelgroepen", "Auteur", "Datum", "Gearchiveerd"],
                ideas.map((i) => [i.title, i.description, STATUS_META[i.status].label, audienceNames(i.audienceIds), authorName(i, userName), i.createdAt.slice(0, 10), i.archived ? "ja" : "nee"]),
              )
            }
          >
            <Download aria-hidden />
            Ideeën (CSV)
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              downloadCsv(
                `kansenmaker-voorbeeld-concepten-${date}.csv`,
                ["Naam", "Status", "Eigenaar", "Doelgroepen", "Realiteitstoets", "Open acties"],
                concepts.map((c) => [
                  c.name,
                  STATUS_META[c.status].label,
                  userName(c.ownerId),
                  audienceNames(c.audienceIds),
                  assessmentOutcome(c.assessment).title,
                  String(state.actions.filter((a) => a.conceptId === c.id && a.status !== "klaar").length),
                ]),
              )
            }
          >
            <Download aria-hidden />
            Concepten (CSV)
          </Button>
          <Button asChild variant="outline">
            <Link href="/beheer/print">
              <Printer aria-hidden />
              Printvriendelijk overzicht
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}

/** Link van een bestaande uitnodiging kopiëren. */
function CopyLinkButton({ path }: { path: string }) {
  const origin = useOrigin();
  return (
    <Button
      variant="link"
      className="mt-1 h-auto min-h-11 gap-1 text-sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(`${origin}${path}`);
          notify.success("Link gekopieerd");
        } catch {
          notify.error("Kopiëren lukte niet", `${origin}${path}`);
        }
      }}
    >
      <Copy className="size-4" aria-hidden />
      Kopieer link
    </Button>
  );
}
