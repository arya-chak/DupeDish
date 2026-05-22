#!/usr/bin/env npx ts-node
/**
 * sku_lookup.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Resolves NULL kroger_sku rows in ingredient_map by querying the Kroger
 * Products API and applying the selection rules from the seed files.
 *
 * Usage:
 *   npx ts-node sku_lookup.ts              # dry-run, prints decisions
 *   npx ts-node sku_lookup.ts --write      # writes confirmed SKUs to Supabase
 *   npx ts-node sku_lookup.ts --only=bacon # single ingredient by name fragment
 *   npx ts-node sku_lookup.ts --review     # print all rows, no API calls
 *
 * Env vars always required:
 *   KROGER_CLIENT_ID
 *   KROGER_CLIENT_SECRET
 *   KROGER_LOCATION_ID
 *
 * Env vars required only with --write:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_KEY
 * ─────────────────────────────────────────────────────────────────────────────
 */
import "dotenv/config";

import { createClient } from "@supabase/supabase-js";

// ── CLI flags ─────────────────────────────────────────────────────────────────

const ARGS = process.argv.slice(2);
const DRY_RUN    = !ARGS.includes("--write");
const FORCE      = ARGS.includes("--force");
const REVIEW_ONLY = ARGS.includes("--review");
const ONLY_FILTER = ARGS.find((a) => a.startsWith("--only="))?.split("=")[1];

const KROGER_BASE  = "https://api.kroger.com/v1";
const TOKEN_URL    = "https://api.kroger.com/v1/connect/oauth2/token";
const RATE_LIMIT_MS = 300;
const SEARCH_LIMIT  = 10;

// ── Hardcoded ingredient list ─────────────────────────────────────────────────
// All rows from the three seed files where kroger_sku IS NULL.
// Produce rows are excluded — they always use USDA pricing.
// Add or remove rows here as the seed files evolve.

interface IngredientRow {
  canonical_name: string;
  usda_avg_price: number;
  unit: string;
  is_pantry_staple: boolean;
}

