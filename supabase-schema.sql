create extension if not exists pgcrypto;

create table if not exists public.study_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  subject text not null,
  hours numeric(6,2) not null check (hours > 0),
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists study_entries_set_updated_at on public.study_entries;
create trigger study_entries_set_updated_at
before update on public.study_entries
for each row
execute function public.set_updated_at();

alter table public.study_entries enable row level security;

drop policy if exists "Users can view their own entries" on public.study_entries;
create policy "Users can view their own entries"
on public.study_entries
for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert their own entries" on public.study_entries;
create policy "Users can insert their own entries"
on public.study_entries
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own entries" on public.study_entries;
create policy "Users can update their own entries"
on public.study_entries
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own entries" on public.study_entries;
create policy "Users can delete their own entries"
on public.study_entries
for delete
using (auth.uid() = user_id);
