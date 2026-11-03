-- De Kansenmaker — helperfuncties en triggers (stap 2)
--
-- Rechtenmatrix (functioneel ontwerp §5), altijd per project:
--   deelnemer  : ideeën toevoegen, eigen ideeën wijzigen, aanvullen/reageren, meedoen in sessies
--   redacteur  : + bijdragen modereren, concepten/doelgroepen beheren
--   begeleider : + concepten/doelgroepen beheren, sessies begeleiden, deelnemers uitnodigen
--   beheerder  : alles, incl. instellingen, rollen, klaar voor proef bevestigen
--
-- Helperfuncties staan in schema private (niet via de API bereikbaar).

create schema if not exists private;
grant usage on schema private to authenticated, anon;

-- ---------------------------------------------------------------------------
-- Helperfuncties
-- ---------------------------------------------------------------------------
create or replace function private.is_member(p_project uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.project_members m
    where m.project_id = p_project and m.user_id = (select auth.uid())
  );
$$;

create or replace function private.has_role(p_project uuid, p_roles text[])
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.project_members m
    where m.project_id = p_project and m.user_id = (select auth.uid()) and m.role = any (p_roles)
  );
$$;

create or replace function private.my_role(p_project uuid)
returns text language sql stable security definer set search_path = '' as $$
  select m.role from public.project_members m
  where m.project_id = p_project and m.user_id = (select auth.uid());
$$;

create or replace function private.shares_project(p_user uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.project_members a
    join public.project_members b on b.project_id = a.project_id
    where a.user_id = (select auth.uid()) and b.user_id = p_user
  );
$$;

create or replace function private.project_open(p_project uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.projects p where p.id = p_project and not p.archived);
$$;

-- Mag de huidige gebruiker deze sessie begeleiden? (beheerder, of begeleider die facilitator is)
create or replace function private.can_facilitate(p_session uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.sessions s
    join public.project_members m on m.project_id = s.project_id and m.user_id = (select auth.uid())
    where s.id = p_session
      and (m.role = 'beheerder' or (m.role = 'begeleider' and s.facilitator_id = (select auth.uid())))
  );
$$;

create or replace function private.display_name(p_user uuid)
returns text language sql stable security definer set search_path = '' as $$
  select coalesce(nullif(trim(p.full_name), ''), split_part(p.email, '@', 1), 'Iemand')
  from public.profiles p where p.id = p_user;
$$;

grant execute on all functions in schema private to authenticated;

-- ---------------------------------------------------------------------------
-- Profielen: automatisch aanmaken bij registratie; e-mail niet zelf wijzigbaar
-- ---------------------------------------------------------------------------
create or replace function private.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, coalesce(new.email, ''), coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

create or replace function private.sync_user_email()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.profiles set email = coalesce(new.email, email) where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row execute function private.sync_user_email();

create or replace function private.guard_profile_update()
returns trigger language plpgsql set search_path = '' as $$
begin
  if (select auth.uid()) is not null then
    new.id := old.id;
    new.email := old.email;
    new.created_at := old.created_at;
  end if;
  return new;
end;
$$;

create trigger guard_profile_update before update on public.profiles
  for each row execute function private.guard_profile_update();

-- ---------------------------------------------------------------------------
-- Consistentie: project_id altijd van de ouder overnemen
-- (TG_ARGV[0] = oudertabel, TG_ARGV[1] = kolom met ouder-id)
-- ---------------------------------------------------------------------------
create or replace function private.inherit_project()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_project uuid;
begin
  execute format('select project_id from public.%I where id = $1', tg_argv[0])
    into v_project using (to_jsonb(new) ->> tg_argv[1])::uuid;
  if v_project is null then
    raise exception 'Onderdeel niet gevonden' using errcode = 'foreign_key_violation';
  end if;
  new.project_id := v_project;
  return new;
end;
$$;

create trigger inherit_project before insert or update on public.needs
  for each row execute function private.inherit_project('audiences', 'audience_id');
create trigger inherit_project before insert or update on public.contributions
  for each row execute function private.inherit_project('ideas', 'idea_id');
