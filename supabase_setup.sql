-- DENTWIN Supabase setup. Run this entire script in Supabase SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.patients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  study_id text not null,
  age text,
  nickname text,
  dentition text,
  visit_date date,
  dmft integer,
  "DMFT" integer,
  plaque text,
  risk text,
  findings text,
  explanation text,
  brushing text,
  fluoride text,
  sugar text,
  supervision text,
  action1 text,
  action2 text,
  action3 text,
  recall text,
  department text,
  photos jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, study_id)
);

alter table public.patients enable row level security;

drop policy if exists "Users can read own patients" on public.patients;
create policy "Users can read own patients" on public.patients
for select to authenticated using (auth.uid() = user_id);

drop policy if exists "Users can insert own patients" on public.patients;
create policy "Users can insert own patients" on public.patients
for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "Users can update own patients" on public.patients;
create policy "Users can update own patients" on public.patients
for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can delete own patients" on public.patients;
create policy "Users can delete own patients" on public.patients
for delete to authenticated using (auth.uid() = user_id);

-- Enforce maximum 15 records per authenticated account (including concurrent inserts).
create or replace function public.enforce_dentwin_patient_limit()
returns trigger language plpgsql security definer set search_path = public
as $$
declare current_count integer;
begin
  perform pg_advisory_xact_lock(hashtext(new.user_id::text));
  select count(*) into current_count from public.patients where user_id = new.user_id;
  if current_count >= 15 then
    raise exception 'DENTWIN_LIMIT_15: Maximum of 15 patient profiles per account.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists dentwin_patient_limit on public.patients;
create trigger dentwin_patient_limit before insert on public.patients
for each row execute function public.enforce_dentwin_patient_limit();

create or replace function public.set_dentwin_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;
drop trigger if exists dentwin_updated_at on public.patients;
create trigger dentwin_updated_at before update on public.patients
for each row execute function public.set_dentwin_updated_at();

-- Private image bucket. Keep it private; app requests short-lived signed URLs.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('patient-photos','patient-photos',false,5242880,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=false, file_size_limit=5242880, allowed_mime_types=array['image/jpeg','image/png','image/webp'];

drop policy if exists "Users manage own DENTWIN photos" on storage.objects;
create policy "Users manage own DENTWIN photos" on storage.objects
for all to authenticated
using (bucket_id='patient-photos' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id='patient-photos' and (storage.foldername(name))[1] = auth.uid()::text);
