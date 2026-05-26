export interface ProviderResult {
  sku: string;
  description: string;
  price: number;
  promoPrice?: number;
  size: string;
  inStock: boolean;
}

export interface GroceryProvider {
  name: 'kroger' | 'walmart';
  searchByName(canonicalName: string, locationId?: string): Promise<ProviderResult | null>;
  searchBySku(sku: string, locationId?: string): Promise<ProviderResult | null>;
  // Note: when Walmart is added post-MVP, its Recipe & Bundles API likely supports a batch
  // ingredient match — add matchIngredients?(ingredients: string[]): Promise<Map<string, ProviderResult>>
}
