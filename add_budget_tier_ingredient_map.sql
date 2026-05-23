-- ============================================================
-- ingredient_map — Add budget_tier column
-- Run in the Supabase SQL editor after all seed files have been applied.
-- ============================================================

-- ── 1. Add column ────────────────────────────────────────────
ALTER TABLE public.ingredient_map
  ADD COLUMN budget_tier text
    NOT NULL
    DEFAULT 'standard'
    CHECK (budget_tier IN ('premium', 'standard', 'budget'));

COMMENT ON COLUMN public.ingredient_map.budget_tier IS
  'Used by the price service to find cheaper ingredient substitutions when a user''s budget is exceeded.';


-- ── 2. Populate existing rows ─────────────────────────────────
-- All rows default to 'standard'. Only override premium and budget tiers below.

-- ── PREMIUM ──────────────────────────────────────────────────
-- Specialty cuts, expensive seafood, high-cost oils/sweeteners,
-- and specialty cheeses/bread that cost noticeably more per use.

UPDATE public.ingredient_map SET budget_tier = 'premium' WHERE canonical_name IN (
  -- Beef specialty cuts
  'steak, skirt / fajita',
  'steak, flank',
  'steak, ribeye',

  -- Pork specialty
  'pork belly',
  'bacon, thick cut',

  -- Premium seafood
  'shrimp, large, peeled deveined',
  'salmon fillet',

  -- Premium oils
  'sesame oil',
  'avocado oil',

  -- Premium sweetener
  'maple syrup, pure',

  -- Specialty cheeses
  'mozzarella, fresh ball',
  'parmesan, shredded / grated',

  -- Specialty bread
  'brioche burger buns'
);


-- ── BUDGET ───────────────────────────────────────────────────
-- Pantry staples, dry spices, canned goods, basic grains, and
-- the cheapest everyday produce.

UPDATE public.ingredient_map SET budget_tier = 'budget' WHERE canonical_name IN (
  -- Dry spices & seasonings
  'salt, kosher',
  'salt, table',
  'black pepper, ground',
  'black pepper, whole / peppercorns',
  'garlic powder',
  'onion powder',
  'cumin, ground',
  'chili powder',
  'paprika, sweet',
  'paprika, smoked',
  'oregano, dried',
  'cayenne pepper, ground',
  'red pepper flakes',
  'cinnamon, ground',
  'Italian seasoning',
  'bay leaves',
  'thyme, dried',
  'seasoned salt',

  -- Vinegars
  'white vinegar, distilled',
  'apple cider vinegar',
  'rice vinegar',
  'red wine vinegar',

  -- Basic condiments
  'ketchup',
  'yellow mustard',
  'soy sauce',
  'soy sauce, low sodium',
  'worcestershire sauce',
  'hot sauce',

  -- Basic oils
  'vegetable oil',
  'canola oil',
  'cooking spray, nonstick',

  -- Sweeteners
  'sugar, granulated white',
  'sugar, brown, light or dark',

  -- Dry pantry / baking
  'all-purpose flour',
  'cornstarch',
  'breadcrumbs, plain',
  'baking powder',
  'baking soda',

  -- Broths
  'chicken broth / stock',
  'beef broth / stock',

  -- Canned goods
  'tomato paste',
  'tomatoes, canned diced',
  'tomatoes, canned crushed',
  'black beans, canned',
  'kidney beans, canned',
  'chickpeas / garbanzo beans, canned',
  'refried beans, canned',
  'cream of mushroom soup, canned',

  -- Grains
  'white rice, long grain',
  'brown rice, long grain',

  -- Dry pasta & noodles
  'pasta, spaghetti',
  'pasta, penne',
  'pasta, fettuccine',
  'ramen noodles, fresh or dried',
  'rice noodles',

  -- Budget produce (cheap everyday aromatics, roots, basics)
  'onion, yellow',
  'onion, white',
  'onion, red',
  'onions, green / scallions',
  'garlic, head',
  'carrots, whole',
  'cabbage, green',
  'cabbage, red',
  'russet potato',
  'lettuce, iceberg',
  'corn, ear',
  'lime',
  'lemon'
);


-- ── 3. Sanity check ──────────────────────────────────────────
-- Run this after executing to verify the distribution looks right.
--
--   SELECT budget_tier, COUNT(*) AS total
--   FROM ingredient_map
--   GROUP BY budget_tier
--   ORDER BY budget_tier;
--   -- Expected roughly: budget ~55, standard ~120, premium ~15
--
--   SELECT canonical_name, budget_tier
--   FROM ingredient_map
--   ORDER BY budget_tier, canonical_name;
