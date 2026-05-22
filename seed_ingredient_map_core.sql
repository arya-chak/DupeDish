-- ============================================================
-- ingredient_map — Core recipe ingredients seed
-- Proteins · Cheese · Bread · Refrigerated · Specialty
--
-- These are neither produce nor pantry staples. They are the
-- bulk-cost ingredients in almost every fast-casual dupe recipe.
-- is_produce = false, is_pantry_staple = false.
--
-- preferred_sku is the most important column here. For any
-- ingredient with multiple pack formats (ground beef, chicken,
-- cheese blocks vs shredded) a human MUST verify the preferred_sku
-- before launch. Wrong format = wrong price.
--
-- SKU status key:
--   ✅ CONFIRMED  — verified against production Kroger API (spike)
--   🔍 NEEDS LOOKUP — run GET /v1/products?filter.term={term}
--                     apply selection rules in comment at bottom
--
-- usda_avg_price is the fallback price if Kroger API misses.
-- price_source is updated to 'kroger' once preferred_sku is set.
-- ============================================================

-- ── Ground beef ──────────────────────────────────────────────
-- ✅ CONFIRMED from production spike. Three formats returned:
--   Patties  0001111096731  4ct/1.2lb  $8.99  ($7.49/lb) ← WRONG for recipes
--   Roll     0001111097972  3lb        $17.99 ($5.99/lb) ← preferred for bulk
--   Tray     0001111096970  3lb        $18.99 ($6.33/lb)
-- Recipes call for loose ground beef, not pre-formed patties.
-- preferred_sku = Roll (best per-lb value for loose beef).
INSERT INTO ingredient_map (
  canonical_name, preferred_sku, kroger_sku, walmart_item_id,
  usda_fdc_id, usda_avg_price, unit,
  is_produce, is_pantry_staple, price_source, updated_at
) VALUES
(
  'ground beef, 80/20',
  '0001111097972',        -- Kroger 80/20 Ground Beef Roll 3lb @ $5.99/lb
  '0001111097972',
  NULL,
  '174032', 5.99, 'lb',
  FALSE, FALSE, 'kroger', NOW()
),
(
  'ground beef, 90/10 lean',
  NULL, NULL, NULL,       -- 🔍 NEEDS LOOKUP: search "ground beef 90/10 lean"
  '174032', 6.99, 'lb',
  FALSE, FALSE, 'usda_avg', NOW()
),
(
  'ground turkey',
  NULL, NULL, NULL,       -- 🔍 NEEDS LOOKUP: search "ground turkey 93/7"
  '171505', 5.49, 'lb',
  FALSE, FALSE, 'usda_avg', NOW()
),
(
  'ground chicken',
  NULL, NULL, NULL,       -- 🔍 NEEDS LOOKUP: search "ground chicken"
  '171477', 5.99, 'lb',
  FALSE, FALSE, 'usda_avg', NOW()
),
(
  'ground pork',
  NULL, NULL, NULL,       -- 🔍 NEEDS LOOKUP: search "ground pork"
  '167903', 4.99, 'lb',
  FALSE, FALSE, 'usda_avg', NOW()
),

-- ── Chicken ──────────────────────────────────────────────────
-- ⚠ HIGH AMBIGUITY: boneless vs bone-in, breast vs thigh,
-- fresh vs frozen, skin-on vs skinless all return different SKUs.
-- preferred_sku must be verified. Pick boneless skinless by default.
(
  'chicken breast, boneless skinless',
  NULL, NULL, NULL,       -- 🔍 NEEDS LOOKUP: "boneless skinless chicken breast"
  '171477', 4.99, 'lb',   -- prefer fresh tray over frozen bag
  FALSE, FALSE, 'usda_avg', NOW()
),
(
  'chicken thighs, boneless skinless',
  NULL, NULL, NULL,       -- 🔍 NEEDS LOOKUP: "boneless skinless chicken thighs"
  '171477', 3.49, 'lb',
  FALSE, FALSE, 'usda_avg', NOW()
),
(
  'chicken thighs, bone-in skin-on',
  NULL, NULL, NULL,       -- 🔍 NEEDS LOOKUP: "chicken thighs bone in"
  '171477', 2.49, 'lb',
  FALSE, FALSE, 'usda_avg', NOW()
),
(
  'chicken tenders / tenderloins',
  NULL, NULL, NULL,       -- 🔍 NEEDS LOOKUP: "chicken tenderloins"
  '171477', 5.99, 'lb',
  FALSE, FALSE, 'usda_avg', NOW()
),
(
  'chicken wings',
  NULL, NULL, NULL,       -- 🔍 NEEDS LOOKUP: "chicken wings party"
  '171477', 3.99, 'lb',
  FALSE, FALSE, 'usda_avg', NOW()
),

