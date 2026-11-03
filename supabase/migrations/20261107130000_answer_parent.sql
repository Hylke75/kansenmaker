-- Ideeën (ronde 3) kunnen bij een doelgroep-antwoord (ronde 2) horen.
alter table public.session_answers add column parent_id uuid references public.session_answers (id) on delete set null;
create index session_answers_parent_idx on public.session_answers (parent_id);

-- Koppeling alleen binnen dezelfde sessie en naar een doelgroep (ronde 2); daarna niet meer te wijzigen.
create or replace function private.check_answer_parent()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'UPDATE' then
    new.parent_id := old.parent_id;
    return new;
  end if;
  if new.parent_id is not null and not exists (
    select 1 from public.session_answers p
    where p.id = new.parent_id and p.session_id = new.session_id and p.round = 2
  ) then
    raise exception 'Deze doelgroep hoort niet bij deze sessie' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;
create trigger check_answer_parent before insert or update on public.session_answers
  for each row execute function private.check_answer_parent();

-- Gast: antwoord toevoegen met ronde en (optioneel) doelgroep
create or replace function public.guest_add_answer(p_token uuid, p_key text, p_text text, p_round integer, p_parent uuid default null)
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
  if (select count(*) from public.session_answers a where a.guest_id = v_guest.id) >= 100 then
    raise exception 'Je hebt het maximum aantal bijdragen bereikt' using errcode = 'check_violation';
  end if;
  insert into public.session_answers (project_id, session_id, round, author_id, guest_id, text, parent_id)
  values (v_session.project_id, v_session.id, p_round, null, v_guest.id, trim(p_text), p_parent)
  returning id into v_id;
  return v_id;
end;
$$;
revoke execute on function public.guest_add_answer(uuid, text, text, integer, uuid) from public;
grant execute on function public.guest_add_answer(uuid, text, text, integer, uuid) to anon, authenticated;

-- Eigen antwoorden met koppeling naar de doelgroep
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
    'session', jsonb_build_object('title', v_session.title, 'state', v_session.state, 'active_round', v_session.active_round, 'self_paced', v_session.self_paced),
    'allow_voting', v_allow,
    'guest', case when v_guest.id is null then null else jsonb_build_object('id', v_guest.id, 'name', v_guest.name) end,
    'my_answers', coalesce((
      select jsonb_agg(jsonb_build_object('id', a.id, 'round', a.round, 'text', a.text, 'hidden', a.hidden, 'parent_id', a.parent_id) order by a.created_at)
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

-- Koppeling naar elk antwoord uit een eerdere ronde (doelgroep → idee → kans/bedreiging)
create or replace function private.check_answer_parent()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'UPDATE' then
    new.parent_id := old.parent_id;
    return new;
  end if;
  if new.parent_id is not null and not exists (
    select 1 from public.session_answers p
    where p.id = new.parent_id and p.session_id = new.session_id and p.round < new.round
  ) then
    raise exception 'Dit onderdeel hoort niet bij deze sessie' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;
