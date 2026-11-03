-- De Kansenmaker — deelnemen met alleen een link (gasten, zonder account).
--
-- Gasten hebben GEEN leesrechten op tabellen. Ze werken uitsluitend via de SECURITY DEFINER-functies
-- hieronder, die steeds controleren:
--   * het geheime token van een geldige uitnodiging (niet ingetrokken, niet verlopen, project niet gearchiveerd);
--   * voor sessies: een gastsleutel die bij aanmelden is uitgegeven (alleen de hash wordt bewaard).
-- Ideeën van gasten wachten altijd op goedkeuring door een redacteur of beheerder.

-- Doel van een linkuitnodiging: lid worden/deelnemen (standaard) of ideeën insturen zonder account
alter table public.invitations
  add column purpose text not null default 'deelname' check (purpose in ('deelname', 'inzending'));

create table public.guests (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  session_id uuid references public.sessions (id) on delete cascade,
  invitation_id uuid references public.invitations (id) on delete set null,
  name text not null check (char_length(trim(name)) between 1 and 60),
  key_hash text not null,
  created_at timestamptz not null default now()
);
create index guests_session_idx on public.guests (session_id);
create index guests_project_idx on public.guests (project_id);
alter table public.guests enable row level security;
create policy "gasten lezen" on public.guests for select to authenticated using (private.is_member(project_id));

alter table public.session_answers add column guest_id uuid references public.guests (id) on delete set null;
alter table public.ideas add column guest_name text check (guest_name is null or char_length(trim(guest_name)) between 1 and 60);

