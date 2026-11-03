-- De Kansenmaker — RPC's en realtime (stap 2)

-- ---------------------------------------------------------------------------
-- RPC's
-- ---------------------------------------------------------------------------

-- Nieuw project: alleen voor wie al beheerder van een project is
create or replace function public.create_project(p_name text, p_description text default '')
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'Niet ingelogd' using errcode = 'insufficient_privilege';
  end if;
  if not exists (select 1 from public.project_members where user_id = v_uid and role = 'beheerder') then
    raise exception 'Alleen beheerders kunnen projecten aanmaken' using errcode = 'insufficient_privilege';
  end if;
  insert into public.projects (name, description, owner_id)
  values (trim(p_name), coalesce(trim(p_description), ''), v_uid)
  returning id into v_id;
  insert into public.project_members (project_id, user_id, role) values (v_id, v_uid, 'beheerder');
  return v_id;
end;
$$;

-- Wat staat er in deze uitnodiging? (ook zonder in te loggen; geeft minimale informatie)
create or replace function public.invitation_preview(p_token uuid)
returns table (project_name text, role text, session_title text, valid boolean, reason text)
language plpgsql stable security definer set search_path = '' as $$
declare
  v_inv public.invitations;
begin
  select * into v_inv from public.invitations where token = p_token;
  if v_inv.id is null then
    return query select null::text, null::text, null::text, false, 'Deze uitnodiging bestaat niet.';
    return;
  end if;
  return query
    select p.name, v_inv.role, s.title,
      (not v_inv.revoked and v_inv.expires_at > now() and not p.archived
        and not (v_inv.kind = 'e-mail' and v_inv.accepted_by is not null)),
      case
        when v_inv.revoked then 'Deze uitnodiging is ingetrokken.'
        when v_inv.expires_at <= now() then 'Deze uitnodiging is verlopen.'
        when p.archived then 'Dit project is gearchiveerd.'
        when v_inv.kind = 'e-mail' and v_inv.accepted_by is not null then 'Deze uitnodiging is al gebruikt.'
        else null
      end
    from public.projects p
    left join public.sessions s on s.id = v_inv.session_id
    where p.id = v_inv.project_id;
end;
$$;

-- Uitnodiging accepteren: lid worden (of rol verhogen) en eventueel aan sessie deelnemen
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

-- Doelgroepen samenvoegen (beheerder)
create or replace function public.merge_audiences(p_source uuid, p_target uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_ps uuid;
  v_pt uuid;
begin
  select project_id into v_ps from public.audiences where id = p_source;
  select project_id into v_pt from public.audiences where id = p_target;
  if v_ps is null or v_pt is null or v_ps <> v_pt or p_source = p_target then
    raise exception 'Kies twee verschillende doelgroepen uit hetzelfde project' using errcode = 'check_violation';
  end if;
  if not private.has_role(v_ps, array['beheerder']) then
    raise exception 'Alleen een beheerder kan doelgroepen samenvoegen' using errcode = 'insufficient_privilege';
  end if;
  insert into public.idea_audiences (idea_id, audience_id)
    select idea_id, p_target from public.idea_audiences where audience_id = p_source
    on conflict do nothing;
  insert into public.concept_audiences (concept_id, audience_id)
    select concept_id, p_target from public.concept_audiences where audience_id = p_source
    on conflict do nothing;
  update public.needs set audience_id = p_target where audience_id = p_source;
  delete from public.audiences where id = p_source;
end;
$$;

revoke execute on function public.create_project(text, text) from public, anon;
revoke execute on function public.accept_invitation(uuid) from public, anon;
revoke execute on function public.merge_audiences(uuid, uuid) from public, anon;
revoke execute on function public.invitation_preview(uuid) from public;
grant execute on function public.create_project(text, text) to authenticated;
grant execute on function public.accept_invitation(uuid) to authenticated;
grant execute on function public.merge_audiences(uuid, uuid) to authenticated;
grant execute on function public.invitation_preview(uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Realtime voor live werksessies (RLS geldt ook voor realtime)
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.sessions, public.session_answers, public.session_votes;
