alter table public.clients
add column if not exists result_access_count integer not null default 0,
add column if not exists last_result_access_at timestamptz,
add column if not exists result_access_limited_at timestamptz;

create table if not exists public.result_download_tokens (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists result_download_tokens_client_id_idx on public.result_download_tokens(client_id);
create index if not exists result_download_tokens_expires_at_idx on public.result_download_tokens(expires_at);

alter table public.result_download_tokens enable row level security;

drop policy if exists "Staff can read result download tokens" on public.result_download_tokens;
create policy "Staff can read result download tokens"
on public.result_download_tokens for select
to authenticated
using (public.is_staff());
