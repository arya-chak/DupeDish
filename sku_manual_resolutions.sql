-- ============================================================
-- sku_manual_resolutions.sql
-- Resolves all 38 rows flagged for human review by sku_lookup.ts
-- Decisions documented inline for each row.
-- Run this against your Supabase DB after the seed files are loaded.
-- ============================================================

-- ── ground chicken ───────────────────────────────────────────
-- Dog food ranked first. Correct pick is Perdue 1lb tray ($4.99/lb).
-- The 3lb Perdue is fine too but the 1lb is cleaner for recipe scaling.
UPDATE ingredient_map SET preferred_sku='0007274506369', kroger_sku='0007274506369', price_source='kroger', updated_at=NOW()
WHERE canonical_name='ground chicken';

-- ── ground pork ──────────────────────────────────────────────
-- Kroger store brand 1lb tray ($3.49) is the right pick — loose ground pork,
-- not the Duroc premium or the beef/pork blend.
UPDATE ingredient_map SET preferred_sku='0001111097275', kroger_sku='0001111097275', price_source='kroger', updated_at=NOW()
WHERE canonical_name='ground pork';

-- ── breakfast sausage, bulk ───────────────────────────────────
-- Kroger Mild Pork Sausage Roll 16oz at $3.49 is the right pick —
-- store brand, cheapest, correct format (roll not links).
UPDATE ingredient_map SET preferred_sku='0001111097298', kroger_sku='0001111097298', price_source='kroger', updated_at=NOW()
WHERE canonical_name='breakfast sausage, bulk';

-- ── chorizo, Mexican-style fresh ──────────────────────────────
-- No results from Kroger API. Fresh Mexican chorizo is hit-or-miss
-- in the Products API — likely sold by weight at the meat counter
-- without a standard UPC. Keep USDA fallback, flag in UI as "check
-- meat counter." No SKU to set.
-- (no UPDATE — leave kroger_sku NULL, usda_avg_price fallback stays)

-- ── salmon fillet ────────────────────────────────────────────
-- Two whole-fish options within 5% per-lb — script flagged ambiguous.
-- Pick the standard Atlantic fillet portion from Kroger ($12.00 for
-- 16oz Kroger Fresh Farm Raised) — predictable size, store brand.
UPDATE ingredient_map SET preferred_sku='0001111062275', kroger_sku='0001111062275', price_source='kroger', updated_at=NOW()
WHERE canonical_name='salmon fillet';

-- ── tofu, silken ─────────────────────────────────────────────
-- Three options within 5%. Simple Truth Organic 16oz at $1.99 is
-- the best per-oz value AND the largest size — good for recipes.
UPDATE ingredient_map SET preferred_sku='0001111009716', kroger_sku='0001111009716', price_source='kroger', updated_at=NOW()
WHERE canonical_name='tofu, silken';

-- ── cheddar cheese, mild block ───────────────────────────────
-- Three Kroger sizes. Pick 16oz ($3.69) — standard recipe size,
-- better per-oz than 8oz, not oversized like the 32oz BIG DEAL.
UPDATE ingredient_map SET preferred_sku='0001111058730', kroger_sku='0001111058730', price_source='kroger', updated_at=NOW()
WHERE canonical_name='cheddar cheese, mild block';

-- ── cheddar cheese, sharp block ──────────────────────────────
-- Same logic as mild. Kroger Sharp 16oz at $3.69.
-- Extra Sharp is a different flavor profile — stick with Sharp.
UPDATE ingredient_map SET preferred_sku='0001111058733', kroger_sku='0001111058733', price_source='kroger', updated_at=NOW()
WHERE canonical_name='cheddar cheese, sharp block';

-- ── cheddar cheese, shredded ─────────────────────────────────
-- Multiple Kroger sizes, all $2.49 for 8oz or $3.69 for 16oz.
-- Pick Mild Cheddar 16oz ($3.69) — neutral flavor, right size for
-- most recipes, better per-oz than 8oz bags.
UPDATE ingredient_map SET preferred_sku='0001111015130', kroger_sku='0001111015130', price_source='kroger', updated_at=NOW()
WHERE canonical_name='cheddar cheese, shredded';

-- ── pepper jack cheese, shredded ─────────────────────────────
-- Script returned cheddar results — search term pollution.
-- The Kroger shredded pepper jack is indexed separately.
-- From the block search we know Kroger makes it; use the block SKU
-- as a placeholder and note: run a targeted search for
-- "kroger pepper jack shredded" to get the correct shredded SKU.
-- For now, use Kroger Colby Jack as nearest substitute (0001111015133)
-- until the correct SKU is confirmed.
UPDATE ingredient_map SET preferred_sku='0001111015133', kroger_sku='0001111015133', price_source='kroger', updated_at=NOW()
WHERE canonical_name='pepper jack cheese, shredded';
-- TODO: verify with GET /v1/products?filter.term=kroger+pepper+jack+shredded