create trigger inherit_project before insert or update on public.risks
  for each row execute function private.inherit_project('concepts', 'concept_id');
create trigger inherit_project before insert or update on public.research_items
  for each row execute function private.inherit_project('concepts', 'concept_id');
create trigger inherit_project before insert or update on public.session_participants
  for each row execute function private.inherit_project('sessions', 'session_id');
create trigger inherit_project before insert or update on public.session_answers
  for each row execute function private.inherit_project('sessions', 'session_id');

-- Koppeltabellen: beide kanten moeten in hetzelfde project liggen
create or replace function private.check_same_project()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_a uuid;
  v_b uuid;
begin
  execute format('select project_id from public.%I where id = $1', tg_argv[0])
    into v_a using (to_jsonb(new) ->> tg_argv[1])::uuid;
  execute format('select project_id from public.%I where id = $1', tg_argv[2])
    into v_b using (to_jsonb(new) ->> tg_argv[3])::uuid;
  if v_a is null or v_b is null or v_a <> v_b then
    raise exception 'Koppelen tussen verschillende projecten is niet toegestaan' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger same_project before insert on public.idea_audiences
  for each row execute function private.check_same_project('ideas', 'idea_id', 'audiences', 'audience_id');
create trigger same_project before insert on public.idea_needs
  for each row execute function private.check_same_project('ideas', 'idea_id', 'needs', 'need_id');
create trigger same_project before insert on public.idea_relations
  for each row execute function private.check_same_project('ideas', 'idea_id', 'ideas', 'related_idea_id');
create trigger same_project before insert on public.concept_ideas
  for each row execute function private.check_same_project('concepts', 'concept_id', 'ideas', 'idea_id');
create trigger same_project before insert on public.concept_audiences
  for each row execute function private.check_same_project('concepts', 'concept_id', 'audiences', 'audience_id');
create trigger same_project before insert on public.concept_needs
  for each row execute function private.check_same_project('concepts', 'concept_id', 'needs', 'need_id');

-- Acties: project volgt het concept of de sessie
create or replace function private.guard_action()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_project uuid;
  v_manager boolean;
begin
  if new.concept_id is not null then
    select project_id into v_project from public.concepts where id = new.concept_id;
  else
    select project_id into v_project from public.sessions where id = new.session_id;
  end if;
  if v_project is null then
    raise exception 'Concept of sessie niet gevonden' using errcode = 'foreign_key_violation';
  end if;
  if new.owner_id is not null and not exists (
    select 1 from public.project_members where project_id = v_project and user_id = new.owner_id
  ) then
    raise exception 'De verantwoordelijke is geen lid van dit project' using errcode = 'check_violation';
  end if;
  new.project_id := v_project;
  if tg_op = 'UPDATE' and (select auth.uid()) is not null then
    v_manager := private.has_role(v_project, array['redacteur', 'begeleider', 'beheerder']);
    if not v_manager then
      -- De verantwoordelijke zelf mag alleen de status wijzigen
      if new.description <> old.description or new.owner_id is distinct from old.owner_id
         or new.deadline is distinct from old.deadline then
        raise exception 'Je mag alleen de status van je eigen actie wijzigen' using errcode = 'insufficient_privilege';
      end if;
    end if;
  end if;
  return new;
end;
$$;

create trigger guard_action before insert or update on public.actions
  for each row execute function private.guard_action();

-- ---------------------------------------------------------------------------
-- Guards op ideeën en bijdragen
-- ---------------------------------------------------------------------------
create or replace function private.guard_idea()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_role text;
  v_project public.projects;
