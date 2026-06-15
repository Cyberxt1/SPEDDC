create table if not exists public.client_logs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid,
  action text not null check (action in ('created', 'updated', 'deleted')),
  client_name text,
  client_phone text,
  changed_by uuid references auth.users(id) on delete set null,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);

create index if not exists client_logs_client_id_idx on public.client_logs(client_id);
create index if not exists client_logs_created_at_idx on public.client_logs(created_at desc);

create or replace function public.log_client_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.client_logs (client_id, action, client_name, client_phone, changed_by, new_data)
    values (new.id, 'created', new.name, new.phone, auth.uid(), to_jsonb(new));
    return new;
  elsif tg_op = 'UPDATE' then
    insert into public.client_logs (client_id, action, client_name, client_phone, changed_by, old_data, new_data)
    values (new.id, 'updated', new.name, new.phone, auth.uid(), to_jsonb(old), to_jsonb(new));
    return new;
  elsif tg_op = 'DELETE' then
    insert into public.client_logs (client_id, action, client_name, client_phone, changed_by, old_data)
    values (old.id, 'deleted', old.name, old.phone, auth.uid(), to_jsonb(old));
    return old;
  end if;

  return null;
end;
$$;

drop trigger if exists clients_log_change on public.clients;
create trigger clients_log_change
after insert or update or delete on public.clients
for each row execute function public.log_client_change();

alter table public.client_logs enable row level security;

drop policy if exists "Staff can read client logs" on public.client_logs;
create policy "Staff can read client logs"
on public.client_logs for select
to authenticated
using (public.is_staff());

drop policy if exists "Staff can create client logs" on public.client_logs;
create policy "Staff can create client logs"
on public.client_logs for insert
to authenticated
with check (public.is_staff());
