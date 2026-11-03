-- De Kansenmaker — schema (stap 2)
-- Alle inhoud hoort bij een project. Toegang wordt geregeld met Row Level Security (zie volgende migratie).

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- Profielen (1-op-1 met auth.users)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text not null default '',
  organisation text not null default '',
  created_at timestamptz not null default now()
);
comment on table public.profiles is 'Publieke profielgegevens van een gebruiker.';

-- ---------------------------------------------------------------------------
-- Projecten en lidmaatschap
-- ---------------------------------------------------------------------------
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 120),
  description text not null default '',
  owner_id uuid references public.profiles (id) on delete set null,
  visibility text not null default 'besloten' check (visibility in ('besloten', 'open')),
  archived boolean not null default false,
  invite_only boolean not null default true,
  ideas_visible_immediately boolean not null default true,
  allow_comments boolean not null default true,
  allow_voting boolean not null default true,
  require_approval boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.project_members (
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null check (role in ('deelnemer', 'redacteur', 'begeleider', 'beheerder')),
  created_at timestamptz not null default now(),
  primary key (project_id, user_id)
);
create index project_members_user_idx on public.project_members (user_id);

-- ---------------------------------------------------------------------------
-- Doelgroepen en behoeften
-- ---------------------------------------------------------------------------
create table public.audiences (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 120),
  description text not null default '',
  category text not null default 'Overig',
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index audiences_project_idx on public.audiences (project_id);

create table public.needs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  audience_id uuid not null references public.audiences (id) on delete cascade,
  description text not null check (char_length(trim(description)) between 1 and 300),
  created_at timestamptz not null default now()
);
create index needs_audience_idx on public.needs (audience_id);
create index needs_project_idx on public.needs (project_id);

-- ---------------------------------------------------------------------------
-- Ideeën
-- ---------------------------------------------------------------------------
create table public.ideas (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 80),
  description text not null check (char_length(trim(description)) between 1 and 1000),
  problem text,
  author_id uuid references public.profiles (id) on delete set null,
  status text not null default 'nieuw'
    check (status in ('nieuw', 'in-ontwikkeling', 'te-onderzoeken', 'klaar-voor-proef', 'afgerond')),
  archived boolean not null default false,
  pending boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index ideas_project_idx on public.ideas (project_id, created_at desc);

create table public.idea_audiences (
  idea_id uuid not null references public.ideas (id) on delete cascade,
  audience_id uuid not null references public.audiences (id) on delete cascade,
  primary key (idea_id, audience_id)
);
create index idea_audiences_audience_idx on public.idea_audiences (audience_id);

create table public.idea_needs (
  idea_id uuid not null references public.ideas (id) on delete cascade,
  need_id uuid not null references public.needs (id) on delete cascade,
  primary key (idea_id, need_id)
);
create index idea_needs_need_idx on public.idea_needs (need_id);

create table public.idea_relations (
  idea_id uuid not null references public.ideas (id) on delete cascade,
  related_idea_id uuid not null references public.ideas (id) on delete cascade,
  primary key (idea_id, related_idea_id),
  check (idea_id <> related_idea_id)
);
create index idea_relations_related_idx on public.idea_relations (related_idea_id);

create table public.contributions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  idea_id uuid not null references public.ideas (id) on delete cascade,
  author_id uuid references public.profiles (id) on delete set null,
  kind text not null check (kind in ('reactie', 'aanvulling')),
  text text not null check (char_length(trim(text)) between 1 and 1000),
  hidden boolean not null default false,
  pending boolean not null default false,
  created_at timestamptz not null default now()
);
create index contributions_idea_idx on public.contributions (idea_id, created_at);
create index contributions_project_idx on public.contributions (project_id);

-- ---------------------------------------------------------------------------
-- Concepten
-- ---------------------------------------------------------------------------
create table public.concepts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 120),
  description text not null default '',
  status text not null default 'nieuw'
    check (status in ('nieuw', 'in-ontwikkeling', 'te-onderzoeken', 'klaar-voor-proef', 'afgerond')),
  owner_id uuid references public.profiles (id) on delete set null,
  distinctiveness text not null default '',
  mission_contribution text not null default '',
  feasibility_people text not null default '',
  feasibility_resources text not null default '',
  feasibility_partners text not null default '',
  feasibility_mission text not null default '',
  feasibility_missing_knowledge text not null default '',
  -- realiteitstoets: { vraag-id: 'aannemelijk' | 'onbekend' | 'obstakel' }
  assessment jsonb not null default '{}'::jsonb,
  ready_confirmed_by uuid references public.profiles (id) on delete set null,
  ready_confirmed_at timestamptz,
  created_at timestamptz not null default now()
);
create index concepts_project_idx on public.concepts (project_id);

