"use client";

/**
 * Prototype-opslag in het geheugen van de browser.
 *
 * BELANGRIJK: dit is géén database. Alle wijzigingen bestaan alleen in dit
 * browservenster en verdwijnen bij herladen. Meldingen in de interface zeggen
 * dat ook expliciet. In stap 2 wordt deze laag vervangen door Supabase.
 *
 * Sessiegegevens worden via BroadcastChannel gedeeld tussen tabbladen in
 * dezelfde browser, zodat het begeleidersscherm en de sessieruimte samen te
 * demonstreren zijn. Dat is geen echte live-verbinding.
 */
import * as React from "react";
import * as data from "./sample-data";
import type {
  ActionItem,
  Activity,
  AssessmentValue,
  Audience,
  Concept,
  Contribution,
  ContributionKind,
  Idea,
  Invitation,
  Membership,
  Need,
  Project,
  ProjectSettings,
  RiskItem,
  ResearchItem,
  Role,
  Session,
  SessionAnswer,
  User,
} from "./types";
import { can, type Permission } from "./permissions";

interface State {
  currentUserId: string;
  currentProjectId: string | null;
  users: User[];
  projects: Project[];
  memberships: Membership[];
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

const initialState: State = {
  currentUserId: "u1",
  currentProjectId: "p1",
  users: data.users,
  projects: data.projects,
  memberships: data.memberships,
  audiences: data.audiences,
  needs: data.needs,
  ideas: data.ideas,
  contributions: data.contributions,
  concepts: data.concepts,
  actions: data.actions,
  sessions: data.sessions,
  sessionAnswers: data.sessionAnswers,
  invitations: data.invitations,
  activities: data.activities,
};

let idCounter = 0;
export const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${(idCounter++).toString(36)}`;

export interface NewIdeaInput {
  title: string;
  description: string;
  problem?: string;
  audienceIds: string[];
  needIds: string[];
}

function useStoreValue() {
  const [state, setState] = React.useState<State>(initialState);

  const currentUser = state.users.find((u) => u.id === state.currentUserId)!;
  const myProjects = state.projects.filter((p) =>
    state.memberships.some((m) => m.userId === state.currentUserId && m.projectId === p.id),
  );
  const project = myProjects.find((p) => p.id === state.currentProjectId) ?? null;
  const role: Role | undefined = project
    ? state.memberships.find((m) => m.userId === state.currentUserId && m.projectId === project.id)?.role
    : undefined;

  const userName = React.useCallback(
    (id: string) => state.users.find((u) => u.id === id)?.name ?? "Onbekende gebruiker",
    [state.users],
  );

  const log = (s: State, text: string, href: string): Activity[] =>
    s.currentProjectId
      ? [{ id: newId("ac"), projectId: s.currentProjectId, text, href, at: new Date().toISOString() }, ...s.activities]
      : s.activities;

  /* ---------- Broadcast voor sessies (alleen tussen tabbladen) ---------- */
  const channelRef = React.useRef<BroadcastChannel | null>(null);
  const remoteUpdate = React.useRef(false);
  React.useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    const ch = new BroadcastChannel("kansenmaker-prototype-sessies");
    channelRef.current = ch;
    ch.onmessage = (e: MessageEvent<{ sessions: Session[]; sessionAnswers: SessionAnswer[] }>) => {
      remoteUpdate.current = true;
      setState((s) => ({ ...s, sessions: e.data.sessions, sessionAnswers: e.data.sessionAnswers }));
    };
    return () => ch.close();
  }, []);
  const firstRender = React.useRef(true);
  React.useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (remoteUpdate.current) {
      remoteUpdate.current = false;
      return;
    }
    channelRef.current?.postMessage({ sessions: state.sessions, sessionAnswers: state.sessionAnswers });
  }, [state.sessions, state.sessionAnswers]);

  const actions = {
    /* Prototype */
    setCurrentUser: (userId: string) =>
      setState((s) => {
        const first = s.memberships.find((m) => m.userId === userId && !s.projects.find((p) => p.id === m.projectId)?.archived);
        return { ...s, currentUserId: userId, currentProjectId: first?.projectId ?? null };
      }),
    setProject: (projectId: string) => setState((s) => ({ ...s, currentProjectId: projectId })),

    /* Ideeën */
    addIdea: (input: NewIdeaInput): string => {
      const id = newId("idee");
      setState((s) => {
        if (!s.currentProjectId) return s;
        const p = s.projects.find((x) => x.id === s.currentProjectId);
        const idea: Idea = {
          id,
          projectId: s.currentProjectId,
          title: input.title.trim(),
          description: input.description.trim(),
          problem: input.problem?.trim() || undefined,
          audienceIds: input.audienceIds,
          needIds: input.needIds,
          authorId: s.currentUserId,
          status: "nieuw",
          createdAt: new Date().toISOString(),
          relatedIdeaIds: [],
          pending: p?.settings.requireApproval || undefined,
        };
        return { ...s, ideas: [idea, ...s.ideas], activities: log(s, `Jij deelde het idee ‘${idea.title}’`, `/ideeen/${id}`) };
      });
      return id;
    },
    updateIdea: (id: string, patch: Partial<Idea>) =>
      setState((s) => ({ ...s, ideas: s.ideas.map((i) => (i.id === id ? { ...i, ...patch } : i)) })),
    addContribution: (ideaId: string, kind: ContributionKind, text: string) =>
      setState((s) => {
        const p = s.projects.find((x) => x.id === s.currentProjectId);
        const c: Contribution = {
          id: newId("bijdrage"),
          ideaId,
          authorId: s.currentUserId,
          kind,
          text: text.trim(),
          createdAt: new Date().toISOString(),
          pending: p?.settings.requireApproval || undefined,
        };
        const title = s.ideas.find((i) => i.id === ideaId)?.title ?? "";
        return {
          ...s,
          contributions: [...s.contributions, c],
          activities: log(s, `Jij gaf een ${kind} op ‘${title}’`, `/ideeen/${ideaId}`),
        };
      }),
    updateContribution: (id: string, patch: Partial<Contribution>) =>
      setState((s) => ({ ...s, contributions: s.contributions.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),

    /* Doelgroepen en behoeften */
    addAudience: (input: Pick<Audience, "name" | "description" | "category">): string => {
      const id = newId("doelgroep");
      setState((s) =>
        s.currentProjectId
          ? { ...s, audiences: [...s.audiences, { ...input, id, projectId: s.currentProjectId }] }
          : s,
      );
      return id;
    },
    updateAudience: (id: string, patch: Partial<Audience>) =>
      setState((s) => ({ ...s, audiences: s.audiences.map((a) => (a.id === id ? { ...a, ...patch } : a)) })),
    mergeAudiences: (sourceId: string, targetId: string) =>
      setState((s) => {
        const swap = (ids: string[]) => Array.from(new Set(ids.map((x) => (x === sourceId ? targetId : x))));
        return {
          ...s,
          audiences: s.audiences.filter((a) => a.id !== sourceId),
          needs: s.needs.map((n) => (n.audienceId === sourceId ? { ...n, audienceId: targetId } : n)),
          ideas: s.ideas.map((i) => ({ ...i, audienceIds: swap(i.audienceIds) })),
          concepts: s.concepts.map((c) => ({ ...c, audienceIds: swap(c.audienceIds) })),
        };
      }),
    addNeed: (audienceId: string, description: string) =>
      setState((s) => ({ ...s, needs: [...s.needs, { id: newId("behoefte"), audienceId, description: description.trim() }] })),
    removeNeed: (id: string) =>
      setState((s) => ({
        ...s,
        needs: s.needs.filter((n) => n.id !== id),
        ideas: s.ideas.map((i) => ({ ...i, needIds: i.needIds.filter((x) => x !== id) })),
        concepts: s.concepts.map((c) => ({ ...c, needIds: c.needIds.filter((x) => x !== id) })),
      })),

    /* Concepten */
    addConcept: (input: { name: string; description: string; ideaIds: string[] }): string => {
      const id = newId("concept");
      setState((s) => {
        if (!s.currentProjectId) return s;
        const fromIdeas = s.ideas.filter((i) => input.ideaIds.includes(i.id));
        const concept: Concept = {
          id,
          projectId: s.currentProjectId,
          name: input.name.trim(),
          description: input.description.trim(),
          status: "nieuw",
          ownerId: s.currentUserId,
          ideaIds: input.ideaIds,
          audienceIds: Array.from(new Set(fromIdeas.flatMap((i) => i.audienceIds))),
          needIds: Array.from(new Set(fromIdeas.flatMap((i) => i.needIds))),
          distinctiveness: "",
          missionContribution: "",
          risks: [],
          feasibility: { people: "", resources: "", partners: "", mission: "", missingKnowledge: "" },
          research: [],
          assessment: {},
        };
        return {
          ...s,
          concepts: [concept, ...s.concepts],
          activities: log(s, `Jij maakte het concept ‘${concept.name}’`, `/concepten/${id}`),
        };
      });
      return id;
    },
    updateConcept: (id: string, patch: Partial<Concept>) =>
      setState((s) => ({ ...s, concepts: s.concepts.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),
    setAssessment: (id: string, questionId: string, value: AssessmentValue | undefined) =>
      setState((s) => ({
        ...s,
        concepts: s.concepts.map((c) =>
          c.id === id ? { ...c, assessment: { ...c.assessment, [questionId]: value } } : c,
        ),
      })),
    addRisk: (conceptId: string, risk: Omit<RiskItem, "id">) =>
      setState((s) => ({
        ...s,
        concepts: s.concepts.map((c) =>
          c.id === conceptId ? { ...c, risks: [...c.risks, { ...risk, id: newId("risico") }] } : c,
        ),
      })),
    removeRisk: (conceptId: string, riskId: string) =>
      setState((s) => ({
        ...s,
        concepts: s.concepts.map((c) => (c.id === conceptId ? { ...c, risks: c.risks.filter((r) => r.id !== riskId) } : c)),
      })),
    addResearch: (conceptId: string, items: Omit<ResearchItem, "id">[]) =>
      setState((s) => ({
        ...s,
        concepts: s.concepts.map((c) =>
          c.id === conceptId
            ? { ...c, research: [...c.research, ...items.map((r) => ({ ...r, id: newId("onderzoek") }))] }
            : c,
        ),
      })),
    updateResearch: (conceptId: string, researchId: string, patch: Partial<ResearchItem>) =>
      setState((s) => ({
        ...s,
        concepts: s.concepts.map((c) =>
          c.id === conceptId
            ? { ...c, research: c.research.map((r) => (r.id === researchId ? { ...r, ...patch } : r)) }
            : c,
        ),
      })),
    addAction: (a: Omit<ActionItem, "id">) =>
      setState((s) => ({ ...s, actions: [...s.actions, { ...a, id: newId("actie") }] })),
    updateAction: (id: string, patch: Partial<ActionItem>) =>
      setState((s) => ({ ...s, actions: s.actions.map((a) => (a.id === id ? { ...a, ...patch } : a)) })),

    /* Sessies */
    addSession: (input: Pick<Session, "title" | "date" | "location">): string => {
      const id = newId("sessie");
      setState((s) =>
        s.currentProjectId
          ? {
              ...s,
              sessions: [
                ...s.sessions,
                {
                  ...input,
                  id,
                  projectId: s.currentProjectId,
                  facilitatorId: s.currentUserId,
                  state: "gepland",
                  activeRound: 1,
                  participantIds: [],
                },
              ],
            }
          : s,
      );
      return id;
    },
    updateSession: (id: string, patch: Partial<Session>) =>
      setState((s) => ({ ...s, sessions: s.sessions.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
    addSessionAnswer: (sessionId: string, round: number, text: string) =>
      setState((s) => ({
        ...s,
        sessionAnswers: [
          ...s.sessionAnswers,
          { id: newId("antwoord"), sessionId, round, authorId: s.currentUserId, text: text.trim(), votes: [] },
        ],
      })),
    toggleAnswerHidden: (id: string) =>
      setState((s) => ({
        ...s,
        sessionAnswers: s.sessionAnswers.map((a) => (a.id === id ? { ...a, hidden: !a.hidden } : a)),
      })),
    toggleVote: (id: string) =>
      setState((s) => ({
        ...s,
        sessionAnswers: s.sessionAnswers.map((a) =>
          a.id === id
            ? {
                ...a,
                votes: a.votes.includes(s.currentUserId)
                  ? a.votes.filter((v) => v !== s.currentUserId)
                  : [...a.votes, s.currentUserId],
              }
            : a,
        ),
      })),

    /* Beheer */
    addProject: (input: Pick<Project, "name" | "description">): string => {
      const id = newId("project");
      setState((s) => ({
        ...s,
        projects: [
          ...s.projects,
          {
            ...input,
            id,
            ownerId: s.currentUserId,
            visibility: "besloten",
            archived: false,
            settings: {
              inviteOnly: true,
              ideasVisibleImmediately: true,
              allowComments: true,
              allowVoting: true,
              requireApproval: false,
            },
          },
        ],
        memberships: [...s.memberships, { userId: s.currentUserId, projectId: id, role: "beheerder" }],
      }));
      return id;
    },
    updateProject: (id: string, patch: Partial<Project>) =>
      setState((s) => ({ ...s, projects: s.projects.map((p) => (p.id === id ? { ...p, ...patch } : p)) })),
    updateSettings: (id: string, patch: Partial<ProjectSettings>) =>
      setState((s) => ({
        ...s,
        projects: s.projects.map((p) => (p.id === id ? { ...p, settings: { ...p.settings, ...patch } } : p)),
      })),
    setMemberRole: (userId: string, projectId: string, role: Role) =>
      setState((s) => ({
        ...s,
        memberships: s.memberships.map((m) => (m.userId === userId && m.projectId === projectId ? { ...m, role } : m)),
      })),
    removeMember: (userId: string, projectId: string) =>
      setState((s) => ({
        ...s,
        memberships: s.memberships.filter((m) => !(m.userId === userId && m.projectId === projectId)),
      })),
    addInvitation: (inv: Omit<Invitation, "id" | "revoked">): string => {
      const id = newId("uitnodiging");
      setState((s) => ({ ...s, invitations: [...s.invitations, { ...inv, id, revoked: false }] }));
      return id;
    },
    revokeInvitation: (id: string) =>
      setState((s) => ({ ...s, invitations: s.invitations.map((i) => (i.id === id ? { ...i, revoked: true } : i)) })),
  };

  const allowed = (permission: Permission) => can(role, permission);

  return { state, currentUser, myProjects, project, role, userName, allowed, ...actions };
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

/** Gegevens van het actieve project (gefilterd op projecttoegang). */
export function useProjectData() {
  const { state, project } = useStore();
  const pid = project?.id;
  return React.useMemo(() => {
    const audiences = state.audiences.filter((a) => a.projectId === pid);
    const audienceIds = new Set(audiences.map((a) => a.id));
    return {
      audiences,
      needs: state.needs.filter((n) => audienceIds.has(n.audienceId)),
      ideas: state.ideas.filter((i) => i.projectId === pid),
      concepts: state.concepts.filter((c) => c.projectId === pid),
      sessions: state.sessions.filter((s) => s.projectId === pid),
      invitations: state.invitations.filter((i) => i.projectId === pid),
      activities: state.activities.filter((a) => a.projectId === pid),
      members: state.memberships.filter((m) => m.projectId === pid),
    };
  }, [state, pid]);
}
