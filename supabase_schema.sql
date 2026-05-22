-- ============================================================
-- Dupe My Dinner — Supabase schema migration
-- Run this in the Supabase SQL editor (Project → SQL Editor)
-- in this order:
--   1. This file (schema + RLS + indexes + trigger)
--   2. seed_ingredient_map_produce.sql
--   3. seed_ingredient_map_pantry.sql
--   4. seed_ingredient_map_core.sql
--   5. sku_manual_resolutions.sql
--   6. npm run lookup --write  (commits the 94 auto-confirmed SKUs)
-- ============================================================

-- ── Extensions ───────────────────────────────────────────────
create extension if not exists "uuid-ossp";


-- ── Tables ───────────────────────────────────────────────────

-- users
-- Extends Supabase's auth.users — one row per authenticated user.
-- Created automatically by the trigger at the bottom of this file.
create table public.users (
  id                 uuid references auth.users(id) on delete cascade primary key,
  email              text,
  home_zip           text,
  nearest_store_id   text,
  is_premium         boolean      default false,
  dupe_count_month   integer      default 0,
  created_at         timestamptz  default now()
);
comment on table public.users is
  'One row per authenticated user. id mirrors auth.users.id.';


-- ingredient_map
-- The core lookup table for ingredient → SKU → price routing.
-- is_produce=true  → skip Kroger API, use usda_avg_price directly.
-- is_pantry_staple → deduct from savings calc if user owns it.
-- preferred_sku    → human-verified; always use over live search result.
-- Not per-user — shared across all users. Written by server with service_role key.
create table public.ingredient_map (
  canonical_name   text        primary key,
  preferred_sku    text,
  kroger_sku       text,
  walmart_item_id  text,
  usda_fdc_id      text,
  usda_avg_price   numeric,
  unit             text,
  is_produce       boolean     default false,
  is_pantry_staple boolean     default false,
  price_source     text,       -- 'kroger' | 'usda_avg' | 'walmart'
  updated_at       timestamptz default now()
);
comment on table public.ingredient_map is
  'Canonical ingredient → SKU/price mapping. Shared, server-written.';


-- recipe_cache
-- Deduplicates Claude calls. Cache key is a hash of
-- (dish_name + servings + calorie_target + dietary_flags).
-- Redis is the read path; this table survives Redis eviction.
-- Written by server with service_role key.
create table public.recipe_cache (
  cache_key            text        primary key,
  dish_name            text        not null,
  servings             integer,
  calorie_target       integer,
  dietary_flags        text[]      default '{}',
  ingredients          jsonb,
  steps                jsonb,
  cook_time_mins       integer,
  difficulty           text,
  calories_per_serving integer,
  generated_at         timestamptz default now()
);
comment on table public.recipe_cache is
  'Claude recipe output cache. Redis is the hot path; this is durability.';


-- dupes
-- Every recipe a user has searched, saved, or cooked.
-- recipe_cache_key links to recipe_cache for the full recipe object.
create table public.dupes (
  id                        uuid        default uuid_generate_v4() primary key,
  user_id                   uuid        references public.users(id) on delete cascade not null,
  dish_name                 text        not null,
  restaurant                text,
  restaurant_price          numeric,
  restaurant_calories       integer,
  home_cost_total           numeric,
  home_cost_per_meal        numeric,
  home_calories_per_serving integer,
  servings_per_batch        integer,
  times_making              integer,
  total_meals               integer,
  calorie_target            integer,
  frequency_per_week        numeric,
  recipe_cache_key          text        references public.recipe_cache(cache_key),
  is_saved                  boolean     default false,
  user_rating               integer     check (user_rating between 1 and 5),
  cooked_at                 timestamptz,
  created_at                timestamptz default now()
);
comment on table public.dupes is
  'Every dupe a user has generated, saved, or cooked.';


-- pantry_items
-- User-owned ingredients that get deducted from the savings calc.
-- quantity + unit are optional — MVP only needs to know if owned or not.
create table public.pantry_items (
  id             uuid        default uuid_generate_v4() primary key,
  user_id        uuid        references public.users(id) on delete cascade not null,
  canonical_name text        not null references public.ingredient_map(canonical_name),
  quantity       numeric,
  unit           text,
  added_at       timestamptz default now(),
  unique (user_id, canonical_name)   -- one row per ingredient per user
);
comment on table public.pantry_items is
  'Ingredients the user marks as already owned. Deducted from savings calc.';


-- savings_ledger
-- Append-only log of every time a user cooks a dupe.
-- amount_saved = (restaurant_price - home_cost_per_meal) at time of cooking.
-- Used for the cumulative savings tracker and milestone push notifications.
create table public.savings_ledger (
  id           uuid        default uuid_generate_v4() primary key,
  user_id      uuid        references public.users(id) on delete cascade not null,
  dupe_id      uuid        references public.dupes(id) on delete cascade not null,
  amount_saved numeric     not null,
  logged_at    timestamptz default now()
);
comment on table public.savings_ledger is
  'Append-only log of cooked dupes for the savings tracker.';


