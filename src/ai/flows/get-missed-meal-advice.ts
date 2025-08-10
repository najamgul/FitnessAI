
'use server';

/**
 * @fileOverview A flow to provide advice on what to do if a user misses a meal.
 *
 * - getMissedMealAdvice - A function that returns advice for a missed meal.
 * - GetMissedMealAdviceInput - The input type for the getMissedMealAdvice function.
 * - GetMissedMealAdviceOutput - The return type for the getMissedMealAdvice function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GetMissedMealAdviceInputSchema = z.object({
  mealTime: z.string().describe('The time of the meal that was missed (e.g., Breakfast, Lunch).'),
  meal: z.string().describe('The specific meal that was missed.'),
});
export type GetMissedMealAdviceInput = z.infer<typeof GetMissedMealAdviceInputSchema>;

const GetMissedMealAdviceOutputSchema = z.object({
  advice: z.string().describe('Actionable advice on what to do after missing the specified meal.'),
});
export type GetMissedMealAdviceOutput = z.infer<typeof GetMissedMealAdviceOutputSchema>;

export async function getMissedMealAdvice(input: GetMissedMealAdviceInput): Promise<GetMissedMealAdviceOutput> {
  return getMissedMealAdviceFlow(input);
}

const prompt = ai.definePrompt({
  name: 'getMissedMealAdvicePrompt',
  input: {schema: GetMissedMealAdviceInputSchema},
  output: {schema: GetMissedMealAdviceOutputSchema},
  prompt: `You are a helpful nutrition assistant. A user has missed a meal in their diet plan. Provide brief, actionable advice on what they should do next.

The user missed their {{mealTime}}: {{meal}}.

What is a good course of action for them? Should they skip it, eat it late, or eat something else? Keep the advice to 1-2 sentences.
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

    