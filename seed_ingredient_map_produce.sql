-- ============================================================
-- ingredient_map — Produce seed
-- All rows: is_produce = true, price_source = 'usda_avg'
-- Kroger/Walmart SKUs intentionally NULL — Products API
-- returns 0 results for PLU-coded produce (confirmed in spike).
-- These items always route to USDA average pricing at runtime.
--
-- USDA avg prices sourced from USDA ERS "Average Retail Food
-- Prices" dataset (most recent annual averages available as of
-- late 2024). Verify FDC IDs at fdc.nal.usda.gov before launch.
-- ============================================================

-- ── Lettuce ─────────────────────────────────────────────────
INSERT INTO ingredient_map (
  canonical_name, preferred_sku, kroger_sku, walmart_item_id,
  usda_fdc_id, usda_avg_price, unit,
  is_produce, is_pantry_staple, price_source, updated_at
) VALUES
(
  'lettuce, iceberg',
  NULL, NULL, NULL,
  '169248', 1.29, 'head',
  TRUE, FALSE, 'usda_avg', NOW()
),
(
  'lettuce, romaine',
  NULL, NULL, NULL,
  '169249', 1.59, 'head',
  TRUE, FALSE, 'usda_avg', NOW()
),
(
  'lettuce, romaine hearts',
  NULL, NULL, NULL,
  '169249', 3.49, '3-pack',
  TRUE, FALSE, 'usda_avg', NOW()
),
(
  'lettuce, green leaf',
  NULL, NULL, NULL,
  '169250', 1.69, 'head',
  TRUE, FALSE, 'usda_avg', NOW()
),
(
  'lettuce, butter / bibb',
  NULL, NULL, NULL,
  '168437', 2.49, 'head',
  TRUE, FALSE, 'usda_avg', NOW()
),

-- ── Tomatoes ────────────────────────────────────────────────
(
  'tomatoes, beefsteak',
  NULL, NULL, NULL,
  '170457', 1.89, 'lb',
  TRUE, FALSE, 'usda_avg', NOW()
),
(
  'tomatoes, roma',
  NULL, NULL, NULL,
  '170461', 1.39, 'lb',
  TRUE, FALSE, 'usda_avg', NOW()
),
(
  'tomatoes, cherry',
  NULL, NULL, NULL,
  '170468', 3.49, 'pint',
  TRUE, FALSE, 'usda_avg', NOW()
),
(
  'tomatoes, grape',
  NULL, NULL, NULL,
  '170468', 2.99, '10 oz',
  TRUE, FALSE, 'usda_avg', NOW()
),
(
  'tomatoes, vine-ripe',
  NULL, NULL, NULL,
  '170457', 1.99, 'lb',
  TRUE, FALSE, 'usda_avg', NOW()
),

-- ── Onions ──────────────────────────────────────────────────
(
  'onion, yellow',
  NULL, NULL, NULL,
  '170000', 0.99, 'lb',
  TRUE, FALSE, 'usda_avg', NOW()
),
(
  'onion, white',
  NULL, NULL, NULL,
  '169276', 1.09, 'lb',
  TRUE, FALSE, 'usda_avg', NOW()
),
(
  'onion, red',
  NULL, NULL, NULL,
  '169275', 1.29, 'lb',
  TRUE, FALSE, 'usda_avg', NOW()
),
(
  'onions, green / scallions',
  NULL, NULL, NULL,
  '170000', 0.99, 'bunch',
  TRUE, FALSE, 'usda_avg', NOW()
),

-- ── Avocado ─────────────────────────────────────────────────
(
  'avocado, hass',
  NULL, NULL, NULL,
  '171705', 1.29, 'each',
  TRUE, FALSE, 'usda_avg', NOW()
),

-- ── Peppers ─────────────────────────────────────────────────
(
  'jalapeño peppers',
  NULL, NULL, NULL,
  '169359', 2.49, 'lb',
  TRUE, FALSE, 'usda_avg', NOW()
),
(
  'serrano peppers',
  NULL, NULL, NULL,
  '170105', 2.99, 'lb',
  TRUE, FALSE, 'usda_avg', NOW()
),
(
  'bell pepper, green',
  NULL, NULL, NULL,
  '170108', 0.99, 'each',
  TRUE, FALSE, 'usda_avg', NOW()
),
(
  'bell pepper, red',
  NULL, NULL, NULL,
  '170109', 1.49, 'each',
  TRUE, FALSE, 'usda_avg', NOW()
),
(
  'bell pepper, yellow',
  NULL, NULL, NULL,
  '170110', 1.49, 'each',
  TRUE, FALSE, 'usda_avg', NOW()
),
(
  'bell pepper, orange',
  NULL, NULL, NULL,
  '170111', 1.49, 'each',
  TRUE, FALSE, 'usda_avg', NOW()
),
(
  'poblano peppers',
  NULL, NULL, NULL,
  '170106', 1.99, 'lb',
  TRUE, FALSE, 'usda_avg', NOW()
),
(
  'banana peppers',
  NULL, NULL, NULL,
  '170107', 1.99, 'lb',
  TRUE, FALSE, 'usda_avg', NOW()
),

-- ── Cucumber ────────────────────────────────────────────────
(
  'cucumber, english / seedless',
  NULL, NULL, NULL,
  '168409', 1.49, 'each',
  TRUE, FALSE, 'usda_avg', NOW()
),
(
  'cucumber, regular',
  NULL, NULL, NULL,
  '168409', 0.89, 'each',
  TRUE, FALSE, 'usda_avg', NOW()
),

