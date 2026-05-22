-- ============================================================
-- ingredient_map — Pantry staples seed
-- All rows: is_pantry_staple = true, is_produce = false
--
-- Unlike produce, pantry items ARE indexed in Kroger's Products
-- API. kroger_sku / preferred_sku should be filled before launch
-- by running the lookup script against the production API.
--
-- SKUs marked ✅ CONFIRMED were verified against the production
-- Kroger API during the initial spike (Plano, TX region).
-- SKUs marked 🔍 NEEDS LOOKUP require one Products API call
-- to resolve — run: GET /v1/products?filter.term={term}
--
-- usda_avg_price is the fallback if the Kroger SKU is missing
-- or the API returns no price. These are USDA ERS annual averages
-- (late 2024 dataset). Pantry items do NOT get the
-- "estimated price" label in the UI — they show a real Kroger
-- price once the SKU is resolved.
--
-- Pantry deduction logic: if user marks this item as owned,
-- price = $0 in the savings calculation. If not owned, shown
-- in a "you'll also need" section at the bottom of the list.
-- ============================================================

-- ── Oils & fats ──────────────────────────────────────────────
INSERT INTO ingredient_map (
  canonical_name, preferred_sku, kroger_sku, walmart_item_id,
  usda_fdc_id, usda_avg_price, unit,
  is_produce, is_pantry_staple, price_source, updated_at
) VALUES

-- ✅ CONFIRMED from production spike (Plano TX, Kroger Custer Park)
(
  'olive oil, extra virgin',
  '0001111087856',         -- Kroger EVOO 16.9 fl oz $6.49 — best value unit for recipe use
  '0001111087856',
  NULL,
  '171413', 6.49, '16.9 fl oz',
  FALSE, TRUE, 'kroger', NOW()
),

-- 🔍 NEEDS LOOKUP — all items below have NULL kroger_sku until API lookup script runs
(
  'vegetable oil',
  NULL, NULL, NULL,
  '172336', 4.99, '48 fl oz',
  FALSE, TRUE, 'usda_avg', NOW()
),
(
  'canola oil',
  NULL, NULL, NULL,
  '172336', 4.49, '48 fl oz',
  FALSE, TRUE, 'usda_avg', NOW()
),
(
  'sesame oil',
  NULL, NULL, NULL,
  '172339', 4.99, '8 fl oz',
  FALSE, TRUE, 'usda_avg', NOW()
),
(
  'avocado oil',
  NULL, NULL, NULL,
  '173573', 7.99, '16.9 fl oz',
  FALSE, TRUE, 'usda_avg', NOW()
),
(
  'butter, unsalted',
  NULL, NULL, NULL,
  '173410', 5.49, '1 lb / 4 sticks',
  FALSE, TRUE, 'usda_avg', NOW()
),
(
  'butter, salted',
  NULL, NULL, NULL,
  '173410', 5.49, '1 lb / 4 sticks',
  FALSE, TRUE, 'usda_avg', NOW()
),
(
  'cooking spray, nonstick',
  NULL, NULL, NULL,
  '172345', 3.49, '6 oz can',
  FALSE, TRUE, 'usda_avg', NOW()
),

-- ── Vinegars ─────────────────────────────────────────────────
(
  'white vinegar, distilled',
  NULL, NULL, NULL,
  '172238', 2.99, '32 fl oz',
  FALSE, TRUE, 'usda_avg', NOW()
),
(
  'apple cider vinegar',
  NULL, NULL, NULL,
  '173469', 3.49, '32 fl oz',
  FALSE, TRUE, 'usda_avg', NOW()
),
(
  'rice vinegar',
  NULL, NULL, NULL,
  '172240', 2.99, '12 fl oz',
  FALSE, TRUE, 'usda_avg', NOW()
),
(
  'red wine vinegar',
  NULL, NULL, NULL,
  '172239', 2.99, '12 fl oz',
  FALSE, TRUE, 'usda_avg', NOW()
),

