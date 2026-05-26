// Grams per teaspoon for common dry pantry ingredients.
// Used to bridge volume (recipe) ↔ weight (package) when Kroger returns oz/g
// for items like spices where recipes specify tsp/tbsp.
const GRAMS_PER_TSP: Record<string, number> = {
  'salt': 6,
  'sugar': 4.2,
  'granulated sugar': 4.2,
  'brown sugar': 4.6,
  'flour': 2.6,
  'baking soda': 6,
  'baking powder': 4,
  'cornstarch': 2.7,
  'black pepper': 2.3,
  'white pepper': 2.4,
  'garlic powder': 3.1,
  'onion powder': 2.4,
  'paprika': 2.3,
  'cumin': 2.1,
  'chili powder': 2.6,
  'cinnamon': 2.6,
  'cayenne': 2.1,
  'oregano': 1.5,
  'thyme': 1.5,
  'basil': 1.2,
  'default': 3.0, // fallback for unknown dry goods
};

// Returns grams-per-tsp for the ingredient, longest key match wins.
function getDensity(ingredientName: string): number {
  const name = ingredientName.toLowerCase();
  const keys = Object.keys(GRAMS_PER_TSP)
    .filter((k) => k !== 'default')
    .sort((a, b) => b.length - a.length); // longest (most specific) first
  for (const key of keys) {
    if (name.includes(key)) return GRAMS_PER_TSP[key];
  }
  return GRAMS_PER_TSP['default'];
}

const WEIGHT_TO_OZ: Record<string, number> = {
  oz: 1,
  lb: 16,
  g: 1 / 28.3495,
  kg: 1000 / 28.3495,
};

const VOLUME_TO_ML: Record<string, number> = {
  ml: 1,
  l: 1000,
  fl_oz: 29.5735,
  cup: 236.588,
  tbsp: 14.7868,
  tsp: 4.92892,
  gal: 3785.41,
};

// All units treated as dimensionless count (1 unit = 1 unit)
const COUNT_UNITS = new Set([
  'whole', 'clove', 'slice', 'strip', 'sprig', 'pinch',
  'ct', 'count', 'each', 'pk', 'pack', 'pcs', 'pieces',
]);

type UnitType = 'weight' | 'volume' | 'count';

function toBase(qty: number, unit: string): { value: number; type: UnitType } | null {
  const u = unit.toLowerCase().trim();
  if (u === 'dozen') return { value: qty * 12, type: 'count' };
  if (WEIGHT_TO_OZ[u] !== undefined) return { value: qty * WEIGHT_TO_OZ[u], type: 'weight' };
  if (VOLUME_TO_ML[u] !== undefined) return { value: qty * VOLUME_TO_ML[u], type: 'volume' };
  if (COUNT_UNITS.has(u)) return { value: qty, type: 'count' };
  return null;
}

function parsePackageSize(sizeStr: string): { qty: number; unit: string } | null {
  const s = sizeStr.toLowerCase().trim();

  // Bare unit names with no leading number
  const BARE: Record<string, { qty: number; unit: string }> = {
    lb: { qty: 1, unit: 'lb' },
    oz: { qty: 1, unit: 'oz' },
    each: { qty: 1, unit: 'ct' },
    dozen: { qty: 12, unit: 'ct' },
    gal: { qty: 1, unit: 'gal' },
    gallon: { qty: 1, unit: 'gal' },
    pint: { qty: 16, unit: 'fl_oz' },
    quart: { qty: 32, unit: 'fl_oz' },
    cup: { qty: 1, unit: 'cup' },
    ml: { qty: 1, unit: 'ml' },
  };
  if (BARE[s]) return BARE[s];

  // Patterns ordered longest-match first to avoid partial matches (fl oz before oz)
  const patterns: Array<{ re: RegExp; unit: string }> = [
    { re: /(\d+(?:\.\d+)?)\s*fl[\s-]*oz/, unit: 'fl_oz' },
    { re: /(\d+(?:\.\d+)?)\s*oz/, unit: 'oz' },
    { re: /(\d+(?:\.\d+)?)\s*lb/, unit: 'lb' },
    { re: /(\d+(?:\.\d+)?)\s*gal(?:lon)?/, unit: 'gal' },
    { re: /(\d+(?:\.\d+)?)\s*l\b/, unit: 'l' },
    { re: /(\d+(?:\.\d+)?)\s*ml\b/, unit: 'ml' },
    { re: /(\d+(?:\.\d+)?)\s*kg\b/, unit: 'kg' },
    { re: /(\d+(?:\.\d+)?)\s*g\b/, unit: 'g' },
    { re: /(\d+(?:\.\d+)?)\s*(?:ct|count|pk|pack|pcs|pieces)/, unit: 'ct' },
  ];

  for (const { re, unit } of patterns) {
    const m = s.match(re);
    if (m) return { qty: parseFloat(m[1]), unit };
  }

  return null;
}

/**
 * Returns the price of recipeQty units given a package price and size.
 *
 * Handles the volume→weight cross-unit case (e.g. recipe in tsp, package in oz)
 * using a density table for common dry pantry ingredients. Pass ingredientName
 * so the correct density entry is selected; defaults to 3.0 g/tsp if unknown.
 *
 * Falls back to packagePrice as-is for all other unparseable or mismatched units.
 */
export function scalePrice(
  recipeQty: number,
  recipeUnit: string,
  packageSize: string,
  packagePrice: number,
  ingredientName: string = '',
): number {
  const parsed = parsePackageSize(packageSize);
  if (!parsed) {
    console.warn(`[unitConversion] Could not parse packageSize "${packageSize}" — using package price as-is`);
    return packagePrice;
  }

  const recipeBase = toBase(recipeQty, recipeUnit);
  const pkgBase = toBase(parsed.qty, parsed.unit);

  if (!recipeBase || !pkgBase) {
    console.warn(`[unitConversion] Unknown unit — recipeUnit="${recipeUnit}", pkgUnit="${parsed.unit}" — using package price as-is`);
    return packagePrice;
  }

  if (recipeBase.type === pkgBase.type) {
    // Same unit family — straightforward ratio
    if (pkgBase.value === 0) return packagePrice;
    return packagePrice * (recipeBase.value / pkgBase.value);
  }

  // Cross-unit: volume recipe qty vs weight package size (typical for dry spices/pantry)
  if (recipeBase.type === 'volume' && pkgBase.type === 'weight') {
    const recipeQtyTsp = recipeBase.value / VOLUME_TO_ML['tsp']; // ml → tsp
    const gramsPerTsp = getDensity(ingredientName);
    const recipeGrams = recipeQtyTsp * gramsPerTsp;
    const pkgGrams = pkgBase.value * 28.3495; // oz → grams
    if (pkgGrams === 0) return packagePrice;
    return packagePrice * (recipeGrams / pkgGrams);
  }

  console.warn(`[unitConversion] Type mismatch — recipe="${recipeUnit}" (${recipeBase.type}), pkg="${parsed.unit}" (${pkgBase.type}) — using package price as-is`);
  return packagePrice;
}