create table public.session_guest_votes (
  answer_id uuid not null references public.session_answers (id) on delete cascade,
  guest_id uuid not null references public.guests (id) on delete cascade,
  session_id uuid not null references public.sessions (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (answer_id, guest_id)
);
create index session_guest_votes_session_idx on public.session_guest_votes (session_id, guest_id);
create index session_guest_votes_project_idx on public.session_guest_votes (project_id);
alter table public.session_guest_votes enable row level security;
create policy "gaststemmen lezen" on public.session_guest_votes for select to authenticated using (private.is_member(project_id));

alter publication supabase_realtime add table public.session_guest_votes;

-- Ideeën met een gastnaam (alleen via guest_submit_idea): nooit een auteur, altijd eerst goedkeuren
create or replace function private.guard_idea()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_role text;
  v_project public.projects;
begin
  if tg_op = 'INSERT' and new.guest_name is not null then
    new.author_id := null;
    new.pending := true;
    new.status := 'nieuw';
    new.archived := false;
    new.created_at := now();
    new.updated_at := now();
    return new;
  end if;
  if v_uid is null then
    return new;
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
  new.guest_name := old.guest_name;
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

-- Sessieantwoord van een gast: geen auteur-account (ook niet als een ingelogde gebruiker de gastfunctie gebruikt)
create or replace function private.guard_session_answer()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_session public.sessions;
begin
  if tg_op = 'INSERT' and new.guest_id is not null then
    new.author_id := null;
    new.hidden := false;
    new.idea_id := null;
    new.created_at := now();
    return new;
  end if;
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
    new.guest_id := null;
    new.hidden := false;
    new.idea_id := null;
    new.created_at := now();
    return new;
  end if;
  new.session_id := old.session_id;
  new.round := old.round;
  new.author_id := old.author_id;
  new.guest_id := old.guest_id;
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

-- Activiteit: idee van een gast noemt de gastnaam
create or replace function private.activity_idea()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (tg_op = 'INSERT' and not new.pending) or (tg_op = 'UPDATE' and old.pending and not new.pending) then
    perform private.log_activity(new.project_id,
      format('%s deelde het idee ‘%s’',
        coalesce(private.display_name(new.author_id), new.guest_name || ' (gast)', 'Iemand'), new.title),
      '/ideeen/' || new.id);
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Interne hulpfuncties
-- ---------------------------------------------------------------------------
create or replace function private.valid_invitation(p_token uuid, p_purpose text)
returns public.invitations language plpgsql stable security definer set search_path = '' as $$
declare
  v_inv public.invitations;
begin
  select * into v_inv from public.invitations where token = p_token;
  if v_inv.id is null or v_inv.kind <> 'link' or v_inv.purpose <> p_purpose then
    raise exception 'Deze link bestaat niet' using errcode = 'no_data_found';
  end if;
  if v_inv.revoked then
    raise exception 'Deze link is ingetrokken' using errcode = 'check_violation';
  end if;
  if v_inv.expires_at <= now() then
    raise exception 'Deze link is verlopen' using errcode = 'check_violation';
  end if;
  if exists (select 1 from public.projects p where p.id = v_inv.project_id and p.archived) then
    raise exception 'Dit project is gearchiveerd' using errcode = 'check_violation';
  end if;
  return v_inv;
end;
$$;

create or replace function private.guest_for(p_token uuid, p_key text)
returns public.guests language plpgsql stable security definer set search_path = '' as $$
declare
  v_inv public.invitations;
  v_guest public.guests;
begin
  v_inv := private.valid_invitation(p_token, 'deelname');
  if v_inv.session_id is null then
    raise exception 'Deze link hoort niet bij een werksessie' using errcode = 'check_violation';
  end if;
  select * into v_guest from public.guests
  where session_id = v_inv.session_id
    and key_hash = encode(extensions.digest(coalesce(p_key, ''), 'sha256'), 'hex');
  if v_guest.id is null then
    raise exception 'Meld je eerst aan met je naam' using errcode = 'insufficient_privilege';
  end if;
  return v_guest;
end;
$$;

-- ---------------------------------------------------------------------------
-- Werksessie als gast
-- ---------------------------------------------------------------------------

-- Aanmelden met een naam; geeft een geheime gastsleutel terug (alleen eenmalig zichtbaar)
create or replace function public.guest_join_session(p_token uuid, p_name text)
returns table (guest_id uuid, guest_key text)
language plpgsql security definer set search_path = '' as $$
declare
  v_inv public.invitations;
  v_key text := encode(extensions.gen_random_bytes(24), 'hex');
  v_id uuid;
begin
  v_inv := private.valid_invitation(p_token, 'deelname');
  if v_inv.session_id is null then
    raise exception 'Deze link hoort niet bij een werksessie' using errcode = 'check_violation';
  end if;
  if exists (select 1 from public.sessions s where s.id = v_inv.session_id and s.state = 'afgesloten') then
    raise exception 'Deze sessie is afgesloten' using errcode = 'check_violation';
  end if;
  if (select count(*) from public.guests g where g.session_id = v_inv.session_id) >= 300 then
    raise exception 'Deze sessie zit vol' using errcode = 'check_violation';
  end if;
  insert into public.guests (project_id, session_id, invitation_id, name, key_hash)
  values (v_inv.project_id, v_inv.session_id, v_inv.id, trim(p_name), encode(extensions.digest(v_key, 'sha256'), 'hex'))
  returning id into v_id;
  return query select v_id, v_key;
end;
$$;

-- Wat ziet de gast? Alleen de actieve opdracht, eigen antwoorden en (in de stemronde) de stemopties.
create or replace function public.guest_session_state(p_token uuid, p_key text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_inv public.invitations;
  v_guest public.guests;
  v_session public.sessions;
  v_allow boolean;
  v_project text;
begin
  v_inv := private.valid_invitation(p_token, 'deelname');
  select * into v_session from public.sessions where id = v_inv.session_id;
  if v_session.id is null then
    raise exception 'Deze link hoort niet bij een werksessie' using errcode = 'check_violation';
  end if;
  select name, allow_voting into v_project, v_allow from public.projects where id = v_session.project_id;
  if p_key is not null then
    begin
      v_guest := private.guest_for(p_token, p_key);
    exception when insufficient_privilege then
      v_guest := null;
    end;
  end if;
  return jsonb_build_object(
    'project_name', v_project,
    'session', jsonb_build_object('title', v_session.title, 'state', v_session.state, 'active_round', v_session.active_round),
    'allow_voting', v_allow,
    'guest', case when v_guest.id is null then null else jsonb_build_object('id', v_guest.id, 'name', v_guest.name) end,
    'my_answers', coalesce((
      select jsonb_agg(jsonb_build_object('id', a.id, 'round', a.round, 'text', a.text, 'hidden', a.hidden) order by a.created_at)
      from public.session_answers a where v_guest.id is not null and a.guest_id = v_guest.id
    ), '[]'::jsonb),
    'votable', case when v_session.state = 'actief' and v_session.active_round = 6 then coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', a.id, 'text', a.text,
        'mine', exists (select 1 from public.session_guest_votes v where v.answer_id = a.id and v.guest_id = v_guest.id)
      ) order by a.created_at)
      from public.session_answers a
      where a.session_id = v_session.id and a.round in (3, 4) and not a.hidden
    ), '[]'::jsonb) else '[]'::jsonb end
  );