-- ── Pork ─────────────────────────────────────────────────────
(
  'bacon, thick cut',
  NULL, NULL, NULL,       -- 🔍 NEEDS LOOKUP: "bacon thick cut"
  '168318', 6.99, '16 oz pkg',
  FALSE, FALSE, 'usda_avg', NOW()
),
(
  'bacon, regular',
  NULL, NULL, NULL,       -- 🔍 NEEDS LOOKUP: "kroger bacon original"
  '168318', 5.49, '16 oz pkg',
  FALSE, FALSE, 'usda_avg', NOW()
),
(
  'pork shoulder / butt',
  NULL, NULL, NULL,       -- 🔍 NEEDS LOOKUP: "pork shoulder butt"
  '167905', 2.99, 'lb',
  FALSE, FALSE, 'usda_avg', NOW()
),
(
  'pork belly',
  NULL, NULL, NULL,       -- 🔍 NEEDS LOOKUP: "pork belly"
  '167869', 5.99, 'lb',
  FALSE, FALSE, 'usda_avg', NOW()
),
(
  'pork chops, boneless',
  NULL, NULL, NULL,       -- 🔍 NEEDS LOOKUP: "boneless pork chops"
  '167905', 4.49, 'lb',
  FALSE, FALSE, 'usda_avg', NOW()
),
(
  'Italian sausage, mild',
  NULL, NULL, NULL,       -- 🔍 NEEDS LOOKUP: "italian sausage mild links"
  '174337', 4.99, '19 oz pkg',
  FALSE, FALSE, 'usda_avg', NOW()
),
(
  'breakfast sausage, bulk',
  NULL, NULL, NULL,       -- 🔍 NEEDS LOOKUP: "breakfast sausage roll bulk"
  '174337', 4.49, '16 oz roll',
  FALSE, FALSE, 'usda_avg', NOW()
),
(
  'chorizo, Mexican-style fresh',
  NULL, NULL, NULL,       -- 🔍 NEEDS LOOKUP: "mexican chorizo fresh"
  '174337', 3.99, '12 oz pkg',
  FALSE, FALSE, 'usda_avg', NOW()
),

-- ── Beef (non-ground) ─────────────────────────────────────────
(
  'steak, skirt / fajita',
  NULL, NULL, NULL,       -- 🔍 NEEDS LOOKUP: "skirt steak"
  '174033', 9.99, 'lb',
  FALSE, FALSE, 'usda_avg', NOW()
),
(
  'steak, flank',
  NULL, NULL, NULL,       -- 🔍 NEEDS LOOKUP: "flank steak"
  '174033', 9.49, 'lb',
  FALSE, FALSE, 'usda_avg', NOW()
),
(
  'steak, ribeye',
  NULL, NULL, NULL,       -- 🔍 NEEDS LOOKUP: "ribeye steak"
  '174033', 14.99, 'lb',
  FALSE, FALSE, 'usda_avg', NOW()
),

-- ── Seafood ──────────────────────────────────────────────────
(
  'shrimp, large, peeled deveined',
  NULL, NULL, NULL,       -- 🔍 NEEDS LOOKUP: "shrimp large peeled deveined"
  '175178', 9.99, 'lb',   -- prefer frozen raw over fresh for recipe predictability
  FALSE, FALSE, 'usda_avg', NOW()
),
(
  'salmon fillet',
  NULL, NULL, NULL,       -- 🔍 NEEDS LOOKUP: "salmon fillet fresh"
  '175168', 9.99, 'lb',
  FALSE, FALSE, 'usda_avg', NOW()
),
(
  'tilapia fillet',
  NULL, NULL, NULL,       -- 🔍 NEEDS LOOKUP: "tilapia fillet"
  '175167', 5.99, 'lb',
  FALSE, FALSE, 'usda_avg', NOW()
),
(
  'cod fillet',
  NULL, NULL, NULL,       -- 🔍 NEEDS LOOKUP: "cod fillet"
  '171958', 7.99, 'lb',
  FALSE, FALSE, 'usda_avg', NOW()
),

