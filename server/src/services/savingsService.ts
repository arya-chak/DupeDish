import { ResolvedIngredient } from '../types/price';

export const DELIVERY_FEE_DISCLAIMER = 'Delivery fees not included';

export interface SavingsInput {
  pricedIngredients: ResolvedIngredient[];
  pantryItems: string[];          // canonical_names
  servingsPerBatch: number;
  timesMaking: number;
  restaurantPrice: number;
  restaurantCalories: number;
  homeCaloriesPerServing: number;
  ledgerSummary?: { totalSaved: number; weeksActive: number };
}

export interface SavingsResult {
  groceryTotal: number;
  pantryDeduction: number;
  adjustedGroceryTotal: number;
  perMealCostHome: number;
  perMealCostRestaurant: number;
  perMealSavings: number;
  isCheaperAtRestaurant: boolean;
  annualSavings: number;
  annualSavingsIsEstimate: boolean;
  calorieDelta: number;
  deductedItems: string[];
}

function r2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function calculateSavings(input: SavingsInput): SavingsResult {
  const {
    pricedIngredients,
    pantryItems,
    servingsPerBatch,
    timesMaking,
    restaurantPrice,
    restaurantCalories,
    homeCaloriesPerServing,
    ledgerSummary,
  } = input;

  const pantrySet = new Set(pantryItems);
  const deductedItems: string[] = [];
  let rawGroceryTotal = 0;
  let rawPantryDeduction = 0;

  for (const ingredient of pricedIngredients) {
    rawGroceryTotal += ingredient.price;
    if (pantrySet.has(ingredient.name)) {
      deductedItems.push(ingredient.name);
      rawPantryDeduction += ingredient.price;
    }
  }

  const groceryTotal = r2(rawGroceryTotal);
  const pantryDeduction = r2(rawPantryDeduction);
  const adjustedGroceryTotal = r2(groceryTotal - pantryDeduction);

  const totalMeals = servingsPerBatch * timesMaking;
  const perMealCostHome = r2(totalMeals > 0 ? adjustedGroceryTotal / totalMeals : 0);
  const perMealCostRestaurant = r2(restaurantPrice);
  const perMealSavings = r2(perMealCostRestaurant - perMealCostHome);
  const isCheaperAtRestaurant = perMealSavings < 0;

  let annualSavings: number;
  let annualSavingsIsEstimate: boolean;

  if (ledgerSummary && ledgerSummary.weeksActive > 0) {
    annualSavings = r2((ledgerSummary.totalSaved / ledgerSummary.weeksActive) * 52);
    annualSavingsIsEstimate = false;
  } else {
    annualSavings = r2(perMealSavings * timesMaking * 52);
    annualSavingsIsEstimate = true;
  }

  const calorieDelta = r2(restaurantCalories - homeCaloriesPerServing);

  return {
    groceryTotal,
    pantryDeduction,
    adjustedGroceryTotal,
    perMealCostHome,
    perMealCostRestaurant,
    perMealSavings,
    isCheaperAtRestaurant,
    annualSavings,
    annualSavingsIsEstimate,
    calorieDelta,
    deductedItems,
  };
}
