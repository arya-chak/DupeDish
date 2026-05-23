# CLAUDE.md — DupeDish

## What this project is
A React Native app (iOS + Android) where users type any restaurant
menu item, get a home-cook dupe recipe, and see the real grocery
cost vs. eating out — with a savings tracker over time.

---

## Planning & implementation workflow

Planning (architecture, feature scoping, tradeoffs, design decisions)
happens in Claude.ai chat. All implementation — writing files, editing
code, running commands — happens here in Claude Code.

**For Claude Code:**
- Receive implementation briefs from the planning chat
- Act on them directly — the brief is the spec
- When a task is ambiguous, stop and ask rather than assume
- Flag anything that looks wrong or inconsistent with this file

**For the planning chat:**
- Never writes production code files
- Produces implementation briefs Claude Code can act on directly
- Flags CLAUDE.md updates needed before each handoff

**When to update this file:**
Any decision made in planning chat that affects how Claude Code should
behave — new conventions, confirmed API behaviors, schema changes,
corrected assumptions — gets added here before the next Claude Code
session. This file is the handoff contract between the two contexts.

---

## Current repo state

### What exists (flat root structure)
dupe_my_dinner_feature_spec.html   # full MVP → v3 feature spec
dupe_my_dinner_architecture.html   # technical architecture reference
supabase_schema.sql                # ✅ deployed to Supabase
seed_ingredient_map_produce.sql    # ✅ run
seed_ingredient_map_pantry.sql     # ✅ run
seed_ingredient_map_core.sql       # ✅ run
sku_manual_resolutions.sql         # ✅ run
sku_lookup.ts                      # one-time SKU seeding tool
package.json                       # seed tool dependencies only
package-lock.json
env.example
kroger-spike.mjs                   # ✅ production spike complete
korgerlocapi.json                  # Kroger Locations OpenAPI spec
korgerauthapi.json                 # Kroger Auth OpenAPI spec
krogerprodapi.json                 # Kroger Products OpenAPI spec
CLAUDE.md

### What does NOT exist yet
- [ ] Expo / React Native app
- [x] Hono API server — `server/` scaffolded, all four stub routes verified
- [ ] Shared TypeScript types
- [ ] Any auth, screens, or UI
- [ ] Any backend routes or services (services are stubs)

*(Check items off as they are built)*

---

## Tech stack

| Layer | Choice |
|---|---|
| Mobile | Expo SDK / React Native, TypeScript, expo-router |
| API server | Node.js + Hono + Zod, TypeScript, Railway |
| Database | Supabase (Postgres + Auth + RLS) |
| Cache | Upstash Redis |
| AI | Anthropic claude-sonnet-4 via @anthropic-ai/sdk |
| Grocery data | Kroger API → Walmart → USDA FoodData (fallback chain) |
| Image storage | Cloudflare R2 (share card images, optional) |
| Push | Expo EAS |

---

## Server

- Lives in `server/` directory at the repo root
- Node.js + Hono, TypeScript, `tsx` for dev (`npm run dev`)
- Four routes: `POST /api/search`, `GET /api/recipe`, `GET /api/prices`, `POST /api/cart-link`
- Supabase client uses service role key (bypasses RLS) — never use anon key server-side
- Env vars validated at startup via Zod in `src/lib/env.ts` — server refuses to start with missing vars
- Services in `src/services/` are stubs until their respective implementation sessions

---

## Environment variables

Template in `env.example`. Never commit `.env` files. Never hardcode
secrets anywhere in the codebase.

**API server:**
KROGER_CLIENT_ID
KROGER_CLIENT_SECRET
KROGER_LOCATION_ID       # nearest store — filters stock, not price
SUPABASE_URL
SUPABASE_SERVICE_KEY     # service role — bypasses RLS for server writes
ANTHROPIC_API_KEY
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN

**Seed tools (tools/.env or root .env):**
KROGER_CLIENT_ID
KROGER_CLIENT_SECRET
KROGER_LOCATION_ID
SUPABASE_URL
SUPABASE_SERVICE_KEY

---

## Database rules

- All schema changes are `.sql` files committed to the repo first,
  then run in the Supabase SQL editor. Never alter tables directly
  in the Supabase dashboard without a corresponding SQL file.
- `ingredient_map` and `recipe_cache` are server-written only
  (service_role key). The client never writes to these tables.
- `savings_ledger` is append-only. No UPDATE or DELETE RLS policies
  exist on it by design — do not add them.
