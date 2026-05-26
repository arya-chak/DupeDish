import { describe, it, expect } from 'vitest';
import { calculateSavings, type SavingsInput } from './savingsService';
import type { ResolvedIngredient } from '../types/price';

function makeIngredient(name: string, price: number): ResolvedIngredient {
  return {
    name,
    quantity: 1,
    unit: 'lb',
    price,
    pricePerUnit: price,
    source: 'kroger',
    isEstimate: false,
  };
}

const base: SavingsInput = {
  pricedIngredients: [
    makeIngredient('chicken breast', 5.00),
    makeIngredient('olive oil', 2.00),
    makeIngredient('garlic', 0.50),
  ],
  pantryItems: [],
  servingsPerBatch: 4,
  timesMaking: 2,
  restaurantPrice: 15.00,
  restaurantCalories: 800,
  homeCaloriesPerServing: 600,
};

describe('calculateSavings', () => {
  it('computes positive savings with no pantry deduction', () => {
    const result = calculateSavings(base);

    expect(result.groceryTotal).toBe(7.50);
    expect(result.pantryDeduction).toBe(0);
    expect(result.adjustedGroceryTotal).toBe(7.50);
    // 7.50 / (4 * 2) = 0.9375 → 0.94
    expect(result.perMealCostHome).toBe(0.94);
    expect(result.perMealCostRestaurant).toBe(15.00);
    expect(result.perMealSavings).toBe(14.06);
    expect(result.isCheaperAtRestaurant).toBe(false);
    expect(result.annualSavingsIsEstimate).toBe(true);
    // 14.06 * 2 * 52 = 1462.24
    expect(result.annualSavings).toBe(1462.24);
    expect(result.deductedItems).toEqual([]);
  });

  it('deducts pantry items from adjustedGroceryTotal', () => {
    const result = calculateSavings({ ...base, pantryItems: ['olive oil'] });

    expect(result.pantryDeduction).toBe(2.00);
    expect(result.adjustedGroceryTotal).toBe(5.50);
    // 5.50 / 8 = 0.6875 → 0.69
    expect(result.perMealCostHome).toBe(0.69);
    expect(result.deductedItems).toEqual(['olive oil']);
  });

  it('sets isCheaperAtRestaurant true when home costs more per meal', () => {
    // very expensive ingredients, cheap restaurant
    const expensive: SavingsInput = {
      ...base,
      pricedIngredients: [makeIngredient('wagyu beef', 80.00)],
      restaurantPrice: 5.00,
      servingsPerBatch: 1,
      timesMaking: 1,
    };
    const result = calculateSavings(expensive);

    expect(result.perMealCostHome).toBe(80.00);
    expect(result.perMealSavings).toBe(-75.00);
    expect(result.isCheaperAtRestaurant).toBe(true);
  });

  it('uses ledger-based annual savings when ledgerSummary is provided', () => {
    const result = calculateSavings({
      ...base,
      ledgerSummary: { totalSaved: 200, weeksActive: 4 },
    });

    // (200 / 4) * 52 = 2600
    expect(result.annualSavings).toBe(2600);
    expect(result.annualSavingsIsEstimate).toBe(false);
  });

  it('falls back to estimate when no ledgerSummary', () => {
    const result = calculateSavings({ ...base, ledgerSummary: undefined });

    expect(result.annualSavingsIsEstimate).toBe(true);
    expect(result.annualSavings).toBe(
      Math.round(result.perMealSavings * base.timesMaking * 52 * 100) / 100,
    );
  });

  it('returns negative calorieDelta when home calories exceed restaurant', () => {
    // home is higher calorie than restaurant → negative delta
    const result = calculateSavings({
      ...base,
      restaurantCalories: 500,
      homeCaloriesPerServing: 750,
    });

    expect(result.calorieDelta).toBe(-250);
  });
});
