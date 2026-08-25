-- Live Finals accommodation request update
-- Run this after supabase/live-finalists-confirmation.sql in the same Supabase project.
-- It adds an accommodation request option to the finalist confirmation flow and export.

alter table public.live_finalists
  add column if not exists accommodation_required boolean not null default false;

alter table public.live_finalists
  add column if not exists accommodation_note text;

create index if not exists live_finalists_accommodation_required_idx
  on public.live_finalists (accommodation_required);

-- The return shape changes, so drop and recreate the public search RPC.
drop function if exists public.search_live_finalists(text);

create or replace function public.search_live_finalists(p_query text)
returns table (
  id uuid,
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
  where length(trim(coalesce(p_query, ''))) >= 2
    and lf.full_name ilike '%' || trim(p_query) || '%'
  order by lf.full_name
  limit 25;
$$;

revoke all on function public.search_live_finalists(text) from public;
grant execute on function public.search_live_finalists(text) to anon, authenticated;

-- New confirm/update RPC with accommodation fields. The earlier function can remain, but the app now calls this signature.
create or replace function public.confirm_live_finalist(
  p_id uuid,
  p_unique_code text,
  p_school_name text,
  p_school_location text,
  p_region text,
  p_email text,
  p_phone text,
  p_whatsapp text,
  p_travel_from text,
  p_companion_name text,
  p_companion_relationship text,
  p_companion_phone text,
  p_accommodation_required boolean,
  p_accommodation_note text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  expected_code text;
  updated_row public.live_finalists;
begin
  select unique_code into expected_code
  from public.live_finalists
  where id = p_id;

  if expected_code is null then
    raise exception 'Finalist record not found.';
  end if;

  if upper(trim(coalesce(p_unique_code, ''))) <> upper(trim(expected_code)) then
    raise exception 'The user code is incorrect. Please check your contest user code and try again.';
  end if;

  update public.live_finalists
  set
    school_name = nullif(trim(coalesce(p_school_name, '')), ''),
    school_location = nullif(trim(coalesce(p_school_location, '')), ''),
    region = nullif(trim(coalesce(p_region, '')), ''),
    email = nullif(trim(coalesce(p_email, '')), ''),
    phone = nullif(trim(coalesce(p_phone, '')), ''),
    whatsapp = nullif(trim(coalesce(p_whatsapp, '')), ''),
    travel_from = nullif(trim(coalesce(p_travel_from, '')), ''),
    companion_name = nullif(trim(coalesce(p_companion_name, '')), ''),
    companion_relationship = nullif(trim(coalesce(p_companion_relationship, '')), ''),
    companion_phone = nullif(trim(coalesce(p_companion_phone, '')), ''),
    accommodation_required = coalesce(p_accommodation_required, false),
    accommodation_note = nullif(trim(coalesce(p_accommodation_note, '')), ''),
    confirmation_status = 'confirmed',
    confirmed_at = now()
  where id = p_id
  returning * into updated_row;

  insert into public.live_finalist_confirmation_log (finalist_id, action, snapshot)
  values (
    p_id,
    'confirm',
    jsonb_build_object(
      'full_name', updated_row.full_name,
      'class_name', updated_row.class_name,
      'school_name', updated_row.school_name,
      'school_location', updated_row.school_location,
      'region', updated_row.region,
      'email', updated_row.email,
      'phone', updated_row.phone,
      'whatsapp', updated_row.whatsapp,
      'travel_from', updated_row.travel_from,
      'companion_name', updated_row.companion_name,
      'companion_relationship', updated_row.companion_relationship,
      'companion_phone', updated_row.companion_phone,
      'accommodation_required', updated_row.accommodation_required,
      'accommodation_note', updated_row.accommodation_note,
      'reporting_date', updated_row.reporting_date,
      'confirmed_at', updated_row.confirmed_at
    )
  );

  return true;
end;
$$;

revoke all on function public.confirm_live_finalist(uuid,text,text,text,text,text,text,text,text,text,text,text,boolean,text) from public;
grant execute on function public.confirm_live_finalist(uuid,text,text,text,text,text,text,text,text,text,text,text,boolean,text) to anon, authenticated;

-- Keep the admin PDF export in sync too.
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