create table public.concept_ideas (
  concept_id uuid not null references public.concepts (id) on delete cascade,
  idea_id uuid not null references public.ideas (id) on delete cascade,
  primary key (concept_id, idea_id)
);
create index concept_ideas_idea_idx on public.concept_ideas (idea_id);

create table public.concept_audiences (
  concept_id uuid not null references public.concepts (id) on delete cascade,
  audience_id uuid not null references public.audiences (id) on delete cascade,
  primary key (concept_id, audience_id)
);
create index concept_audiences_audience_idx on public.concept_audiences (audience_id);

create table public.concept_needs (
  concept_id uuid not null references public.concepts (id) on delete cascade,
  need_id uuid not null references public.needs (id) on delete cascade,
  primary key (concept_id, need_id)
);
create index concept_needs_need_idx on public.concept_needs (need_id);

create table public.risks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  concept_id uuid not null references public.concepts (id) on delete cascade,
  kind text not null check (kind in ('kans', 'bedreiging', 'belemmering')),
  text text not null check (char_length(trim(text)) between 1 and 500),
  created_at timestamptz not null default now()
);
create index risks_concept_idx on public.risks (concept_id);
create index risks_project_idx on public.risks (project_id);

create table public.research_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  concept_id uuid not null references public.concepts (id) on delete cascade,
  assumption text not null check (char_length(trim(assumption)) between 1 and 500),
  method text not null default '',
  status text not null default 'open' check (status in ('open', 'bezig', 'afgerond')),
  result text,
  created_at timestamptz not null default now()
);
create index research_items_concept_idx on public.research_items (concept_id);
create index research_items_project_idx on public.research_items (project_id);

-- ---------------------------------------------------------------------------
-- Sessies
-- ---------------------------------------------------------------------------
create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 120),
  starts_at timestamptz not null,
  location text not null default 'Nog te bepalen',
  facilitator_id uuid references public.profiles (id) on delete set null,
  state text not null default 'gepland' check (state in ('gepland', 'actief', 'afgesloten')),
  active_round smallint not null default 1 check (active_round between 1 and 6),
  created_at timestamptz not null default now()
);
create index sessions_project_idx on public.sessions (project_id);

create table public.session_participants (
  session_id uuid not null references public.sessions (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (session_id, user_id)
);
create index session_participants_project_idx on public.session_participants (project_id);

create table public.session_answers (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  session_id uuid not null references public.sessions (id) on delete cascade,
  round smallint not null check (round between 1 and 6),
  author_id uuid references public.profiles (id) on delete set null,
  text text not null check (char_length(trim(text)) between 1 and 500),
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);
create index session_answers_session_idx on public.session_answers (session_id, round);
create index session_answers_project_idx on public.session_answers (project_id);

create table public.session_votes (
  answer_id uuid not null references public.session_answers (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  session_id uuid not null references public.sessions (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (answer_id, user_id)
);
create index session_votes_session_user_idx on public.session_votes (session_id, user_id);
create index session_votes_project_idx on public.session_votes (project_id);

-- ---------------------------------------------------------------------------
-- Acties (bij een concept of sessie)
-- ---------------------------------------------------------------------------
create table public.actions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  concept_id uuid references public.concepts (id) on delete cascade,
  session_id uuid references public.sessions (id) on delete cascade,
  description text not null check (char_length(trim(description)) between 1 and 300),
  owner_id uuid references public.profiles (id) on delete set null,
  deadline date,
  status text not null default 'open' check (status in ('open', 'bezig', 'klaar')),
  created_at timestamptz not null default now(),
  check (concept_id is not null or session_id is not null)
);
create index actions_project_idx on public.actions (project_id);
create index actions_owner_idx on public.actions (owner_id);
create index actions_concept_idx on public.actions (concept_id);

-- ---------------------------------------------------------------------------
-- Uitnodigingen
-- ---------------------------------------------------------------------------
create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  token uuid not null unique default gen_random_uuid(),
  email text,
  role text not null default 'deelnemer' check (role in ('deelnemer', 'redacteur', 'begeleider', 'beheerder')),
  kind text not null check (kind in ('e-mail', 'link')),
  session_id uuid references public.sessions (id) on delete cascade,
  expires_at timestamptz not null,
  revoked boolean not null default false,
  created_by uuid references public.profiles (id) on delete set null,
  accepted_by uuid references public.profiles (id) on delete set null,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  check (kind <> 'e-mail' or email is not null)
);
create index invitations_project_idx on public.invitations (project_id);

-- ---------------------------------------------------------------------------
-- Activiteit (wordt door triggers gevuld)
-- ---------------------------------------------------------------------------
create table public.activities (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete set null,
  text text not null,
  href text not null,
  created_at timestamptz not null default now()
);
create index activities_project_idx on public.activities (project_id, created_at desc);
