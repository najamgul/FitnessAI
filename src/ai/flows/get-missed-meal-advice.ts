
'use server';

/**
 * @fileOverview A flow to provide advice on what to do if a user misses a meal and recalculate the rest of the day's plan.
 *
 * - getMissedMealAdvice - A function that returns advice and an updated meal plan.
 * - GetMissedMealAdviceInput - The input type for the getMissedMealAdvice function.
 * - GetMissedMealAdviceOutput - The return type for the getMissedMealAdvice function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const MealSchema = z.object({
  meal: z.string(),
  time: z.string(),
  quantity: z.string(),
  hint: z.string(),
  calories: z.number(),
  description: z.string(),
  imageUrl: z.string().optional(),
  mealTime: z.string(),
  completed: z.boolean(),
  skipped: z.boolean().optional(),
});

const GetMissedMealAdviceInputSchema = z.object({
  missedMeal: MealSchema.describe("The specific meal that was missed."),
  remainingMeals: z.array(MealSchema).describe("The list of remaining meals for the day."),
  userGoals: z.string().describe("The user's primary health and diet goals (e.g., weight loss, muscle gain)."),
});
export type GetMissedMealAdviceInput = z.infer<typeof GetMissedMealAdviceInputSchema>;


const AdjustedMealSchema = z.object({
    meal: z.string(),
    time: z.string(),
    quantity: z.string().describe("The new, adjusted quantity for the meal."),
    calories: z.number().describe("The new, adjusted calorie count for the meal."),
    mealTime: z.string(),
});

const GetMissedMealAdviceOutputSchema = z.object({
  advice: z.string().describe('Actionable advice on what to do after missing the meal.'),
  adjustedMeals: z.array(AdjustedMealSchema).describe("An array of the remaining meals with adjusted quantities and calories to compensate for the missed meal."),
});
export type GetMissedMealAdviceOutput = z.infer<typeof GetMissedMealAdviceOutputSchema>;

export async function getMissedMealAdvice(input: GetMissedMealAdviceInput): Promise<GetMissedMealAdviceOutput> {
  return getMissedMealAdviceFlow(input);
}

const prompt = ai.definePrompt({
  name: 'getMissedMealAdvicePrompt',
  input: {schema: GetMissedMealAdviceInputSchema},
  output: {schema: GetMissedMealAdviceOutputSchema},
  prompt: `You are a helpful and pragmatic nutrition coach. A user has just skipped a meal and needs advice. Their primary goal is "{{userGoals}}".

The user skipped their {{missedMeal.mealTime}} ({{missedMeal.time}}): "{{missedMeal.meal}}" which was approximately {{missedMeal.calories}} calories.

Here are the remaining meals for their day:
{{#each remainingMeals}}
- {{this.mealTime}} ({{this.time}}): {{this.meal}} ({{this.calories}} cal)
{{/each}}

1.  **Provide Advice**: First, give brief, reassuring, and actionable advice (1-2 sentences). Should they just move on, or try to make up for it? The advice should be encouraging.

2.  **Adjust Plan**: Recalculate the quantities and calories for the *remaining meals* to help the user stay as close as possible to their daily goal. Distribute the {{missedMeal.calories}} calories from the missed meal among the remaining meals. Be realistic; slightly increase portions of the upcoming meals. For snacks, you can suggest adding a small item like a fruit or some nuts. For main meals, slightly increase the grams of protein or carbs.

Return the advice and the list of adjusted meals with their new quantities, calories, and original meal times.
`,
});

const getMissedMealAdviceFlow = ai.defineFlow(
  {
    name: 'getMissedMealAdviceFlow',
    inputSchema: GetMissedMealAdviceInputSchema,
    outputSchema: GetMissedMealAdviceOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