const INGREDIENTS_NEEDING_LOOKUP: IngredientRow[] = [
  // ── Core: ground proteins ──────────────────────────────────
  { canonical_name: "ground beef, 90/10 lean",           usda_avg_price: 6.99, unit: "lb",            is_pantry_staple: false },
  { canonical_name: "ground turkey",                      usda_avg_price: 5.49, unit: "lb",            is_pantry_staple: false },
  { canonical_name: "ground chicken",                     usda_avg_price: 5.99, unit: "lb",            is_pantry_staple: false },
  { canonical_name: "ground pork",                        usda_avg_price: 4.99, unit: "lb",            is_pantry_staple: false },
  // ── Core: chicken ─────────────────────────────────────────
  { canonical_name: "chicken breast, boneless skinless",  usda_avg_price: 4.99, unit: "lb",            is_pantry_staple: false },
  { canonical_name: "chicken thighs, boneless skinless",  usda_avg_price: 3.49, unit: "lb",            is_pantry_staple: false },
  { canonical_name: "chicken thighs, bone-in skin-on",    usda_avg_price: 2.49, unit: "lb",            is_pantry_staple: false },
  { canonical_name: "chicken tenders / tenderloins",      usda_avg_price: 5.99, unit: "lb",            is_pantry_staple: false },
  { canonical_name: "chicken wings",                      usda_avg_price: 3.99, unit: "lb",            is_pantry_staple: false },
  // ── Core: pork ────────────────────────────────────────────
  { canonical_name: "bacon, thick cut",                   usda_avg_price: 6.99, unit: "16 oz pkg",     is_pantry_staple: false },
  { canonical_name: "bacon, regular",                     usda_avg_price: 5.49, unit: "16 oz pkg",     is_pantry_staple: false },
  { canonical_name: "pork shoulder / butt",               usda_avg_price: 2.99, unit: "lb",            is_pantry_staple: false },
  { canonical_name: "pork belly",                         usda_avg_price: 5.99, unit: "lb",            is_pantry_staple: false },
  { canonical_name: "pork chops, boneless",               usda_avg_price: 4.49, unit: "lb",            is_pantry_staple: false },
  { canonical_name: "Italian sausage, mild",              usda_avg_price: 4.99, unit: "19 oz pkg",     is_pantry_staple: false },
  { canonical_name: "breakfast sausage, bulk",            usda_avg_price: 4.49, unit: "16 oz roll",    is_pantry_staple: false },
  { canonical_name: "chorizo, Mexican-style fresh",       usda_avg_price: 3.99, unit: "12 oz pkg",     is_pantry_staple: false },
  // ── Core: beef (non-ground) ───────────────────────────────
  { canonical_name: "steak, skirt / fajita",              usda_avg_price: 9.99, unit: "lb",            is_pantry_staple: false },
  { canonical_name: "steak, flank",                       usda_avg_price: 9.49, unit: "lb",            is_pantry_staple: false },
  { canonical_name: "steak, ribeye",                      usda_avg_price: 14.99, unit: "lb",           is_pantry_staple: false },
  // ── Core: seafood ─────────────────────────────────────────
  { canonical_name: "shrimp, large, peeled deveined",     usda_avg_price: 9.99, unit: "lb",            is_pantry_staple: false },
  { canonical_name: "salmon fillet",                      usda_avg_price: 9.99, unit: "lb",            is_pantry_staple: false },
  { canonical_name: "tilapia fillet",                     usda_avg_price: 5.99, unit: "lb",            is_pantry_staple: false },
  { canonical_name: "cod fillet",                         usda_avg_price: 7.99, unit: "lb",            is_pantry_staple: false },
  // ── Core: tofu / plant ────────────────────────────────────
  { canonical_name: "tofu, extra firm",                   usda_avg_price: 2.49, unit: "14-16 oz block", is_pantry_staple: false },
  { canonical_name: "tofu, silken",                       usda_avg_price: 1.99, unit: "14 oz pkg",     is_pantry_staple: false },
  { canonical_name: "tempeh",                             usda_avg_price: 3.49, unit: "8 oz pkg",      is_pantry_staple: false },
  // ── Core: cheese ──────────────────────────────────────────
  { canonical_name: "cheddar cheese, mild block",         usda_avg_price: 3.99, unit: "16 oz block",   is_pantry_staple: false },
  { canonical_name: "cheddar cheese, sharp block",        usda_avg_price: 4.49, unit: "16 oz block",   is_pantry_staple: false },
  { canonical_name: "cheddar cheese, shredded",           usda_avg_price: 3.49, unit: "8 oz bag",      is_pantry_staple: false },
  { canonical_name: "pepper jack cheese, block",          usda_avg_price: 4.49, unit: "16 oz block",   is_pantry_staple: false },
  { canonical_name: "pepper jack cheese, shredded",       usda_avg_price: 3.49, unit: "8 oz bag",      is_pantry_staple: false },
  { canonical_name: "monterey jack cheese, shredded",     usda_avg_price: 3.49, unit: "8 oz bag",      is_pantry_staple: false },
  { canonical_name: "mozzarella, shredded",               usda_avg_price: 3.49, unit: "8 oz bag",      is_pantry_staple: false },
  { canonical_name: "mozzarella, fresh ball",             usda_avg_price: 3.99, unit: "8 oz",          is_pantry_staple: false },
  { canonical_name: "parmesan, shredded / grated",        usda_avg_price: 3.99, unit: "6 oz",          is_pantry_staple: false },
  { canonical_name: "queso fresco",                       usda_avg_price: 3.49, unit: "10 oz",         is_pantry_staple: false },
  { canonical_name: "cotija cheese",                      usda_avg_price: 3.99, unit: "10 oz",         is_pantry_staple: false },
  { canonical_name: "feta cheese, crumbled",              usda_avg_price: 3.99, unit: "6 oz",          is_pantry_staple: false },
  { canonical_name: "provolone cheese, sliced",           usda_avg_price: 3.99, unit: "8 oz",          is_pantry_staple: false },
  { canonical_name: "swiss cheese, sliced",               usda_avg_price: 3.99, unit: "8 oz",          is_pantry_staple: false },
  { canonical_name: "mexican blend cheese, shredded",     usda_avg_price: 3.49, unit: "8 oz bag",      is_pantry_staple: false },
  // ── Core: bread ───────────────────────────────────────────
  { canonical_name: "hamburger buns, regular",            usda_avg_price: 2.49, unit: "8 ct",          is_pantry_staple: false },
  { canonical_name: "hot dog buns",                       usda_avg_price: 2.49, unit: "8 ct",          is_pantry_staple: false },
  { canonical_name: "hoagie / sub rolls",                 usda_avg_price: 3.49, unit: "6 ct",          is_pantry_staple: false },
  { canonical_name: "sandwich bread, white",              usda_avg_price: 2.49, unit: "20 oz loaf",    is_pantry_staple: false },
  { canonical_name: "sandwich bread, whole wheat",        usda_avg_price: 2.99, unit: "20 oz loaf",    is_pantry_staple: false },
  { canonical_name: "flour tortillas, 8-inch",            usda_avg_price: 3.49, unit: "10 ct",         is_pantry_staple: false },
  { canonical_name: "flour tortillas, 10-inch burrito size", usda_avg_price: 3.99, unit: "8 ct",       is_pantry_staple: false },
  { canonical_name: "corn tortillas, 6-inch",             usda_avg_price: 2.99, unit: "30 ct",         is_pantry_staple: false },
  { canonical_name: "pita bread",                         usda_avg_price: 2.99, unit: "6 ct",          is_pantry_staple: false },
  { canonical_name: "naan bread",                         usda_avg_price: 3.99, unit: "4 ct",          is_pantry_staple: false },
  // ── Core: pasta & noodles ─────────────────────────────────
  { canonical_name: "pasta, spaghetti",                   usda_avg_price: 1.49, unit: "16 oz",         is_pantry_staple: false },
  { canonical_name: "pasta, penne",                       usda_avg_price: 1.49, unit: "16 oz",         is_pantry_staple: false },
  { canonical_name: "pasta, fettuccine",                  usda_avg_price: 1.49, unit: "16 oz",         is_pantry_staple: false },
  { canonical_name: "ramen noodles, fresh or dried",      usda_avg_price: 1.99, unit: "6 oz pkg",      is_pantry_staple: false },
  { canonical_name: "rice noodles",                       usda_avg_price: 2.99, unit: "8 oz pkg",      is_pantry_staple: false },
  // ── Core: specialty ───────────────────────────────────────
  { canonical_name: "tortilla chips",                     usda_avg_price: 3.99, unit: "13 oz bag",     is_pantry_staple: false },
  { canonical_name: "refried beans, canned",              usda_avg_price: 1.29, unit: "16 oz can",     is_pantry_staple: false },
  { canonical_name: "salsa verde, jarred",                usda_avg_price: 3.49, unit: "16 oz",         is_pantry_staple: false },
  { canonical_name: "chipotle peppers in adobo, canned",  usda_avg_price: 1.99, unit: "7 oz can",      is_pantry_staple: false },
  { canonical_name: "peanut butter, creamy",              usda_avg_price: 3.99, unit: "16 oz",         is_pantry_staple: false },
  { canonical_name: "cream of mushroom soup, canned",     usda_avg_price: 1.49, unit: "10.5 oz can",   is_pantry_staple: false },
  // ── Pantry: oils & fats ───────────────────────────────────
  { canonical_name: "vegetable oil",                      usda_avg_price: 4.99, unit: "48 fl oz",      is_pantry_staple: true },
  { canonical_name: "canola oil",                         usda_avg_price: 4.49, unit: "48 fl oz",      is_pantry_staple: true },
  { canonical_name: "sesame oil",                         usda_avg_price: 4.99, unit: "8 fl oz",       is_pantry_staple: true },
  { canonical_name: "avocado oil",                        usda_avg_price: 7.99, unit: "16.9 fl oz",    is_pantry_staple: true },
  { canonical_name: "butter, unsalted",                   usda_avg_price: 5.49, unit: "1 lb / 4 sticks", is_pantry_staple: true },
  { canonical_name: "butter, salted",                     usda_avg_price: 5.49, unit: "1 lb / 4 sticks", is_pantry_staple: true },
  { canonical_name: "cooking spray, nonstick",            usda_avg_price: 3.49, unit: "6 oz can",      is_pantry_staple: true },
  // ── Pantry: vinegars ──────────────────────────────────────
  { canonical_name: "white vinegar, distilled",           usda_avg_price: 2.99, unit: "32 fl oz",      is_pantry_staple: true },
  { canonical_name: "apple cider vinegar",                usda_avg_price: 3.49, unit: "32 fl oz",      is_pantry_staple: true },
  { canonical_name: "rice vinegar",                       usda_avg_price: 2.99, unit: "12 fl oz",      is_pantry_staple: true },
  { canonical_name: "red wine vinegar",                   usda_avg_price: 2.99, unit: "12 fl oz",      is_pantry_staple: true },
  // ── Pantry: condiments ────────────────────────────────────
  { canonical_name: "ketchup",                            usda_avg_price: 3.49, unit: "32 oz",         is_pantry_staple: true },
  { canonical_name: "yellow mustard",                     usda_avg_price: 1.49, unit: "14 oz",         is_pantry_staple: true },
  { canonical_name: "dijon mustard",                      usda_avg_price: 3.29, unit: "8 oz",          is_pantry_staple: true },
  { canonical_name: "mayonnaise",                         usda_avg_price: 5.49, unit: "30 oz",         is_pantry_staple: true },
  { canonical_name: "soy sauce",                          usda_avg_price: 2.49, unit: "10 fl oz",      is_pantry_staple: true },
  { canonical_name: "soy sauce, low sodium",              usda_avg_price: 2.49, unit: "10 fl oz",      is_pantry_staple: true },
  { canonical_name: "worcestershire sauce",               usda_avg_price: 2.99, unit: "10 fl oz",      is_pantry_staple: true },
  { canonical_name: "hot sauce",                          usda_avg_price: 2.99, unit: "12 fl oz",      is_pantry_staple: true },
  { canonical_name: "sriracha",                           usda_avg_price: 3.99, unit: "28 oz",         is_pantry_staple: true },
  { canonical_name: "fish sauce",                         usda_avg_price: 3.49, unit: "7 fl oz",       is_pantry_staple: true },
  { canonical_name: "oyster sauce",                       usda_avg_price: 3.49, unit: "9 oz",          is_pantry_staple: true },
  { canonical_name: "hoisin sauce",                       usda_avg_price: 3.49, unit: "7 oz",          is_pantry_staple: true },
  { canonical_name: "salsa, jarred",                      usda_avg_price: 3.49, unit: "16 oz",         is_pantry_staple: true },
  { canonical_name: "tahini",                             usda_avg_price: 6.99, unit: "16 oz",         is_pantry_staple: true },
  // ── Pantry: spices ────────────────────────────────────────
  { canonical_name: "salt, kosher",                       usda_avg_price: 3.49, unit: "48 oz box",     is_pantry_staple: true },
  { canonical_name: "salt, table",                        usda_avg_price: 1.29, unit: "26 oz",         is_pantry_staple: true },
  { canonical_name: "black pepper, ground",               usda_avg_price: 3.29, unit: "3 oz",          is_pantry_staple: true },
  { canonical_name: "black pepper, whole / peppercorns",  usda_avg_price: 4.49, unit: "2 oz",          is_pantry_staple: true },
  { canonical_name: "garlic powder",                      usda_avg_price: 2.49, unit: "3 oz",          is_pantry_staple: true },
  { canonical_name: "onion powder",                       usda_avg_price: 2.49, unit: "3 oz",          is_pantry_staple: true },
  { canonical_name: "cumin, ground",                      usda_avg_price: 2.29, unit: "2 oz",          is_pantry_staple: true },
  { canonical_name: "chili powder",                       usda_avg_price: 2.29, unit: "2.5 oz",        is_pantry_staple: true },
  { canonical_name: "paprika, sweet",                     usda_avg_price: 2.29, unit: "2 oz",          is_pantry_staple: true },
  { canonical_name: "paprika, smoked",                    usda_avg_price: 2.99, unit: "2 oz",          is_pantry_staple: true },
  { canonical_name: "oregano, dried",                     usda_avg_price: 1.99, unit: "0.75 oz",       is_pantry_staple: true },
  { canonical_name: "cayenne pepper, ground",             usda_avg_price: 1.99, unit: "1.5 oz",        is_pantry_staple: true },
  { canonical_name: "red pepper flakes",                  usda_avg_price: 1.99, unit: "1.5 oz",        is_pantry_staple: true },
  { canonical_name: "cinnamon, ground",                   usda_avg_price: 2.99, unit: "2 oz",          is_pantry_staple: true },
  { canonical_name: "Italian seasoning",                  usda_avg_price: 2.49, unit: "0.75 oz",       is_pantry_staple: true },
  { canonical_name: "bay leaves",                         usda_avg_price: 1.99, unit: "0.1 oz",        is_pantry_staple: true },
  { canonical_name: "thyme, dried",                       usda_avg_price: 1.99, unit: "0.5 oz",        is_pantry_staple: true },
  { canonical_name: "seasoned salt",                      usda_avg_price: 2.49, unit: "4.25 oz",       is_pantry_staple: true },
  // ── Pantry: sweeteners ────────────────────────────────────
  { canonical_name: "sugar, granulated white",            usda_avg_price: 3.29, unit: "4 lb",          is_pantry_staple: true },
  { canonical_name: "sugar, brown, light or dark",        usda_avg_price: 2.79, unit: "2 lb",          is_pantry_staple: true },
  { canonical_name: "honey",                              usda_avg_price: 5.49, unit: "12 oz",         is_pantry_staple: true },
  { canonical_name: "maple syrup, pure",                  usda_avg_price: 8.99, unit: "12 fl oz",      is_pantry_staple: true },
  // ── Pantry: dry / baking ──────────────────────────────────
  { canonical_name: "all-purpose flour",                  usda_avg_price: 3.99, unit: "5 lb",          is_pantry_staple: true },
  { canonical_name: "cornstarch",                         usda_avg_price: 1.99, unit: "16 oz",         is_pantry_staple: true },
  { canonical_name: "breadcrumbs, plain",                 usda_avg_price: 2.49, unit: "15 oz",         is_pantry_staple: true },
  { canonical_name: "breadcrumbs, panko",                 usda_avg_price: 3.49, unit: "8 oz",          is_pantry_staple: true },
  { canonical_name: "baking powder",                      usda_avg_price: 1.99, unit: "8.1 oz",        is_pantry_staple: true },
  { canonical_name: "baking soda",                        usda_avg_price: 0.99, unit: "16 oz",         is_pantry_staple: true },
  // ── Pantry: canned goods ──────────────────────────────────
  { canonical_name: "chicken broth / stock",              usda_avg_price: 2.99, unit: "32 fl oz",      is_pantry_staple: true },
  { canonical_name: "beef broth / stock",                 usda_avg_price: 2.99, unit: "32 fl oz",      is_pantry_staple: true },
  { canonical_name: "tomato paste",                       usda_avg_price: 1.49, unit: "6 oz can",      is_pantry_staple: true },
  { canonical_name: "tomatoes, canned diced",             usda_avg_price: 1.49, unit: "14.5 oz can",   is_pantry_staple: true },
  { canonical_name: "tomatoes, canned crushed",           usda_avg_price: 1.79, unit: "28 oz can",     is_pantry_staple: true },
  { canonical_name: "coconut milk, canned",               usda_avg_price: 2.49, unit: "13.5 oz can",   is_pantry_staple: true },
  { canonical_name: "black beans, canned",                usda_avg_price: 1.29, unit: "15 oz can",     is_pantry_staple: true },
  { canonical_name: "kidney beans, canned",               usda_avg_price: 1.29, unit: "15 oz can",     is_pantry_staple: true },
  { canonical_name: "chickpeas / garbanzo beans, canned", usda_avg_price: 1.49, unit: "15 oz can",     is_pantry_staple: true },
  // ── Pantry: grains ────────────────────────────────────────
  { canonical_name: "white rice, long grain",             usda_avg_price: 2.99, unit: "2 lb",          is_pantry_staple: true },
  { canonical_name: "brown rice, long grain",             usda_avg_price: 3.49, unit: "2 lb",          is_pantry_staple: true },
  // ── Pantry: dairy basics ──────────────────────────────────
  { canonical_name: "eggs, large",                        usda_avg_price: 3.99, unit: "dozen",         is_pantry_staple: true },
  { canonical_name: "whole milk",                         usda_avg_price: 3.99, unit: "1 gallon",      is_pantry_staple: true },
  { canonical_name: "heavy cream",                        usda_avg_price: 3.49, unit: "1 pint",        is_pantry_staple: true },
  { canonical_name: "sour cream",                         usda_avg_price: 2.49, unit: "16 oz",         is_pantry_staple: true },
  { canonical_name: "cream cheese",                       usda_avg_price: 2.99, unit: "8 oz",          is_pantry_staple: true },
];

