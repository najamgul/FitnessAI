'use server';

/**
 * @fileOverview Provides advice when a user misses a meal.
 * This flow is used by the diet plan page when a user skips a meal
 * to redistribute calories among remaining meals.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GetMissedMealAdviceInputSchema = z.object({
  missedMeal: z.string().describe('The name/type of the missed meal (e.g., "Breakfast", "Lunch").'),
  missedCalories: z.number().describe('The calorie count of the missed meal.'),
  remainingMeals: z.array(z.object({
    mealTime: z.string(),
    meal: z.string(),
    calories: z.number(),
  })).describe('The remaining meals for the day.'),
  userGoals: z.string().describe('The user\'s health/nutrition goals.'),
});

const GetMissedMealAdviceOutputSchema = z.object({
  advice: z.string().describe('Friendly, personalized advice about what to do after missing a meal.'),
  adjustedMeals: z.array(z.object({
    mealTime: z.string(),
    additionalCalories: z.number(),
    suggestion: z.string(),
  })).describe('Suggested calorie adjustments for remaining meals.'),
});

export type GetMissedMealAdviceInput = z.infer<typeof GetMissedMealAdviceInputSchema>;
export type GetMissedMealAdviceOutput = z.infer<typeof GetMissedMealAdviceOutputSchema>;

export async function getMissedMealAdvice(input: GetMissedMealAdviceInput): Promise<GetMissedMealAdviceOutput> {
  return getMissedMealAdviceFlow(input);
}

const prompt = ai.definePrompt({
  name: 'getMissedMealAdvicePrompt',
  input: { schema: GetMissedMealAdviceInputSchema },
  output: { schema: GetMissedMealAdviceOutputSchema },
  prompt: `You are Azai, a friendly nutrition coach. A user has missed their {{{missedMeal}}} meal ({{{missedCalories}}} calories).

Their goals: {{{userGoals}}}

Remaining meals today:
{{#each remainingMeals}}
- {{this.mealTime}}: {{this.meal}} ({{this.calories}} cal)
{{/each}}

Provide:
1. Brief, encouraging advice (2-3 sentences)
2. How to redistribute the missed calories among remaining meals

Keep it friendly and supportive. Don't make the user feel guilty.`,
});

const getMissedMealAdviceFlow = ai.defineFlow(
  {
    name: 'getMissedMealAdviceFlow',
    inputSchema: GetMissedMealAdviceInputSchema,
    outputSchema: GetMissedMealAdviceOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);