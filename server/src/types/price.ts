export interface PriceRequest {
  recipeId: string;
  locationId: string;
  servings: number;
  timesMaking: number;
  budgetMode: boolean;
  pantryItems?: string[]; // canonical_names of user-owned items — zeroes out their cost
}

export interface ResolvedIngredient {
  name: string;
  quantity: number;
  unit: string;
  price: number;
  pricePerUnit: number;
  source: 'kroger' | 'usda_avg' | 'walmart'; // 'walmart' unused until post-MVP
  isEstimate: boolean;
  krogerSku?: string;
  inStock?: boolean; // undefined when source = usda_avg
  pantryOwned?: boolean; // true when user owns this item; price is zeroed out
}

export interface Substitution {
  originalName: string;
  substituteName: string;
  notes?: string;
}

export interface PriceResponse {
  recipeId: string;
  resolvedAt: string;
  store: { name: string; locationId: string };
  ingredients: ResolvedIngredient[];
  totalCost: number;
  budgetMode: boolean;
  substitutionsApplied: Substitution[];
}
