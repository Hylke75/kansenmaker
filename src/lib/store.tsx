"use client";

/**
 * Gegevenslaag van De Kansenmaker, gekoppeld aan Supabase.
 *
 * - Alle lees- en schrijfacties lopen via de browserclient; Row Level Security in de
 *   database bepaalt wat iemand mag zien en wijzigen (zie supabase/migrations).
 * - Na een wijziging worden de gegevens van het actieve project opnieuw geladen.
 * - Werksessies (sessies, antwoorden, stemmen) worden live bijgewerkt via Supabase Realtime.
 * - Fouten worden als melding getoond; succes meldt het scherm zelf (zie notify.after).
 */
import * as React from "react";
import type { PostgrestError } from "@supabase/supabase-js";
import { getSupabase } from "./supabase/client";
import type { Row } from "./database.types";
import { can, type Permission } from "./permissions";
import { notify } from "@/components/km/toast";
import type {
  ActionItem,
  Activity,
  AssessmentValue,
  Audience,
  Concept,
  Contribution,
  ContributionKind,
  Feasibility,
  Idea,
  Invitation,
  Membership,
  Need,
  Project,
  ProjectSettings,
  ResearchItem,
  RiskItem,
  Role,
  Session,
  SessionAnswer,
  Status,
  User,
} from "./types";

/* ------------------------------------------------------------------ */
/* Omzetten van databaserijen naar de typen van de interface           */
/* ------------------------------------------------------------------ */

const toUser = (r: Row<"profiles">): User => ({
  id: r.id,
  name: r.full_name.trim() || r.email.split("@")[0],
  nameMissing: !r.full_name.trim() || undefined,
  email: r.email,
  organisation: r.organisation || undefined,
});

const toProject = (r: Row<"projects">): Project => ({
  id: r.id,
  name: r.name,
  description: r.description,
  ownerId: r.owner_id ?? "",
  visibility: r.visibility as Project["visibility"],
  archived: r.archived,
  settings: {
    inviteOnly: r.invite_only,
    ideasVisibleImmediately: r.ideas_visible_immediately,
    allowComments: r.allow_comments,
    allowVoting: r.allow_voting,
    requireApproval: r.require_approval,
  },
});

const FEASIBILITY_COLUMNS: Record<keyof Feasibility, keyof Row<"concepts">> = {
  people: "feasibility_people",
  resources: "feasibility_resources",
  partners: "feasibility_partners",
  mission: "feasibility_mission",
  missingKnowledge: "feasibility_missing_knowledge",
};

/* ------------------------------------------------------------------ */
/* Foutafhandeling                                                     */
/* ------------------------------------------------------------------ */

class NoRowsError extends Error {}

type LinkTable = "idea_audiences" | "idea_needs" | "concept_ideas" | "concept_audiences" | "concept_needs";

/** Koppeltabel gelijktrekken met de gewenste set: alleen verschillen toevoegen/verwijderen. */
async function syncLinks(table: LinkTable, keyCol: string, keyVal: string, otherCol: string, current: string[], desired: string[]) {
  const db = getSupabase();
  const add = desired.filter((x) => !current.includes(x));
  const remove = current.filter((x) => !desired.includes(x));
  if (remove.length) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- dynamische koppeltabel
    const { error } = await (db.from(table) as any).delete().eq(keyCol, keyVal).in(otherCol, remove);
    if (error) throw error;
  }
  if (add.length) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- dynamische koppeltabel
    const { error } = await (db.from(table) as any).insert(add.map((x) => ({ [keyCol]: keyVal, [otherCol]: x })));
    if (error) throw error;
  }
}

/** Begrijpelijke Nederlandse foutmelding. Meldingen uit de database zijn al in het Nederlands. */
function friendly(err: unknown): string {
  if (err instanceof NoRowsError) return "Je hebt geen rechten om dit te wijzigen, of het onderdeel bestaat niet meer.";
  const e = err as Partial<PostgrestError> & { message?: string };
  const msg = e?.message ?? "";
  if (e?.code === "42501") {
    // Eigen meldingen uit triggers zijn Nederlands; de standaard RLS-melding niet
    return /row-level security/i.test(msg) ? "Je hebt geen rechten om dit te doen." : msg;
  }
  if (e?.code === "23505") return "Dit bestaat al.";
  if (e?.code === "23514" || e?.code === "P0001" || e?.code === "23503" || e?.code === "P0002") {
    return /violates|constraint/i.test(msg) ? "De invoer voldoet niet aan de eisen. Controleer de velden." : msg;
  }
  if (/fetch|network|Failed to fetch/i.test(msg)) return "Geen verbinding met de server. Controleer je internetverbinding en probeer het opnieuw.";
  return msg || "Er ging iets mis. Probeer het opnieuw.";
}