-- ── Indexes ───────────────────────────────────────────────────
-- These cover every query the API server will actually run.

-- User's dupe history (most recent first)
create index dupes_user_id_created_at
  on public.dupes (user_id, created_at desc);

-- Saved dupes only
create index dupes_user_id_is_saved
  on public.dupes (user_id, is_saved)
  where is_saved = true;

-- Pantry lookup — the hot path for every savings calculation
create index pantry_items_user_id
  on public.pantry_items (user_id);

-- Pantry: check if a specific ingredient is owned
create index pantry_items_user_canonical
  on public.pantry_items (user_id, canonical_name);

-- Savings ledger: cumulative total + milestone check
create index savings_ledger_user_id_logged_at
  on public.savings_ledger (user_id, logged_at desc);

-- ingredient_map: route produce vs non-produce quickly
create index ingredient_map_is_produce
  on public.ingredient_map (is_produce)
  where is_produce = true;

-- ingredient_map: pantry staple quick-add list
create index ingredient_map_is_pantry_staple
  on public.ingredient_map (is_pantry_staple)
  where is_pantry_staple = true;


-- ── Row Level Security ────────────────────────────────────────
-- All user-data tables: users can only read/write their own rows.
-- Shared tables (ingredient_map, recipe_cache): readable by all
-- authenticated users, writable only by the server (service_role).

alter table public.users           enable row level security;
alter table public.dupes           enable row level security;
alter table public.pantry_items    enable row level security;
alter table public.savings_ledger  enable row level security;
alter table public.ingredient_map  enable row level security;
alter table public.recipe_cache    enable row level security;


-- users
create policy "Users can view own profile"
  on public.users for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.users for update
  using (auth.uid() = id);


-- dupes
create policy "Users can view own dupes"
  on public.dupes for select
  using (auth.uid() = user_id);

create policy "Users can insert own dupes"
  on public.dupes for insert
  with check (auth.uid() = user_id);

create policy "Users can update own dupes"
  on public.dupes for update
  using (auth.uid() = user_id);

create policy "Users can delete own dupes"
  on public.dupes for delete
  using (auth.uid() = user_id);


-- pantry_items
create policy "Users can view own pantry"
  on public.pantry_items for select
  using (auth.uid() = user_id);

create policy "Users can insert own pantry items"
  on public.pantry_items for insert
  with check (auth.uid() = user_id);

create policy "Users can update own pantry items"
  on public.pantry_items for update
  using (auth.uid() = user_id);

create policy "Users can delete own pantry items"
  on public.pantry_items for delete
  using (auth.uid() = user_id);


-- savings_ledger
create policy "Users can view own savings"
  on public.savings_ledger for select
  using (auth.uid() = user_id);

create policy "Users can insert own savings"
  on public.savings_ledger for insert
  with check (auth.uid() = user_id);

-- No update/delete on savings_ledger — it's append-only by design.


-- ingredient_map — readable by all authenticated users, no user writes
create policy "Authenticated users can read ingredient_map"
  on public.ingredient_map for select
  to authenticated
  using (true);

-- recipe_cache — readable by all authenticated users, no user writes
create policy "Authenticated users can read recipe_cache"
  on public.recipe_cache for select
  to authenticated
  using (true);

-- Server writes to ingredient_map and recipe_cache using the
-- service_role key (bypasses RLS entirely — no policy needed).


-- ── Auth trigger ──────────────────────────────────────────────
-- Creates a public.users row automatically when someone signs up
-- via Supabase auth (Apple, Google, magic link, etc.)

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, email, created_at)
  values (
    new.id,
    new.email,
    now()
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- ── Sanity checks ─────────────────────────────────────────────
-- Run these after executing the full migration to confirm everything
-- is wired up correctly.
--
-- 1. Tables exist:
--   select table_name from information_schema.tables
--   where table_schema = 'public'
--   order by table_name;
--   -- Expected: dupes, ingredient_map, pantry_items,
--   --           recipe_cache, savings_ledger, users
--
-- 2. RLS enabled on all tables:
--   select tablename, rowsecurity from pg_tables
--   where schemaname = 'public'
--   order by tablename;
--   -- Expected: rowsecurity = true for all 6 tables
--
-- 3. Indexes created:
--   select indexname from pg_indexes
--   where schemaname = 'public'
--   order by indexname;
--
-- 4. After seeding ingredient_map, check row counts:
--   select
--     is_produce,
--     is_pantry_staple,
--     count(*) as total,
--     count(kroger_sku) as has_sku,
--     count(*) - count(kroger_sku) as pending
--   from ingredient_map
--   group by is_produce, is_pantry_staple;
--   -- Expected:
--   --   is_produce=true,  is_pantry=false  → 54 rows, 0 SKUs  (all USDA)
--   --   is_produce=false, is_pantry=true   → 70 rows, 70 SKUs (after lookup)
--   --   is_produce=false, is_pantry=false  → 66 rows, 64 SKUs (2 USDA fallback)
