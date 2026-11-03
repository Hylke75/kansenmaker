-- De Kansenmaker — Row Level Security-policies volgens de rechtenmatrix (stap 2)

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.audiences enable row level security;
alter table public.needs enable row level security;
alter table public.ideas enable row level security;
alter table public.idea_audiences enable row level security;
alter table public.idea_needs enable row level security;
alter table public.idea_relations enable row level security;
alter table public.contributions enable row level security;
alter table public.concepts enable row level security;
alter table public.concept_ideas enable row level security;
alter table public.concept_audiences enable row level security;
alter table public.concept_needs enable row level security;
alter table public.risks enable row level security;
alter table public.research_items enable row level security;
alter table public.sessions enable row level security;
alter table public.session_participants enable row level security;
alter table public.session_answers enable row level security;
alter table public.session_votes enable row level security;
alter table public.actions enable row level security;
alter table public.invitations enable row level security;
alter table public.activities enable row level security;

-- Profielen: jezelf en mensen met wie je een project deelt
create policy "profiel lezen" on public.profiles for select to authenticated
  using (id = (select auth.uid()) or private.shares_project(id));
create policy "eigen profiel wijzigen" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Projecten (aanmaken via create_project)
create policy "project lezen" on public.projects for select to authenticated
  using (private.is_member(id));
create policy "project wijzigen" on public.projects for update to authenticated
  using (private.has_role(id, array['beheerder'])) with check (private.has_role(id, array['beheerder']));

-- Leden (toevoegen via accept_invitation / create_project)
create policy "leden lezen" on public.project_members for select to authenticated
  using (private.is_member(project_id));
create policy "rol wijzigen" on public.project_members for update to authenticated
  using (private.has_role(project_id, array['beheerder']) and user_id <> (select auth.uid()))
  with check (private.has_role(project_id, array['beheerder']) and user_id <> (select auth.uid()));
create policy "lid verwijderen" on public.project_members for delete to authenticated
  using (private.has_role(project_id, array['beheerder']) and user_id <> (select auth.uid()));

-- Doelgroepen en behoeften
create policy "doelgroepen lezen" on public.audiences for select to authenticated
  using (private.is_member(project_id));
create policy "doelgroepen toevoegen" on public.audiences for insert to authenticated
  with check (private.has_role(project_id, array['redacteur', 'begeleider', 'beheerder']) and private.project_open(project_id));
create policy "doelgroepen wijzigen" on public.audiences for update to authenticated
  using (private.has_role(project_id, array['redacteur', 'begeleider', 'beheerder']))
  with check (private.has_role(project_id, array['redacteur', 'begeleider', 'beheerder']));
create policy "doelgroepen verwijderen" on public.audiences for delete to authenticated
  using (private.has_role(project_id, array['beheerder']));

create policy "behoeften lezen" on public.needs for select to authenticated
  using (private.is_member(project_id));
create policy "behoeften toevoegen" on public.needs for insert to authenticated
  with check (private.has_role(project_id, array['redacteur', 'begeleider', 'beheerder']) and private.project_open(project_id));
create policy "behoeften wijzigen" on public.needs for update to authenticated
  using (private.has_role(project_id, array['redacteur', 'begeleider', 'beheerder']))
  with check (private.has_role(project_id, array['redacteur', 'begeleider', 'beheerder']));
create policy "behoeften verwijderen" on public.needs for delete to authenticated
  using (private.has_role(project_id, array['redacteur', 'begeleider', 'beheerder']));

-- Ideeën: wachtende ideeën alleen voor auteur en moderatoren
create policy "ideeen lezen" on public.ideas for select to authenticated
  using (private.is_member(project_id) and (
    not pending or author_id = (select auth.uid()) or private.has_role(project_id, array['redacteur', 'beheerder'])
  ));
create policy "ideeen toevoegen" on public.ideas for insert to authenticated
  with check (private.is_member(project_id) and private.project_open(project_id) and author_id = (select auth.uid()));
create policy "ideeen wijzigen" on public.ideas for update to authenticated
  using (private.is_member(project_id) and (
    author_id = (select auth.uid()) or private.has_role(project_id, array['redacteur', 'begeleider', 'beheerder'])
  ))
  with check (private.is_member(project_id));

-- Koppelingen bij ideeën: lezen als je het idee mag zien, wijzigen door auteur of conceptbeheerders
create policy "lezen" on public.idea_audiences for select to authenticated
  using (exists (select 1 from public.ideas i where i.id = idea_id));
