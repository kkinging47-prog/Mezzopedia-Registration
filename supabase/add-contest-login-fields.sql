-- Run this once in Supabase SQL Editor for an existing MEZZOPEDIA Registration database.
-- It adds the fields needed for the contest login sheet and picture links.

alter table public.registrants add column if not exists password text;
alter table public.registrants add column if not exists stage text;
alter table public.registrants add column if not exists picture_url text;