// ── Types ─────────────────────────────────────────────────────────────────────

interface KrogerProduct {
  productId: string;
  upc: string;
  brand: string;
  description: string;
  items: KrogerItem[];
}

interface KrogerItem {
  itemId: string;
  size: string;
  soldBy: string;
  price?: { regular: number; promo: number };
  inventory?: { status: string };
}

interface Resolution {
  canonical_name: string;
  chosen_upc: string | null;
  chosen_description: string;
  chosen_price: number | null;
  chosen_promo_price: number | null;
  chosen_size: string;
  rule_applied: string;
  confidence: "auto" | "human-review";
  candidates: KrogerProduct[];
}

// ── Kroger auth ───────────────────────────────────────────────────────────────

let _token: string | null = null;
let _tokenExpiry = 0;

async function getKrogerToken(): Promise<string> {
  if (_token && Date.now() < _tokenExpiry) return _token;
  const clientId     = requireEnv("KROGER_CLIENT_ID");
  const clientSecret = requireEnv("KROGER_CLIENT_SECRET");
  const credentials  = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials&scope=product.compact",
  });
  if (!res.ok) throw new Error(`Kroger auth failed: ${res.status} ${await res.text()}`);
  const data = (await res.json()) as { access_token: string; expires_in: number };
  _token = data.access_token;
  _tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
  return _token;
}