create policy "toevoegen" on public.idea_audiences for insert to authenticated
  with check (exists (select 1 from public.ideas i where i.id = idea_id and (
    i.author_id = (select auth.uid()) or private.has_role(i.project_id, array['redacteur', 'begeleider', 'beheerder']))));
create policy "verwijderen" on public.idea_audiences for delete to authenticated
  using (exists (select 1 from public.ideas i where i.id = idea_id and (
    i.author_id = (select auth.uid()) or private.has_role(i.project_id, array['redacteur', 'begeleider', 'beheerder']))));

create policy "lezen" on public.idea_needs for select to authenticated
  using (exists (select 1 from public.ideas i where i.id = idea_id));
create policy "toevoegen" on public.idea_needs for insert to authenticated
  with check (exists (select 1 from public.ideas i where i.id = idea_id and (
    i.author_id = (select auth.uid()) or private.has_role(i.project_id, array['redacteur', 'begeleider', 'beheerder']))));
create policy "verwijderen" on public.idea_needs for delete to authenticated
  using (exists (select 1 from public.ideas i where i.id = idea_id and (
    i.author_id = (select auth.uid()) or private.has_role(i.project_id, array['redacteur', 'begeleider', 'beheerder']))));

create policy "lezen" on public.idea_relations for select to authenticated
  using (exists (select 1 from public.ideas i where i.id = idea_id));
create policy "toevoegen" on public.idea_relations for insert to authenticated
  with check (exists (select 1 from public.ideas i where i.id = idea_id and
    private.has_role(i.project_id, array['redacteur', 'begeleider', 'beheerder'])));
create policy "verwijderen" on public.idea_relations for delete to authenticated
  using (exists (select 1 from public.ideas i where i.id = idea_id and
    private.has_role(i.project_id, array['redacteur', 'begeleider', 'beheerder'])));

-- Bijdragen
create policy "bijdragen lezen" on public.contributions for select to authenticated
  using (private.is_member(project_id) and (
    (not hidden and not pending) or author_id = (select auth.uid()) or private.has_role(project_id, array['redacteur', 'beheerder'])
  ));
create policy "bijdragen toevoegen" on public.contributions for insert to authenticated
  with check (private.is_member(project_id) and author_id = (select auth.uid())
    and exists (select 1 from public.ideas i where i.id = idea_id));
create policy "bijdragen modereren" on public.contributions for update to authenticated
  using (private.has_role(project_id, array['redacteur', 'beheerder']))
  with check (private.has_role(project_id, array['redacteur', 'beheerder']));

-- Concepten en onderdelen: lezen voor leden, wijzigen voor conceptbeheerders
create policy "concepten lezen" on public.concepts for select to authenticated
  using (private.is_member(project_id));
create policy "concepten toevoegen" on public.concepts for insert to authenticated
  with check (private.has_role(project_id, array['redacteur', 'begeleider', 'beheerder']) and private.project_open(project_id));
create policy "concepten wijzigen" on public.concepts for update to authenticated
  using (private.has_role(project_id, array['redacteur', 'begeleider', 'beheerder']))
  with check (private.has_role(project_id, array['redacteur', 'begeleider', 'beheerder']));

create policy "lezen" on public.concept_ideas for select to authenticated
  using (exists (select 1 from public.concepts c where c.id = concept_id));
create policy "toevoegen" on public.concept_ideas for insert to authenticated
  with check (exists (select 1 from public.concepts c where c.id = concept_id and
    private.has_role(c.project_id, array['redacteur', 'begeleider', 'beheerder'])));
create policy "verwijderen" on public.concept_ideas for delete to authenticated
  using (exists (select 1 from public.concepts c where c.id = concept_id and
    private.has_role(c.project_id, array['redacteur', 'begeleider', 'beheerder'])));

create policy "lezen" on public.concept_audiences for select to authenticated
  using (exists (select 1 from public.concepts c where c.id = concept_id));
create policy "toevoegen" on public.concept_audiences for insert to authenticated
  with check (exists (select 1 from public.concepts c where c.id = concept_id and
    private.has_role(c.project_id, array['redacteur', 'begeleider', 'beheerder'])));
create policy "verwijderen" on public.concept_audiences for delete to authenticated
  using (exists (select 1 from public.concepts c where c.id = concept_id and
    private.has_role(c.project_id, array['redacteur', 'begeleider', 'beheerder'])));

create policy "lezen" on public.concept_needs for select to authenticated
  using (exists (select 1 from public.concepts c where c.id = concept_id));