-- ── Tofu & plant protein ──────────────────────────────────────
(
  'tofu, extra firm',
  NULL, NULL, NULL,       -- 🔍 NEEDS LOOKUP: "extra firm tofu"
  '172457', 2.49, '14–16 oz block',
  FALSE, FALSE, 'usda_avg', NOW()
),
(
  'tofu, silken',
  NULL, NULL, NULL,       -- 🔍 NEEDS LOOKUP: "silken tofu"
  '172457', 1.99, '14 oz pkg',
  FALSE, FALSE, 'usda_avg', NOW()
),
(
  'tempeh',
  NULL, NULL, NULL,       -- 🔍 NEEDS LOOKUP: "tempeh"
  '168436', 3.49, '8 oz pkg',
  FALSE, FALSE, 'usda_avg', NOW()
),

-- ── Cheese — sliced & block ──────────────────────────────────
-- ✅ CONFIRMED from production spike:
--   Kroger Singles 16ct/12oz  0001111009434  $2.99 ($2.33 promo) ← preferred
--   Kroger Deli American 1lb  0002163410000  $7.49
(
  'american cheese, sliced',
  '0001111009434',        -- Kroger Singles American 16ct $2.99 — best value for recipes
  '0001111009434',
  NULL,
  '173414', 2.99, '16 ct / 12 oz',
  FALSE, FALSE, 'kroger', NOW()
),
(
  'cheddar cheese, mild block',
  NULL, NULL, NULL,       -- 🔍 NEEDS LOOKUP: "kroger mild cheddar block"
  '173414', 3.99, '16 oz block',
  FALSE, FALSE, 'usda_avg', NOW()
),
(
  'cheddar cheese, sharp block',
  NULL, NULL, NULL,       -- 🔍 NEEDS LOOKUP: "kroger sharp cheddar block"
  '173414', 4.49, '16 oz block',
  FALSE, FALSE, 'usda_avg', NOW()
),
(
  'cheddar cheese, shredded',
  NULL, NULL, NULL,       -- 🔍 NEEDS LOOKUP: "kroger shredded cheddar"
  '173414', 3.49, '8 oz bag',
  FALSE, FALSE, 'usda_avg', NOW()
),
(
  'pepper jack cheese, block',
  NULL, NULL, NULL,       -- 🔍 NEEDS LOOKUP: "pepper jack block"
  '173420', 4.49, '16 oz block',
  FALSE, FALSE, 'usda_avg', NOW()
),
(
  'pepper jack cheese, shredded',
  NULL, NULL, NULL,       -- 🔍 NEEDS LOOKUP: "kroger shredded pepper jack"
  '173420', 3.49, '8 oz bag',
  FALSE, FALSE, 'usda_avg', NOW()
),
(
  'monterey jack cheese, shredded',
  NULL, NULL, NULL,       -- 🔍 NEEDS LOOKUP: "kroger shredded monterey jack"
  '173418', 3.49, '8 oz bag',
  FALSE, FALSE, 'usda_avg', NOW()
),
(
  'mozzarella, shredded',
  NULL, NULL, NULL,       -- 🔍 NEEDS LOOKUP: "kroger shredded mozzarella"
  '171255', 3.49, '8 oz bag',
  FALSE, FALSE, 'usda_avg', NOW()
),
(
  'mozzarella, fresh ball',
  NULL, NULL, NULL,       -- 🔍 NEEDS LOOKUP: "fresh mozzarella ball"
  '171255', 3.99, '8 oz',
  FALSE, FALSE, 'usda_avg', NOW()
),
(
  'parmesan, shredded / grated',
  NULL, NULL, NULL,       -- 🔍 NEEDS LOOKUP: "kroger parmesan shredded"
  '173410', 3.99, '6 oz',
  FALSE, FALSE, 'usda_avg', NOW()
),
(
  'queso fresco',
  NULL, NULL, NULL,       -- 🔍 NEEDS LOOKUP: "queso fresco"
  '173416', 3.49, '10 oz',
  FALSE, FALSE, 'usda_avg', NOW()
),
(
  'cotija cheese',
  NULL, NULL, NULL,       -- 🔍 NEEDS LOOKUP: "cotija cheese"
  '173416', 3.99, '10 oz',
  FALSE, FALSE, 'usda_avg', NOW()
),
(
  'feta cheese, crumbled',
  NULL, NULL, NULL,       -- 🔍 NEEDS LOOKUP: "feta crumbled"
  '173421', 3.99, '6 oz',
  FALSE, FALSE, 'usda_avg', NOW()
),
(
  'provolone cheese, sliced',
  NULL, NULL, NULL,       -- 🔍 NEEDS LOOKUP: "provolone sliced"
  '173419', 3.99, '8 oz',
  FALSE, FALSE, 'usda_avg', NOW()
),
(
  'swiss cheese, sliced',
  NULL, NULL, NULL,       -- 🔍 NEEDS LOOKUP: "swiss cheese sliced"
  '171256', 3.99, '8 oz',
  FALSE, FALSE, 'usda_avg', NOW()
),
(
  'mexican blend cheese, shredded',
  NULL, NULL, NULL,       -- 🔍 NEEDS LOOKUP: "kroger mexican blend shredded"
  '173414', 3.49, '8 oz bag',
  FALSE, FALSE, 'usda_avg', NOW()
),

