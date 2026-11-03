-- De Kansenmaker — test gaststemmen via de deelnamelink (rol anon). Vereist een actieve sessie met deelnamelink.
-- Draait in een transactie en wordt teruggedraaid.
begin;
do $t$
declare
  v_tok uuid; v_sid uuid; v_key text; v_a1 uuid; v_a2 uuid; v_a3 uuid; v_a4 uuid; ok boolean;
begin
  select i.token, i.session_id into v_tok, v_sid from public.invitations i join public.sessions s on s.id = i.session_id
  where i.kind = 'link' and i.purpose = 'deelname' and not i.revoked and i.expires_at > now() and s.state = 'actief'
  order by i.created_at desc limit 1;
  insert into public.session_answers (session_id, round, text) values (v_sid, 3, 'Stemoptie 1') returning id into v_a1;
  insert into public.session_answers (session_id, round, text) values (v_sid, 3, 'Stemoptie 2') returning id into v_a2;
  insert into public.session_answers (session_id, round, text) values (v_sid, 3, 'Stemoptie 3') returning id into v_a3;
  insert into public.session_answers (session_id, round, text) values (v_sid, 3, 'Stemoptie 4') returning id into v_a4;
  update public.sessions set active_round = 6 where id = v_sid;

  perform set_config('role', 'anon', true);
  select guest_key into v_key from public.guest_join_session(v_tok, 'Stemgast');
  begin
    perform public.guest_submit_answer(v_tok, v_key, 'antwoord in stemronde');
    raise exception 'TEST MISLUKT: antwoord in stemronde toegestaan';
  exception when check_violation then null;
  end;
  ok := public.guest_toggle_vote(v_tok, v_key, v_a1);
  ok := public.guest_toggle_vote(v_tok, v_key, v_a2);
  ok := public.guest_toggle_vote(v_tok, v_key, v_a3);
  begin
    ok := public.guest_toggle_vote(v_tok, v_key, v_a4);
    raise exception 'TEST MISLUKT: vierde stem toegestaan';
  exception when check_violation then null;
  end;
  ok := public.guest_toggle_vote(v_tok, v_key, v_a1);
  if ok then raise exception 'TEST MISLUKT: stem niet ingetrokken'; end if;
  ok := public.guest_toggle_vote(v_tok, v_key, v_a4);
  if not ok then raise exception 'TEST MISLUKT: stem na intrekken niet mogelijk'; end if;
  begin
    ok := public.guest_toggle_vote(v_tok, 'verkeerde-sleutel', v_a2);
    raise exception 'TEST MISLUKT: stem met verkeerde sleutel';
  exception when insufficient_privilege then null;
  end;
  begin
    perform 1 from public.session_guest_votes;
    raise exception 'TEST MISLUKT: anon leest tabel';
  exception when insufficient_privilege then null;
  end;
  reset role;
  if (select count(*) from public.session_guest_votes v join public.guests g on g.id = v.guest_id where g.name = 'Stemgast') <> 3 then
    raise exception 'TEST MISLUKT: verwacht 3 stemmen';
  end if;
end $t$;
select 'gaststemmen: alle tests geslaagd' as resultaat;
rollback;
