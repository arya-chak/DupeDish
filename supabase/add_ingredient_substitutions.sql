-- ============================================================
-- ingredient_substitutions — budget/premium substitution pairs
-- Run in the Supabase SQL editor after all seed files and
-- add_budget_tier_ingredient_map.sql have been applied.
-- ============================================================
-- NOTE: The brief specified REFERENCES ingredient_map(id) with UUID FKs,
-- but ingredient_map uses canonical_name (text) as its primary key — no id
-- column exists. These FKs reference canonical_name instead, which is
-- equivalent and eliminates the need for UUID subqueries in the seed file.
-- ============================================================

CREATE TABLE public.ingredient_substitutions (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  from_name   text        NOT NULL REFERENCES public.ingredient_map(canonical_name) ON DELETE CASCADE,
  to_name     text        NOT NULL REFERENCES public.ingredient_map(canonical_name) ON DELETE CASCADE,
  direction   text        NOT NULL CHECK (direction IN ('budget', 'premium')),
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (from_name, direction)
);

COMMENT ON TABLE public.ingredient_substitutions IS
  'Maps premium ingredients to budget alternates for budget mode substitution.';

ALTER TABLE public.ingredient_substitutions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read ingredient_substitutions"
  ON public.ingredient_substitutions FOR SELECT
  TO authenticated
  USING (true);

-- Server writes via service_role key (bypasses RLS — no policy needed).