-- ── Bread & bakery ────────────────────────────────────────────
-- ✅ CONFIRMED from production spike:
--   St Pierre Brioche Burger Buns 4ct/7oz  0081166902024  $4.99 ($4.49 promo)
--   Nature's Own Brioche Burger 8ct/18oz   0007225002525  $4.79 ($3.49 promo) ← preferred per bun
(
  'brioche burger buns',
  '0007225002525',        -- Nature's Own Brioche 8ct $4.79 — best per-bun value
  '0007225002525',
  NULL,
  '172893', 4.79, '8 ct',
  FALSE, FALSE, 'kroger', NOW()
),
(
  'hamburger buns, regular',
  NULL, NULL, NULL,       -- 🔍 NEEDS LOOKUP: "kroger hamburger buns"
  '172893', 2.49, '8 ct',
  FALSE, FALSE, 'usda_avg', NOW()
),
(
  'hot dog buns',
  NULL, NULL, NULL,       -- 🔍 NEEDS LOOKUP: "kroger hot dog buns"
  '172893', 2.49, '8 ct',
  FALSE, FALSE, 'usda_avg', NOW()
),
(
  'hoagie / sub rolls',
  NULL, NULL, NULL,       -- 🔍 NEEDS LOOKUP: "hoagie rolls sub"
  '172893', 3.49, '6 ct',
  FALSE, FALSE, 'usda_avg', NOW()
),
(
  'sandwich bread, white',
  NULL, NULL, NULL,       -- 🔍 NEEDS LOOKUP: "kroger white sandwich bread"
  '172893', 2.49, '20 oz loaf',
  FALSE, FALSE, 'usda_avg', NOW()
),
(
  'sandwich bread, whole wheat',
  NULL, NULL, NULL,       -- 🔍 NEEDS LOOKUP: "kroger whole wheat bread"
  '172893', 2.99, '20 oz loaf',
  FALSE, FALSE, 'usda_avg', NOW()
),
(
  'flour tortillas, 8-inch',
  NULL, NULL, NULL,       -- 🔍 NEEDS LOOKUP: "flour tortillas 8 inch"
  '172892', 3.49, '10 ct',
  FALSE, FALSE, 'usda_avg', NOW()
),
(
  'flour tortillas, 10-inch burrito size',
  NULL, NULL, NULL,       -- 🔍 NEEDS LOOKUP: "flour tortillas burrito 10 inch"
  '172892', 3.99, '8 ct',
  FALSE, FALSE, 'usda_avg', NOW()
),
(
  'corn tortillas, 6-inch',
  NULL, NULL, NULL,       -- 🔍 NEEDS LOOKUP: "corn tortillas 6 inch"
  '172892', 2.99, '30 ct',
  FALSE, FALSE, 'usda_avg', NOW()
),
(
  'pita bread',
  NULL, NULL, NULL,       -- 🔍 NEEDS LOOKUP: "pita bread"
  '172893', 2.99, '6 ct',
  FALSE, FALSE, 'usda_avg', NOW()
),
(
  'naan bread',
  NULL, NULL, NULL,       -- 🔍 NEEDS LOOKUP: "naan bread"
  '172893', 3.99, '4 ct',
  FALSE, FALSE, 'usda_avg', NOW()
),

-- ── Pasta & noodles ───────────────────────────────────────────
(
  'pasta, spaghetti',
  NULL, NULL, NULL,       -- 🔍 NEEDS LOOKUP: "kroger spaghetti pasta"
  '168872', 1.49, '16 oz',
  FALSE, FALSE, 'usda_avg', NOW()
),
(
  'pasta, penne',
  NULL, NULL, NULL,       -- 🔍 NEEDS LOOKUP: "kroger penne pasta"
  '168872', 1.49, '16 oz',
  FALSE, FALSE, 'usda_avg', NOW()
),
(
  'pasta, fettuccine',
  NULL, NULL, NULL,       -- 🔍 NEEDS LOOKUP: "kroger fettuccine pasta"
  '168872', 1.49, '16 oz',
  FALSE, FALSE, 'usda_avg', NOW()
),
(
  'ramen noodles, fresh or dried',
  NULL, NULL, NULL,       -- 🔍 NEEDS LOOKUP: "ramen noodles"
  '168877', 1.99, '6 oz pkg',
  FALSE, FALSE, 'usda_avg', NOW()
),
(
  'rice noodles',
  NULL, NULL, NULL,       -- 🔍 NEEDS LOOKUP: "rice noodles"
  '168877', 2.99, '8 oz pkg',
  FALSE, FALSE, 'usda_avg', NOW()
),

