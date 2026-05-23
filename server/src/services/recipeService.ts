import { createHash } from "crypto";
import Anthropic from "@anthropic-ai/sdk";
import { env } from "../lib/env";
import { redis } from "../lib/redis";
import { supabase } from "../lib/supabase";
import {
  RecipeInput,
  RecipeResponse,
  RecipeGenerationError,
} from "../types/recipe";

const RECIPE_TTL_SECONDS = 604800; // 7 days

const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are a recipe engineer. Your job is to reverse-engineer homemade versions \
of restaurant dishes that are accurate enough to taste like the original, \
practical for a home cook, and optimized for the constraints given. \
Always respond with valid JSON matching the schema exactly. \
Never add commentary outside the JSON.`;

function buildCacheKey(input: RecipeInput): string {
  const flags = [...(input.dietaryFlags ?? [])].sort().join(",");
  const raw = [
    input.dishName.toLowerCase().trim(),
    input.servings,
    input.calorieTarget ?? "",
    flags,
  ].join("|");
  return createHash("sha256").update(raw).digest("hex");
}

function buildUserPrompt(input: RecipeInput): string {
  const lines: string[] = [
    `Dish: ${input.dishName}`,
  ];
  if (input.restaurantName) {
    lines.push(`Restaurant: ${input.restaurantName}`);
  }
  lines.push(`Servings per batch: ${input.servings}`);
  if (input.calorieTarget) {
    lines.push(`Calorie target per serving: ${input.calorieTarget}`);
  }
  if (input.dietaryFlags && input.dietaryFlags.length > 0) {
    lines.push(`Dietary flags: ${input.dietaryFlags.join(", ")}`);
  }

  lines.push("");
  lines.push("Generate a home recipe that faithfully dupes this dish.");
  if (input.calorieTarget) {
    lines.push(
      "If a calorie target is set, adjust portions and substitutions to hit within ±10%."
    );
  }
  lines.push(
    "Use common US grocery store ingredient names — no specialty items unless essential."
  );
  lines.push("");
  lines.push(
    `Respond ONLY with a JSON object matching this exact schema:
{
  "dishName": string,
  "servings": number,
  "prepTimeMinutes": number,
  "cookTimeMinutes": number,
  "difficultyRating": "easy" | "medium" | "hard",
  "caloriesPerServing": number,
  "flavorNotes": string,
  "ingredients": [
    {
      "id": string,          // "ing_001", "ing_002", etc.
      "name": string,        // grocery-friendly name
      "quantity": number,
      "unit": string,        // one of: lb, oz, cup, tbsp, tsp, fl_oz, whole, clove, slice, strip, sprig, pinch
      "notes": string        // optional
    }
  ],
  "steps": [
    {
      "stepNumber": number,
      "instruction": string,
      "timerMinutes": number // optional
    }
  ]
}`
  );
  lines.push("");
  lines.push(
    "Units for ingredients must be one of: lb, oz, cup, tbsp, tsp, fl_oz, whole, clove, slice, strip, sprig, pinch."
  );

  return lines.join("\n");
}

async function callClaude(input: RecipeInput): Promise<RecipeResponse> {
  let text: string;
  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      temperature: 0,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildUserPrompt(input) }],
    });
    if (response.stop_reason === "max_tokens") {
      throw new RecipeGenerationError("Claude response was truncated (max_tokens reached)");
    }
    text = (response.content[0] as { type: string; text: string }).text;
  } catch (err) {
    if (err instanceof RecipeGenerationError) throw err;
    console.error("[recipe] Claude API error:", err);
    throw new RecipeGenerationError("Claude API call failed", err);
  }

  // Extract the JSON object — handle models that wrap output in ```json ... ```
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) {
    throw new RecipeGenerationError("No JSON object found in Claude response");
  }
  const jsonText = text.slice(start, end + 1);

  try {
    return JSON.parse(jsonText) as RecipeResponse;
  } catch (err) {
    throw new RecipeGenerationError("Failed to parse Claude response as JSON", err);
  }
}

async function writeToPostgres(
  cacheKey: string,
  input: RecipeInput,
  recipe: RecipeResponse
): Promise<void> {
  const { error } = await supabase.from("recipe_cache").insert({
    cache_key: cacheKey,
    dish_name: input.dishName,
    servings: input.servings,
    calorie_target: input.calorieTarget ?? null,
    dietary_flags: input.dietaryFlags ?? [],
    prep_time_mins: recipe.prepTimeMinutes,
    cook_time_mins: recipe.cookTimeMinutes,
    difficulty: recipe.difficultyRating,
    calories_per_serving: recipe.caloriesPerServing,
    flavor_notes: recipe.flavorNotes,
    ingredients: recipe.ingredients,
    steps: recipe.steps,
    generated_at: new Date().toISOString(),
  });
  if (error) {
    // Log but don't fail the request — cache write failure is non-fatal
    console.error("Failed to write recipe to Postgres cache:", error);
  }
}

function rowToRecipeResponse(row: Record<string, unknown>): RecipeResponse {
  return {
    dishName: row.dish_name as string,
    servings: row.servings as number,
    prepTimeMinutes: row.prep_time_mins as number,
    cookTimeMinutes: row.cook_time_mins as number,
    difficultyRating: row.difficulty as "easy" | "medium" | "hard",
    caloriesPerServing: row.calories_per_serving as number,
    flavorNotes: row.flavor_notes as string,
    ingredients: row.ingredients as RecipeResponse["ingredients"],
    steps: row.steps as RecipeResponse["steps"],
  };
}

export async function generateRecipe(input: RecipeInput): Promise<RecipeResponse> {
  const cacheKey = buildCacheKey(input);
  const redisKey = `recipe:${cacheKey}`;

  // 1. Redis cache
  const cached = await redis.get<RecipeResponse>(redisKey);
  if (cached) {
    return cached;
  }

  // 2. Postgres cache
  const { data: rows } = await supabase
    .from("recipe_cache")
    .select("*")
    .eq("cache_key", cacheKey)
    .limit(1);

  if (rows && rows.length > 0) {
    const recipe = rowToRecipeResponse(rows[0] as Record<string, unknown>);
    await redis.set(redisKey, recipe, { ex: RECIPE_TTL_SECONDS });
    return recipe;
  }

  // 3. Claude API
  const recipe = await callClaude(input);
  await writeToPostgres(cacheKey, input, recipe);
  await redis.set(redisKey, recipe, { ex: RECIPE_TTL_SECONDS });
  return recipe;
}