-- ── mozzarella, shredded ─────────────────────────────────────
-- Three Kroger sizes. Pick 16oz ($3.69) — same logic as cheddar.
-- Better per-oz than 8oz, not the oversized family pack.
UPDATE ingredient_map SET preferred_sku='0001111050159', kroger_sku='0001111050159', price_source='kroger', updated_at=NOW()
WHERE canonical_name='mozzarella, shredded';

-- ── mozzarella, fresh ball ────────────────────────────────────
-- BelGioioso and Private Selection options. Script flagged ambiguous
-- because per-oz values were close. Private Selection 16oz ($7.99)
-- is the best value and the most versatile size for slicing.
-- BelGioioso burrata minis are a different product entirely.
UPDATE ingredient_map SET preferred_sku='0001111004374', kroger_sku='0001111004374', price_source='kroger', updated_at=NOW()
WHERE canonical_name='mozzarella, fresh ball';

-- ── queso fresco ─────────────────────────────────────────────
-- Two Kroger Mercado options. Whole Milk Queso Fresco 10oz ($2.99)
-- is the correct product — not the Quesadilla cheese, which is a
-- different texture. Cacique is fine too but Kroger brand preferred.
UPDATE ingredient_map SET preferred_sku='0001111012733', kroger_sku='0001111012733', price_source='kroger', updated_at=NOW()
WHERE canonical_name='queso fresco';

-- ── feta cheese, crumbled ────────────────────────────────────
-- Private Selection 6oz ($4.99) and President 6oz ($5.49) are within
-- 5%. Pick Private Selection — store brand preference, same format.
UPDATE ingredient_map SET preferred_sku='0001111062856', kroger_sku='0001111062856', price_source='kroger', updated_at=NOW()
WHERE canonical_name='feta cheese, crumbled';

-- ── swiss cheese, sliced ─────────────────────────────────────
-- Boar's Head options are deli-counter weight, not standard UPC.
-- Private Selection Swiss 1lb ($8.99) is the right packaged option.
-- Baby Swiss is a milder variant — standard Swiss is the better default.
UPDATE ingredient_map SET preferred_sku='0022629600000', kroger_sku='0022629600000', price_source='kroger', updated_at=NOW()
WHERE canonical_name='swiss cheese, sliced';

-- ── mexican blend cheese, shredded ───────────────────────────
-- Kroger Mexican Style Blend 16oz ($3.69) is the clear pick —
-- store brand, right size, correct blend. The 32oz BIG DEAL and
-- Sargento premium are both outclassed on value.
UPDATE ingredient_map SET preferred_sku='0001111015131', kroger_sku='0001111015131', price_source='kroger', updated_at=NOW()
WHERE canonical_name='mexican blend cheese, shredded';

-- ── pita bread ───────────────────────────────────────────────
-- Search returned pita chips alongside actual pita. Joseph's Pita
-- 4ct/11oz ($2.99) is the correct product — real pita bread,
-- best per-unit value, widely available.
UPDATE ingredient_map SET preferred_sku='0007411700014', kroger_sku='0007411700014', price_source='kroger', updated_at=NOW()
WHERE canonical_name='pita bread';

-- ── naan bread ───────────────────────────────────────────────
-- All Stonefire. Original Naan 8.8oz ($3.99) is the standard
-- product — not the crisps, not the dippers, not the mini rounds.
-- Best per-oz of the full-size options.
UPDATE ingredient_map SET preferred_sku='0087668100750', kroger_sku='0087668100750', price_source='kroger', updated_at=NOW()
WHERE canonical_name='naan bread';

-- ── pasta, spaghetti ─────────────────────────────────────────
-- Search returned pasta sauce alongside pasta. Kroger Thin Spaghetti
-- 16oz ($1.25) is correct — store brand, standard size.
-- Regular spaghetti is the same SKU family; thin is fine as default.
UPDATE ingredient_map SET preferred_sku='0001111085020', kroger_sku='0001111085020', price_source='kroger', updated_at=NOW()
WHERE canonical_name='pasta, spaghetti';

-- ── tortilla chips ───────────────────────────────────────────
-- Three Kroger options all at $1.99 for different sizes/flavors.
-- Plain white corn restaurant style 13oz (0001111010996) is the
-- default — no lime, no guacamole flavor, largest bag.
UPDATE ingredient_map SET preferred_sku='0001111010996', kroger_sku='0001111010996', price_source='kroger', updated_at=NOW()
WHERE canonical_name='tortilla chips';

