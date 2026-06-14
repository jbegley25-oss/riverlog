-- Run this in your Supabase SQL Editor

-- Profiles table (extends auth.users)
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  first_name text not null default '',
  last_name text not null default '',
  middle_name text,
  date_of_birth date,
  company_name text not null default '',
  rol_license text not null default '',
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

-- Log entries table
create table public.log_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  date date not null,
  river text not null,
  put_in text not null,
  take_out text not null,
  boat_type text not null check (boat_type in ('paddle', 'oar', 'combined')),
  role text not null check (role in ('guide', 'trip_leader', 'guide_instructor', 'private')),
  hours numeric(5,2) not null check (hours > 0),
  miles numeric(6,2) not null check (miles >= 0),
  company_name text not null default '',
  rol_license text not null default '',
  created_at timestamptz not null default now()
);

-- RLS policies
alter table public.profiles enable row level security;
alter table public.log_entries enable row level security;

-- Profiles: users can read/update their own; admins can read all
create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

create policy "Admins can view all profiles" on public.profiles
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

-- Log entries: users manage their own; admins can read all
create policy "Users can view own entries" on public.log_entries
  for select using (auth.uid() = user_id);

create policy "Users can insert own entries" on public.log_entries
  for insert with check (auth.uid() = user_id);

create policy "Users can update own entries" on public.log_entries
  for update using (auth.uid() = user_id);

create policy "Users can delete own entries" on public.log_entries
  for delete using (auth.uid() = user_id);

create policy "Admins can view all entries" on public.log_entries
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id)
  values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