begin
  if v_uid is null then
    return new; -- service/beheer via SQL
  end if;
  if tg_op = 'INSERT' then
    select * into v_project from public.projects where id = new.project_id;
    new.author_id := v_uid;
    new.status := 'nieuw';
    new.archived := false;
    new.pending := v_project.require_approval or not v_project.ideas_visible_immediately;
    new.created_at := now();
    new.updated_at := now();
    return new;
  end if;

  v_role := coalesce(private.my_role(old.project_id), '');
  new.project_id := old.project_id;
  new.author_id := old.author_id;
  new.created_at := old.created_at;
  new.updated_at := now();

  if new.pending is distinct from old.pending and v_role not in ('redacteur', 'beheerder') then
    raise exception 'Alleen een redacteur of beheerder kan ideeën goedkeuren' using errcode = 'insufficient_privilege';
  end if;
  if new.status is distinct from old.status and v_role not in ('redacteur', 'begeleider', 'beheerder') then
    raise exception 'Je mag de status van een idee niet wijzigen' using errcode = 'insufficient_privilege';
  end if;
  if (new.title, new.description, new.problem, new.archived) is distinct from (old.title, old.description, old.problem, old.archived)
     and old.author_id is distinct from v_uid and v_role not in ('redacteur', 'beheerder') then
    raise exception 'Je mag alleen je eigen ideeën wijzigen' using errcode = 'insufficient_privilege';
  end if;
  return new;
end;
$$;

create trigger guard_idea before insert or update on public.ideas
  for each row execute function private.guard_idea();

create or replace function private.guard_contribution()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_project public.projects;
  v_idea public.ideas;
begin
  if v_uid is null then
    return new;
  end if;
  if tg_op = 'INSERT' then
    select * into v_idea from public.ideas where id = new.idea_id;
    select * into v_project from public.projects where id = v_idea.project_id;
    if not v_project.allow_comments then
      raise exception 'Reageren is in dit project uitgeschakeld' using errcode = 'check_violation';
    end if;
    if v_idea.archived or v_project.archived then
      raise exception 'Je kunt geen bijdragen meer toevoegen' using errcode = 'check_violation';
    end if;
    new.author_id := v_uid;
    new.hidden := false;
    new.pending := v_project.require_approval;
    new.created_at := now();
    return new;
  end if;
  -- Bij wijzigen mogen alleen 'verborgen' en 'wacht op goedkeuring' veranderen
  new.idea_id := old.idea_id;
  new.author_id := old.author_id;
  new.kind := old.kind;
  new.text := old.text;
  new.created_at := old.created_at;
  return new;
end;
$$;

create trigger guard_contribution before insert or update on public.contributions
  for each row execute function private.guard_contribution();

-- ---------------------------------------------------------------------------
-- Guards op concepten: 'klaar voor proef' en verantwoordelijke alleen door beheerder
-- ---------------------------------------------------------------------------
create or replace function private.guard_concept()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.owner_id := coalesce(new.owner_id, v_uid);
    if new.status = 'klaar-voor-proef' then
      new.status := 'nieuw';
    end if;
    new.ready_confirmed_by := null;
    new.ready_confirmed_at := null;
    return new;
  end if;

  new.project_id := old.project_id;
  new.created_at := old.created_at;

  if new.status = 'klaar-voor-proef' and old.status <> 'klaar-voor-proef' then
    if not private.has_role(old.project_id, array['beheerder']) then
      raise exception 'Alleen een beheerder kan bevestigen dat een concept klaar is voor een proef'
        using errcode = 'insufficient_privilege';
    end if;
    new.ready_confirmed_by := v_uid;
    new.ready_confirmed_at := now();
  elsif new.status <> 'klaar-voor-proef' then
    new.ready_confirmed_by := null;
    new.ready_confirmed_at := null;
  else
    new.ready_confirmed_by := old.ready_confirmed_by;
    new.ready_confirmed_at := old.ready_confirmed_at;
  end if;

  if new.owner_id is distinct from old.owner_id then
    if not private.has_role(old.project_id, array['beheerder']) then
      raise exception 'Alleen een beheerder kan de verantwoordelijke wijzigen' using errcode = 'insufficient_privilege';
    end if;
    if new.owner_id is not null and not exists (
      select 1 from public.project_members where project_id = old.project_id and user_id = new.owner_id
    ) then
      raise exception 'De verantwoordelijke is geen lid van dit project' using errcode = 'check_violation';
    end if;
  end if;
  return new;
end;
$$;

create trigger guard_concept before insert or update on public.concepts
  for each row execute function private.guard_concept();