end;
$$;

create or replace function public.guest_submit_answer(p_token uuid, p_key text, p_text text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_guest public.guests;
  v_session public.sessions;
  v_id uuid;
begin
  v_guest := private.guest_for(p_token, p_key);
  select * into v_session from public.sessions where id = v_guest.session_id;
  if v_session.state <> 'actief' then
    raise exception 'Deze sessie is niet actief' using errcode = 'check_violation';
  end if;
  if v_session.active_round = 6 then
    raise exception 'In de stemronde geef je geen antwoorden' using errcode = 'check_violation';
  end if;
  if (select count(*) from public.session_answers a where a.guest_id = v_guest.id) >= 60 then
    raise exception 'Je hebt het maximum aantal bijdragen bereikt' using errcode = 'check_violation';
  end if;
  insert into public.session_answers (project_id, session_id, round, author_id, guest_id, text)
  values (v_session.project_id, v_session.id, v_session.active_round, null, v_guest.id, trim(p_text))
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.guest_toggle_vote(p_token uuid, p_key text, p_answer uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  v_guest public.guests;
  v_session public.sessions;
  v_answer public.session_answers;
begin
  v_guest := private.guest_for(p_token, p_key);
  select * into v_session from public.sessions where id = v_guest.session_id;
  select * into v_answer from public.session_answers where id = p_answer and session_id = v_session.id;
  if v_answer.id is null then
    raise exception 'Op dit antwoord kun je niet stemmen' using errcode = 'check_violation';
  end if;
  if exists (select 1 from public.session_guest_votes where answer_id = p_answer and guest_id = v_guest.id) then
    delete from public.session_guest_votes where answer_id = p_answer and guest_id = v_guest.id;
    return false;
  end if;
  if not (select allow_voting from public.projects where id = v_session.project_id) then
    raise exception 'Stemmen is in dit project uitgeschakeld' using errcode = 'check_violation';
  end if;
  if v_session.state <> 'actief' or v_session.active_round <> 6 then
    raise exception 'Stemmen kan alleen in de stemronde' using errcode = 'check_violation';
  end if;
  if v_answer.round not in (3, 4) or v_answer.hidden then
    raise exception 'Op dit antwoord kun je niet stemmen' using errcode = 'check_violation';
  end if;
  if (select count(*) from public.session_guest_votes where session_id = v_session.id and guest_id = v_guest.id) >= 3 then
    raise exception 'Je hebt al je 3 stemmen gebruikt' using errcode = 'check_violation';
  end if;
  insert into public.session_guest_votes (answer_id, guest_id, session_id, project_id)
  values (p_answer, v_guest.id, v_session.id, v_session.project_id);
  return true;
end;
$$;

-- ---------------------------------------------------------------------------
-- Idee insturen via een inzendlink
-- ---------------------------------------------------------------------------
create or replace function public.submission_preview(p_token uuid)
returns table (project_name text, valid boolean, reason text)
language plpgsql stable security definer set search_path = '' as $$
declare
  v_inv public.invitations;
begin
  begin
    v_inv := private.valid_invitation(p_token, 'inzending');
  exception when others then
    return query select null::text, false, sqlerrm;
    return;
  end;
  return query select p.name, true, null::text from public.projects p where p.id = v_inv.project_id;
end;
$$;

create or replace function public.guest_submit_idea(p_token uuid, p_name text, p_title text, p_description text, p_problem text default null)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  v_inv public.invitations;
begin
  v_inv := private.valid_invitation(p_token, 'inzending');
  if (select count(*) from public.ideas i where i.project_id = v_inv.project_id and i.guest_name is not null
      and i.created_at > now() - interval '1 hour') >= 100 then
    raise exception 'Er zijn net heel veel ideeën ingestuurd. Probeer het later opnieuw.' using errcode = 'check_violation';
  end if;
  insert into public.ideas (project_id, title, description, problem, author_id, guest_name, pending)
  values (v_inv.project_id, trim(p_title), trim(p_description), nullif(trim(coalesce(p_problem, '')), ''), null, trim(p_name), true);
  return true;
end;
$$;

-- Een inzendlink geeft nooit lidmaatschap
create or replace function public.accept_invitation(p_token uuid)
returns table (project_id uuid, session_id uuid)
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_email text;
  v_inv public.invitations;
  v_current text;
  v_rank_new int;
  v_rank_cur int;
begin
  if v_uid is null then
    raise exception 'Log eerst in om de uitnodiging te accepteren' using errcode = 'insufficient_privilege';
  end if;
  select * into v_inv from public.invitations where token = p_token for update;
  if v_inv.id is null then
    raise exception 'Deze uitnodiging bestaat niet' using errcode = 'no_data_found';
  end if;
  if v_inv.purpose <> 'deelname' then
    raise exception 'Met een inzendlink stuur je ideeën in; je wordt er geen lid mee' using errcode = 'check_violation';
  end if;
  if v_inv.revoked then
    raise exception 'Deze uitnodiging is ingetrokken' using errcode = 'check_violation';
  end if;
  if v_inv.expires_at <= now() then
    raise exception 'Deze uitnodiging is verlopen' using errcode = 'check_violation';
  end if;
  if exists (select 1 from public.projects p where p.id = v_inv.project_id and p.archived) then
    raise exception 'Dit project is gearchiveerd' using errcode = 'check_violation';
  end if;
  if v_inv.kind = 'e-mail' then
    select lower(email) into v_email from auth.users where id = v_uid;
    if v_email is distinct from v_inv.email then
      raise exception 'Deze uitnodiging is bedoeld voor een ander e-mailadres' using errcode = 'insufficient_privilege';
    end if;
    if v_inv.accepted_by is not null and v_inv.accepted_by <> v_uid then
      raise exception 'Deze uitnodiging is al gebruikt' using errcode = 'check_violation';
    end if;
  end if;

  select m.role into v_current from public.project_members m
  where m.project_id = v_inv.project_id and m.user_id = v_uid;

  v_rank_new := array_position(array['deelnemer', 'redacteur', 'begeleider', 'beheerder'], v_inv.role);
  v_rank_cur := coalesce(array_position(array['deelnemer', 'redacteur', 'begeleider', 'beheerder'], v_current), 0);

  if v_current is null then
    insert into public.project_members (project_id, user_id, role) values (v_inv.project_id, v_uid, v_inv.role);
  elsif v_rank_new > v_rank_cur then
    update public.project_members m set role = v_inv.role
    where m.project_id = v_inv.project_id and m.user_id = v_uid;
  end if;

  if v_inv.session_id is not null then
    insert into public.session_participants (session_id, user_id, project_id)
    values (v_inv.session_id, v_uid, v_inv.project_id)
    on conflict do nothing;
  end if;

  if v_inv.accepted_by is null then
    perform set_config('kansenmaker.accepting', 'on', true);
    update public.invitations i set accepted_by = v_uid, accepted_at = now() where i.id = v_inv.id;
    perform set_config('kansenmaker.accepting', 'off', true);
  end if;

  return query select v_inv.project_id, v_inv.session_id;
end;
$$;

-- Rechten: deze functies zijn bedoeld voor bezoekers zonder account (anon) én ingelogde gebruikers
revoke execute on function public.guest_join_session(uuid, text) from public;
revoke execute on function public.guest_session_state(uuid, text) from public;
revoke execute on function public.guest_submit_answer(uuid, text, text) from public;
revoke execute on function public.guest_toggle_vote(uuid, text, uuid) from public;
revoke execute on function public.submission_preview(uuid) from public;
revoke execute on function public.guest_submit_idea(uuid, text, text, text, text) from public;
grant execute on function public.guest_join_session(uuid, text) to anon, authenticated;
grant execute on function public.guest_session_state(uuid, text) to anon, authenticated;
grant execute on function public.guest_submit_answer(uuid, text, text) to anon, authenticated;
grant execute on function public.guest_toggle_vote(uuid, text, uuid) to anon, authenticated;
grant execute on function public.submission_preview(uuid) to anon, authenticated;
grant execute on function public.guest_submit_idea(uuid, text, text, text, text) to anon, authenticated;