-- ── Condiments & sauces ──────────────────────────────────────
(
  'ketchup',
  NULL, NULL, NULL,
  '170184', 3.49, '32 oz',
  FALSE, TRUE, 'usda_avg', NOW()
),
(
  'yellow mustard',
  NULL, NULL, NULL,
  '170186', 1.49, '14 oz',
  FALSE, TRUE, 'usda_avg', NOW()
),
(
  'dijon mustard',
  NULL, NULL, NULL,
  '170185', 3.29, '8 oz',
  FALSE, TRUE, 'usda_avg', NOW()
),
(
  'mayonnaise',
  NULL, NULL, NULL,
  '172740', 5.49, '30 oz',
  FALSE, TRUE, 'usda_avg', NOW()
),
(
  'soy sauce',
  NULL, NULL, NULL,
  '172238', 2.49, '10 fl oz',
  FALSE, TRUE, 'usda_avg', NOW()
),
(
  'soy sauce, low sodium',
  NULL, NULL, NULL,
  '172238', 2.49, '10 fl oz',
  FALSE, TRUE, 'usda_avg', NOW()
),
(
  'worcestershire sauce',
  NULL, NULL, NULL,
  '172241', 2.99, '10 fl oz',
  FALSE, TRUE, 'usda_avg', NOW()
),
(
  'hot sauce',
  NULL, NULL, NULL,
  '175168', 2.99, '12 fl oz',
  FALSE, TRUE, 'usda_avg', NOW()
),
(
  'sriracha',
  NULL, NULL, NULL,
  '175168', 3.99, '28 oz',
  FALSE, TRUE, 'usda_avg', NOW()
),
(
  'fish sauce',
  NULL, NULL, NULL,
  '173430', 3.49, '7 fl oz',
  FALSE, TRUE, 'usda_avg', NOW()
),
(
  'oyster sauce',
  NULL, NULL, NULL,
  '172347', 3.49, '9 oz',
  FALSE, TRUE, 'usda_avg', NOW()
),
(
  'hoisin sauce',
  NULL, NULL, NULL,
  '172347', 3.49, '7 oz',
  FALSE, TRUE, 'usda_avg', NOW()
),
(
  'salsa, jarred',
  NULL, NULL, NULL,
  '170073', 3.49, '16 oz',
  FALSE, TRUE, 'usda_avg', NOW()
),
(
  'tahini',
  NULL, NULL, NULL,
  '168591', 6.99, '16 oz',
  FALSE, TRUE, 'usda_avg', NOW()
),

-- ── Dry spices & seasonings ───────────────────────────────────
(
  'salt, kosher',
  NULL, NULL, NULL,
  '173468', 3.49, '48 oz box',
  FALSE, TRUE, 'usda_avg', NOW()
),
(
  'salt, table',
  NULL, NULL, NULL,
  '173468', 1.29, '26 oz',
  FALSE, TRUE, 'usda_avg', NOW()
),
(
  'black pepper, ground',
  NULL, NULL, NULL,
  '170931', 3.29, '3 oz',
  FALSE, TRUE, 'usda_avg', NOW()
),
(
  'black pepper, whole / peppercorns',
  NULL, NULL, NULL,
  '170931', 4.49, '2 oz',
  FALSE, TRUE, 'usda_avg', NOW()
),
(
  'garlic powder',
  NULL, NULL, NULL,
  '170921', 2.49, '3 oz',
  FALSE, TRUE, 'usda_avg', NOW()
),
(
  'onion powder',
  NULL, NULL, NULL,
  '170929', 2.49, '3 oz',
  FALSE, TRUE, 'usda_avg', NOW()
),
(
  'cumin, ground',
  NULL, NULL, NULL,
  '170922', 2.29, '2 oz',
  FALSE, TRUE, 'usda_avg', NOW()
),
(
  'chili powder',
  NULL, NULL, NULL,
  '170919', 2.29, '2.5 oz',
  FALSE, TRUE, 'usda_avg', NOW()
),
(
  'paprika, sweet',
  NULL, NULL, NULL,
  '170930', 2.29, '2 oz',
  FALSE, TRUE, 'usda_avg', NOW()
),
(
  'paprika, smoked',
  NULL, NULL, NULL,
  '170930', 2.99, '2 oz',
  FALSE, TRUE, 'usda_avg', NOW()
),
(
  'oregano, dried',
  NULL, NULL, NULL,
  '170928', 1.99, '0.75 oz',
  FALSE, TRUE, 'usda_avg', NOW()
),
(
  'cayenne pepper, ground',
  NULL, NULL, NULL,
  '170918', 1.99, '1.5 oz',
  FALSE, TRUE, 'usda_avg', NOW()
),
(
  'red pepper flakes',
  NULL, NULL, NULL,
  '170932', 1.99, '1.5 oz',
  FALSE, TRUE, 'usda_avg', NOW()
),
(
  'cinnamon, ground',
  NULL, NULL, NULL,
  '170920', 2.99, '2 oz',
  FALSE, TRUE, 'usda_avg', NOW()
),
(
  'Italian seasoning',
  NULL, NULL, NULL,
  '170928', 2.49, '0.75 oz',
  FALSE, TRUE, 'usda_avg', NOW()
),
(
  'bay leaves',
  NULL, NULL, NULL,
  '170924', 1.99, '0.1 oz',
  FALSE, TRUE, 'usda_avg', NOW()
),
(
  'thyme, dried',
  NULL, NULL, NULL,
  '170935', 1.99, '0.5 oz',
  FALSE, TRUE, 'usda_avg', NOW()
),
(
  'seasoned salt',
  NULL, NULL, NULL,
  '173468', 2.49, '4.25 oz',
  FALSE, TRUE, 'usda_avg', NOW()
),