-- ── Refrigerated specialty ────────────────────────────────────
(
  'tortilla chips',
  NULL, NULL, NULL,       -- 🔍 NEEDS LOOKUP: "tortilla chips restaurant style"
  '172931', 3.99, '13 oz bag',
  FALSE, FALSE, 'usda_avg', NOW()
),
(
  'refried beans, canned',
  NULL, NULL, NULL,       -- 🔍 NEEDS LOOKUP: "refried beans canned"
  '175192', 1.29, '16 oz can',
  FALSE, FALSE, 'usda_avg', NOW()
),
(
  'salsa verde, jarred',
  NULL, NULL, NULL,       -- 🔍 NEEDS LOOKUP: "salsa verde"
  '170074', 3.49, '16 oz',
  FALSE, FALSE, 'usda_avg', NOW()
),
(
  'chipotle peppers in adobo, canned',
  NULL, NULL, NULL,       -- 🔍 NEEDS LOOKUP: "chipotle peppers adobo"
  '170105', 1.99, '7 oz can',
  FALSE, FALSE, 'usda_avg', NOW()
),
(
  'peanut butter, creamy',
  NULL, NULL, NULL,       -- 🔍 NEEDS LOOKUP: "kroger peanut butter creamy"
  '172470', 3.99, '16 oz',
  FALSE, FALSE, 'usda_avg', NOW()
),
(
  'cream of mushroom soup, canned',
  NULL, NULL, NULL,       -- 🔍 NEEDS LOOKUP: "cream of mushroom soup"
  '172453', 1.49, '10.5 oz can',
  FALSE, FALSE, 'usda_avg', NOW()
);


-- ============================================================
-- SKU lookup script — for each NULL kroger_sku row, run:
--
--   GET https://api.kroger.com/v1/products
--     ?filter.term={canonical_name}
--     &filter.locationId={nearest_store_id}
--     &filter.limit=10
--
-- Selection rules (in priority order):
--   1. Kroger store brand over national brands where quality is equal
--   2. For proteins: fresh tray over frozen bag; loose over pre-formed
--   3. For cheese: standard size (8–16oz) over club/bulk packs
--   4. Never select specialty, organic, or premium unless it's the
--      only option — this app is about saving money
--   5. For anything with ambiguous pack formats, set preferred_sku
--      manually and add a comment noting why
--
-- Update after resolving:
--   UPDATE ingredient_map
--   SET preferred_sku = '{upc}',
--       kroger_sku    = '{upc}',
--       price_source  = 'kroger',
--       updated_at    = NOW()
--   WHERE canonical_name = '{name}';
-- ============================================================

-- Sanity checks — run after seeding:
--
-- Total core ingredient rows:
--   SELECT COUNT(*) FROM ingredient_map
--   WHERE is_produce = FALSE AND is_pantry_staple = FALSE;
--   -- Expected: 66 rows
--
-- Confirmed SKUs (spike-verified):
--   SELECT canonical_name, preferred_sku
--   FROM ingredient_map
--   WHERE is_produce = FALSE
--     AND is_pantry_staple = FALSE
--     AND kroger_sku IS NOT NULL;
--   -- Expected: 3 rows (ground beef 80/20, american cheese, brioche buns)
--
-- Still needs lookup:
--   SELECT canonical_name, unit, usda_avg_price
--   FROM ingredient_map
--   WHERE is_produce = FALSE
--     AND is_pantry_staple = FALSE
--     AND kroger_sku IS NULL
--   ORDER BY canonical_name;
--   -- Expected: 63 rows
--
-- Full ingredient_map summary after all three seeds:
--   SELECT
--     is_produce,
--     is_pantry_staple,
--     COUNT(*) as count,
--     COUNT(kroger_sku) as has_kroger_sku,
--     COUNT(*) - COUNT(kroger_sku) as needs_lookup
--   FROM ingredient_map
--   GROUP BY is_produce, is_pantry_staple;
