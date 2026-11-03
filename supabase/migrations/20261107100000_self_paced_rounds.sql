-- Deelnemers bladeren zelf door de rondes: antwoorden mogen in elke invoerronde (1–5) zolang de
-- sessie actief is, en stemmen kan zolang de sessie actief is. De begeleider houdt de actieve ronde
-- bij als gezamenlijke stand (deelnemers springen mee). Gasten geven de ronde mee aan guest_submit_answer.

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
    if new.round = 6 then
      raise exception 'In de stemronde geef je geen antwoorden' using errcode = 'check_violation';
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
  if v_session.state <> 'actief' then
    raise exception 'Stemmen kan alleen tijdens de sessie' using errcode = 'check_violation';
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
  if v_session.state <> 'actief' then
    raise exception 'Stemmen kan alleen tijdens de sessie' using errcode = 'check_violation';
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
    'votable', case when v_session.state = 'actief' then coalesce((
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

create or replace function public.guest_submit_answer(p_token uuid, p_key text, p_text text, p_round integer)
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
  if p_round is null or p_round < 1 or p_round > 5 then
    raise exception 'In deze ronde geef je geen antwoorden' using errcode = 'check_violation';
  end if;
  if (select count(*) from public.session_answers a where a.guest_id = v_guest.id) >= 60 then
    raise exception 'Je hebt het maximum aantal bijdragen bereikt' using errcode = 'check_violation';
  end if;
  insert into public.session_answers (project_id, session_id, round, author_id, guest_id, text)
  values (v_session.project_id, v_session.id, p_round, null, v_guest.id, trim(p_text))
  returning id into v_id;
  return v_id;
end;
$$;
revoke execute on function public.guest_submit_answer(uuid, text, text, integer) from public;
grant execute on function public.guest_submit_answer(uuid, text, text, integer) to anon, authenticated;
