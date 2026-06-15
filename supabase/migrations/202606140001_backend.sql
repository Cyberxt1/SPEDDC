create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  role text not null default 'staff' check (role in ('admin', 'staff')),
  created_at timestamptz not null default now()
);

create table if not exists public.service_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text not null,
  service text not null,
  urgency text not null default 'Routine',
  client_type text not null,
  note text not null default '',
  status text not null default 'New' check (status in ('New', 'Contacted', 'Scheduled', 'Completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text not null,
  result_password text not null,
  status text not null default 'not-ready' check (status in ('not-ready', 'ready')),
  report_path text,
  report_name text,
  report_uploaded_at timestamptz,
  report_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists service_requests_status_idx on public.service_requests(status);
create index if not exists clients_phone_idx on public.clients(phone);
create index if not exists clients_report_expires_idx on public.clients(report_expires_at) where report_path is not null;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists service_requests_set_updated_at on public.service_requests;
create trigger service_requests_set_updated_at
before update on public.service_requests
for each row execute function public.set_updated_at();

drop trigger if exists clients_set_updated_at on public.clients;
create trigger clients_set_updated_at
before update on public.clients
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'staff')
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
    and role in ('admin', 'staff')
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
    and role = 'admin'
  );
$$;

create or replace function public.verify_result_access(
  lookup_phone text,
  lookup_password text
)
returns table (
  id uuid,
  name text,
  status text,
  report_path text,
  report_name text,
  report_expires_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select c.id, c.name, c.status, c.report_path, c.report_name, c.report_expires_at
  from public.clients c
  where regexp_replace(c.phone, '\s+', '', 'g') = regexp_replace(lookup_phone, '\s+', '', 'g')
    and c.result_password = lookup_password
  limit 1;
$$;

alter table public.profiles enable row level security;
alter table public.service_requests enable row level security;
alter table public.clients enable row level security;

drop policy if exists "Staff can read profiles" on public.profiles;
create policy "Staff can read profiles"
on public.profiles for select
to authenticated
using (public.is_staff());

drop policy if exists "Admins can manage profiles" on public.profiles;
create policy "Admins can manage profiles"
on public.profiles for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Anyone can submit requests" on public.service_requests;
create policy "Anyone can submit requests"
on public.service_requests for insert
to anon, authenticated
with check (true);

drop policy if exists "Staff can manage requests" on public.service_requests;
create policy "Staff can manage requests"
on public.service_requests for all
to authenticated
using (public.is_staff())
with check (public.is_staff());

drop policy if exists "Staff can manage clients" on public.clients;
create policy "Staff can manage clients"
on public.clients for all
to authenticated
using (public.is_staff())
with check (public.is_staff());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('reports', 'reports', false, 10485760, array['application/pdf'])
on conflict (id) do update
set public = false,
    file_size_limit = 10485760,
    allowed_mime_types = array['application/pdf'];

drop policy if exists "Staff can manage report files" on storage.objects;
create policy "Staff can manage report files"
on storage.objects for all
to authenticated
using (bucket_id = 'reports' and public.is_staff())
with check (bucket_id = 'reports' and public.is_staff());

drop policy if exists "Verified result access only uses signed URLs" on storage.objects;
create policy "Verified result access only uses signed URLs"
on storage.objects for select
to anon, authenticated
using (false);
