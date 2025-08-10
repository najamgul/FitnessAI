
'use server';

/**
 * @fileOverview A flow to provide advice on how to catch up on water intake.
 *
 * - getHydrationAdvice - A function that returns advice for hydration.
 * - GetHydrationAdviceInput - The input type for the getHydrationAdvice function.
 * - GetHydrationAdviceOutput - The return type for the getHydrationAdvice function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GetHydrationAdviceInputSchema = z.object({
  targetIntake: z.number().describe('The user\'s daily target water intake in liters.'),
  actualIntake: z.number().describe('The amount of water the user has actually consumed so far in liters.'),
});
export type GetHydrationAdviceInput = z.infer<typeof GetHydrationAdviceInputSchema>;

const GetHydrationAdviceOutputSchema = z.object({
  advice: z.string().describe('Actionable advice on how to catch up on water intake for the rest of the day.'),
});
export type GetHydrationAdviceOutput = z.infer<typeof GetHydrationAdviceOutputSchema>;

export async function getHydrationAdvice(input: GetHydrationAdviceInput): Promise<GetHydrationAdviceOutput> {
  return getHydrationAdviceFlow(input);
}

const prompt = ai.definePrompt({
  name: 'getHydrationAdvicePrompt',
  input: {schema: GetHydrationAdviceInputSchema},
  output: {schema: GetHydrationAdviceOutputSchema},
  prompt: `You are a helpful nutrition and hydration assistant. A user is behind on their water intake for the day.

User's goal: {{targetIntake}} liters.
User's actual intake so far: {{actualIntake}} liters.

If the user has already met or exceeded their goal, congratulate them.

If they are behind, calculate the remaining amount and provide a simple, safe, and actionable plan for them to catch up. Break down the remaining amount into smaller, manageable portions to drink over the next few hours. Emphasize not to drink a large amount all at once. Keep the advice encouraging and brief (2-4 sentences).

Example: "You have X liters left to go! Try drinking one 250ml glass of water every hour for the next Y hours to catch up safely."
`,
});

const getHydrationAdviceFlow = ai.defineFlow(
  {
    name: 'getHydrationAdviceFlow',
    inputSchema: GetHydrationAdviceInputSchema,
    outputSchema: GetHydrationAdviceOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
