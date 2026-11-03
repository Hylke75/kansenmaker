-- Logboek van verstuurde inlogmails (Edge Function `inloglink`), voor rate limiting.
-- Alleen de service-rol (Edge Function) leest en schrijft; RLS zonder policies.
create table public.login_mail_log (
  id bigint generated always as identity primary key,
  email text not null,
  sent_at timestamptz not null default now()
);
create index login_mail_log_email_sent_at on public.login_mail_log (email, sent_at desc);
alter table public.login_mail_log enable row level security;
revoke all on public.login_mail_log from anon, authenticated;