-- ── cream of mushroom soup, canned ───────────────────────────
-- Kroger has two sizes. 10.5oz ($0.79) is the standard recipe
-- size — most recipes call for one 10.5oz can. The 26oz is
-- oversized for a single recipe use.
UPDATE ingredient_map SET preferred_sku='0001111016045', kroger_sku='0001111016045', price_source='kroger', updated_at=NOW()
WHERE canonical_name='cream of mushroom soup, canned';

-- ── avocado oil ──────────────────────────────────────────────
-- Flagged as produce_guard — wrong rule fired. Avocado oil is a
-- pantry item, not fresh produce. The produce_guard checks for
-- the word "avocado" in the name which is too broad.
-- Private Selection 17oz ($11.49) is the right pick — store brand,
-- standard size. Add to SEARCH_TERM_OVERRIDES in sku_lookup.ts:
--   "avocado oil": "avocado oil cooking"
-- to avoid the produce_guard match in future runs.
UPDATE ingredient_map SET preferred_sku='0001111012986', kroger_sku='0001111012986', price_source='kroger', updated_at=NOW()
WHERE canonical_name='avocado oil';

-- ── ketchup ──────────────────────────────────────────────────
-- Four Kroger options. 24oz ($1.39) is the best per-oz value
-- and the right size for typical household use.
UPDATE ingredient_map SET preferred_sku='0001111084467', kroger_sku='0001111084467', price_source='kroger', updated_at=NOW()
WHERE canonical_name='ketchup';

-- ── mayonnaise ───────────────────────────────────────────────
-- Kroger Real Mayo 30oz and 15oz at different prices. 30oz ($3.79)
-- is better per-oz and a common pantry size. Olive Oil Mayo is a
-- different product — stick with Real Mayo.
UPDATE ingredient_map SET preferred_sku='0001111001988', kroger_sku='0001111001988', price_source='kroger', updated_at=NOW()
WHERE canonical_name='mayonnaise';

-- ── salsa, jarred ────────────────────────────────────────────
-- Pace Picante appeared but search also returned Cheez Whiz / Taco Bell
-- dips. Pace Hot 16oz ($3.19) is the correct product and better
-- value than the 24oz. Note: Kroger store brand salsa exists —
-- run "kroger salsa mild" to check if preferred for store brand rule.
-- Using Pace for now as a known-good product.
UPDATE ingredient_map SET preferred_sku='0004156500019', kroger_sku='0004156500019', price_source='kroger', updated_at=NOW()
WHERE canonical_name='salsa, jarred';

-- ── chili powder ─────────────────────────────────────────────
-- Kroger Chili Powder Shaker 4oz ($3.49) is the clear pick —
-- store brand, standard size. McCormick and organic options
-- are unnecessary cost.
UPDATE ingredient_map SET preferred_sku='0001111068268', kroger_sku='0001111068268', price_source='kroger', updated_at=NOW()
WHERE canonical_name='chili powder';

-- ── paprika, sweet ────────────────────────────────────────────
-- No results. Search term "paprika, sweet" returned nothing.
-- Kroger does sell paprika — retry with simpler term.
-- Add to SEARCH_TERM_OVERRIDES: "paprika, sweet": "kroger paprika"
-- For now leave as USDA fallback. Smoked paprika resolved fine.
-- (no UPDATE — leave kroger_sku NULL)

-- ── maple syrup, pure ─────────────────────────────────────────
-- Multiple 32oz options at $17.49. Private Selection 12oz ($9.29)
-- is the right size for recipes — no recipe calls for 32oz of maple syrup.
UPDATE ingredient_map SET preferred_sku='0001111080325', kroger_sku='0001111080325', price_source='kroger', updated_at=NOW()
WHERE canonical_name='maple syrup, pure';

-- ── all-purpose flour ─────────────────────────────────────────
-- Bleached vs unbleached Kroger both at $2.59/5lb — within 5%.
-- Unbleached is the better default for most savory and baking uses.
UPDATE ingredient_map SET preferred_sku='0001111086116', kroger_sku='0001111086116', price_source='kroger', updated_at=NOW()
WHERE canonical_name='all-purpose flour';

-- ── chicken broth / stock ─────────────────────────────────────
-- Multiple Kroger sizes. 32oz ($1.59) is the right size —
-- most recipes call for 1–2 cups and the 32oz covers that without
-- waste. 14oz is undersized; reduced sodium vs regular is a wash.
UPDATE ingredient_map SET preferred_sku='0001111004969', kroger_sku='0001111004969', price_source='kroger', updated_at=NOW()
WHERE canonical_name='chicken broth / stock';

