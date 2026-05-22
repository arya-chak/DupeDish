#!/usr/bin/env node
/**
 * Kroger API Spike — Dupe My Dinner
 *
 * Tests three things in order:
 *   1. OAuth2 token (client credentials)
 *   2. Location API — get real store IDs near a lat/lng
 *   3. Product API — search ingredients, check price coverage + search quality
 *
 * Usage:
 *   KROGER_CLIENT_ID=xxx KROGER_CLIENT_SECRET=yyy node kroger-spike.mjs
 *
 * Register at: https://developer.kroger.com/
 * Scope needed: product.compact
 */

// const BASE_URL = "https://api-ce.kroger.com/v1";
const BASE_URL = "https://api.kroger.com/v1";

// ─── config ────────────────────────────────────────────────────────────────

const CLIENT_ID     = process.env.KROGER_CLIENT_ID;
const CLIENT_SECRET = process.env.KROGER_CLIENT_SECRET;

// Plano, TX — change to wherever you want to test
const TEST_LAT = 33.0198;
const TEST_LON = -96.6989;

// Ingredients that cover a range of mapping difficulty
const TEST_INGREDIENTS = [
  "ground beef 80/20",
  "brioche buns",
  "american cheese slices",
  "iceberg lettuce",
  "olive oil",
];

// ─── helpers ───────────────────────────────────────────────────────────────

function log(label, data) {
  console.log(`\n${"─".repeat(60)}`);
  console.log(`▶  ${label}`);
  console.log("─".repeat(60));
  if (typeof data === "string") console.log(data);
  else console.log(JSON.stringify(data, null, 2));
}

function fail(step, err) {
  console.error(`\n❌  STEP FAILED: ${step}`);
  console.error(err?.message ?? err);
  process.exit(1);
}

// ─── Step 1: Auth ──────────────────────────────────────────────────────────