-- ── Citrus ──────────────────────────────────────────────────
(
  'lime',
  NULL, NULL, NULL,
  '167746', 0.49, 'each',
  TRUE, FALSE, 'usda_avg', NOW()
),
(
  'lemon',
  NULL, NULL, NULL,
  '167747', 0.59, 'each',
  TRUE, FALSE, 'usda_avg', NOW()
),

-- ── Fresh herbs ─────────────────────────────────────────────
(
  'cilantro, fresh',
  NULL, NULL, NULL,
  '169997', 0.99, 'bunch',
  TRUE, FALSE, 'usda_avg', NOW()
),
(
  'parsley, fresh',
  NULL, NULL, NULL,
  '170416', 0.99, 'bunch',
  TRUE, FALSE, 'usda_avg', NOW()
),
(
  'basil, fresh',
  NULL, NULL, NULL,
  '172232', 1.99, '0.75 oz pkg',
  TRUE, FALSE, 'usda_avg', NOW()
),
(
  'mint, fresh',
  NULL, NULL, NULL,
  '173473', 1.99, '0.75 oz pkg',
  TRUE, FALSE, 'usda_avg', NOW()
),
(
  'rosemary, fresh',
  NULL, NULL, NULL,
  '172231', 1.99, '0.5 oz pkg',
  TRUE, FALSE, 'usda_avg', NOW()
),
(
  'thyme, fresh',
  NULL, NULL, NULL,
  '172229', 1.99, '0.5 oz pkg',
  TRUE, FALSE, 'usda_avg', NOW()
),

-- ── Alliums ─────────────────────────────────────────────────
(
  'garlic, head',
  NULL, NULL, NULL,
  '169230', 0.69, 'head',
  TRUE, FALSE, 'usda_avg', NOW()
),
(
  'shallots',
  NULL, NULL, NULL,
  '170496', 1.99, 'lb',
  TRUE, FALSE, 'usda_avg', NOW()
),

-- ── Leafy greens ────────────────────────────────────────────
(
  'spinach, baby',
  NULL, NULL, NULL,
  '168462', 3.49, '5 oz bag',
  TRUE, FALSE, 'usda_avg', NOW()
),
(
  'spinach, regular',
  NULL, NULL, NULL,
  '168462', 2.99, 'bunch',
  TRUE, FALSE, 'usda_avg', NOW()
),
(
  'arugula',
  NULL, NULL, NULL,
  '169386', 3.49, '5 oz bag',
  TRUE, FALSE, 'usda_avg', NOW()
),
(
  'cabbage, green',
  NULL, NULL, NULL,
  '169975', 0.79, 'lb',
  TRUE, FALSE, 'usda_avg', NOW()
),
(
  'cabbage, red',
  NULL, NULL, NULL,
  '169976', 0.99, 'lb',
  TRUE, FALSE, 'usda_avg', NOW()
),
(
  'coleslaw mix',
  NULL, NULL, NULL,
  '169975', 1.99, '14 oz bag',
  TRUE, FALSE, 'usda_avg', NOW()
),
(
  'kale, curly',
  NULL, NULL, NULL,
  '323505', 1.99, 'bunch',
  TRUE, FALSE, 'usda_avg', NOW()
),

-- ── Root vegetables ─────────────────────────────────────────
(
  'carrots, whole',
  NULL, NULL, NULL,
  '170393', 0.89, 'lb',
  TRUE, FALSE, 'usda_avg', NOW()
),
(
  'carrots, shredded / matchstick',
  NULL, NULL, NULL,
  '170393', 1.99, '10 oz bag',
  TRUE, FALSE, 'usda_avg', NOW()
),
(
  'russet potato',
  NULL, NULL, NULL,
  '170030', 0.89, 'lb',
  TRUE, FALSE, 'usda_avg', NOW()
),
(
  'sweet potato',
  NULL, NULL, NULL,
  '168482', 1.29, 'lb',
  TRUE, FALSE, 'usda_avg', NOW()
),

-- ── Other common produce ─────────────────────────────────────
(
  'corn, ear',
  NULL, NULL, NULL,
  '170392', 0.79, 'ear',
  TRUE, FALSE, 'usda_avg', NOW()
),
(
  'mushrooms, cremini / button',
  NULL, NULL, NULL,
  '169251', 3.49, '8 oz',
  TRUE, FALSE, 'usda_avg', NOW()
),
(
  'mushrooms, portobello',
  NULL, NULL, NULL,
  '169252', 3.99, 'each',
  TRUE, FALSE, 'usda_avg', NOW()
),
(
  'zucchini',
  NULL, NULL, NULL,
  '169291', 1.49, 'lb',
  TRUE, FALSE, 'usda_avg', NOW()
),
(
  'broccoli',
  NULL, NULL, NULL,
  '170379', 1.99, 'head',
  TRUE, FALSE, 'usda_avg', NOW()
),

-- ── Fruit used in savory dishes ──────────────────────────────
(
  'mango',
  NULL, NULL, NULL,
  '169910', 1.29, 'each',
  TRUE, FALSE, 'usda_avg', NOW()
),
(
  'pineapple',
  NULL, NULL, NULL,
  '169124', 2.99, 'each',
  TRUE, FALSE, 'usda_avg', NOW()
);


-- ============================================================
-- Quick sanity check — run this after seeding:
--
--   SELECT canonical_name, usda_avg_price, unit
--   FROM ingredient_map
--   WHERE is_produce = TRUE
--   ORDER BY canonical_name;
--
-- Expected: 54 rows, all with usda_avg_price > 0 and
-- preferred_sku / kroger_sku both NULL.
-- ============================================================