-- ── beef broth / stock ───────────────────────────────────────
-- Same logic as chicken broth. Kroger Fat Free Beef Broth 32oz ($1.59).
UPDATE ingredient_map SET preferred_sku='0001111008596', kroger_sku='0001111008596', price_source='kroger', updated_at=NOW()
WHERE canonical_name='beef broth / stock';

-- ── tomato paste ─────────────────────────────────────────────
-- Flagged as produce_guard — same "tomato" string match issue.
-- Tomato paste is a pantry/canned item. Kroger 6oz ($0.99) is correct.
-- Fix the produce_guard in sku_lookup.ts to check for fresh produce
-- keywords more specifically (e.g. require "fresh" or check is_produce flag).
UPDATE ingredient_map SET preferred_sku='0001111011971', kroger_sku='0001111011971', price_source='kroger', updated_at=NOW()
WHERE canonical_name='tomato paste';

-- ── tomatoes, canned diced ───────────────────────────────────
-- Same produce_guard false positive. Kroger Diced Tomatoes 14.5oz ($1.00).
-- Standard recipe size; petite diced is fine too but regular diced
-- is the more common call.
UPDATE ingredient_map SET preferred_sku='0001111011612', kroger_sku='0001111011612', price_source='kroger', updated_at=NOW()
WHERE canonical_name='tomatoes, canned diced';

-- ── tomatoes, canned crushed ──────────────────────────────────
-- Same produce_guard false positive. Kroger Crushed Tomatoes 15oz ($1.00).
UPDATE ingredient_map SET preferred_sku='0001111011980', kroger_sku='0001111011980', price_source='kroger', updated_at=NOW()
WHERE canonical_name='tomatoes, canned crushed';

-- ── black beans, canned ──────────────────────────────────────
-- Kroger Black Beans 15.25oz ($1.00) — standard size, store brand.
-- No-salt-added variant is the same price but limits recipe flexibility.
UPDATE ingredient_map SET preferred_sku='0001111072567', kroger_sku='0001111072567', price_source='kroger', updated_at=NOW()
WHERE canonical_name='black beans, canned';

-- ── kidney beans, canned ─────────────────────────────────────
-- Kroger Light Red Kidney Beans 15.5oz ($1.00) — store brand, correct size.
-- Light vs dark red is a minor flavor difference; light is the safer default.
UPDATE ingredient_map SET preferred_sku='0001111071786', kroger_sku='0001111071786', price_source='kroger', updated_at=NOW()
WHERE canonical_name='kidney beans, canned';

-- ── eggs, large ──────────────────────────────────────────────
-- Kroger Grade A Large White 18ct ($2.65) is the best value —
-- $0.147/egg vs $0.333 for Eggland's. Cage-free options are 2x
-- the cost and not needed for a savings-focused app.
UPDATE ingredient_map SET preferred_sku='0001111060933', kroger_sku='0001111060933', price_source='kroger', updated_at=NOW()
WHERE canonical_name='eggs, large';

-- ── heavy cream ──────────────────────────────────────────────
-- Kroger Heavy Whipping Cream Pint ($3.29) and Quart ($5.79).
-- Pint is the standard recipe size — most recipes use ½–1 cup.
-- The quart is only better value if you'll use it all, which
-- most home cooks won't before it expires.
UPDATE ingredient_map SET preferred_sku='0001111050315', kroger_sku='0001111050315', price_source='kroger', updated_at=NOW()
WHERE canonical_name='heavy cream';


-- ============================================================
-- Two items left as USDA fallback (no Kroger SKU available):
--   chorizo, Mexican-style fresh  — sold at meat counter by weight
--   paprika, sweet                — search returned 0 results; retry
--                                   with "kroger paprika" after fixing
--                                   SEARCH_TERM_OVERRIDES
--
-- Two bugs to fix in sku_lookup.ts produce_guard (Rule 1):
--   "avocado oil"        — "avocado" substring match is too broad
--   "tomato paste"       — "tomato" substring match is too broad
--   "tomatoes, canned *" — same issue
-- Change Rule 1 to check exact produce terms only:
--   if (name === 'avocado, hass' || name === 'lettuce, iceberg' || ...)
-- or better: pass the is_produce flag from the row into selectProduct
-- and gate on that instead of substring matching.
-- ============================================================

-- Final sanity check — run after applying:
--   SELECT
--     COUNT(*) as total,
--     COUNT(kroger_sku) as has_sku,
--     COUNT(*) - COUNT(kroger_sku) as still_null
--   FROM ingredient_map
--   WHERE is_produce = FALSE;
--   -- Expected: total=136, has_sku=134, still_null=2
--   -- (chorizo + paprika remaining as USDA fallback)