- RLS is enabled on all 6 tables. Do not disable it.
- The `users` row is created automatically by the
  `on_auth_user_created` trigger. Do not create it manually.

### Tables
- `users` — one row per auth user, mirrors `auth.users.id`
- `dupes` — saved dupe results per user
- `pantry_items` — per-user pantry (drives savings deduction)
- `savings_ledger` — append-only savings history
- `ingredient_map` — shared canonical ingredient → SKU/price map
- `recipe_cache` — deduplicates Claude API calls

---

## ingredient_map rules

| Flag | Meaning |
|---|---|
| `is_produce = true` | Skip Kroger API. Use `usda_avg_price` directly. |
| `is_pantry_staple = true` | Eligible for pantry deduction in savings calc |
| `preferred_sku` set | Human-verified. Always wins over a live search result. |

Never assign a `kroger_sku` to a produce row.
When checking `is_produce`, rely on the DB flag — not string matching
on ingredient names (the tomato paste/canned tomato bug came from
string matching — see `sku_manual_resolutions.sql`).

### SKU seeding commands
```bash
npx ts-node sku_lookup.ts              # dry-run, inspect decisions
npx ts-node sku_lookup.ts --write      # write confirmed SKUs to Supabase
npx ts-node sku_lookup.ts --only=bacon # single ingredient by name
npx ts-node sku_lookup.ts --review     # print all rows, no API calls
```

---

## Kroger API — confirmed facts from production spike

These are verified, not assumed. Do not work around them.

1. **Always use production** (`https://api.kroger.com/v1`).
   The cert environment (`api-ce.kroger.com`) has a thin catalog.
   Only use cert for auth flow testing.

2. **Pricing is chain-wide.** The same SKU returns the same price
   across all nearby stores. Cache key for prices is `kroger_sku`
   only — no `store_id` in the cache key.

3. **Ratio syntax works.** `"ground beef 80/20"` resolves correctly.
   Do not strip ratio suffixes from search terms.

4. **`inventory.status` always returns `"unknown"`** in both cert and
   production. Do not build an "in stock" indicator in the MVP UI.

5. **Token TTL is 30 minutes.** Cache the token server-side.
   Never fetch a new token per request.

6. **Batch SKU lookups.** Do not call `/products` per ingredient.
   Batch into the minimum number of calls per session.

7. **Multi-format ambiguity is real.** `"ground beef 80/20"` returns
   patties, roll, and tray — first result is pre-formed patties, wrong
   for recipes. Any ingredient with multiple pack formats must have a
   human-verified `preferred_sku` before going live.

8. **Fresh produce returns 0 results.** Confirmed in production.
   All produce rows must have `is_produce = true` and route directly
   to `usda_avg_price`. Never call the Products API for produce.

---

## Savings calculation
perMealCost = groceryTotal ÷ (servingsPerBatch × timesMaking)

- Compare per-meal cost home vs per-meal cost at the restaurant.
  Never compare raw grocery total vs restaurant price.
- Deduct pantry staples the user already owns from `groceryTotal`.
- Delivery path: add ~$18–22 flat for Instacart fees when user opts in.
- Annual projection: `perMealSavings × timesMaking × 52`

---

## Claude API usage

- **Model:** `claude-sonnet-4-20250514`
- **Always use structured JSON output.** No free-text parsing.
- **Recipe cache key:** `sha256(dish_name + servings + calorie_target + dietary_flags)`
- **Cache TTL:** recipes 7 days · prices 24 hours · disambiguation 30 days
- **Cache miss path:** Redis → `recipe_cache` Postgres → Claude API.
  Only call Claude if both cache layers miss.
- **Calorie target:** include in the prompt — Claude adjusts portions
  and substitutions to hit the range. Do not post-process portions.

---

## Key product rules

1. **Free tier:** 5 dupes/month. Tracked via `dupe_count_month` on
   `users`. Increment on every successful dupe generation.
2. **Premium:** `is_premium = true` → unlimited dupes.
3. **Share cards are client-side only.** Generated via
   `react-native-view-shot`. No server round-trip for the image.
4. **Location UX:** request permission on first dupe with value-framing
   copy. Fall back to ZIP code input if denied.
5. **Cache the store list** in Supabase — do not re-query the Kroger
   Locations API every session.
6. **Never show a blank price.** Fallback chain:
   Kroger SKU → Walmart → USDA avg. Always show something, labeled
   "estimated" when falling back to USDA.
   
   
# Coding Guidelines
Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.