/** Gooit bij een fout; bij updates/deletes ook als er geen rij is geraakt (RLS). */
async function must<R extends { data: unknown; error: PostgrestError | null }>(
  p: PromiseLike<R>,
  opts?: { rows?: boolean },
): Promise<NonNullable<R["data"]>> {
  const { data, error } = await p;
  if (error) throw error;
  if (opts?.rows && Array.isArray(data) && data.length === 0) throw new NoRowsError();
  // Bij insert zonder select is data null; die waarde wordt dan niet gebruikt.
  return data as NonNullable<R["data"]>;
}

/** Zoals must, maar een ontbrekende rij (maybeSingle) is geen fout. */
async function mustMaybe<T>(p: PromiseLike<{ data: T | null; error: PostgrestError | null }>): Promise<T | null> {
  const { data, error } = await p;
  if (error) throw error;
  return data;
}

/* ------------------------------------------------------------------ */
/* State                                                               */
/* ------------------------------------------------------------------ */

interface ProjectData {
  members: Membership[];
  audiences: Audience[];
  needs: Need[];
  ideas: Idea[];
  contributions: Contribution[];
  concepts: Concept[];
  actions: ActionItem[];
  sessions: Session[];
  sessionAnswers: SessionAnswer[];
  invitations: Invitation[];
  activities: Activity[];
}

const EMPTY: ProjectData = {
  members: [],
  audiences: [],
  needs: [],
  ideas: [],
  contributions: [],
  concepts: [],
  actions: [],
  sessions: [],
  sessionAnswers: [],
  invitations: [],
  activities: [],
};

interface State extends ProjectData {
  status: "loading" | "ready" | "signed-out" | "error";
  userId: string | null;
  profiles: User[];
  myMemberships: Membership[];
  projects: Project[];
  currentProjectId: string | null;
  /** Project waarvan de gegevens geladen zijn (voorkomt lege toestanden tijdens laden) */
  loadedProjectId: string | null;
}

const INITIAL: State = {
  ...EMPTY,
  status: "loading",
  userId: null,
  profiles: [],
  myMemberships: [],
  projects: [],
  currentProjectId: null,
  loadedProjectId: null,
};

const PROJECT_KEY = "kansenmaker:project";
const readStoredProject = () => {
  try {
    return localStorage.getItem(PROJECT_KEY);
  } catch {
    return null;
  }
};
const storeProject = (id: string) => {
  try {
    localStorage.setItem(PROJECT_KEY, id);
  } catch {
    /* privémodus: niet erg */
  }
};

export interface NewIdeaInput {
  title: string;
  description: string;
  problem?: string;
  audienceIds: string[];
  needIds: string[];
}

/* ------------------------------------------------------------------ */
/* Laden                                                               */
/* ------------------------------------------------------------------ */

async function fetchSessions(pid: string) {
  const db = getSupabase();
  const [sessions, participants, answers, votes] = await Promise.all([
    must(db.from("sessions").select("*").eq("project_id", pid).order("starts_at")),
    must(db.from("session_participants").select("*").eq("project_id", pid)),
    must(db.from("session_answers").select("*").eq("project_id", pid).order("created_at")),
    must(db.from("session_votes").select("*").eq("project_id", pid)),
  ]);
  return {
    sessions: sessions.map(
      (s): Session => ({
        id: s.id,
        projectId: s.project_id,
        title: s.title,
        date: s.starts_at,
        facilitatorId: s.facilitator_id ?? "",
        state: s.state as Session["state"],
        activeRound: s.active_round,
        participantIds: participants.filter((p) => p.session_id === s.id).map((p) => p.user_id),
        location: s.location,
      }),
    ),
    sessionAnswers: answers.map(
      (a): SessionAnswer => ({
        id: a.id,
        sessionId: a.session_id,
        round: a.round,
        authorId: a.author_id ?? "",
        text: a.text,
        hidden: a.hidden,
        votes: votes.filter((v) => v.answer_id === a.id).map((v) => v.user_id),
        ideaId: a.idea_id ?? undefined,
      }),
    ),
  };
}