-- ── Sweeteners ───────────────────────────────────────────────
(
  'sugar, granulated white',
  NULL, NULL, NULL,
  '169655', 3.29, '4 lb',
  FALSE, TRUE, 'usda_avg', NOW()
),
(
  'sugar, brown, light or dark',
  NULL, NULL, NULL,
  '168833', 2.79, '2 lb',
  FALSE, TRUE, 'usda_avg', NOW()
),
(
  'honey',
  NULL, NULL, NULL,
  '169640', 5.49, '12 oz',
  FALSE, TRUE, 'usda_avg', NOW()
),
(
  'maple syrup, pure',
  NULL, NULL, NULL,
  '168875', 8.99, '12 fl oz',
  FALSE, TRUE, 'usda_avg', NOW()
),

-- ── Dry pantry / baking ──────────────────────────────────────
(
  'all-purpose flour',
  NULL, NULL, NULL,
  '169761', 3.99, '5 lb',
  FALSE, TRUE, 'usda_avg', NOW()
),
(
  'cornstarch',
  NULL, NULL, NULL,
  '169717', 1.99, '16 oz',
  FALSE, TRUE, 'usda_avg', NOW()
),
(
  'breadcrumbs, plain',
  NULL, NULL, NULL,
  '172893', 2.49, '15 oz',
  FALSE, TRUE, 'usda_avg', NOW()
),
(
  'breadcrumbs, panko',
  NULL, NULL, NULL,
  '172893', 3.49, '8 oz',
  FALSE, TRUE, 'usda_avg', NOW()
),
(
  'baking powder',
  NULL, NULL, NULL,
  '175036', 1.99, '8.1 oz',
  FALSE, TRUE, 'usda_avg', NOW()
),
(
  'baking soda',
  NULL, NULL, NULL,
  '175037', 0.99, '16 oz',
  FALSE, TRUE, 'usda_avg', NOW()
),

