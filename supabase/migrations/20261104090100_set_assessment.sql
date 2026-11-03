-- De Kansenmaker — realiteitstoets: één stelling atomair bijwerken.
-- Voorkomt dat twee snel opeenvolgende keuzes elkaar overschrijven (lezen-wijzigen-schrijven in de browser).
-- SECURITY INVOKER: RLS en de guard op concepten blijven gewoon gelden.
create or replace function public.set_assessment(p_concept uuid, p_question text, p_value text)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare
  n int;
begin
  if p_question !~ '^[a-z_]{1,40}$' then
    raise exception 'Onbekende stelling' using errcode = 'check_violation';
  end if;
  if p_value is not null and p_value not in ('aannemelijk', 'onbekend', 'obstakel') then
    raise exception 'Kies aannemelijk, onbekend of obstakel' using errcode = 'check_violation';
  end if;
  update public.concepts
  set assessment = case
    when p_value is null then assessment - p_question
    else assessment || jsonb_build_object(p_question, p_value)
  end
  where id = p_concept;
  get diagnostics n = row_count;
  return n > 0;
end;
$$;

revoke execute on function public.set_assessment(uuid, text, text) from public, anon;
grant execute on function public.set_assessment(uuid, text, text) to authenticated;
