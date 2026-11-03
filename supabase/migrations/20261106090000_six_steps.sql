-- De zes stappen van De Kansenmaker (begeleide route voor deelnemers).
-- 1 sterke punten (strengths)          4 ideeën (bestaand)
-- 2 doelgroepen (bestaand, nu ook door deelnemers)
-- 3 behoeften (bestaand, nu ook door deelnemers)
-- 5 kansen/bedreigingen/vragen per idee (idea_insights)
-- 6 ideeën kiezen + eerste vervolgstap (idea_picks)

-- ---------------------------------------------------------------------------
-- Hulpfunctie: 'aangemaakt door' kan niet worden gewijzigd
-- ---------------------------------------------------------------------------
create or replace function private.keep_created_by()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.created_by := old.created_by;
  new.created_at := old.created_at;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Stap 1: sterke punten
-- ---------------------------------------------------------------------------
create table public.strengths (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  text text not null check (char_length(trim(text)) between 1 and 300),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index strengths_project_idx on public.strengths (project_id);
create index strengths_created_by_idx on public.strengths (created_by);

create trigger set_created_by before insert on public.strengths
  for each row execute function private.set_created_by();
create trigger keep_created_by before update on public.strengths
  for each row execute function private.keep_created_by();

alter table public.strengths enable row level security;
create policy "sterke punten lezen" on public.strengths for select to authenticated
  using (private.is_member(project_id));
create policy "sterke punten toevoegen" on public.strengths for insert to authenticated
  with check (private.is_member(project_id) and private.project_open(project_id) and created_by = (select auth.uid()));
create policy "sterke punten wijzigen" on public.strengths for update to authenticated
  using (created_by = (select auth.uid()) or private.has_role(project_id, array['redacteur', 'begeleider', 'beheerder']))
  with check (private.is_member(project_id));
create policy "sterke punten verwijderen" on public.strengths for delete to authenticated
  using (created_by = (select auth.uid()) or private.has_role(project_id, array['redacteur', 'begeleider', 'beheerder']));

-- ---------------------------------------------------------------------------
-- Stap 2: doelgroepen – iedere deelnemer mag toevoegen en eigen doelgroepen wijzigen
-- ---------------------------------------------------------------------------
create trigger keep_created_by before update on public.audiences
  for each row execute function private.keep_created_by();

alter policy "doelgroepen toevoegen" on public.audiences
  with check (private.is_member(project_id) and private.project_open(project_id) and created_by = (select auth.uid()));
alter policy "doelgroepen wijzigen" on public.audiences
  using (created_by = (select auth.uid()) or private.has_role(project_id, array['redacteur', 'begeleider', 'beheerder']))
  with check (private.is_member(project_id));

-- ---------------------------------------------------------------------------
-- Stap 3: behoeften – iedere deelnemer mag toevoegen en eigen behoeften wijzigen/verwijderen
-- ---------------------------------------------------------------------------
alter table public.needs add column created_by uuid references public.profiles (id) on delete set null;
create index needs_created_by_idx on public.needs (created_by);
create trigger set_created_by before insert on public.needs
  for each row execute function private.set_created_by();
create trigger keep_created_by before update on public.needs
  for each row execute function private.keep_created_by();

alter policy "behoeften toevoegen" on public.needs
  with check (private.is_member(project_id) and private.project_open(project_id) and created_by = (select auth.uid()));
alter policy "behoeften wijzigen" on public.needs
  using (created_by = (select auth.uid()) or private.has_role(project_id, array['redacteur', 'begeleider', 'beheerder']))
  with check (private.is_member(project_id));
alter policy "behoeften verwijderen" on public.needs
  using (created_by = (select auth.uid()) or private.has_role(project_id, array['redacteur', 'begeleider', 'beheerder']));

-- ---------------------------------------------------------------------------
-- Stap 5: kansen, bedreigingen en vragen per idee
-- ---------------------------------------------------------------------------
create table public.idea_insights (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  idea_id uuid not null references public.ideas (id) on delete cascade,
  kind text not null check (kind in ('kans', 'bedreiging', 'vraag')),
  text text not null check (char_length(trim(text)) between 1 and 500),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index idea_insights_idea_idx on public.idea_insights (idea_id);
create index idea_insights_project_idx on public.idea_insights (project_id);
create index idea_insights_created_by_idx on public.idea_insights (created_by);

create trigger inherit_project before insert or update on public.idea_insights
  for each row execute function private.inherit_project('ideas', 'idea_id');
create trigger set_created_by before insert on public.idea_insights
  for each row execute function private.set_created_by();
create trigger keep_created_by before update on public.idea_insights
  for each row execute function private.keep_created_by();

alter table public.idea_insights enable row level security;
-- Alleen bij ideeën die je mag zien (RLS op ideas filtert wachtende ideeën)
create policy "inzichten lezen" on public.idea_insights for select to authenticated
  using (exists (select 1 from public.ideas i where i.id = idea_id));
create policy "inzichten toevoegen" on public.idea_insights for insert to authenticated
  with check (private.is_member(project_id) and private.project_open(project_id) and created_by = (select auth.uid())
    and exists (select 1 from public.ideas i where i.id = idea_id and not i.pending and not i.archived));
create policy "inzichten wijzigen" on public.idea_insights for update to authenticated
  using (created_by = (select auth.uid()) or private.has_role(project_id, array['redacteur', 'begeleider', 'beheerder']))
  with check (private.is_member(project_id));
create policy "inzichten verwijderen" on public.idea_insights for delete to authenticated
  using (created_by = (select auth.uid()) or private.has_role(project_id, array['redacteur', 'begeleider', 'beheerder']));

-- ---------------------------------------------------------------------------
-- Stap 6: ideeën kiezen met een eerste vervolgstap (één keuze per persoon per idee)
-- ---------------------------------------------------------------------------
create table public.idea_picks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  idea_id uuid not null references public.ideas (id) on delete cascade,
  next_step text not null default '' check (char_length(next_step) <= 500),
  created_by uuid references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (idea_id, created_by)
);
create index idea_picks_project_idx on public.idea_picks (project_id);
create index idea_picks_created_by_idx on public.idea_picks (created_by);

create trigger inherit_project before insert or update on public.idea_picks
  for each row execute function private.inherit_project('ideas', 'idea_id');
create trigger set_created_by before insert on public.idea_picks
  for each row execute function private.set_created_by();
create trigger keep_created_by before update on public.idea_picks
  for each row execute function private.keep_created_by();

alter table public.idea_picks enable row level security;
create policy "keuzes lezen" on public.idea_picks for select to authenticated
  using (exists (select 1 from public.ideas i where i.id = idea_id));
create policy "keuzes toevoegen" on public.idea_picks for insert to authenticated
  with check (private.is_member(project_id) and private.project_open(project_id) and created_by = (select auth.uid())
    and exists (select 1 from public.ideas i where i.id = idea_id and not i.pending and not i.archived));
create policy "keuzes wijzigen" on public.idea_picks for update to authenticated
  using (created_by = (select auth.uid()))
  with check (created_by = (select auth.uid()));
create policy "keuzes verwijderen" on public.idea_picks for delete to authenticated
  using (created_by = (select auth.uid()));
