-- De Kansenmaker — stap 3: koppelingen en selectie
-- 1. Sessie-antwoord kan worden omgezet in een idee (verwijzing blijft bewaard).
-- 2. Gerelateerde ideeën worden symmetrisch opgeslagen (kleinste id eerst), zodat A↔B maar één keer bestaat.

alter table public.session_answers
  add column idea_id uuid references public.ideas (id) on delete set null;
create index session_answers_idea_idx on public.session_answers (idea_id);

-- Bij wijzigen mogen alleen 'verborgen' en 'omgezet naar idee' veranderen; het idee moet in hetzelfde project liggen.
create or replace function private.guard_session_answer()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_session public.sessions;
begin
  if (select auth.uid()) is null then
    return new;
  end if;
  if tg_op = 'INSERT' then
    select * into v_session from public.sessions where id = new.session_id;
    if v_session.state <> 'actief' then
      raise exception 'Deze sessie is niet actief' using errcode = 'check_violation';
    end if;
    if new.round <> v_session.active_round then
      raise exception 'Deze ronde is niet meer actief' using errcode = 'check_violation';
    end if;
    new.author_id := (select auth.uid());
    new.hidden := false;
    new.idea_id := null;
    new.created_at := now();
    return new;
  end if;
  new.session_id := old.session_id;
  new.round := old.round;
  new.author_id := old.author_id;
  new.text := old.text;
  new.created_at := old.created_at;
  if new.idea_id is distinct from old.idea_id and new.idea_id is not null and not exists (
    select 1 from public.ideas i where i.id = new.idea_id and i.project_id = old.project_id
  ) then
    raise exception 'Idee hoort niet bij dit project' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

-- Gerelateerde ideeën: altijd (kleinste, grootste) opslaan
create or replace function private.normalize_relation()
returns trigger language plpgsql set search_path = '' as $$
declare
  v_tmp uuid;
begin
  if new.idea_id > new.related_idea_id then
    v_tmp := new.idea_id;
    new.idea_id := new.related_idea_id;
    new.related_idea_id := v_tmp;
  end if;
  return new;
end;
$$;

-- Naam begint met 'a_' zodat deze trigger vóór 'same_project' draait (triggers lopen alfabetisch)
create trigger a_normalize_relation before insert on public.idea_relations
  for each row execute function private.normalize_relation();

-- Koppelen en ontkoppelen van gerelateerde ideeën: de auteur van één van beide ideeën of een conceptbeheerder
alter policy "toevoegen" on public.idea_relations
  with check (exists (
    select 1 from public.ideas i where i.id in (idea_id, related_idea_id) and (
      i.author_id = (select auth.uid()) or private.has_role(i.project_id, array['redacteur', 'begeleider', 'beheerder']))
  ));
alter policy "verwijderen" on public.idea_relations
  using (exists (
    select 1 from public.ideas i where i.id in (idea_id, related_idea_id) and (
      i.author_id = (select auth.uid()) or private.has_role(i.project_id, array['redacteur', 'begeleider', 'beheerder']))
  ));
