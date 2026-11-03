-- De Kansenmaker — rechtentest stap 3 (koppelingen en sessie-antwoord → idee)
-- Draait in één transactie en wordt teruggedraaid.

begin;

do $test$
declare
  u_beg uuid := gen_random_uuid();
  u_dn uuid := gen_random_uuid();
  u_dn2 uuid := gen_random_uuid();
  p1 uuid; p2 uuid; i1 uuid; i2 uuid; i3 uuid; i_other uuid; s1 uuid; ans uuid; n int;
begin
  insert into auth.users (id, email, aud, role, instance_id) values
    (u_beg, 's3-beg@kansenmaker.test', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'),
    (u_dn,  's3-dn@kansenmaker.test',  'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'),
    (u_dn2, 's3-dn2@kansenmaker.test', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000');
  insert into public.projects (name) values ('S3 project') returning id into p1;
  insert into public.projects (name) values ('S3 ander') returning id into p2;
  insert into public.project_members values (p1, u_beg, 'begeleider', now()), (p1, u_dn, 'deelnemer', now()), (p1, u_dn2, 'deelnemer', now());
  insert into public.ideas (project_id, title, description, author_id) values (p1, 'A', 'a', u_dn) returning id into i1;
  insert into public.ideas (project_id, title, description, author_id) values (p1, 'B', 'b', u_dn2) returning id into i2;
  insert into public.ideas (project_id, title, description, author_id) values (p1, 'C', 'c', u_dn2) returning id into i3;
  insert into public.ideas (project_id, title, description) values (p2, 'X', 'x') returning id into i_other;

  perform set_config('role', 'authenticated', true);

  -- Auteur van één van beide ideeën mag koppelen; opslag is genormaliseerd (A↔B één keer)
  perform set_config('request.jwt.claims', json_build_object('sub', u_dn, 'role', 'authenticated')::text, true);
  insert into public.idea_relations (idea_id, related_idea_id) values (greatest(i1, i2), least(i1, i2));
  if (select count(*) from public.idea_relations where idea_id = least(i1, i2) and related_idea_id = greatest(i1, i2)) <> 1 then
    raise exception 'TEST MISLUKT: relatie niet genormaliseerd';
  end if;
  begin
    insert into public.idea_relations (idea_id, related_idea_id) values (least(i1, i2), greatest(i1, i2));
    raise exception 'TEST MISLUKT: dubbele relatie toegestaan';
  exception when unique_violation then null;
  end;

  -- Deelnemer die van geen van beide de auteur is, mag niet koppelen
  begin
    insert into public.idea_relations (idea_id, related_idea_id) values (i2, i3);
    raise exception 'TEST MISLUKT: niet-auteur koppelde ideeën';
  exception when insufficient_privilege then null;
  end;

  -- Begeleider (conceptbeheerder) mag wel; maar niet over projecten heen (ook niet als service)
  perform set_config('request.jwt.claims', json_build_object('sub', u_beg, 'role', 'authenticated')::text, true);
  insert into public.idea_relations (idea_id, related_idea_id) values (i2, i3);
  reset role;
  begin
    insert into public.idea_relations (idea_id, related_idea_id) values (i1, i_other);
    raise exception 'TEST MISLUKT: relatie tussen projecten toegestaan';
  exception when check_violation then null;
  end;
  perform set_config('role', 'authenticated', true);

  -- Sessie-antwoord → idee
  perform set_config('request.jwt.claims', json_build_object('sub', u_beg, 'role', 'authenticated')::text, true);
  insert into public.sessions (project_id, title, starts_at) values (p1, 'S', now() + interval '1 hour') returning id into s1;
  update public.sessions set state = 'actief' where id = s1;
  perform set_config('request.jwt.claims', json_build_object('sub', u_dn, 'role', 'authenticated')::text, true);
  insert into public.session_answers (session_id, round, text, idea_id) values (s1, 1, 'Antwoord', i2) returning id into ans;
  if (select idea_id from public.session_answers where id = ans) is not null then
    raise exception 'TEST MISLUKT: idea_id bij invoeren niet genegeerd';
  end if;
  update public.session_answers set idea_id = i1 where id = ans;
  get diagnostics n = row_count;
  if n > 0 then raise exception 'TEST MISLUKT: deelnemer koppelde antwoord aan idee'; end if;

  perform set_config('request.jwt.claims', json_build_object('sub', u_beg, 'role', 'authenticated')::text, true);
  begin
    update public.session_answers set idea_id = i_other where id = ans;
    raise exception 'TEST MISLUKT: antwoord gekoppeld aan idee uit ander project';
  exception when check_violation then null;
  end;
  update public.session_answers set idea_id = i1 where id = ans;
  if (select idea_id from public.session_answers where id = ans) <> i1 then
    raise exception 'TEST MISLUKT: begeleider kon antwoord niet omzetten';
  end if;
  update public.session_answers set text = 'Gewijzigd' where id = ans;
  if (select text from public.session_answers where id = ans) <> 'Antwoord' then
    raise exception 'TEST MISLUKT: tekst van antwoord gewijzigd';
  end if;

  reset role;
end;
$test$;

select 'alle stap-3-tests geslaagd' as resultaat;

rollback;
