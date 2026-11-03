/**
 * Datamodel van de KansenKamer (prototype).
 * Volgt §7 van het functioneel ontwerp. Opgeslagen in Supabase (zie supabase/migrations).
 */

export type Role = "deelnemer" | "redacteur" | "begeleider" | "beheerder";

export type Status =
  | "nieuw"
  | "in-ontwikkeling"
  | "te-onderzoeken"
  | "klaar-voor-proef"
  | "afgerond";

export type Visibility = "besloten" | "open";

export interface ProjectSettings {
  /** Deelname alleen op uitnodiging */
  inviteOnly: boolean;
  /** Ideeën zijn direct zichtbaar voor alle deelnemers */
  ideasVisibleImmediately: boolean;
  /** Deelnemers mogen op elkaar reageren */
  allowComments: boolean;
  /** Stemmen is toegestaan */
  allowVoting: boolean;
  /** Bijdragen moeten eerst worden goedgekeurd */
  requireApproval: boolean;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  visibility: Visibility;
  archived: boolean;
  settings: ProjectSettings;
}

export interface User {
  id: string;
  name: string;
  /** Naam nog niet ingevuld (naam is dan afgeleid van het e-mailadres) */
  nameMissing?: boolean;
  email: string;
  organisation?: string;
}

export interface Membership {
  userId: string;
  projectId: string;
  role: Role;
}

export interface Audience {
  id: string;
  projectId: string;
  name: string;
  description: string;
  category: string;
  createdBy?: string;
}

export interface Need {
  id: string;
  audienceId: string;
  description: string;
  createdBy?: string;
}

/** Stap 1: een sterk punt van het Haags Verhaal */
export interface Strength {
  id: string;
  text: string;
  createdBy?: string;
  createdAt: string;
}

/** Stap 5: kans, bedreiging of open vraag bij een idee */
export type InsightKind = "kans" | "bedreiging" | "vraag";
export interface IdeaInsight {
  id: string;
  ideaId: string;
  kind: InsightKind;
  text: string;
  createdBy?: string;
  createdAt: string;
}

/** Stap 6: iemand kiest een idee als kansrijk, met een eerste vervolgstap */
export interface IdeaPick {
  id: string;
  ideaId: string;
  nextStep: string;
  createdBy?: string;
  createdAt: string;
}

export type ContributionKind = "reactie" | "aanvulling";

export interface Contribution {
  id: string;
  ideaId: string;
  authorId: string;
  kind: ContributionKind;
  text: string;
  createdAt: string;
  hidden?: boolean;
  /** Wacht op goedkeuring (als het project goedkeuring vereist) */
  pending?: boolean;
}

export interface Idea {
  id: string;
  projectId: string;
  title: string;
  description: string;
  /** Optioneel: welke behoefte of welk probleem lost dit op? */
  problem?: string;
  authorId: string;
  audienceIds: string[];
  needIds: string[];
  status: Status;
  createdAt: string;
  archived?: boolean;
  relatedIdeaIds: string[];
  pending?: boolean;
  /** Ingestuurd via een inzendlink door iemand zonder account */
  guestName?: string;
}

export type RiskKind = "kans" | "bedreiging" | "belemmering";

export interface RiskItem {
  id: string;
  kind: RiskKind;
  text: string;
}

export interface Feasibility {
  people: string;
  resources: string;
  partners: string;
  mission: string;
  missingKnowledge: string;
}

export type ResearchStatus = "open" | "bezig" | "afgerond";

export interface ResearchItem {
  id: string;
  assumption: string;
  method: string;
  status: ResearchStatus;
  result?: string;
}

export type ActionStatus = "open" | "bezig" | "klaar";

export interface ActionItem {
  id: string;
  description: string;
  ownerId: string;
  deadline?: string;
  status: ActionStatus;
  conceptId?: string;
  sessionId?: string;
}

/** ✓ aannemelijk, ? onbekend, × obstakel */
export type AssessmentValue = "aannemelijk" | "onbekend" | "obstakel";

export interface AssessmentQuestion {
  id: string;
  label: string;
  help?: string;
}

export interface Concept {
  id: string;
  projectId: string;
  name: string;
  description: string;
  status: Status;
  ownerId: string;
  ideaIds: string[];
  audienceIds: string[];
  needIds: string[];
  distinctiveness: string;
  /** Hoe draagt dit bij aan ontmoeting, verbinding of verhalen die anders niet gehoord worden? */
  missionContribution: string;
  risks: RiskItem[];
  feasibility: Feasibility;
  research: ResearchItem[];
  assessment: Record<string, AssessmentValue | undefined>;
  /** Bevestiging door bevoegde gebruiker voor 'Klaar voor proef' */
  readyConfirmedBy?: string;
}

export type SessionState = "gepland" | "actief" | "afgesloten";

export interface SessionRoundDef {
  number: number;
  title: string;
  minutes: number;
  assignment: string;
  /** Soort invoer die deelnemers geven */
  inputLabel: string;
  voting?: boolean;
  /** Tekst van de knop om nog een antwoord toe te voegen, bijv. ‘Voeg nog een idee toe’ */
  addLabel?: string;
  /** Uitleg van Haags Verhaal uit deze stap(pen) van de KansenKamer (src/lib/steps.ts) */
  steps?: number[];
  /** Eigen uitleg als de ronde niet bij een stap hoort */
  explanation?: { questions: string[]; why: string[] };
  /** Gestructureerde invoer: ‘doelgroep’ = een doelgroep met één of meer behoeften per antwoord */
  structured?: "doelgroep";
}

export interface SessionAnswer {
  id: string;
  sessionId: string;
  round: number;
  authorId: string;
  text: string;
  hidden?: boolean;
  votes: string[];
  /** Omgezet naar dit idee */
  ideaId?: string;
  /** Ingebracht door een gast (zonder account) */
  guestName?: string;
}

export interface Session {
  id: string;
  projectId: string;
  title: string;
  date: string;
  facilitatorId: string;
  state: SessionState;
  activeRound: number;
  participantIds: string[];
  /** Aantal gasten (deelname via link, zonder account) */
  guestCount?: number;
  location: string;
  /** Online sessie: iedere deelnemer doorloopt de rondes in eigen tempo, zonder begeleider */
  selfPaced: boolean;
}

export interface Invitation {
  id: string;
  projectId: string;
  token: string;
  createdBy?: string;
  acceptedAt?: string;
  email?: string;
  role: Role;
  kind: "e-mail" | "link";
  /** deelname (lid worden / sessie) of inzending (ideeën insturen zonder account) */
  purpose?: "deelname" | "inzending";
  expiresAt: string;
  revoked: boolean;
  sessionId?: string;
}

export interface Activity {
  id: string;
  projectId: string;
  text: string;
  href: string;
  at: string;
}