-- ── Canned & jarred goods ─────────────────────────────────────
(
  'chicken broth / stock',
  NULL, NULL, NULL,
  '171534', 2.99, '32 fl oz',
  FALSE, TRUE, 'usda_avg', NOW()
),
(
  'beef broth / stock',
  NULL, NULL, NULL,
  '171535', 2.99, '32 fl oz',
  FALSE, TRUE, 'usda_avg', NOW()
),
(
  'tomato paste',
  NULL, NULL, NULL,
  '170461', 1.49, '6 oz can',
  FALSE, TRUE, 'usda_avg', NOW()
),
(
  'tomatoes, canned diced',
  NULL, NULL, NULL,
  '170457', 1.49, '14.5 oz can',
  FALSE, TRUE, 'usda_avg', NOW()
),
(
  'tomatoes, canned crushed',
  NULL, NULL, NULL,
  '170457', 1.79, '28 oz can',
  FALSE, TRUE, 'usda_avg', NOW()
),
(
  'coconut milk, canned',
  NULL, NULL, NULL,
  '174836', 2.49, '13.5 oz can',
  FALSE, TRUE, 'usda_avg', NOW()
),
(
  'black beans, canned',
  NULL, NULL, NULL,
  '173735', 1.29, '15 oz can',
  FALSE, TRUE, 'usda_avg', NOW()
),
(
  'kidney beans, canned',
  NULL, NULL, NULL,
  '173736', 1.29, '15 oz can',
  FALSE, TRUE, 'usda_avg', NOW()
),
(
  'chickpeas / garbanzo beans, canned',
  NULL, NULL, NULL,
  '173757', 1.49, '15 oz can',
  FALSE, TRUE, 'usda_avg', NOW()
),

-- ── Grains & dry starch ──────────────────────────────────────
(
  'white rice, long grain',
  NULL, NULL, NULL,
  '169756', 2.99, '2 lb',
  FALSE, TRUE, 'usda_avg', NOW()
),
(
  'brown rice, long grain',
  NULL, NULL, NULL,
  '168878', 3.49, '2 lb',
  FALSE, TRUE, 'usda_avg', NOW()
),

-- ── Dairy basics ─────────────────────────────────────────────
(
  'eggs, large',
  NULL, NULL, NULL,
  '748967', 3.99, 'dozen',
  FALSE, TRUE, 'usda_avg', NOW()
),
(
  'whole milk',
  NULL, NULL, NULL,
  '746782', 3.99, '1 gallon',
  FALSE, TRUE, 'usda_avg', NOW()
),
(
  'heavy cream',
  NULL, NULL, NULL,
  '170859', 3.49, '1 pint',
  FALSE, TRUE, 'usda_avg', NOW()
),
(
  'sour cream',
  NULL, NULL, NULL,
  '170482', 2.49, '16 oz',
  FALSE, TRUE, 'usda_avg', NOW()
),
(
  'cream cheese',
  NULL, NULL, NULL,
  '171252', 2.99, '8 oz',
  FALSE, TRUE, 'usda_avg', NOW()
);


-- ============================================================
-- SKU lookup helper — run this for each NULL-SKU row to fill
-- in preferred_sku and kroger_sku before launch:
--
--   GET https://api.kroger.com/v1/products
--     ?filter.term={canonical_name}
--     &filter.locationId={nearest_store_id}
--     &filter.limit=5
--
-- Selection rules when picking preferred_sku:
--   1. Prefer Kroger store brand over national brands
--   2. For multi-format items (oil sizes, etc.) pick mid-size
--      unit with best price-per-oz — not the cheapest total
--   3. Never pick specialty/organic unless no standard exists
--
-- After resolving, update the row:
--   UPDATE ingredient_map
--   SET preferred_sku = '{upc}',
--       kroger_sku    = '{upc}',
--       price_source  = 'kroger',
--       updated_at    = NOW()
--   WHERE canonical_name = '{name}';
-- ============================================================

-- Quick sanity checks — run after seeding:
--
-- Total count:
--   SELECT COUNT(*) FROM ingredient_map WHERE is_pantry_staple = TRUE;
--   -- Expected: 70 rows
--
-- Unresolved SKUs (need API lookup before launch):
--   SELECT canonical_name, unit, usda_avg_price
--   FROM ingredient_map
--   WHERE is_pantry_staple = TRUE AND kroger_sku IS NULL
--   ORDER BY canonical_name;
--   -- Expected: 69 rows — all except olive oil (confirmed in spike)
--
-- Confirmed SKUs:
--   SELECT canonical_name, preferred_sku, kroger_sku
--   FROM ingredient_map
--   WHERE is_pantry_staple = TRUE AND kroger_sku IS NOT NULL;
--   -- Expected: 1 row (olive oil, extra virgin)
