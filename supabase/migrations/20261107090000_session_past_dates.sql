-- Sessies mogen een startdatum in het verleden hebben (bijv. om een eerdere sessie vast te leggen)
-- en de datum, titel en locatie kunnen achteraf worden gewijzigd.
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