-- ---------------------------------------------------------------------------
-- Leden: er blijft altijd minstens één beheerder
-- ---------------------------------------------------------------------------
create or replace function private.guard_last_admin()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  -- Beheer via SQL/service (bijv. account verwijderen) wordt niet geblokkeerd
  if (select auth.uid()) is null then
    return coalesce(new, old);
  end if;
  if old.role = 'beheerder' and (tg_op = 'DELETE' or new.role <> 'beheerder') then
    if (select count(*) from public.project_members where project_id = old.project_id and role = 'beheerder') <= 1 then
      raise exception 'Een project heeft minstens één beheerder nodig' using errcode = 'check_violation';
    end if;
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  new.project_id := old.project_id;
  new.user_id := old.user_id;
  return new;
end;
$$;

create trigger guard_last_admin before update or delete on public.project_members
  for each row execute function private.guard_last_admin();

-- ---------------------------------------------------------------------------
-- Sessies, antwoorden en stemmen
-- ---------------------------------------------------------------------------
create or replace function private.guard_session()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.facilitator_id := coalesce(new.facilitator_id, (select auth.uid()));
    new.state := 'gepland';
    new.active_round := 1;
    if new.starts_at < now() - interval '1 day' then
      raise exception 'De datum ligt in het verleden' using errcode = 'check_violation';
    end if;
    return new;
  end if;
  new.project_id := old.project_id;
  if old.state = 'afgesloten' and new.state <> 'afgesloten' then
    raise exception 'Een afgesloten sessie kan niet opnieuw worden geopend' using errcode = 'check_violation';
  end if;
  if new.facilitator_id is distinct from old.facilitator_id
     and not private.has_role(old.project_id, array['beheerder']) then
    raise exception 'Alleen een beheerder kan de begeleider wijzigen' using errcode = 'insufficient_privilege';
  end if;
  return new;
end;
$$;

create trigger guard_session before insert or update on public.sessions
  for each row execute function private.guard_session();

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
    new.created_at := now();
    return new;
  end if;
  -- Alleen 'verborgen' mag wijzigen
  new.session_id := old.session_id;
  new.round := old.round;
  new.author_id := old.author_id;
  new.text := old.text;
  new.created_at := old.created_at;
  return new;
end;
$$;

create trigger guard_session_answer before insert or update on public.session_answers
  for each row execute function private.guard_session_answer();

create or replace function private.guard_vote()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_answer public.session_answers;
  v_session public.sessions;
  v_allow boolean;
begin
  select * into v_answer from public.session_answers where id = new.answer_id;
  if v_answer.id is null then
    raise exception 'Antwoord niet gevonden' using errcode = 'foreign_key_violation';
  end if;
  select * into v_session from public.sessions where id = v_answer.session_id;
  select allow_voting into v_allow from public.projects where id = v_session.project_id;
  new.session_id := v_session.id;
  new.project_id := v_session.project_id;
  new.user_id := coalesce((select auth.uid()), new.user_id);
  if not v_allow then
    raise exception 'Stemmen is in dit project uitgeschakeld' using errcode = 'check_violation';
  end if;
  if v_session.state <> 'actief' or v_session.active_round <> 6 then
    raise exception 'Stemmen kan alleen in de stemronde' using errcode = 'check_violation';
  end if;
  if v_answer.round not in (3, 4) or v_answer.hidden then
    raise exception 'Op dit antwoord kun je niet stemmen' using errcode = 'check_violation';
  end if;
  if (select count(*) from public.session_votes where session_id = v_session.id and user_id = new.user_id) >= 3 then
    raise exception 'Je hebt al je 3 stemmen gebruikt' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger guard_vote before insert on public.session_votes
  for each row execute function private.guard_vote();

-- ---------------------------------------------------------------------------
-- Uitnodigingen
-- ---------------------------------------------------------------------------
create or replace function private.guard_invitation()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_role text;
  v_revoked boolean;