// ── Kroger product search ─────────────────────────────────────────────────────

async function searchKroger(term: string, locationId: string): Promise<KrogerProduct[]> {
  const token  = await getKrogerToken();
  const params = new URLSearchParams({
    "filter.term":        term,
    "filter.locationId":  locationId,
    "filter.limit":       String(SEARCH_LIMIT),
    "filter.fulfillment": "ais",
  });
  const res = await fetch(`${KROGER_BASE}/products?${params}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  if (!res.ok) {
    if (res.status === 204) return [];
    throw new Error(`Kroger /products failed for "${term}": ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as { data: KrogerProduct[] };
  return data.data ?? [];
}

// ── Selection rules ───────────────────────────────────────────────────────────

function selectProduct(
  candidates: KrogerProduct[],
  ctx: IngredientRow
): { product: KrogerProduct | null; rule: string; confidence: "auto" | "human-review" } {
  if (candidates.length === 0) return { product: null, rule: "no_results", confidence: "human-review" };

  const name = ctx.canonical_name.toLowerCase();

  // Rule 1: produce guard
  if (name.includes("lettuce") || name.includes("tomato") || name.includes("avocado"))
    return { product: null, rule: "produce_guard", confidence: "human-review" };

  // Rule 2: ground proteins — reject pre-formed
  if (name.includes("ground beef") || name.includes("ground turkey") || name.includes("ground chicken")) {
    const filtered = candidates.filter((p) => {
      const d = p.description.toLowerCase();
      return !d.includes("patti") && !d.includes("burger") && !d.includes("frozen");
    });
    if (filtered.length === 1) return { product: filtered[0], rule: "ground_protein_no_patties", confidence: "auto" };
    if (filtered.length > 1) {
      const roll = filtered.find((p) => p.description.toLowerCase().includes("roll"));
      if (roll) return { product: roll, rule: "ground_protein_prefer_roll", confidence: "auto" };
      return selectByBestValue(filtered, "ground_protein_best_value");
    }
    return { product: candidates[0], rule: "ground_protein_only_patties", confidence: "human-review" };
  }

  // Rule 3: fresh proteins — reject frozen
  if (["chicken breast","chicken thigh","chicken tender","salmon","tilapia","cod","shrimp"].some((k) => name.includes(k))) {
    const fresh = candidates.filter((p) => !p.description.toLowerCase().includes("frozen"));
    const pool  = fresh.length > 0 ? fresh : candidates;
    if (pool.length === 1) return { product: pool[0], rule: "protein_prefer_fresh", confidence: "auto" };
    return selectByBestValue(pool, "protein_prefer_fresh_best_value");
  }

  // Rule 4: prefer Kroger store brand
  const krogerBrand = candidates.filter(
    (p) => p.brand?.toLowerCase() === "kroger" || p.description.toLowerCase().startsWith("kroger")
  );
  if (krogerBrand.length === 1) return { product: krogerBrand[0], rule: "kroger_store_brand", confidence: "auto" };
  if (krogerBrand.length > 1)   return selectByBestValue(krogerBrand, "kroger_store_brand_best_value");

  // Rule 5: reject organic / premium
  const nonPremium = candidates.filter((p) => {
    const d = p.description.toLowerCase();
    return !d.includes("organic") && !d.includes("natural") && !d.includes("premium")
        && !d.includes("artisan") && !d.includes("grass-fed") && !d.includes("free-range");
  });
  const pool = nonPremium.length > 0 ? nonPremium : candidates;

  // Rule 6: cheese — reject club / bulk packs
  if (name.includes("cheese")) {
    const standard = pool.filter((p) => {
      const d = p.description.toLowerCase();
      return !d.includes("club") && !d.includes("2 lb") && !d.includes("3 lb");
    });
    if (standard.length === 1) return { product: standard[0], rule: "cheese_standard_size", confidence: "auto" };
    if (standard.length > 1)   return selectByBestValue(standard, "cheese_best_value");
  }

  // Rule 7: best per-unit value
  if (pool.length === 1) return { product: pool[0], rule: "only_option", confidence: "auto" };
  return selectByBestValue(pool, "best_value");
}

function selectByBestValue(
  candidates: KrogerProduct[],
  rule: string
): { product: KrogerProduct; rule: string; confidence: "auto" | "human-review" } {
  const scored = candidates
    .map((p) => {
      const item  = p.items?.[0];
      const price = item?.price?.regular ?? item?.price?.promo ?? Infinity;
      return { product: p, pricePerUnit: parsePricePerUnit(price, item?.size ?? ""), price };
    })
    .filter((s) => s.price < Infinity)
    .sort((a, b) => a.pricePerUnit - b.pricePerUnit);

  if (scored.length === 0) return { product: candidates[0], rule: `${rule}_no_price`, confidence: "human-review" };

  const best       = scored[0];
  const secondBest = scored[1];
  if (secondBest && secondBest.pricePerUnit / best.pricePerUnit < 1.05)
    return { product: best.product, rule: `${rule}_ambiguous`, confidence: "human-review" };

  return { product: best.product, rule, confidence: "auto" };
}

function parsePricePerUnit(price: number, size: string): number {
  const s      = size.toLowerCase().trim();
  const lbMatch = s.match(/(\d+(?:\.\d+)?)\s*lb/);
  const ozMatch = s.match(/(\d+(?:\.\d+)?)\s*(?:fl\s*)?oz/);
  const ctMatch = s.match(/(\d+(?:\.\d+)?)\s*(?:ct|count|pk|pack)/);
  const gMatch  = s.match(/(\d+(?:\.\d+)?)\s*g\b/);
  if (lbMatch) return price / (parseFloat(lbMatch[1]) * 16);
  if (ozMatch) return price / parseFloat(ozMatch[1]);
  if (ctMatch) return price / parseFloat(ctMatch[1]);
  if (gMatch)  return price / (parseFloat(gMatch[1]) / 28.35);
  return price;
}

// ── Search term overrides ─────────────────────────────────────────────────────

const SEARCH_TERM_OVERRIDES: Record<string, string> = {
  "ground beef, 90/10 lean":                "lean ground beef 90/10",
  "ground turkey":                           "ground turkey 93/7",
  "chicken breast, boneless skinless":       "boneless skinless chicken breast",
  "chicken thighs, boneless skinless":       "boneless skinless chicken thighs",
  "chicken thighs, bone-in skin-on":         "chicken thighs bone in",
  "chicken tenders / tenderloins":           "chicken tenderloins",
  "chicken wings":                           "chicken wings party",
  "bacon, thick cut":                        "bacon thick cut",
  "bacon, regular":                          "bacon original",
  "pork shoulder / butt":                    "pork shoulder butt",
  "Italian sausage, mild":                   "italian sausage mild links",
  "breakfast sausage, bulk":                 "breakfast sausage roll",
  "chorizo, Mexican-style fresh":            "mexican chorizo fresh",
  "steak, skirt / fajita":                   "skirt steak",
  "shrimp, large, peeled deveined":          "shrimp large peeled deveined",
  "hoagie / sub rolls":                      "hoagie rolls",
  "flour tortillas, 8-inch":                 "flour tortillas 8 inch",
  "flour tortillas, 10-inch burrito size":   "flour tortillas burrito",
  "corn tortillas, 6-inch":                  "corn tortillas 6 inch",
  "butter, unsalted":                        "unsalted butter sticks",
  "butter, salted":                          "salted butter sticks",
  "soy sauce, low sodium":                   "low sodium soy sauce",
  "black pepper, whole / peppercorns":       "whole peppercorns",
  "sugar, granulated white":                 "granulated white sugar",
  "sugar, brown, light or dark":             "light brown sugar",
  "chickpeas / garbanzo beans, canned":      "garbanzo beans canned",
  "chicken broth / stock":                   "chicken broth",
  "beef broth / stock":                      "beef broth",
  "tomatoes, canned diced":                  "diced tomatoes canned",
  "tomatoes, canned crushed":                "crushed tomatoes canned",
  "peanut butter, creamy":                   "peanut butter creamy",
  "cream of mushroom soup, canned":          "cream of mushroom soup",
  "chipotle peppers in adobo, canned":       "chipotle peppers adobo sauce",
  "mexican blend cheese, shredded":          "mexican blend shredded cheese",
  "cheddar cheese, mild block":              "mild cheddar block",
  "cheddar cheese, sharp block":             "sharp cheddar block",
  "cheddar cheese, shredded":               "shredded cheddar cheese",
  "mozzarella, shredded":                    "shredded mozzarella cheese",
  "mozzarella, fresh ball":                  "fresh mozzarella ball",
  "parmesan, shredded / grated":             "parmesan cheese shredded",
  "pepper jack cheese, block":               "pepper jack block",
  "pepper jack cheese, shredded":            "shredded pepper jack cheese",
  "monterey jack cheese, shredded":          "shredded monterey jack",
  "swiss cheese, sliced":                    "swiss cheese sliced deli",
  "provolone cheese, sliced":                "provolone sliced deli",
  "pasta, spaghetti":                        "spaghetti pasta",
  "pasta, penne":                            "penne pasta",
  "pasta, fettuccine":                       "fettuccine pasta",
  "ramen noodles, fresh or dried":           "ramen noodles",
  "white rice, long grain":                  "long grain white rice",
  "brown rice, long grain":                  "long grain brown rice",
  "black beans, canned":                     "canned black beans",
  "kidney beans, canned":                    "canned kidney beans",
  "cooking spray, nonstick":                 "nonstick cooking spray",
  "white vinegar, distilled":                "distilled white vinegar",
  "tortilla chips":                          "restaurant style tortilla chips",
  "refried beans, canned":                   "refried beans",
};

function buildSearchTerm(name: string): string {
  return SEARCH_TERM_OVERRIDES[name] ?? name;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function resolveAll(): Promise<void> {
  const locationId = requireEnv("KROGER_LOCATION_ID");

  // Apply --only and --force filters to the hardcoded list
  let rows = INGREDIENTS_NEEDING_LOOKUP;
  if (ONLY_FILTER) {
    rows = rows.filter((r) => r.canonical_name.toLowerCase().includes(ONLY_FILTER.toLowerCase()));
  }

  if (REVIEW_ONLY) {
    console.log(`\n${"─".repeat(80)}`);
    console.log(`📋  ${rows.length} rows with NULL kroger_sku`);
    console.log("─".repeat(80));
    for (const row of rows) {
      console.log(`  ${row.canonical_name.padEnd(48)} USDA fallback: $${row.usda_avg_price} / ${row.unit}`);
    }
    return;
  }

  console.log(`\n${"─".repeat(80)}`);
  console.log(`🔍  Resolving ${rows.length} rows${DRY_RUN ? " (DRY RUN — pass --write to commit)" : ""}`);
  console.log("─".repeat(80));

  const resolutions: Resolution[]  = [];
  const needsHumanReview: Resolution[] = [];

  for (const row of rows) {
    const searchTerm = buildSearchTerm(row.canonical_name);
    process.stdout.write(`  ${row.canonical_name.padEnd(48)} → `);

    let candidates: KrogerProduct[] = [];
    try {
      candidates = await searchKroger(searchTerm, locationId);
    } catch (e) {
      console.log(`FAILED: ${(e as Error).message}`);
      resolutions.push({ canonical_name: row.canonical_name, chosen_upc: null,
        chosen_description: "API error", chosen_price: null, chosen_promo_price: null,
        chosen_size: "", rule_applied: "api_error", confidence: "human-review", candidates: [] });
      await sleep(RATE_LIMIT_MS);
      continue;
    }

    const { product, rule, confidence } = selectProduct(candidates, row);
    const item = product?.items?.[0];
    const resolution: Resolution = {
      canonical_name:    row.canonical_name,
      chosen_upc:        product?.upc ?? null,
      chosen_description: product?.description ?? "(none)",
      chosen_price:      item?.price?.regular ?? null,
      chosen_promo_price: item?.price?.promo ?? null,
      chosen_size:       item?.size ?? "",
      rule_applied:      rule,
      confidence,
      candidates,
    };
    resolutions.push(resolution);
    if (confidence === "human-review") needsHumanReview.push(resolution);

    const flag     = confidence === "auto" ? "✅" : "⚠️ ";
    const priceStr = resolution.chosen_price != null
      ? `$${resolution.chosen_price.toFixed(2)}${resolution.chosen_promo_price != null ? ` (promo $${resolution.chosen_promo_price.toFixed(2)})` : ""}`
      : "no price";
    console.log(`${flag} ${resolution.chosen_description.slice(0, 38).padEnd(38)} ${priceStr}  [${rule}]`);

    await sleep(RATE_LIMIT_MS);
  }

  // ── Write to Supabase ────────────────────────────────────────────────────

  const confirmed = resolutions.filter((r) => r.confidence === "auto" && r.chosen_upc != null);

  if (!DRY_RUN && confirmed.length > 0) {
    const supabase = createClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_KEY"));
    console.log(`\n📝  Writing ${confirmed.length} confirmed SKUs to ingredient_map...`);
    for (const r of confirmed) {
      const { error } = await supabase
        .from("ingredient_map")
        .update({ preferred_sku: r.chosen_upc, kroger_sku: r.chosen_upc,
                  price_source: "kroger", updated_at: new Date().toISOString() })
        .eq("canonical_name", r.canonical_name);
      if (error) console.error(`  ❌ ${r.canonical_name}: ${error.message}`);
      else        console.log(`  ✅ ${r.canonical_name} → ${r.chosen_upc}`);
    }
  }

  // ── Human review report ──────────────────────────────────────────────────

  if (needsHumanReview.length > 0) {
    console.log(`\n${"─".repeat(80)}`);
    console.log(`⚠️   ${needsHumanReview.length} rows need human review:`);
    console.log("─".repeat(80));
    for (const r of needsHumanReview) {
      console.log(`\n  canonical_name: ${r.canonical_name}`);
      console.log(`  rule_applied:   ${r.rule_applied}`);
      if (r.candidates.length === 0) {
        console.log(`  candidates:     none — check search term`);
      } else {
        console.log(`  candidates (top ${Math.min(r.candidates.length, 5)}):`);
        r.candidates.slice(0, 5).forEach((c, i) => {
          const itm = c.items?.[0];
          const p   = itm?.price?.regular ?? itm?.price?.promo;
          console.log(`    ${i + 1}. [${c.upc}] ${c.brand} ${c.description} (${itm?.size ?? "??"})${p != null ? ` — $${p.toFixed(2)}` : ""}`);
        });
        console.log(`\n  Fix with SQL:`);
        console.log(`    UPDATE ingredient_map SET preferred_sku='<upc>', kroger_sku='<upc>', price_source='kroger', updated_at=NOW() WHERE canonical_name='${r.canonical_name}';`);
      }
    }
  }

  // ── Summary ──────────────────────────────────────────────────────────────

  console.log(`\n${"─".repeat(80)}`);
  console.log("📊  Summary");
  console.log("─".repeat(80));
  console.log(`  Total processed:    ${resolutions.length}`);
  console.log(`  Auto-confirmed:     ${confirmed.length}${DRY_RUN ? " (not written — dry run)" : " (written to DB)"}`);
  console.log(`  Needs human review: ${needsHumanReview.length}`);
  console.log(`  No results:         ${resolutions.filter((r) => r.candidates.length === 0).length}`);
  if (DRY_RUN) console.log(`\n  Run with --write to commit auto-confirmed SKUs to Supabase.`);
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function requireEnv(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required env var: ${key}`);
  return val;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

resolveAll().catch((e) => {
  console.error(`\n❌ Fatal error: ${e.message}`);
  process.exit(1);
});