
'use server';

/**
 * @fileOverview Generates a shopping list from a diet plan.
 *
 * - generateShoppingList - A function that creates a categorized shopping list.
 * - GenerateShoppingListInput - The input type for the generateShoppingList function.
 * - GenerateShoppingListOutput - The return type for the generateShoppingList function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const MealSchema = z.object({
    meal: z.string(),
    hint: z.string(),
    calories: z.number(),
    description: z.string(),
});

const MealsSchema = z.object({
    "Breakfast": MealSchema,
    "Morning Snack": MealSchema,
    "Lunch": MealSchema,
    "Afternoon Snack": MealSchema,
    "Dinner": MealSchema,
    "Evening Snack": MealSchema,
    "Before Bed": MealSchema,
});

const DayPlanSchema = z.object({
    day: z.number(),
    meals: MealsSchema,
});

const GenerateShoppingListInputSchema = z.object({
  dietPlan: z.array(DayPlanSchema).describe('The full diet plan array for the user.'),
});
export type GenerateShoppingListInput = z.infer<typeof GenerateShoppingListInputSchema>;

const ShoppingListItemSchema = z.object({
  name: z.string().describe('The name of the shopping item.'),
  quantity: z.string().describe('The estimated quantity needed for the entire plan (e.g., 500g, 2 liters, 3 units).'),
});

const ShoppingListCategorySchema = z.object({
  category: z.string().describe('The category of the shopping items (e.g., Vegetables, Fruits, Grains, Protein, Dairy, Spices).'),
  items: z.array(ShoppingListItemSchema),
});

const GenerateShoppingListOutputSchema = z.object({
  shoppingList: z.array(ShoppingListCategorySchema).describe('The categorized shopping list.'),
});
export type GenerateShoppingListOutput = z.infer<typeof GenerateShoppingListOutputSchema>;

export async function generateShoppingList(input: GenerateShoppingListInput): Promise<GenerateShoppingListOutput> {
  return generateShoppingListFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateShoppingListPrompt',
  input: {schema: GenerateShoppingListInputSchema},
  output: {schema: GenerateShoppingListOutputSchema},
  prompt: `You are an expert nutritionist's assistant. Based on the provided diet plan, generate a comprehensive, categorized shopping list.

  Analyze all the meals across all the days in the diet plan. Consolidate all the required ingredients and estimate the total quantity needed for the entire duration of the plan.

  Group the items into logical categories like "Vegetables", "Fruits", "Grains", "Protein", "Dairy", "Spices", "Oils & Fats", and "Other".

  Diet Plan:
  {{{dietPlan}}}

  Generate the shopping list with categories and items with their quantities.
  `,
});


const generateShoppingListFlow = ai.defineFlow(
  {
    name: 'generateShoppingListFlow',
    inputSchema: GenerateShoppingListInputSchema,
    outputSchema: GenerateShoppingListOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
