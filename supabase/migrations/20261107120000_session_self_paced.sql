-- Online sessie (‘in eigen tempo’): iedere deelnemer doorloopt de rondes zelf, zonder begeleider.
alter table public.sessions add column self_paced boolean not null default false;
comment on column public.sessions.self_paced is 'Online sessie: iedere deelnemer doorloopt de rondes in eigen tempo, zonder begeleider';
update public.sessions set self_paced = true where location ilike '%online%';

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