create policy "toevoegen" on public.concept_needs for insert to authenticated
  with check (exists (select 1 from public.concepts c where c.id = concept_id and
    private.has_role(c.project_id, array['redacteur', 'begeleider', 'beheerder'])));
create policy "verwijderen" on public.concept_needs for delete to authenticated
  using (exists (select 1 from public.concepts c where c.id = concept_id and
    private.has_role(c.project_id, array['redacteur', 'begeleider', 'beheerder'])));

create policy "risicos lezen" on public.risks for select to authenticated
  using (private.is_member(project_id));
create policy "risicos toevoegen" on public.risks for insert to authenticated
  with check (private.has_role(project_id, array['redacteur', 'begeleider', 'beheerder']));
create policy "risicos verwijderen" on public.risks for delete to authenticated
  using (private.has_role(project_id, array['redacteur', 'begeleider', 'beheerder']));

create policy "onderzoek lezen" on public.research_items for select to authenticated
  using (private.is_member(project_id));
create policy "onderzoek toevoegen" on public.research_items for insert to authenticated
  with check (private.has_role(project_id, array['redacteur', 'begeleider', 'beheerder']));
create policy "onderzoek wijzigen" on public.research_items for update to authenticated
  using (private.has_role(project_id, array['redacteur', 'begeleider', 'beheerder']))
  with check (private.has_role(project_id, array['redacteur', 'begeleider', 'beheerder']));
create policy "onderzoek verwijderen" on public.research_items for delete to authenticated
  using (private.has_role(project_id, array['redacteur', 'begeleider', 'beheerder']));

-- Acties
create policy "acties lezen" on public.actions for select to authenticated
  using (private.is_member(project_id));
create policy "acties toevoegen" on public.actions for insert to authenticated
  with check (private.has_role(project_id, array['redacteur', 'begeleider', 'beheerder']));
create policy "acties wijzigen" on public.actions for update to authenticated
  using (private.has_role(project_id, array['redacteur', 'begeleider', 'beheerder']) or owner_id = (select auth.uid()))
  with check (private.is_member(project_id));
create policy "acties verwijderen" on public.actions for delete to authenticated
  using (private.has_role(project_id, array['redacteur', 'begeleider', 'beheerder']));

-- Sessies
create policy "sessies lezen" on public.sessions for select to authenticated
  using (private.is_member(project_id));
create policy "sessies plannen" on public.sessions for insert to authenticated
  with check (private.has_role(project_id, array['begeleider', 'beheerder']) and private.project_open(project_id));
create policy "sessies begeleiden" on public.sessions for update to authenticated
  using (private.can_facilitate(id)) with check (private.has_role(project_id, array['begeleider', 'beheerder']));

create policy "deelnemers lezen" on public.session_participants for select to authenticated
  using (private.is_member(project_id));
create policy "zelf deelnemen" on public.session_participants for insert to authenticated
  with check (user_id = (select auth.uid()) and private.is_member(project_id));

create policy "antwoorden lezen" on public.session_answers for select to authenticated
  using (private.is_member(project_id) and (
    not hidden or author_id = (select auth.uid()) or private.can_facilitate(session_id)
  ));
create policy "antwoord geven" on public.session_answers for insert to authenticated
  with check (private.is_member(project_id) and author_id = (select auth.uid()));
create policy "antwoorden modereren" on public.session_answers for update to authenticated
  using (private.can_facilitate(session_id)) with check (private.can_facilitate(session_id));

create policy "stemmen lezen" on public.session_votes for select to authenticated
  using (private.is_member(project_id));
create policy "stemmen" on public.session_votes for insert to authenticated
  with check (user_id = (select auth.uid()) and private.is_member(project_id));
create policy "stem intrekken" on public.session_votes for delete to authenticated
  using (user_id = (select auth.uid()));

-- Uitnodigingen
create policy "uitnodigingen lezen" on public.invitations for select to authenticated
  using (private.has_role(project_id, array['begeleider', 'beheerder']));
create policy "uitnodigen" on public.invitations for insert to authenticated
  with check (private.has_role(project_id, array['begeleider', 'beheerder']) and private.project_open(project_id));
create policy "uitnodiging intrekken" on public.invitations for update to authenticated
  using (private.has_role(project_id, array['beheerder']) or created_by = (select auth.uid()))
  with check (private.has_role(project_id, array['begeleider', 'beheerder']));

-- Activiteit (alleen via triggers geschreven)
create policy "activiteit lezen" on public.activities for select to authenticated
  using (private.is_member(project_id));

-- Anoniem: geen rechten op tabellen
revoke all on all tables in schema public from anon;

