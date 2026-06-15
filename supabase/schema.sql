-- MEZZOPEDIA Registration Portal database setup for Supabase
-- Run this file in Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.registrants (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text,
  email text,
  payment_status text not null default 'unpaid' check (payment_status in ('paid', 'unpaid', 'pending')),
  unique_code text not null unique,
  category text not null check (category in ('student', 'adult')),
  proof_url text,
  proof_filename text,
  proof_uploaded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists registrants_full_name_idx on public.registrants using gin (to_tsvector('simple', full_name));
create index if not exists registrants_category_idx on public.registrants (category);
create index if not exists registrants_payment_status_idx on public.registrants (payment_status);

create table if not exists public.admin_notifications (
  id uuid primary key default gen_random_uuid(),
  registrant_id uuid references public.registrants(id) on delete set null,
  registrant_name text,
  type text not null,
  message text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.app_settings (
  key text primary key,
  value text,
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_registrants_updated_at on public.registrants;
create trigger set_registrants_updated_at
before update on public.registrants
for each row execute function public.set_updated_at();

-- Storage bucket for payment proof files.
insert into storage.buckets (id, name, public)
values ('payment-proofs', 'payment-proofs', true)
on conflict (id) do update set public = true;

-- MVP access policies. This keeps the app simple for a public contest registration portal.
-- For a high-security production version, replace these with Supabase Auth + admin roles.
alter table public.registrants enable row level security;
alter table public.admin_notifications enable row level security;
alter table public.app_settings enable row level security;

-- Registrants: public can read/search, users can edit their name/upload proof, admin UI can manage records.
drop policy if exists "Public read registrants" on public.registrants;
create policy "Public read registrants" on public.registrants for select using (true);

drop policy if exists "Public insert registrants" on public.registrants;
create policy "Public insert registrants" on public.registrants for insert with check (true);

drop policy if exists "Public update registrants" on public.registrants;
create policy "Public update registrants" on public.registrants for update using (true) with check (true);

drop policy if exists "Public delete registrants" on public.registrants;
create policy "Public delete registrants" on public.registrants for delete using (true);

-- Notifications: users create notifications, admin reads and manages them.
drop policy if exists "Public read notifications" on public.admin_notifications;
create policy "Public read notifications" on public.admin_notifications for select using (true);

drop policy if exists "Public insert notifications" on public.admin_notifications;
create policy "Public insert notifications" on public.admin_notifications for insert with check (true);

drop policy if exists "Public update notifications" on public.admin_notifications;
create policy "Public update notifications" on public.admin_notifications for update using (true) with check (true);

drop policy if exists "Public delete notifications" on public.admin_notifications;
create policy "Public delete notifications" on public.admin_notifications for delete using (true);

-- Settings: used for uploaded logo.
drop policy if exists "Public read settings" on public.app_settings;
create policy "Public read settings" on public.app_settings for select using (true);

drop policy if exists "Public write settings" on public.app_settings;
create policy "Public write settings" on public.app_settings for all using (true) with check (true);

-- Storage policies for proof upload/read.
drop policy if exists "Public read payment proofs" on storage.objects;
create policy "Public read payment proofs" on storage.objects for select using (bucket_id = 'payment-proofs');

drop policy if exists "Public upload payment proofs" on storage.objects;
create policy "Public upload payment proofs" on storage.objects for insert with check (bucket_id = 'payment-proofs');

drop policy if exists "Public update payment proofs" on storage.objects;
create policy "Public update payment proofs" on storage.objects for update using (bucket_id = 'payment-proofs') with check (bucket_id = 'payment-proofs');

-- Optional sample records. Delete these after testing if you do not need them.
insert into public.registrants (full_name, phone, email, payment_status, unique_code, category)
values
  ('Kofi Mensah', '0240000000', 'kofi@example.com', 'paid', 'MZP-STU-SAMPLE1', 'student'),
  ('Ama Boateng', '0550000000', 'ama@example.com', 'unpaid', 'MZP-STU-SAMPLE2', 'student'),
  ('Kwame Addo', '0200000000', 'kwame@example.com', 'pending', 'MZP-ADT-SAMPLE1', 'adult')
on conflict (unique_code) do nothing;