begin
  if (select auth.uid()) is null then
    return new;
  end if;
  if tg_op = 'INSERT' then
    v_role := coalesce(private.my_role(new.project_id), '');
    new.created_by := (select auth.uid());
    new.revoked := false;
    new.accepted_by := null;
    new.accepted_at := null;
    new.email := nullif(lower(trim(new.email)), '');
    if new.expires_at <= now() then
      raise exception 'De vervaldatum moet in de toekomst liggen' using errcode = 'check_violation';
    end if;
    if v_role = 'begeleider' then
      if new.role <> 'deelnemer' then
        raise exception 'Begeleiders kunnen alleen deelnemers uitnodigen' using errcode = 'insufficient_privilege';
      end if;
      if new.session_id is not null and not private.can_facilitate(new.session_id) then
        raise exception 'Je kunt alleen uitnodigen voor je eigen sessies' using errcode = 'insufficient_privilege';
      end if;
    end if;
    if new.session_id is not null and not exists (
      select 1 from public.sessions where id = new.session_id and project_id = new.project_id
    ) then
      raise exception 'Sessie hoort niet bij dit project' using errcode = 'check_violation';
    end if;
    return new;
  end if;
  if coalesce(current_setting('kansenmaker.accepting', true), '') = 'on' then
    return new;
  end if;
  v_revoked := new.revoked;
  new := old;
  new.revoked := v_revoked or old.revoked; -- intrekken is definitief
  return new;
end;
$$;

create trigger guard_invitation before insert or update on public.invitations
  for each row execute function private.guard_invitation();

-- ---------------------------------------------------------------------------
-- Overige 'aangemaakt door'-velden
-- ---------------------------------------------------------------------------
create or replace function private.set_created_by()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is not null then
    new.created_by := (select auth.uid());
  end if;
  return new;
end;
$$;

create trigger set_created_by before insert on public.audiences
  for each row execute function private.set_created_by();

create or replace function private.set_participant_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is not null then
    new.user_id := (select auth.uid());
  end if;
  return new;
end;
$$;

create trigger set_participant_user before insert on public.session_participants
  for each row execute function private.set_participant_user();

-- ---------------------------------------------------------------------------
-- Activiteit
-- ---------------------------------------------------------------------------
create or replace function private.log_activity(p_project uuid, p_text text, p_href text)
returns void language sql security definer set search_path = '' as $$
  insert into public.activities (project_id, actor_id, text, href)
  values (p_project, (select auth.uid()), p_text, p_href);
$$;

create or replace function private.activity_idea()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (tg_op = 'INSERT' and not new.pending) or (tg_op = 'UPDATE' and old.pending and not new.pending) then
    perform private.log_activity(new.project_id,
      format('%s deelde het idee ‘%s’', coalesce(private.display_name(new.author_id), 'Iemand'), new.title),
      '/ideeen/' || new.id);
  end if;
  return new;
end;
$$;

create trigger activity_idea after insert or update of pending on public.ideas
  for each row execute function private.activity_idea();

create or replace function private.activity_contribution()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not new.pending then
    perform private.log_activity(new.project_id,
      format('%s gaf een %s op ‘%s’', coalesce(private.display_name(new.author_id), 'Iemand'), new.kind,
        (select title from public.ideas where id = new.idea_id)),
      '/ideeen/' || new.idea_id);
  end if;
  return new;
end;
$$;

create trigger activity_contribution after insert on public.contributions
  for each row execute function private.activity_contribution();

create or replace function private.activity_concept()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    perform private.log_activity(new.project_id,
      format('%s maakte het concept ‘%s’', coalesce(private.display_name((select auth.uid())), 'Iemand'), new.name),
      '/concepten/' || new.id);
  elsif new.status = 'klaar-voor-proef' and old.status <> 'klaar-voor-proef' then
    perform private.log_activity(new.project_id,
      format('Concept ‘%s’ is klaar voor proef', new.name), '/concepten/' || new.id);
  end if;
  return new;
end;
$$;

create trigger activity_concept after insert or update of status on public.concepts
  for each row execute function private.activity_concept();

create or replace function private.activity_session()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform private.log_activity(new.project_id, format('Werksessie ‘%s’ gepland', new.title), '/sessies/' || new.id);
  return new;
end;
$$;

create trigger activity_session after insert on public.sessions
  for each row execute function private.activity_session();