async function fetchProject(pid: string): Promise<ProjectData & { profiles: User[] }> {
  const db = getSupabase();
  const [
    members,
    audiences,
    needs,
    ideas,
    ideaAudiences,
    ideaNeeds,
    ideaRelations,
    contributions,
    concepts,
    conceptIdeas,
    conceptAudiences,
    conceptNeeds,
    risks,
    research,
    actions,
    invitations,
    activities,
    sessionData,
  ] = await Promise.all([
    must(db.from("project_members").select("*").eq("project_id", pid)),
    must(db.from("audiences").select("*").eq("project_id", pid).order("name")),
    must(db.from("needs").select("*").eq("project_id", pid).order("created_at")),
    must(db.from("ideas").select("*").eq("project_id", pid).order("created_at", { ascending: false })),
    must(db.from("idea_audiences").select("*")),
    must(db.from("idea_needs").select("*")),
    must(db.from("idea_relations").select("*")),
    must(db.from("contributions").select("*").eq("project_id", pid).order("created_at")),
    must(db.from("concepts").select("*").eq("project_id", pid).order("created_at", { ascending: false })),
    must(db.from("concept_ideas").select("*")),
    must(db.from("concept_audiences").select("*")),
    must(db.from("concept_needs").select("*")),
    must(db.from("risks").select("*").eq("project_id", pid).order("created_at")),
    must(db.from("research_items").select("*").eq("project_id", pid).order("created_at")),
    must(db.from("actions").select("*").eq("project_id", pid).order("created_at")),
    must(db.from("invitations").select("*").eq("project_id", pid).order("created_at", { ascending: false })),
    must(db.from("activities").select("*").eq("project_id", pid).order("created_at", { ascending: false }).limit(50)),
    fetchSessions(pid),
  ]);

  const memberIds = members.map((m) => m.user_id);
  const profiles = memberIds.length
    ? (await must(db.from("profiles").select("*").in("id", memberIds))).map(toUser)
    : [];

  const ideaIds = new Set(ideas.map((i) => i.id));

  return {
    profiles,
    members: members.map((m) => ({ userId: m.user_id, projectId: m.project_id, role: m.role as Role })),
    audiences: audiences.map((a) => ({ id: a.id, projectId: a.project_id, name: a.name, description: a.description, category: a.category })),
    needs: needs.map((n) => ({ id: n.id, audienceId: n.audience_id, description: n.description })),
    ideas: ideas.map(
      (i): Idea => ({
        id: i.id,
        projectId: i.project_id,
        title: i.title,
        description: i.description,
        problem: i.problem ?? undefined,
        authorId: i.author_id ?? "",
        audienceIds: ideaAudiences.filter((x) => x.idea_id === i.id).map((x) => x.audience_id),
        needIds: ideaNeeds.filter((x) => x.idea_id === i.id).map((x) => x.need_id),
        status: i.status as Status,
        createdAt: i.created_at,
        archived: i.archived || undefined,
        pending: i.pending || undefined,
        relatedIdeaIds: ideaRelations
          .filter((x) => x.idea_id === i.id || x.related_idea_id === i.id)
          .map((x) => (x.idea_id === i.id ? x.related_idea_id : x.idea_id))
          .filter((x) => ideaIds.has(x)),
      }),
    ),
    contributions: contributions.map((c) => ({
      id: c.id,
      ideaId: c.idea_id,
      authorId: c.author_id ?? "",
      kind: c.kind as ContributionKind,
      text: c.text,
      createdAt: c.created_at,
      hidden: c.hidden || undefined,
      pending: c.pending || undefined,
    })),
    concepts: concepts.map(
      (c): Concept => ({
        id: c.id,
        projectId: c.project_id,
        name: c.name,
        description: c.description,
        status: c.status as Status,
        ownerId: c.owner_id ?? "",
        ideaIds: conceptIdeas.filter((x) => x.concept_id === c.id && ideaIds.has(x.idea_id)).map((x) => x.idea_id),
        audienceIds: conceptAudiences.filter((x) => x.concept_id === c.id).map((x) => x.audience_id),
        needIds: conceptNeeds.filter((x) => x.concept_id === c.id).map((x) => x.need_id),
        distinctiveness: c.distinctiveness,
        missionContribution: c.mission_contribution,
        risks: risks.filter((r) => r.concept_id === c.id).map((r) => ({ id: r.id, kind: r.kind as RiskItem["kind"], text: r.text })),
        feasibility: {
          people: c.feasibility_people,
          resources: c.feasibility_resources,
          partners: c.feasibility_partners,
          mission: c.feasibility_mission,
          missingKnowledge: c.feasibility_missing_knowledge,
        },
        research: research
          .filter((r) => r.concept_id === c.id)
          .map((r) => ({
            id: r.id,
            assumption: r.assumption,
            method: r.method,
            status: r.status as ResearchItem["status"],
            result: r.result ?? undefined,
          })),
        assessment: (c.assessment ?? {}) as Record<string, AssessmentValue | undefined>,
        readyConfirmedBy: c.ready_confirmed_by ?? undefined,
      }),
    ),
    actions: actions.map((a) => ({
      id: a.id,
      description: a.description,
      ownerId: a.owner_id ?? "",
      deadline: a.deadline ?? undefined,
      status: a.status as ActionItem["status"],
      conceptId: a.concept_id ?? undefined,
      sessionId: a.session_id ?? undefined,
    })),
    invitations: invitations.map((i) => ({
      id: i.id,
      projectId: i.project_id,
      token: i.token,
      email: i.email ?? undefined,
      role: i.role as Role,
      kind: i.kind as Invitation["kind"],
      expiresAt: i.expires_at.slice(0, 10),
      revoked: i.revoked,
      sessionId: i.session_id ?? undefined,
      createdBy: i.created_by ?? undefined,
      acceptedAt: i.accepted_at ?? undefined,
    })),
    activities: activities.map((a) => ({ id: a.id, projectId: a.project_id, text: a.text, href: a.href, at: a.created_at })),
    ...sessionData,
  };
}

