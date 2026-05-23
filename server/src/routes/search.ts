import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { generateRecipe } from '../services/recipeService';
import { RecipeGenerationError } from '../types/recipe';

const SearchRequestSchema = z.object({
  dishName: z.string().min(1),
  restaurantName: z.string().optional(),
  servings: z.number().int().min(1).max(20),
  calorieTarget: z.number().int().positive().optional(),
  dietaryFlags: z.array(z.string()).optional(),
});

const router = new Hono();

router.post('/', zValidator('json', SearchRequestSchema), async (c) => {
  const body = c.req.valid('json');
  try {
    const recipe = await generateRecipe(body);
    return c.json({ recipe });
  } catch (err) {
    if (err instanceof RecipeGenerationError) {
      return c.json({ error: 'Recipe generation failed' }, 500);
    }
    throw err;
  }
});

export default router;
