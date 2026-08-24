-- Mezzopedia Live Finals self-service confirmation portal
-- Run this once in the Supabase SQL Editor for the Mezzopedia Registration project.
-- It creates a private finalist table, secure RPC functions, and seeds the 53 final live finalists.

create extension if not exists pgcrypto;

create table if not exists public.live_finalists (
  id uuid primary key default gen_random_uuid(),
  usercode text not null unique,
  full_name text not null,
  class_name text not null check (class_name in ('Primary 5','Primary 6','JHS 1','JHS 2','JHS 3','SHS','Adults')),
  school text,
  location text,
  region text,
  email text,
  phone text,
  whatsapp text,
  companion_name text,
  companion_relationship text,
  companion_phone text,
  recording_date date not null,
  confirmation_status text not null default 'pending' check (confirmation_status in ('pending','confirmed')),
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists live_finalists_name_idx on public.live_finalists using gin (to_tsvector('simple', full_name));
create index if not exists live_finalists_class_idx on public.live_finalists (class_name);
create index if not exists live_finalists_region_idx on public.live_finalists (region);
create index if not exists live_finalists_confirmation_idx on public.live_finalists (confirmation_status);

alter table public.live_finalists enable row level security;

-- No direct public table access. Contestants use the RPC functions below.
revoke all on table public.live_finalists from anon, authenticated;

create or replace function public.live_finalist_recording_date(p_class_name text)
returns date
language sql
immutable
set search_path = public
as $$
  select case
    when p_class_name in ('Primary 5','Primary 6') then date '2026-08-31'
    when p_class_name in ('JHS 1','JHS 2','JHS 3') then date '2026-09-01'
    else date '2026-09-02'
  end;
$$;

create or replace function public.search_live_finalists(p_query text)
returns table (
  id uuid,
  full_name text,
  class_name text,
  region text,
  location text,
  recording_date date,
  confirmation_status text
)
language sql
stable
security definer
set search_path = public
as $$
  select f.id, f.full_name, f.class_name, f.region, f.location, f.recording_date, f.confirmation_status
  from public.live_finalists f
  where char_length(trim(coalesce(p_query,''))) >= 2
    and f.full_name ilike '%' || trim(p_query) || '%'
  order by f.full_name
  limit 30;
$$;

create or replace function public.get_live_finalist_details(p_id uuid, p_usercode text)
returns table (
  id uuid,
  usercode text,
  full_name text,
  class_name text,
  school text,
  location text,
  region text,
  email text,
  phone text,
  whatsapp text,
  companion_name text,
  companion_relationship text,
  companion_phone text,
  recording_date date,
  confirmation_status text,
  confirmed_at timestamptz,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    f.id, f.usercode, f.full_name, f.class_name, f.school, f.location, f.region,
    f.email, f.phone, f.whatsapp, f.companion_name, f.companion_relationship,
    f.companion_phone, f.recording_date, f.confirmation_status, f.confirmed_at, f.updated_at
  from public.live_finalists f
  where f.id = p_id
    and upper(f.usercode) = upper(trim(coalesce(p_usercode,'')))
  limit 1;
$$;

create or replace function public.update_live_finalist_details(
  p_id uuid,
  p_usercode text,
  p_full_name text,
  p_class_name text,
  p_school text,
  p_location text,
  p_region text,
  p_email text,
  p_phone text,
  p_whatsapp text,
  p_companion_name text,
  p_companion_relationship text,
  p_companion_phone text
)
returns setof public.live_finalists
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_class_name not in ('Primary 5','Primary 6','JHS 1','JHS 2','JHS 3','SHS','Adults') then
    raise exception 'Invalid class/category';
  end if;

  return query
  update public.live_finalists f
  set
    full_name = nullif(trim(p_full_name),''),
    class_name = p_class_name,
    school = nullif(trim(coalesce(p_school,'')),''),
    location = nullif(trim(coalesce(p_location,'')),''),
    region = nullif(trim(coalesce(p_region,'')),''),
    email = nullif(trim(coalesce(p_email,'')),''),
    phone = nullif(trim(coalesce(p_phone,'')),''),
    whatsapp = nullif(trim(coalesce(p_whatsapp,'')),''),
    companion_name = nullif(trim(coalesce(p_companion_name,'')),''),
    companion_relationship = nullif(trim(coalesce(p_companion_relationship,'')),''),
    companion_phone = nullif(trim(coalesce(p_companion_phone,'')),''),
    recording_date = public.live_finalist_recording_date(p_class_name),
    confirmation_status = 'pending',
    confirmed_at = null,
    updated_at = now()
  where f.id = p_id
    and upper(f.usercode) = upper(trim(coalesce(p_usercode,'')))
  returning f.*;
end;
$$;

create or replace function public.confirm_live_finalist(p_id uuid, p_usercode text)
returns setof public.live_finalists
language sql
security definer
set search_path = public
as $$
  update public.live_finalists f
  set confirmation_status = 'confirmed',
      confirmed_at = now(),
      updated_at = now()
  where f.id = p_id
    and upper(f.usercode) = upper(trim(coalesce(p_usercode,'')))
  returning f.*;
$$;

revoke all on function public.live_finalist_recording_date(text) from public;
revoke all on function public.search_live_finalists(text) from public;
revoke all on function public.get_live_finalist_details(uuid,text) from public;
revoke all on function public.update_live_finalist_details(uuid,text,text,text,text,text,text,text,text,text,text,text,text) from public;
revoke all on function public.confirm_live_finalist(uuid,text) from public;
grant execute on function public.search_live_finalists(text) to anon, authenticated;
grant execute on function public.get_live_finalist_details(uuid,text) to anon, authenticated;
grant execute on function public.update_live_finalist_details(uuid,text,text,text,text,text,text,text,text,text,text,text,text) to anon, authenticated;
grant execute on function public.confirm_live_finalist(uuid,text) to anon, authenticated;

insert into public.live_finalists
  (usercode, full_name, class_name, school, location, region, email, phone, whatsapp,
   companion_name, companion_relationship, companion_phone, recording_date)
values
('MNMCA0002', 'Albert Chris Essel Donkoh', 'Adults', null, 'Mankessim', 'Central Region', 'dprincipal90@gmail.com', '0530651855', null, 'Self', 'Self', '0530651855', '2026-09-02'),
('MNMCA0005', 'Emmanuel Arku Korsah', 'Adults', null, 'Tema, Golf City', 'Greater Accra Region', 'korsah578@gmail.com', '0506936923', null, 'Self', 'Self', '0506936923', '2026-09-02'),
('MNMCA0006', 'Frimpong Nana Akowuah', 'Adults', null, 'Atonsu', 'Ashanti Region', 'akowuahnana00@gmail.com', '0593460494', null, 'Self', 'Self', '0593460494', '2026-09-02'),
('MNMCA0036', 'Godwin Kwaku Dornyo', 'Adults', null, 'Agbozume', 'Volta Region', 'godwindornyo13@gmail.com', '0545161071', null, 'Self', 'Self', '0545161071', '2026-09-02'),
('MNMCA0035', 'Solomon Affum', 'Adults', null, 'Asamankese', 'Eastern Region', 'solomonaffum85@gmail.com', '0242101896', null, 'Self', 'Self', '0242101896', '2026-09-02'),
('MNMC00160', 'Atuahene Kezia', 'JHS 1', 'Leesbon Educational Centre', 'Asokore Mampong, Kumasi, P.O, AN 2914', 'Ashanti Region', 'yawagyenimboateng90@gmail.com', '0242819324', null, 'Joyce Ackah', 'Registered guardian', '0242819324', '2026-09-01'),
('MNMC00102', 'Hilton Scott Ebbah', 'JHS 1', 'Republic Academy', 'Obom Road, Kasoa', 'Central Region', 'michaelfosu5080@gmail.com', '+233555111979', null, 'Mrs Anita Ahiabu', 'Registered guardian', '0555111979', '2026-09-01'),
('MNMC00103', 'Jeremy Mawuena Hodonu', 'JHS 1', 'Republic Academy', 'Obom Road, Kasoa', 'Central Region', 'enninrita2024@gmail.com', '+233242031383', null, 'Ophelia Addai Hodonu', 'Registered guardian', '0242031383', '2026-09-01'),
('MNMC00035', 'Kobea Joseph Godson', 'JHS 1', null, null, null, 'mavisadjei112233@gmail.com', '+233593312311', null, null, null, null, '2026-09-01'),
('MNMC00168', 'Mohammed Abdul-Faheem Borenyi', 'JHS 1', 'SDA JHS B', 'Buipe-Bridge', 'Savannah Region', 'kamilajob234@gmail.com', '0208074933', null, 'Mohammed Kamila Job', 'Registered guardian', '0208074933', '2026-09-01'),
('MNMC00159', 'Mozimbil Selina', 'JHS 1', 'Leesbon Educational Centre', 'Asokore Mampong, Kumasi, P.O, Box 2419', 'Ashanti Region', 'yawagyenimboateng90@gmail.com', '0243707965', null, 'Nang Elizabeth', 'Registered guardian', '0243707965', '2026-09-01'),
('MNMC00099', 'Quinnella Adwoa Adutwumwah Darko', 'JHS 1', 'Republic Academy', 'Obom Road, Kasoa', 'Central Region', 'elizabethekoh97@gmail.com', '+233244929997', null, 'Mrs. Elizabeth Ekoh', 'Registered guardian', '0244929997', '2026-09-01'),
('MNMC00129', 'Yayra Enam Ankora', 'JHS 1', 'United Church School', 'TESHIE-NUNGUA', 'Greater Accra Region', 'rolanddadzoe@gmail.com', '0244990103', null, 'Grace Worlanyo Krah', 'Registered guardian', '0244990103', '2026-09-01'),
('MNMC00161', 'Abdul Mateen Hafiz', 'JHS 2', 'Leesbon Educational Centre', 'Asokore Mampong, Kumasi, P.O, Box AN 2914', 'Ashanti Region', 'yawagyenimboateng90@gmail.com', '0556563000', null, 'Hajia Zeena Salifu', 'Registered guardian', '0556563000', '2026-09-01'),
('MNMC00107', 'Adebiyi Precious Abena Adenike Adom', 'JHS 2', 'Perseverance International School', 'Nsawam', 'Greater Accra Region', 'adebiyialice26@gmail.com', '+233243368919', null, 'Alice N-yellabong', 'Registered guardian', '0243368919', '2026-09-01'),
('MNMC00148', 'Dinah Naadu Ayertey', 'JHS 2', 'United Church School', 'TESHIE-NUNGUA', 'Greater Accra Region', 'rolanddadzoe@gmail.com', '0246277100', null, 'Vida Dornor Pewudie', 'Registered guardian', '+233 24 627 7100', '2026-09-01'),
('MNMC00028', 'Haatim Adam', 'JHS 2', 'Gold Avenue', 'Old Ashongman', 'Greater Accra Region', 'haatim201411@gmail.com', '+233244187975', null, 'Mr Nurudeen Adam', 'Registered guardian', '244187975', '2026-09-01'),
('MNMC00005', 'Jersey Darko Owusu', 'JHS 2', 'Mirekua International Community School', 'Sapeiman - Accra', 'Greater Accra Region', 'ladyjulia1990@gmail.com', '+233547579996', null, 'Juliana Nyarkoah Ababio', 'Registered guardian', '0547579996', '2026-09-01'),
('MNMC00079', 'Akosua Nyamekye Oforiwa Akonnor', 'JHS 3', 'Mart Beck International School', 'Kasoa Papaase No. 2', 'Central Region', 'kwabs24@gmail.com', '+233249482839', null, 'Sampson Boamah', 'Registered guardian', '0249482839', '2026-09-01'),
('MNMC00126', 'Angela Yayra Anyomi', 'JHS 3', 'Dar-Es-Salaam JHS', 'TESHIE-NUNGUA', 'Greater Accra Region', 'rolanddadzoe@gmail.com', '0243954615', null, 'Daniel Anyomi', 'Registered guardian', '0243954615', '2026-09-01'),
('MNMC00062', 'Barima Okyere Ofori Ayim', 'JHS 3', 'Presbyterian Preparatory School', 'Nii Boi Town', 'Greater Accra Region', 'fletcherszoe@gmail.com', '+233555071570', null, 'Essel Dorothy', 'Registered guardian', '0555071570', '2026-09-01'),
('MNMC00060', 'Boadi appah Earl Jason', 'JHS 3', 'Accra high school', 'North ridge', 'Greater Accra Region', 'earlboadi8@gmail.com', '+233508787500', null, 'Mrs. Dorcas Dankwa', 'Registered guardian', '0508787500', '2026-09-01'),
('MNMC00049', 'Fidèlle Sena Dzivenu', 'JHS 3', 'Kotobabi ''3'' Basic school', 'Kotobabi', 'Greater Accra Region', 'thepinkhood11@gmail.com', '+233553847919', null, 'Delali Togbe', 'Registered guardian', '0553847919', '2026-09-01'),
('MNMC00075', 'Hakeem Botchwey', 'JHS 3', 'Mart Beck International School', 'Kasoa Papaase', 'Central Region', 'kwabs24@gmail.com', '+233249482839', null, 'Sampson Boamah', 'Registered guardian', '0249482839', '2026-09-01'),
('MNMC00078', 'Joshua Edem Dotse', 'JHS 3', 'Mart Beck International School', 'Kasoa Papaase No. 2', 'Central Region', 'kwabs24@gmail.com', '+233249482839', null, 'Sampson Boamah', 'Registered guardian', '0249482839', '2026-09-01'),
('MNMC00089', 'Nana Yaw Peprah', 'JHS 3', 'GOD''S GLORY ACADEMY', 'Ablekuma North District', 'Greater Accra Region', 'jamespeprahboateng57@gmail.com', '+233554615538', null, 'Thelma Klewiah', 'Registered guardian', '0554615538', '2026-09-01'),
('MNMC00125', 'Prudence Mensah', 'JHS 3', 'United Church School', 'TESHIE-NUNGUA', 'Greater Accra Region', 'rolanddadzoe@gmail.com', '0243452977', null, 'Alfred Mensah', 'Registered guardian', '0243452977', '2026-09-01'),
('MNMC00180', 'ADELAYITA SHEENA DZIEDZORM', 'Primary 5', 'Crystal Height International School', 'SIKPORNTELE, AMASAMAN', 'Greater Accra Region', 'roselklut@gmail.com', '0249594954', '0249594954', 'KLUTSE-ADELAYITA ROSE ELORM', 'Registered guardian', '0249594954', '2026-08-31'),
('MNMC00150', 'Alisha Zaynab Belem', 'Primary 5', 'Linvoy Academy', 'Kpobiman-Container', 'Greater Accra Region', 'enninrita2024@gmail.com', '0204163245', null, 'Adama Belem', 'Registered guardian', '0204163245', '2026-08-31'),
('MNMC00145', 'Dagbe Awushie Wagba', 'Primary 5', 'United Church School', 'TESHIE-NUNGUA', 'Greater Accra Region', 'rolanddadzoe@gmail.com', '0591899847', null, 'Wisdom Worlanyo Wagba', 'Registered guardian', '0591899847', '2026-08-31'),
('MNMC00117', 'Grace Wilhelmina Yaa Kekeli Deku', 'Primary 5', 'PETHELEN MONTESSORI', 'TAIFA', 'Greater Accra Region', 'lynagold80@gmail.com', '+233244679807', null, 'Christopher Deku', 'Registered guardian', '0244679807', '2026-08-31'),
('MNMC00144', 'Nana Kwesi Ansah Tyrell Elvin Enzo', 'Primary 5', 'Bridge Roses Montessori', 'Ashongman Estate Accra', 'Greater Accra Region', 'ewuakyeadjeib@gmail.com', '0245738998', null, 'Celestine Adjei', 'Registered guardian', '0245738998', '2026-08-31'),
('MNMC00169', 'Bediako Grace', 'Primary 6', 'Leesbon Educational Centre', 'Asokore Mampong, Ashanti Region', 'Ashanti Region', 'yawagyenimboateng90@gmail.com', '0249934037', '0550927668', 'Naana Juliana Attia', 'Registered guardian', '0249934037', '2026-08-31'),
('MNMC00112', 'Dakora McKinley', 'Primary 6', 'King Solomon International School', 'Nkontwima, New Road', 'Ashanti Region', 'koaj334@gmail.com', '+233593312311', null, 'Sir Amaniampong Ofosuhene Kwaku', 'Registered guardian', '0593312311', '2026-08-31'),
('MNMC00177', 'Daniel Amenyo Abiwu', 'Primary 6', 'Morning Angels Basic School', 'Dome', 'Greater Accra Region', 'gademordavid23@gmail.com', '0544168690', '0544168690', 'Confidence Abiwu', 'Registered guardian', '0544168690', '2026-08-31'),
('MNMC00088', 'Danielle Abla Dugbenu', 'Primary 6', 'Crystal Height International School', 'Amasaman, Shikpontele', 'Greater Accra Region', 'kojodumas@gmail.com', '+233242312640', null, 'Lawrenda Pappoe', 'Registered guardian', '0242312640', '2026-08-31'),
('MNMC00022', 'DESMOND MENSAH', 'Primary 6', 'His Majesty School, Mankessim', 'Mankessim', 'Central Region', 'dprincipal90@gmail.com', '+233593272535', null, 'BENEDICT BUABENG', 'Registered guardian', '+233593272535', '2026-08-31'),
('MNMC00175', 'Gad Kobina Yeboah', 'Primary 6', 'His Majesty School, Mankessim', 'Mankessim', 'Central Region', 'dprincipal90@gmail.com', '0596865190', '0596865190', 'Mr. Albert Chris Essel Donkoh', 'Registered guardian', '0596865190', '2026-08-31'),
('MNMC00119', 'Jadon Novignon', 'Primary 6', 'Crystal Heights International School', 'Amasaman', 'Greater Accra Region', 'jnovignon2015@gmail.com', '+233599523813', null, 'Augustina Novignon', 'Registered guardian', '0599523813', '2026-08-31'),
('MNMC00149', 'Joel Bortei Boye Doku', 'Primary 6', 'United Church School', 'TESHIE-NUNGUA', 'Greater Accra Region', 'rolanddadzoe@gmail.com', '0264888863', null, 'Benjamin Boye Doku', 'Registered guardian', '0264888863', '2026-08-31'),
('MNMC00171', 'Kelvin Asamoah', 'Primary 6', 'Leesbon Educational Centre', 'Asokore Mampong', 'Ashanti Region', 'yawagyenimboateng90@gmail.com', '0545348284', '0550927668', 'Fauzia Awuah', 'Registered guardian', '0545348284', '2026-08-31'),
('MNMC00059', 'Madiba Oduro Acheampong', 'Primary 6', 'King Solomon International School', 'New Road, Nkontwima', 'Ashanti Region', 'koaj334@gmail.com', '+233547699755', null, 'Mavis Agyei', 'Registered guardian', '+233547699755', '2026-08-31'),
('MNMC00042', 'Michelle Ama Serwaa Ayim', 'Primary 6', 'Crystal Heights International School', 'Accra - Amasaman', 'Greater Accra Region', 'eayim6011@gmail.com', '0244303313', '+233 59 299 9299', 'Evans K. Ayim', 'Registered guardian', '0244303313', '2026-08-31'),
('MNMC00170', 'Muhammad Awal lbrahim', 'Primary 6', 'Leesbon Educational Centre', 'Asokore Mampong, Ashanti Region', 'Ashanti Region', 'yawagyenimboateng90@gmail.com', '0246136448', '0550927668', 'Hummu Suleiman', 'Registered guardian', '0246136448', '2026-08-31'),
('MNMC00085', 'Nazarena A. Kwao', 'Primary 6', 'Crystal Heights International School', 'Amasaman', 'Greater Accra Region', 'jay.efya.den@gmail.com', '+233242515048', null, 'Jennifer Denkyi', 'Registered guardian', '0242515048', '2026-08-31'),
('MNMC00032', 'Paul Etornam Doe', 'Primary 6', 'Crystals Heights International School', 'Sapeiman', 'Greater Accra Region', 'voicetomen@gmail.com', '+233249167853', null, 'Dorcas Doe', 'Registered guardian', '0249167853', '2026-08-31'),
('MNMC00072', 'Sedinam Dei', 'Primary 6', 'Services Primary and Junior High School', 'Burma Camp', 'Greater Accra Region', 'patiencedei12@gmail.com', '+233244622432', null, 'Patience Gomashie Dei', 'Registered guardian', '0244622432', '2026-08-31'),
('MNMC00004', 'Theikos Ofori', 'Primary 6', 'Sincere Care Montessori School', 'Broadcasting, Weija. Off Accra Cape Coast Highway', 'Greater Accra Region', 'georgeofori83@gmail.com', '+233244633609', null, 'George Ofori', 'Registered guardian', '0244633609', '2026-08-31'),
('MNMC00073', 'Amegah-Awli Edwin Dziedzorm', 'SHS', 'Presbyterian Boys'' Secondary School', 'East Legon', 'Greater Accra Region', 'amegahawlidziedzorm@gmail.com', '+233242911547', null, 'Komla Awli', 'Registered guardian', '0242911547', '2026-09-02'),
('MNMCA0032', 'George Lordson Dadzie', 'SHS', null, 'Takoradi', 'Western Region', 'dadziegeorgelordson@gmail.com', '0206116609', null, 'Self', 'Self', '0206116609', '2026-09-02'),
('MNMCA0030', 'Mensah Addai Michael', 'SHS', null, 'Kumasi', 'Ashanti Region', 'teslamichael22@gmail.com', '0533308763', null, 'Self', 'Self', '0533308763', '2026-09-02'),
('MNMC00121', 'Nzebah Michael', 'SHS', 'St. Thomas Senior High Technical School', 'Asamankese', 'Greater Accra Region', 'nzebahmichael@gmail.com', '0548768752', null, 'Gabriel Nzebah', 'Registered guardian', '+233548768752', '2026-09-02'),
('MNMC00038', 'YELOUH AGODOE JOYCE', 'SHS', 'ECOLE RONSARD', 'EAST LEGON', 'Greater Accra Region', 'joyceyelouh@gmail.com', '+233545008731', null, 'ROSE XOLASSE TOKPAH', 'Registered guardian', '0545008731', '2026-09-02')
on conflict (usercode) do nothing;
