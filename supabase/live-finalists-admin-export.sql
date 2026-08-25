-- Live Finals admin PDF export helper
-- Run this in the same Supabase project after live-finalists-confirmation.sql.
-- It allows the admin dashboard to fetch the full finalist summary/contact dataset for PDF export.

alter table public.live_finalists add column if not exists accommodation_required boolean not null default false;
alter table public.live_finalists add column if not exists accommodation_note text;

create or replace function public.list_live_finalists_for_admin()
returns table (
  id uuid,
  unique_code text,
  full_name text,
  class_name text,
  school_name text,
  school_location text,
  region text,
  email text,
  phone text,
  whatsapp text,
  travel_from text,
  companion_name text,
  companion_relationship text,
  companion_phone text,
  accommodation_required boolean,
  accommodation_note text,
  reporting_date date,
  confirmation_status text,
  confirmed_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    lf.id,
    lf.unique_code,
    lf.full_name,
    lf.class_name,
    lf.school_name,
    lf.school_location,
    lf.region,
    lf.email,
    lf.phone,
    lf.whatsapp,
    lf.travel_from,
    lf.companion_name,
    lf.companion_relationship,
    lf.companion_phone,
    lf.accommodation_required,
    lf.accommodation_note,
    lf.reporting_date,
    lf.confirmation_status,
    lf.confirmed_at
  from public.live_finalists lf
  order by lf.reporting_date, lf.class_name, lf.full_name;
$$;

revoke all on function public.list_live_finalists_for_admin() from public;
grant execute on function public.list_live_finalists_for_admin() to anon, authenticated;
