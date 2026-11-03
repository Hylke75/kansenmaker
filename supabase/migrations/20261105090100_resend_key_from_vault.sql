-- De Resend-sleutel staat in Supabase Vault (naam 'resend_api_key', handmatig aangemaakt met
-- vault.create_secret; de waarde staat niet in de repo). Alleen de service-rol (Edge Function
-- `inloglink`) mag hem uitlezen.
create or replace function public.resend_api_key()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select decrypted_secret from vault.decrypted_secrets where name = 'resend_api_key' limit 1;
$$;
revoke execute on function public.resend_api_key() from public, anon, authenticated;
grant execute on function public.resend_api_key() to service_role;
