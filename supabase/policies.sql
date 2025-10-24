-- ===============================================================
-- DJK-App  |  Supabase Row Level Security Policies (RLS)
-- Stand:   $(date)
-- Struktur basiert auf `profiles.role` ('admin' / 'player')
-- ===============================================================

-- ===============================================================
-- 🧍 Profiles
-- ===============================================================

alter table public.profiles enable row level security;

drop policy if exists profiles_read_own on public.profiles;
drop policy if exists profiles_update_own on public.profiles;
drop policy if exists profiles_admin_manage_all on public.profiles;
drop policy if exists profiles_insert_self on public.profiles;

-- Jeder darf sein eigenes Profil lesen
create policy profiles_read_own
on public.profiles
for select
to authenticated
using (auth.uid() = user_id);

-- Jeder darf sein eigenes Profil bearbeiten
create policy profiles_update_own
on public.profiles
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Admins dürfen alles
create policy profiles_admin_manage_all
on public.profiles
for all
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid() and p.role = 'admin'
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid() and p.role = 'admin'
  )
);

-- Optional: Nutzer dürfen sich selbst anlegen (wenn kein Trigger genutzt wird)
create policy profiles_insert_self
on public.profiles
for insert
to authenticated
with check (auth.uid() = user_id);



-- ===============================================================
-- ⚽ Games
-- ===============================================================

alter table public.games enable row level security;

drop policy if exists games_select_all on public.games;
drop policy if exists games_admin_manage_all on public.games;
drop policy if exists games_insert_own on public.games;

-- Alle authentifizierten Nutzer dürfen Spiele sehen
create policy games_select_all
on public.games
for select
to authenticated
using (true);

-- Admins dürfen alles
create policy games_admin_manage_all
on public.games
for all
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid() and p.role = 'admin'
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid() and p.role = 'admin'
  )
);

-- Optional: Spieler dürfen eigene Spiele hinzufügen (falls gewünscht)
create policy games_insert_own
on public.games
for insert
to authenticated
with check (auth.uid() = created_by);



-- ===============================================================
-- 🚗 Drivers
-- ===============================================================

alter table public.drivers enable row level security;

drop policy if exists drivers_select_all on public.drivers;
drop policy if exists drivers_insert_own on public.drivers;
drop policy if exists drivers_update_delete_own on public.drivers;
drop policy if exists drivers_admin_manage_all on public.drivers;

-- Jeder darf Fahrerlisten lesen
create policy drivers_select_all
on public.drivers
for select
to authenticated
using (true);

-- Spieler dürfen eigene Fahrten hinzufügen
create policy drivers_insert_own
on public.drivers
for insert
to authenticated
with check (auth.uid() = user_id);

-- Spieler dürfen eigene Fahrten bearbeiten/löschen
create policy drivers_update_delete_own
on public.drivers
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Admins dürfen alles
create policy drivers_admin_manage_all
on public.drivers
for all
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid() and p.role = 'admin'
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid() and p.role = 'admin'
  )
);



-- ===============================================================
-- 🧍 Passengers
-- ===============================================================

alter table public.passengers enable row level security;

drop policy if exists passengers_select_all on public.passengers;
drop policy if exists passengers_insert_self on public.passengers;
drop policy if exists passengers_delete_self on public.passengers;
drop policy if exists passengers_update_self on public.passengers;
drop policy if exists passengers_admin_manage_all on public.passengers;

-- Jeder darf Mitfahrerlisten sehen
create policy passengers_select_all
on public.passengers
for select
to authenticated
using (true);

-- Spieler dürfen sich selbst als Mitfahrer hinzufügen
create policy passengers_insert_self
on public.passengers
for insert
to authenticated
with check (auth.uid() = user_id);

-- Spieler dürfen sich austragen
create policy passengers_delete_self
on public.passengers
for delete
to authenticated
using (auth.uid() = user_id);

-- Spieler dürfen eigene Einträge bearbeiten (optional)
create policy passengers_update_self
on public.passengers
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Admins dürfen alles
create policy passengers_admin_manage_all
on public.passengers
for all
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid() and p.role = 'admin'
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid() and p.role = 'admin'
  )
);



-- ===============================================================
-- 🧺 Locker Duties
-- ===============================================================

alter table public.locker_duties enable row level security;

drop policy if exists locker_duties_select_all on public.locker_duties;
drop policy if exists locker_duties_update_own_or_free on public.locker_duties;
drop policy if exists locker_duties_insert_self on public.locker_duties;
drop policy if exists locker_duties_delete_self on public.locker_duties;
drop policy if exists locker_duties_admin_manage_all on public.locker_duties;

-- Alle dürfen Kabinendienste lesen
create policy locker_duties_select_all
on public.locker_duties
for select
to authenticated
using (true);

-- Spieler dürfen eigene oder freie Einträge übernehmen
create policy locker_duties_update_own_or_free
on public.locker_duties
for update
to authenticated
using ((assigned_to is null) or (assigned_to = auth.uid()))
with check ((assigned_to is null) or (assigned_to = auth.uid()));

-- Spieler dürfen neue Einträge anlegen (optional)
create policy locker_duties_insert_self
on public.locker_duties
for insert
to authenticated
with check ((assigned_to is null) or (assigned_to = auth.uid()));

-- Spieler dürfen eigene Dienste löschen (optional)
create policy locker_duties_delete_self
on public.locker_duties
for delete
to authenticated
using (assigned_to = auth.uid());

-- Admins dürfen alles
create policy locker_duties_admin_manage_all
on public.locker_duties
for all
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid() and p.role = 'admin'
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid() and p.role = 'admin'
  )
);



-- ===============================================================
-- 🧽 Wash Duties
-- ===============================================================

alter table public.wash_duties enable row level security;

drop policy if exists wash_duties_select_all on public.wash_duties;
drop policy if exists wash_duties_update_own_or_free on public.wash_duties;
drop policy if exists wash_duties_insert_self on public.wash_duties;
drop policy if exists wash_duties_delete_self on public.wash_duties;
drop policy if exists wash_duties_admin_manage_all on public.wash_duties;

-- Alle dürfen Waschdienste lesen
create policy wash_duties_select_all
on public.wash_duties
for select
to authenticated
using (true);

-- Spieler dürfen freie oder eigene übernehmen
create policy wash_duties_update_own_or_free
on public.wash_duties
for update
to authenticated
using ((assigned_to is null) or (assigned_to = auth.uid()))
with check ((assigned_to is null) or (assigned_to = auth.uid()));

-- Spieler dürfen eigene Dienste anlegen (optional)
create policy wash_duties_insert_self
on public.wash_duties
for insert
to authenticated
with check ((assigned_to is null) or (assigned_to = auth.uid()));

-- Spieler dürfen eigene Dienste löschen (optional)
create policy wash_duties_delete_self
on public.wash_duties
for delete
to authenticated
using (assigned_to = auth.uid());

-- Admins dürfen alles
create policy wash_duties_admin_manage_all
on public.wash_duties
for all
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid() and p.role = 'admin'
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid() and p.role = 'admin'
  )
);
