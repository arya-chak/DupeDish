-- ============================================================
-- ingredient_substitutions — seed budget substitution pairs
-- Run AFTER add_ingredient_substitutions.sql.
-- All from_name and to_name values must exist in ingredient_map.
-- ============================================================
-- VERIFY before running:
--   "ground beef, 80/20"      — check canonical_name in ingredient_map
--   "canned tuna in water"    — check canonical_name in ingredient_map
--   "romano, grated"          — check canonical_name in ingredient_map
-- The names below match the seeded ingredient_map canonical names.
-- "pork shoulder / butt" and "hamburger buns, regular" are used here
-- (the brief listed "pork shoulder" and "hamburger buns, standard" —
-- corrected to match the actual DB canonical names from seed files).
-- ============================================================

INSERT INTO public.ingredient_substitutions (from_name, to_name, direction, notes) VALUES
  ('steak, skirt / fajita',          'ground beef, 80/20',                'budget', 'significant flavor difference'),
  ('steak, flank',                   'ground beef, 80/20',                'budget', 'significant flavor difference'),
  ('steak, ribeye',                  'ground beef, 80/20',                'budget', 'significant flavor difference'),
  ('pork belly',                     'pork shoulder / butt',              'budget', NULL),
  ('bacon, thick cut',               'bacon, regular',                    'budget', NULL),
  ('shrimp, large, peeled deveined', 'chicken breast, boneless skinless', 'budget', NULL),
  ('salmon fillet',                  'canned tuna in water',              'budget', NULL),
  ('sesame oil',                     'vegetable oil',                     'budget', 'flavor profile differs'),
  ('avocado oil',                    'vegetable oil',                     'budget', NULL),
  ('maple syrup, pure',              'honey',                             'budget', NULL),
  ('mozzarella, fresh ball',         'mozzarella, shredded',              'budget', NULL),
  ('parmesan, shredded / grated',    'romano, grated',                    'budget', NULL),
  ('brioche burger buns',            'hamburger buns, regular',           'budget', NULL)
ON CONFLICT (from_name, direction) DO NOTHING;