/* ------------------------------------------------------------------ */
/* Store                                                               */
/* ------------------------------------------------------------------ */

function useStoreValue() {
  const [state, setState] = React.useState<State>(INITIAL);
  const stateRef = React.useRef(state);
  React.useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const db = getSupabase();

  /** Mijn profiel, lidmaatschappen en projecten laden en een project kiezen. */
  const loadMe = React.useCallback(
    async (preferProject?: string | null) => {
      const { data: auth } = await db.auth.getUser();
      const uid = auth.user?.id ?? null;
      if (!uid) {
        setState({ ...INITIAL, status: "signed-out" });
        return;
      }
      try {
        const [profile, memberships, projects] = await Promise.all([
          mustMaybe(db.from("profiles").select("*").eq("id", uid).maybeSingle()),
          must(db.from("project_members").select("*").eq("user_id", uid)),
          must(db.from("projects").select("*").order("created_at")),
        ]);
        const my = memberships.map((m) => ({ userId: m.user_id, projectId: m.project_id, role: m.role as Role }));
        const projs = projects.map(toProject);
        const stored = preferProject ?? stateRef.current.currentProjectId ?? readStoredProject();
        const current =
          projs.find((p) => p.id === stored && my.some((m) => m.projectId === p.id)) ??
          projs.find((p) => !p.archived && my.some((m) => m.projectId === p.id)) ??
          null;
        setState((s) => ({
          ...s,
          status: "ready",
          userId: uid,
          profiles: profile ? mergeProfiles(s.profiles, [toUser(profile)]) : s.profiles,
          myMemberships: my,
          projects: projs,
          currentProjectId: current?.id ?? null,
        }));
        if (current) storeProject(current.id);
      } catch (err) {
        setState((s) => ({ ...s, status: "error" }));
        notify.error("Gegevens konden niet worden geladen", friendly(err));
      }
    },
    [db],
  );

  const loadProject = React.useCallback(
    async (pid: string | null) => {
      if (!pid) return; // setProject/loadMe zetten de lege toestand al
      try {
        const data = await fetchProject(pid);
        setState((s) =>
          s.currentProjectId === pid
            ? { ...s, ...data, profiles: mergeProfiles(s.profiles, data.profiles), loadedProjectId: pid }
            : s,
        );
      } catch (err) {
        notify.error("Projectgegevens konden niet worden geladen", friendly(err));
      }
    },
    [],
  );

  const reloadSessions = React.useCallback(async () => {
    const pid = stateRef.current.currentProjectId;
    if (!pid) return;
    try {
      const data = await fetchSessions(pid);
      setState((s) => (s.currentProjectId === pid ? { ...s, ...data } : s));
    } catch {
      /* stil: volgende update probeert opnieuw */
    }
  }, []);

  // Waarschuwen bij sluiten of herladen zolang er nog iets wordt opgeslagen
  const pendingWrites = React.useRef(0);
  React.useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (pendingWrites.current > 0) e.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  // Start + reageren op in-/uitloggen
  React.useEffect(() => {
    // Ophalen uit Supabase (extern systeem); setState gebeurt pas na een await.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadMe();
    const { data } = db.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") setState({ ...INITIAL, status: "signed-out" });
      if (event === "SIGNED_IN" && !stateRef.current.userId) void loadMe();
    });
    return () => data.subscription.unsubscribe();
  }, [db, loadMe]);

  // Project laden bij wissel
  React.useEffect(() => {
    // Ophalen uit Supabase (extern systeem); setState gebeurt pas na een await.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (state.status === "ready") void loadProject(state.currentProjectId);
  }, [state.status, state.currentProjectId, loadProject]);

  // Live werksessies
  React.useEffect(() => {
    const pid = state.currentProjectId;
    if (!pid || state.status !== "ready") return;
    let timer: number | undefined;
    const schedule = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => void reloadSessions(), 150);
    };
    const channel = db
      .channel(`sessies-${pid}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "sessions", filter: `project_id=eq.${pid}` }, schedule)
      .on("postgres_changes", { event: "*", schema: "public", table: "session_answers", filter: `project_id=eq.${pid}` }, schedule)
      .on("postgres_changes", { event: "*", schema: "public", table: "session_votes", filter: `project_id=eq.${pid}` }, schedule)
      .subscribe();
    return () => {
      window.clearTimeout(timer);
      void db.removeChannel(channel);
    };
  }, [db, state.currentProjectId, state.status, reloadSessions]);

  /* ---------------- afgeleide waarden ---------------- */
  const currentUser: User =
    state.profiles.find((u) => u.id === state.userId) ?? { id: state.userId ?? "", name: "", email: "" };
  const myProjects = state.projects.filter((p) => state.myMemberships.some((m) => m.projectId === p.id));
  const project = myProjects.find((p) => p.id === state.currentProjectId) ?? null;
  const role: Role | undefined = state.myMemberships.find((m) => m.projectId === project?.id)?.role;
  const userName = React.useCallback(
    (id: string) => state.profiles.find((u) => u.id === id)?.name ?? "Onbekende gebruiker",
    [state.profiles],
  );
  const allowed = (permission: Permission) => can(role, permission);
  const projectReady = !project || state.loadedProjectId === project.id;

  /** Voert een wijziging uit, toont fouten en herlaadt het project. */
  const run = async <T,>(fn: () => Promise<T>, opts: { reload?: "project" | "sessions" | "me" | "none" } = {}): Promise<T | null> => {
    pendingWrites.current += 1;
    try {
      const result = await fn();
      const reload = opts.reload ?? "project";
      if (reload === "project") await loadProject(stateRef.current.currentProjectId);
      if (reload === "sessions") await reloadSessions();
      if (reload === "me") await loadMe();
      return result;
    } catch (err) {
      notify.error("Dat is niet gelukt", friendly(err));
      return null;
    } finally {
      pendingWrites.current -= 1;
    }
  };
  const pid = () => {
    const id = stateRef.current.currentProjectId;
    if (!id) throw new Error("Kies eerst een project.");
    return id;
  };

  const actions = {
    refresh: () => loadProject(stateRef.current.currentProjectId),
    setProject: (projectId: string) => {
      storeProject(projectId);
      setState((s) => ({ ...s, ...EMPTY, currentProjectId: projectId, loadedProjectId: null }));
    },
    signOut: async () => {
      await db.auth.signOut();
    },
    updateProfile: (patch: { name: string; organisation: string }) =>
      run(
        async () => {
          await must(
            db.from("profiles").update({ full_name: patch.name.trim(), organisation: patch.organisation.trim() }).eq("id", state.userId!).select("id"),
            { rows: true },
          );
          setState((s) => ({
            ...s,
            profiles: s.profiles.map((u) =>
              u.id === s.userId
                ? { ...u, name: patch.name.trim() || u.email.split("@")[0], nameMissing: !patch.name.trim() || undefined, organisation: patch.organisation.trim() || undefined }
                : u,
            ),
          }));
          return true;
        },
        { reload: "none" },
      ),

    /* Ideeën */
    addIdea: (input: NewIdeaInput) =>
      run(async () => {
        const row = await must(
          db
            .from("ideas")
            .insert({ project_id: pid(), title: input.title.trim(), description: input.description.trim(), problem: input.problem?.trim() || null })
            .select("id")
            .single(),
        );
        if (input.audienceIds.length)
          await must(db.from("idea_audiences").insert(input.audienceIds.map((a) => ({ idea_id: row.id, audience_id: a }))));
        if (input.needIds.length)
          await must(db.from("idea_needs").insert(input.needIds.map((n) => ({ idea_id: row.id, need_id: n }))));
        return row.id;
      }),
    updateIdea: (id: string, patch: Partial<Idea>) =>
      run(async () => {
        const u: Partial<Row<"ideas">> = {};
        if (patch.title !== undefined) u.title = patch.title;
        if (patch.description !== undefined) u.description = patch.description;
        if ("problem" in patch) u.problem = patch.problem ?? null;
        if (patch.status !== undefined) u.status = patch.status;
        if ("archived" in patch) u.archived = !!patch.archived;
        if ("pending" in patch) u.pending = !!patch.pending;
        await must(db.from("ideas").update(u).eq("id", id).select("id"), { rows: true });
        return true;
      }),
    addContribution: (ideaId: string, kind: ContributionKind, text: string) =>
      run(async () => {
        await must(db.from("contributions").insert({ idea_id: ideaId, kind, text: text.trim() }));
        return true;
      }),
    updateContribution: (id: string, patch: Partial<Contribution>) =>
      run(async () => {
        const u: Partial<Row<"contributions">> = {};
        if ("hidden" in patch) u.hidden = !!patch.hidden;
        if ("pending" in patch) u.pending = !!patch.pending;
        await must(db.from("contributions").update(u).eq("id", id).select("id"), { rows: true });
        return true;
      }),

    /* Doelgroepen en behoeften */
    addAudience: (input: Pick<Audience, "name" | "description" | "category">) =>
      run(async () => (await must(db.from("audiences").insert({ project_id: pid(), ...input }).select("id").single())).id),
    updateAudience: (id: string, patch: Partial<Audience>) =>
      run(async () => {
        await must(
          db.from("audiences").update({ name: patch.name, description: patch.description, category: patch.category }).eq("id", id).select("id"),
          { rows: true },
        );
        return true;
      }),
    mergeAudiences: (sourceId: string, targetId: string) =>
      run(async () => {
        await must(db.rpc("merge_audiences", { p_source: sourceId, p_target: targetId }));
        return true;
      }),
    addNeed: (audienceId: string, description: string) =>
      run(async () => {
        await must(db.from("needs").insert({ audience_id: audienceId, description: description.trim() }));
        return true;
      }),
    removeNeed: (id: string) =>
      run(async () => {
        await must(db.from("needs").delete().eq("id", id).select("id"), { rows: true });
        return true;
      }),

    /* Concepten */
    addConcept: (input: { name: string; description: string; ideaIds: string[] }) =>
      run(async () => {
        const row = await must(
          db.from("concepts").insert({ project_id: pid(), name: input.name.trim(), description: input.description.trim() }).select("id").single(),
        );
        const fromIdeas = stateRef.current.ideas.filter((i) => input.ideaIds.includes(i.id));
        const audienceIds = Array.from(new Set(fromIdeas.flatMap((i) => i.audienceIds)));
        const needIds = Array.from(new Set(fromIdeas.flatMap((i) => i.needIds)));
        if (input.ideaIds.length) await must(db.from("concept_ideas").insert(input.ideaIds.map((i) => ({ concept_id: row.id, idea_id: i }))));
        if (audienceIds.length) await must(db.from("concept_audiences").insert(audienceIds.map((a) => ({ concept_id: row.id, audience_id: a }))));
        if (needIds.length) await must(db.from("concept_needs").insert(needIds.map((n) => ({ concept_id: row.id, need_id: n }))));
        return row.id;
      }),
    updateConcept: (id: string, patch: Partial<Concept>) =>
      run(async () => {
        const u: Partial<Row<"concepts">> = {};
        if (patch.name !== undefined) u.name = patch.name;
        if (patch.description !== undefined) u.description = patch.description;
        if (patch.status !== undefined) u.status = patch.status;
        if (patch.ownerId !== undefined) u.owner_id = patch.ownerId;
        if (patch.distinctiveness !== undefined) u.distinctiveness = patch.distinctiveness;
        if (patch.missionContribution !== undefined) u.mission_contribution = patch.missionContribution;
        if (patch.feasibility) {
          for (const [k, col] of Object.entries(FEASIBILITY_COLUMNS) as [keyof Feasibility, string][]) {
            (u as Record<string, unknown>)[col] = patch.feasibility[k];
          }
        }
        await must(db.from("concepts").update(u).eq("id", id).select("id"), { rows: true });
        return true;
      }),
    /** Eén stelling van de realiteitstoets: direct zichtbaar, atomair opgeslagen (geen overschrijven bij snel klikken). */
    setAssessment: (id: string, questionId: string, value: AssessmentValue | undefined) => {
      setState((s) => ({
        ...s,
        concepts: s.concepts.map((c) => (c.id === id ? { ...c, assessment: { ...c.assessment, [questionId]: value } } : c)),
      }));
      return run(async () => {
        const ok = await must(db.rpc("set_assessment", { p_concept: id, p_question: questionId, p_value: value ?? null }));
        if (!ok) throw new NoRowsError();
        return true;
      }).then(async (r) => {
        // Bij een fout de echte stand terughalen
        if (r === null) await loadProject(stateRef.current.currentProjectId);
        return r;
      });
    },
    addRisk: (conceptId: string, risk: Omit<RiskItem, "id">) =>
      run(async () => {
        await must(db.from("risks").insert({ concept_id: conceptId, kind: risk.kind, text: risk.text }));
        return true;
      }),
    removeRisk: (_conceptId: string, riskId: string) =>
      run(async () => {
        await must(db.from("risks").delete().eq("id", riskId).select("id"), { rows: true });
        return true;
      }),
    addResearch: (conceptId: string, items: Omit<ResearchItem, "id">[]) =>
      run(async () => {
        await must(
          db.from("research_items").insert(items.map((r) => ({ concept_id: conceptId, assumption: r.assumption, method: r.method, status: r.status, result: r.result ?? null }))),
        );
        return true;
      }),
    updateResearch: (_conceptId: string, researchId: string, patch: Partial<ResearchItem>) =>
      run(async () => {
        const u: Partial<Row<"research_items">> = {};
        if (patch.status) u.status = patch.status;
        if ("result" in patch) u.result = patch.result ?? null;
        if (patch.method !== undefined) u.method = patch.method;
        await must(db.from("research_items").update(u).eq("id", researchId).select("id"), { rows: true });
        return true;
      }),
    addAction: (a: Omit<ActionItem, "id">) =>
      run(async () => {
        await must(
          db.from("actions").insert({
            concept_id: a.conceptId ?? null,
            session_id: a.sessionId ?? null,
            description: a.description,
            owner_id: a.ownerId || null,
            deadline: a.deadline ?? null,
            status: a.status,
          }),
        );
        return true;
      }),
    updateAction: (id: string, patch: Partial<ActionItem>) =>
      run(async () => {
        const u: Partial<Row<"actions">> = {};
        if (patch.status) u.status = patch.status;
        if (patch.description !== undefined) u.description = patch.description.trim();
        if (patch.ownerId !== undefined) u.owner_id = patch.ownerId || null;
        if ("deadline" in patch) u.deadline = patch.deadline || null;
        await must(db.from("actions").update(u).eq("id", id).select("id"), { rows: true });
        return true;
      }),
    removeAction: (id: string) =>
      run(async () => {
        await must(db.from("actions").delete().eq("id", id).select("id"), { rows: true });
        return true;
      }),
    removeResearch: (researchId: string) =>
      run(async () => {
        await must(db.from("research_items").delete().eq("id", researchId).select("id"), { rows: true });
        return true;
      }),

    /* Koppelingen */
    setIdeaLinks: (ideaId: string, audienceIds: string[], needIds: string[]) =>
      run(async () => {
        const idea = stateRef.current.ideas.find((i) => i.id === ideaId);
        if (!idea) throw new NoRowsError();
        await syncLinks("idea_audiences", "idea_id", ideaId, "audience_id", idea.audienceIds, audienceIds);
        await syncLinks("idea_needs", "idea_id", ideaId, "need_id", idea.needIds, needIds);
        return true;
      }),
    setConceptLinks: (conceptId: string, links: { ideaIds: string[]; audienceIds: string[]; needIds: string[] }) =>
      run(async () => {
        const c = stateRef.current.concepts.find((x) => x.id === conceptId);
        if (!c) throw new NoRowsError();
        await syncLinks("concept_ideas", "concept_id", conceptId, "idea_id", c.ideaIds, links.ideaIds);
        await syncLinks("concept_audiences", "concept_id", conceptId, "audience_id", c.audienceIds, links.audienceIds);
        await syncLinks("concept_needs", "concept_id", conceptId, "need_id", c.needIds, links.needIds);
        return true;
      }),
    addRelation: (ideaId: string, otherId: string) =>
      run(async () => {
        await must(db.from("idea_relations").insert({ idea_id: ideaId, related_idea_id: otherId }));
        return true;
      }),
    removeRelation: (ideaId: string, otherId: string) =>
      run(async () => {
        const [a, b] = ideaId < otherId ? [ideaId, otherId] : [otherId, ideaId];
        await must(db.from("idea_relations").delete().eq("idea_id", a).eq("related_idea_id", b).select("idea_id"), { rows: true });
        return true;
      }),
    /** Sessie-antwoord omzetten in een idee (de begeleider wordt auteur; het antwoord verwijst naar het idee). */
    answerToIdea: (answerId: string, input: { title: string; description: string }) =>
      run(async () => {
        const row = await must(
          db.from("ideas").insert({ project_id: pid(), title: input.title.trim(), description: input.description.trim() }).select("id").single(),
        );
        await must(db.from("session_answers").update({ idea_id: row.id }).eq("id", answerId).select("id"), { rows: true });
        return row.id;
      }),

    /* Sessies */
    addSession: (input: Pick<Session, "title" | "date" | "location">) =>
      run(async () => (await must(db.from("sessions").insert({ project_id: pid(), title: input.title, starts_at: input.date, location: input.location }).select("id").single())).id),
    updateSession: (id: string, patch: Partial<Session>) =>
      run(
        async () => {
          const u: Partial<Row<"sessions">> = {};
          if (patch.state) u.state = patch.state;
          if (patch.activeRound) u.active_round = patch.activeRound;
          await must(db.from("sessions").update(u).eq("id", id).select("id"), { rows: true });
          return true;
        },
        { reload: "sessions" },
      ),
    joinSession: async (sessionId: string) => {
      const { error } = await db.from("session_participants").insert({ session_id: sessionId });
      if (!error) await reloadSessions();
    },
    addSessionAnswer: (sessionId: string, round: number, text: string) =>
      run(
        async () => {
          await must(db.from("session_answers").insert({ session_id: sessionId, round, text: text.trim() }));
          return true;
        },
        { reload: "sessions" },
      ),
    toggleAnswerHidden: (id: string) =>
      run(
        async () => {
          const a = stateRef.current.sessionAnswers.find((x) => x.id === id);
          await must(db.from("session_answers").update({ hidden: !a?.hidden }).eq("id", id).select("id"), { rows: true });
          return true;
        },
        { reload: "sessions" },
      ),
    toggleVote: (answerId: string) =>
      run(
        async () => {
          const uid = stateRef.current.userId!;
          const a = stateRef.current.sessionAnswers.find((x) => x.id === answerId);
          if (a?.votes.includes(uid)) {
            await must(db.from("session_votes").delete().eq("answer_id", answerId).eq("user_id", uid).select("answer_id"), { rows: true });
          } else {
            await must(db.from("session_votes").insert({ answer_id: answerId }));
          }
          return true;
        },
        { reload: "sessions" },
      ),
    /** Zorgt dat het project van een sessie actief is (voor deelnamelinks). */
    openSessionProject: async (sessionId: string): Promise<"ok" | "not-found"> => {
      if (stateRef.current.sessions.some((s) => s.id === sessionId)) return "ok";
      const { data } = await db.from("sessions").select("project_id").eq("id", sessionId).maybeSingle();
      if (!data) return "not-found";
      if (data.project_id !== stateRef.current.currentProjectId) actions.setProject(data.project_id);
      return "ok";
    },

    /* Beheer */
    addProject: (input: Pick<Project, "name" | "description">) =>
      run(async () => (await must(db.rpc("create_project", { p_name: input.name, p_description: input.description }))) as string, {
        reload: "me",
      }),
    updateProject: (id: string, patch: Partial<Project>) =>
      run(
        async () => {
          const u: Partial<Row<"projects">> = {};
          if (patch.name !== undefined) u.name = patch.name;
          if (patch.description !== undefined) u.description = patch.description;
          if ("archived" in patch) u.archived = !!patch.archived;
          await must(db.from("projects").update(u).eq("id", id).select("id"), { rows: true });
          return true;
        },
        { reload: "me" },
      ),
    updateSettings: (id: string, patch: Partial<ProjectSettings>) =>
      run(
        async () => {
          const u: Partial<Row<"projects">> = {};
          if (patch.inviteOnly !== undefined) u.invite_only = patch.inviteOnly;
          if (patch.ideasVisibleImmediately !== undefined) u.ideas_visible_immediately = patch.ideasVisibleImmediately;
          if (patch.allowComments !== undefined) u.allow_comments = patch.allowComments;
          if (patch.allowVoting !== undefined) u.allow_voting = patch.allowVoting;
          if (patch.requireApproval !== undefined) u.require_approval = patch.requireApproval;
          await must(db.from("projects").update(u).eq("id", id).select("id"), { rows: true });
          return true;
        },
        { reload: "me" },
      ),
    setMemberRole: (userId: string, projectId: string, role: Role) =>
      run(async () => {
        await must(db.from("project_members").update({ role }).eq("project_id", projectId).eq("user_id", userId).select("user_id"), { rows: true });
        return true;
      }),
    removeMember: (userId: string, projectId: string) =>
      run(async () => {
        await must(db.from("project_members").delete().eq("project_id", projectId).eq("user_id", userId).select("user_id"), { rows: true });
        return true;
      }),
    addInvitation: (inv: Omit<Invitation, "id" | "revoked" | "token">) =>
      run(async () => {
        const row = await must(
          db
            .from("invitations")
            .insert({
              project_id: inv.projectId,
              email: inv.email ?? null,
              role: inv.role,
              kind: inv.kind,
              session_id: inv.sessionId ?? null,
              expires_at: new Date(`${inv.expiresAt}T23:59:59`).toISOString(),
            })
            .select("token")
            .single(),
        );
        return row.token;
      }),
    revokeInvitation: (id: string) =>
      run(async () => {
        await must(db.from("invitations").update({ revoked: true }).eq("id", id).select("id"), { rows: true });
        return true;
      }),
    acceptInvitation: (token: string) =>
      run(
        async () => {
          const rows = await must(db.rpc("accept_invitation", { p_token: token }));
          const r = rows[0];
          storeProject(r.project_id);
          await loadMe(r.project_id);
          return { projectId: r.project_id, sessionId: r.session_id };
        },
        { reload: "none" },
      ),
  };

  return {
    state: {
      ...state,
      users: state.profiles,
      memberships: [...state.myMemberships, ...state.members.filter((m) => m.userId !== state.userId)],
    },
    currentUser,
    myProjects,
    project,
    role,
    userName,
    allowed,
    projectReady,
    ...actions,
  };
}

function mergeProfiles(a: User[], b: User[]) {
  const map = new Map(a.map((u) => [u.id, u]));
  b.forEach((u) => map.set(u.id, u));
  return Array.from(map.values());
}

type Store = ReturnType<typeof useStoreValue>;
const StoreContext = React.createContext<Store | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const value = useStoreValue();
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const ctx = React.useContext(StoreContext);
  if (!ctx) throw new Error("useStore moet binnen StoreProvider worden gebruikt");
  return ctx;
}

/** Gegevens van het actieve project (al gefilterd door RLS en op project). */
export function useProjectData() {
  const { state } = useStore();
  return React.useMemo(
    () => ({
      audiences: state.audiences,
      needs: state.needs,
      ideas: state.ideas,
      concepts: state.concepts,
      sessions: state.sessions,
      invitations: state.invitations,
      activities: state.activities,
      members: state.members,
    }),
    [state.audiences, state.needs, state.ideas, state.concepts, state.sessions, state.invitations, state.activities, state.members],
  );
}
