-- De Kansenmaker — RLS- en rechtentest
-- Draait volledig in één transactie en wordt teruggedraaid: er blijft niets achter.
-- Uitvoeren: plak in de SQL-editor van Supabase (of via psql). Bij een fout stopt de test met
-- 'TEST MISLUKT: …'; bij succes is het resultaat 'alle RLS-tests geslaagd'.

begin;

create temporary table _t (id text primary key, val uuid) on commit drop;
grant all on _t to authenticated;

do $test$
declare
  u_admin uuid := gen_random_uuid();
  u_beg uuid := gen_random_uuid();
  u_red uuid := gen_random_uuid();
  u_dn uuid := gen_random_uuid();
  u_out uuid := gen_random_uuid();
  p1 uuid; p2 uuid; a1 uuid; idea1 uuid; idea_dn uuid; c1 uuid; s1 uuid; ans uuid; inv uuid; tok uuid;
  n int;
  ok boolean;

begin
  -- Testgebruikers (profielen worden door trigger aangemaakt)
  insert into auth.users (id, email, aud, role, instance_id)
  values (u_admin, 'rls-admin@kansenmaker.test', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'),
         (u_beg,   'rls-beg@kansenmaker.test',   'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'),
         (u_red,   'rls-red@kansenmaker.test',   'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'),
         (u_dn,    'rls-dn@kansenmaker.test',    'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'),
         (u_out,   'rls-out@kansenmaker.test',   'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000');

  if (select count(*) from public.profiles where id in (u_admin, u_beg, u_red, u_dn, u_out)) <> 5 then
    raise exception 'TEST MISLUKT: profielen niet automatisch aangemaakt';
  end if;

  -- Twee projecten opzetten als service
  insert into public.projects (name, owner_id) values ('RLS-test project', u_admin) returning id into p1;
  insert into public.projects (name, owner_id) values ('RLS-test ander project', u_out) returning id into p2;
  insert into public.project_members values
    (p1, u_admin, 'beheerder'), (p1, u_beg, 'begeleider'), (p1, u_red, 'redacteur'), (p1, u_dn, 'deelnemer'),
    (p2, u_out, 'beheerder');

  -- ===== Deelnemer =====
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', u_dn, 'role', 'authenticated')::text, true);

  if (select count(*) from public.projects) <> 1 then raise exception 'TEST MISLUKT: deelnemer ziet andere projecten'; end if;
  if (select count(*) from public.profiles where id = u_out) <> 0 then raise exception 'TEST MISLUKT: profiel buiten project zichtbaar'; end if;

  insert into public.ideas (project_id, title, description) values (p1, 'Idee deelnemer', 'Beschrijving van het idee')
    returning id into idea_dn;
  if (select author_id from public.ideas where id = idea_dn) <> u_dn then raise exception 'TEST MISLUKT: auteur niet gezet'; end if;

  begin
    insert into public.ideas (project_id, title, description) values (p2, 'Inbraak', 'In ander project');
    raise exception 'TEST MISLUKT: idee in ander project toegestaan';
  exception when insufficient_privilege then null; -- RLS-overtreding (42501)
  end;

  begin
    update public.ideas set status = 'afgerond' where id = idea_dn;
    raise exception 'TEST MISLUKT: deelnemer wijzigde status';
  exception when insufficient_privilege then null;
  end;

  begin
    insert into public.audiences (project_id, name) values (p1, 'Mag niet');
    raise exception 'TEST MISLUKT: deelnemer maakte doelgroep';
  exception when insufficient_privilege then null;
  end;

  begin
    insert into public.invitations (project_id, kind, expires_at) values (p1, 'link', now() + interval '1 day');
    raise exception 'TEST MISLUKT: deelnemer maakte uitnodiging';
  exception when insufficient_privilege then null;
  end;

  if (select count(*) from public.invitations) <> 0 then raise exception 'TEST MISLUKT: deelnemer ziet uitnodigingen'; end if;

  begin
    perform public.create_project('Nieuw', '');
    raise exception 'TEST MISLUKT: deelnemer maakte project';
  exception when insufficient_privilege then null;
  end;

  update public.project_members set role = 'beheerder' where user_id = u_dn;
  if (select role from public.project_members where user_id = u_dn and project_id = p1) <> 'deelnemer' then
    raise exception 'TEST MISLUKT: deelnemer verhoogde eigen rol';
  end if;

  -- ===== Redacteur =====
  perform set_config('request.jwt.claims', json_build_object('sub', u_red, 'role', 'authenticated')::text, true);
  insert into public.audiences (project_id, name, description) values (p1, 'Bewoners', 'Test') returning id into a1;
  insert into public.idea_audiences values (idea_dn, a1);
  update public.ideas set status = 'in-ontwikkeling' where id = idea_dn;
  insert into public.concepts (project_id, name, description) values (p1, 'Concept', 'Test') returning id into c1;
  insert into public.concept_ideas values (c1, idea_dn);

  begin
    update public.concepts set status = 'klaar-voor-proef' where id = c1;
    raise exception 'TEST MISLUKT: redacteur zette klaar voor proef';
  exception when insufficient_privilege then null;
  end;

  begin
    insert into public.sessions (project_id, title, starts_at) values (p1, 'Sessie', now() + interval '1 day');
    raise exception 'TEST MISLUKT: redacteur plande sessie';
  exception when insufficient_privilege then null;
  end;

  -- ===== Beheerder =====
  perform set_config('request.jwt.claims', json_build_object('sub', u_admin, 'role', 'authenticated')::text, true);
  update public.concepts set status = 'klaar-voor-proef' where id = c1;
  if (select ready_confirmed_by from public.concepts where id = c1) <> u_admin then
    raise exception 'TEST MISLUKT: bevestiging klaar voor proef niet vastgelegd';
  end if;

  begin
    delete from public.project_members where user_id = u_admin and project_id = p1;
    -- eigen lidmaatschap verwijderen mag niet via RLS; 0 rijen geraakt
  end;
  if not exists (select 1 from public.project_members where user_id = u_admin and project_id = p1) then
    raise exception 'TEST MISLUKT: beheerder verwijderde zichzelf';
  end if;

  -- Koppelen tussen projecten wordt geweigerd (ook voor service)
  reset role;
  insert into public.ideas (project_id, title, description, author_id) values (p2, 'Ander', 'Idee', u_out) returning id into idea1;
  begin
    insert into public.idea_audiences values (idea1, a1);
    raise exception 'TEST MISLUKT: koppeling tussen projecten toegestaan';
  exception when check_violation then null;
  end;
  perform set_config('role', 'authenticated', true);

  -- Goedkeuring: wachtende ideeën alleen zichtbaar voor auteur en moderatoren
  update public.projects set require_approval = true where id = p1;
  perform set_config('request.jwt.claims', json_build_object('sub', u_dn, 'role', 'authenticated')::text, true);
  insert into public.ideas (project_id, title, description) values (p1, 'Wacht', 'Moet goedgekeurd worden') returning id into idea1;
  if not (select pending from public.ideas where id = idea1) then raise exception 'TEST MISLUKT: idee niet in afwachting'; end if;
  insert into _t values ('pending_idea', idea1);
  perform set_config('request.jwt.claims', json_build_object('sub', u_beg, 'role', 'authenticated')::text, true);
  if exists (select 1 from public.ideas where id = idea1) then raise exception 'TEST MISLUKT: begeleider ziet wachtend idee'; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', u_red, 'role', 'authenticated')::text, true);
  if not exists (select 1 from public.ideas where id = idea1) then raise exception 'TEST MISLUKT: redacteur ziet wachtend idee niet'; end if;
  update public.ideas set pending = false where id = idea1;
  perform set_config('request.jwt.claims', json_build_object('sub', u_admin, 'role', 'authenticated')::text, true);
  update public.projects set require_approval = false where id = p1;

  -- ===== Begeleider: sessie, uitnodigingen =====
  perform set_config('request.jwt.claims', json_build_object('sub', u_beg, 'role', 'authenticated')::text, true);
  insert into public.sessions (project_id, title, starts_at) values (p1, 'Werksessie', now() + interval '1 hour') returning id into s1;
  begin
    insert into public.invitations (project_id, kind, role, expires_at) values (p1, 'link', 'beheerder', now() + interval '1 day');
    raise exception 'TEST MISLUKT: begeleider nodigde beheerder uit';
  exception when insufficient_privilege then null;
  end;
  insert into public.invitations (project_id, kind, role, expires_at, session_id)
  values (p1, 'link', 'deelnemer', now() + interval '1 day', s1) returning id, token into inv, tok;
  insert into _t values ('token', tok);
  update public.sessions set state = 'actief', active_round = 3 where id = s1;

  -- Deelnemer geeft antwoord in actieve ronde, niet in een andere ronde
  perform set_config('request.jwt.claims', json_build_object('sub', u_dn, 'role', 'authenticated')::text, true);
  insert into public.session_answers (session_id, round, text) values (s1, 3, 'Mijn idee') returning id into ans;
  begin
    insert into public.session_answers (session_id, round, text) values (s1, 4, 'Te vroeg');
    raise exception 'TEST MISLUKT: antwoord in niet-actieve ronde';
  exception when check_violation then null;
  end;
  begin
    update public.sessions set active_round = 6 where id = s1;
    get diagnostics n = row_count;
    if n > 0 then raise exception 'TEST MISLUKT: deelnemer wijzigde sessie'; end if;
  end;

  -- Begeleider verbergt antwoord; deelnemer (auteur) blijft het zien, anderen niet
  perform set_config('request.jwt.claims', json_build_object('sub', u_beg, 'role', 'authenticated')::text, true);
  update public.session_answers set hidden = true where id = ans;
  perform set_config('request.jwt.claims', json_build_object('sub', u_red, 'role', 'authenticated')::text, true);
  if exists (select 1 from public.session_answers where id = ans) then raise exception 'TEST MISLUKT: verborgen antwoord zichtbaar'; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', u_beg, 'role', 'authenticated')::text, true);
  update public.session_answers set hidden = false where id = ans;
  update public.sessions set active_round = 6 where id = s1;

  -- Stemmen: maximaal 3
  perform set_config('request.jwt.claims', json_build_object('sub', u_dn, 'role', 'authenticated')::text, true);
  insert into public.session_votes (answer_id) values (ans);
  if (select user_id from public.session_votes where answer_id = ans) <> u_dn then raise exception 'TEST MISLUKT: stem niet van gebruiker'; end if;

  -- ===== Buitenstaander accepteert uitnodiging =====
  perform set_config('request.jwt.claims', json_build_object('sub', u_out, 'role', 'authenticated')::text, true);
  if exists (select 1 from public.ideas where project_id = p1) then raise exception 'TEST MISLUKT: buitenstaander ziet ideeën'; end if;
  if exists (select 1 from public.activities where project_id = p1) then raise exception 'TEST MISLUKT: buitenstaander ziet activiteit'; end if;
  perform public.accept_invitation((select val from _t where id = 'token'));
  if (select role from public.project_members where user_id = u_out and project_id = p1) <> 'deelnemer' then
    raise exception 'TEST MISLUKT: uitnodiging niet geaccepteerd';
  end if;
  if not exists (select 1 from public.session_participants where user_id = u_out and session_id = s1) then
    raise exception 'TEST MISLUKT: niet aan sessie toegevoegd';
  end if;
  if not exists (select 1 from public.ideas where project_id = p1) then raise exception 'TEST MISLUKT: nieuw lid ziet ideeën niet'; end if;

  -- Ingetrokken uitnodiging werkt niet meer
  perform set_config('request.jwt.claims', json_build_object('sub', u_admin, 'role', 'authenticated')::text, true);
  update public.invitations set revoked = true where id = inv;
  perform set_config('request.jwt.claims', json_build_object('sub', u_red, 'role', 'authenticated')::text, true);
  begin
    perform public.accept_invitation((select val from _t where id = 'token'));
    raise exception 'TEST MISLUKT: ingetrokken uitnodiging geaccepteerd';
  exception when check_violation then null;
  end;

  -- Laatste beheerder kan niet worden gedegradeerd
  perform set_config('request.jwt.claims', json_build_object('sub', u_out, 'role', 'authenticated')::text, true);
  begin
    update public.project_members set role = 'deelnemer' where project_id = p2 and user_id = u_out;
    -- eigen rol: RLS blokkeert (0 rijen); daarna controleren
  end;
  if (select role from public.project_members where project_id = p2 and user_id = u_out) <> 'beheerder' then
    raise exception 'TEST MISLUKT: laatste beheerder gedegradeerd';
  end if;

  -- Activiteit wordt automatisch gevuld
  perform set_config('request.jwt.claims', json_build_object('sub', u_admin, 'role', 'authenticated')::text, true);
  if (select count(*) from public.activities where project_id = p1) < 3 then raise exception 'TEST MISLUKT: activiteit ontbreekt'; end if;

  reset role;
  raise notice 'alle RLS-tests geslaagd';
end;
$test$;

select 'alle RLS-tests geslaagd' as resultaat;

rollback;
