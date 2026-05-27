export type IngredientUnit =
  | "lb" | "oz"
  | "cup" | "tbsp" | "tsp" | "fl_oz"
  | "whole" | "clove" | "slice" | "strip" | "sprig"
  | "pinch";

export interface RecipeIngredient {
  id: string;
  name: string;
  quantity: number;
  unit: IngredientUnit;
  notes?: string;
}

export interface RecipeStep {
  stepNumber: number;
  instruction: string;
  timerMinutes?: number;
}

export interface RecipeResponse {
  dishName: string;
  servings: number;
  prepTimeMinutes: number;
  cookTimeMinutes: number;
  difficultyRating: "easy" | "medium" | "hard";
  caloriesPerServing: number;
  flavorNotes: string;
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
}

export interface RecipeInput {
  dishName: string;
  restaurantName?: string;
  servings: number;
  calorieTarget?: number;
  dietaryFlags?: string[];
}

export class RecipeGenerationError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "RecipeGenerationError";
  }
}

export interface PantryItem {
  id: string;
  canonical_name: string;
  quantity: number | null;
  unit: string | null;
}

export interface PantryItemInput {
  canonical_name: string;
  quantity?: number;
  unit?: string;
}

export interface Staple {
  canonical_name: string;
  unit: string;
  owned: boolean;
}