async function getToken() {
  log("STEP 1 — OAuth2 token (client_credentials)");

  if (!CLIENT_ID || !CLIENT_SECRET) {
    fail("Auth", "Missing KROGER_CLIENT_ID or KROGER_CLIENT_SECRET env vars.\n" +
      "Register at https://developer.kroger.com/ and set them before running.");
  }

  const creds = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64");

  const res = await fetch(`${BASE_URL}/connect/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Authorization": `Basic ${creds}`,
    },
    body: "grant_type=client_credentials&scope=product.compact",
  });

  if (!res.ok) {
    const body = await res.text();
    fail("Auth", `HTTP ${res.status}: ${body}`);
  }

  const data = await res.json();
  log("Token response", {
    token_type:   data.token_type,
    expires_in:   `${data.expires_in}s (~${Math.round(data.expires_in / 60)} min)`,
    scope:        data.scope,
    has_token:    !!data.access_token,
  });

  console.log("✅  Auth OK");
  return data.access_token;
}

// ─── Step 2: Locations ─────────────────────────────────────────────────────

async function getStores(token) {
  log(`STEP 2 — Location API (lat=${TEST_LAT}, lon=${TEST_LON}, radius=10mi)`);

  const url = new URL(`${BASE_URL}/locations`);
  url.searchParams.set("filter.lat.near", TEST_LAT);
  url.searchParams.set("filter.lon.near", TEST_LON);
  url.searchParams.set("filter.radiusInMiles", "10");
  url.searchParams.set("filter.limit", "5");

  const res = await fetch(url, {
    headers: { "Authorization": `Bearer ${token}` },
  });

  if (!res.ok) {
    const body = await res.text();
    fail("Locations", `HTTP ${res.status}: ${body}`);
  }

  const data = await res.json();
  const stores = data.data ?? [];

  if (!stores.length) fail("Locations", "No stores returned — check lat/lon values");

  log("Stores found", stores.map(s => ({
    locationId: s.locationId,
    name:       s.name,
    chain:      s.chain,
    address:    s.address?.addressLine1,
    city:       s.address?.city,
    distance:   s.geolocation?.latLng ?? "n/a",
  })));

  console.log(`✅  Locations OK — ${stores.length} store(s) found`);
  console.log(`    Using locationId: ${stores[0].locationId} (${stores[0].name}) for product tests`);

  return { stores, primaryStoreId: stores[0].locationId };
}

// ─── Step 3: Products ──────────────────────────────────────────────────────

async function searchProduct(token, term, locationId) {
  const url = new URL(`${BASE_URL}/products`);
  url.searchParams.set("filter.term", term);
  url.searchParams.set("filter.locationId", locationId);
  url.searchParams.set("filter.limit", "5");

  const res = await fetch(url, {
    headers: { "Authorization": `Bearer ${token}` },
  });

  if (!res.ok) {
    const body = await res.text();
    return { error: `HTTP ${res.status}: ${body}` };
  }

  return res.json();
}

async function testProducts(token, primaryStoreId, stores) {
  log(`STEP 3 — Product API (store: ${primaryStoreId})`);

  const results = [];

  for (const ingredient of TEST_INGREDIENTS) {
    const data = await searchProduct(token, ingredient, primaryStoreId);
    const items = data.data ?? [];

    const summary = {
      query:       ingredient,
      totalFound:  data.meta?.pagination?.total ?? items.length,
      topResults:  items.slice(0, 3).map(p => {
        const price    = p.items?.[0]?.price;
        const hasPrice = price?.regular != null;
        return {
          upc:         p.upc,
          description: p.description,
          brand:       p.brand,
          size:        p.items?.[0]?.size,
          price_regular: hasPrice ? `$${price.regular}` : "⚠ MISSING",
          price_promo:   price?.promo   ? `$${price.promo}`   : "none",
          in_stock:    p.items?.[0]?.inventory?.status ?? "unknown",
        };
      }),
    };

    const missingPrices = summary.topResults.filter(r => r.price_regular === "⚠ MISSING").length;
    summary.price_coverage = `${summary.topResults.length - missingPrices}/${summary.topResults.length} results have prices`;

    results.push(summary);
    console.log(`\n  [${ingredient}] → ${summary.totalFound} results | ${summary.price_coverage}`);
    if (missingPrices > 0) console.log("  ⚠  Some prices missing — may require Partner tier");
  }

  log("Full product search results", results);
  return results;
}

// ─── Step 3b: Price diff across stores ─────────────────────────────────────

async function testLocationPriceDiff(token, stores) {
  if (stores.length < 2) {
    log("STEP 3b — Cross-store price comparison", "⚠ Only 1 store found, skipping diff test");
    return;
  }

  log(`STEP 3b — Same SKU, two stores — does locationId actually change prices?`);

  const store1 = stores[0].locationId;
  const store2 = stores[1].locationId;
  const term   = "ground beef 80/20";

  const [r1, r2] = await Promise.all([
    searchProduct(token, term, store1),
    searchProduct(token, term, store2),
  ]);

  const p1 = r1.data?.[0]?.items?.[0]?.price;
  const p2 = r2.data?.[0]?.items?.[0]?.price;

  log("Price diff result", {
    store1: { id: store1, name: stores[0].name, price: p1?.regular ?? "missing" },
    store2: { id: store2, name: stores[1].name, price: p2?.regular ?? "missing" },
    prices_differ: p1?.regular !== p2?.regular ? "✅ YES — location pricing works" : "⚠ SAME — may be catalog-level only",
  });
}

// ─── main ──────────────────────────────────────────────────────────────────

(async () => {
  console.log("🛒  Kroger API Spike — Dupe My Dinner\n");

  try {
    const token                       = await getToken();
    const { stores, primaryStoreId }  = await getStores(token);
    await testProducts(token, primaryStoreId, stores);
    await testLocationPriceDiff(token, stores);

    log("SPIKE COMPLETE — Key questions answered", [
      "1. Auth working?          → check Step 1 output",
      "2. Store IDs available?   → check Step 2 output",
      "3. Prices in response?    → check price_coverage in Step 3",
      "4. Search relevance good? → manually review topResults for each ingredient",
      "5. Location pricing real? → check Step 3b diff result",
    ]);
  } catch (err) {
    console.error("\n💥  Unhandled error:", err);
    process.exit(1);
  }
})();
