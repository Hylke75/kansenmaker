-- Deelnemers mogen hun eigen antwoord in een werksessie bewerken zolang de sessie actief is.
-- Ingelogd: via een update op session_answers (policy + guard). Gast: via guest_update_answer.

create or replace function private.guard_session_answer()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_session public.sessions;
  v_uid uuid := (select auth.uid());
  v_guest_edit text := current_setting('kansenkamer.guest_edit', true);
begin
  if tg_op = 'INSERT' and new.guest_id is not null then
    new.author_id := null;
    new.hidden := false;
    new.idea_id := null;
    new.created_at := now();
    return new;
  end if;
  if v_uid is null and tg_op = 'INSERT' then
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
    new.author_id := v_uid;
    new.guest_id := null;
    new.hidden := false;
    new.idea_id := null;
    new.created_at := now();
    return new;
  end if;

  -- UPDATE
  new.session_id := old.session_id;
  new.round := old.round;
  new.author_id := old.author_id;
  new.guest_id := old.guest_id;
  new.created_at := old.created_at;
  if new.text is distinct from old.text then
    if (old.author_id is not null and old.author_id = v_uid)
       or (old.guest_id is not null and v_guest_edit = old.guest_id::text) then
      select * into v_session from public.sessions where id = old.session_id;
      if v_session.state <> 'actief' then
        raise exception 'Deze sessie is niet actief' using errcode = 'check_violation';
      end if;
      new.text := trim(new.text);
    else
      new.text := old.text;
    end if;
  end if;
  -- Verbergen en omzetten naar een idee blijft voor begeleiders
  if v_uid is not null and not private.can_facilitate(old.session_id) then
    new.hidden := old.hidden;
    new.idea_id := old.idea_id;
  end if;
  if new.idea_id is distinct from old.idea_id and new.idea_id is not null and not exists (
    select 1 from public.ideas i where i.id = new.idea_id and i.project_id = old.project_id
  ) then
    raise exception 'Idee hoort niet bij dit project' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create policy "eigen antwoord bewerken" on public.session_answers for update to authenticated
  using (author_id = (select auth.uid()))
  with check (author_id = (select auth.uid()));

create or replace function public.guest_update_answer(p_token uuid, p_key text, p_answer uuid, p_text text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  v_guest public.guests;
begin
  v_guest := private.guest_for(p_token, p_key);
  if p_text is null or char_length(trim(p_text)) not between 1 and 500 then
    raise exception 'Je antwoord moet tussen 1 en 500 tekens zijn' using errcode = 'check_violation';
  end if;
  perform set_config('kansenkamer.guest_edit', v_guest.id::text, true);
  update public.session_answers set text = trim(p_text) where id = p_answer and guest_id = v_guest.id;
  if not found then
    raise exception 'Dit antwoord kun je niet bewerken' using errcode = 'insufficient_privilege';
  end if;
  perform set_config('kansenkamer.guest_edit', '', true);
  return true;
end;
$$;
revoke execute on function public.guest_update_answer(uuid, text, uuid, text) from public;
grant execute on function public.guest_update_answer(uuid, text, uuid, text) to anon, authenticated;
