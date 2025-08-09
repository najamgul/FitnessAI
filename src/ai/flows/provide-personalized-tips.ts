'use server';

/**
 * @fileOverview This file defines a Genkit flow for providing personalized tips to users based on their daily progress tracking data.
 *
 * - providePersonalizedTips - A function that takes user progress data and returns personalized tips.
 * - PersonalizedTipsInput - The input type for the providePersonalizedTips function.
 * - PersonalizedTipsOutput - The return type for the providePersonalizedTips function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const PersonalizedTipsInputSchema = z.object({
  weight: z.number().describe('The user\'s weight in kilograms.'),
  energyLevels: z
    .number()
    .min(1)
    .max(10)
    .describe('The user\'s energy levels on a scale of 1 to 10.'),
  mealCompletion: z
    .number()
    .min(0)
    .max(100)
    .describe('The percentage of meals the user completed.'),
  goals: z.string().describe('The user provided diet goals.'),
});
export type PersonalizedTipsInput = z.infer<typeof PersonalizedTipsInputSchema>;

const PersonalizedTipsOutputSchema = z.object({
  tips: z.string().describe('Personalized tips for the user to improve their diet and reach their goals.'),
});
export type PersonalizedTipsOutput = z.infer<typeof PersonalizedTipsOutputSchema>;

export async function providePersonalizedTips(input: PersonalizedTipsInput): Promise<PersonalizedTipsOutput> {
  return providePersonalizedTipsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'personalizedTipsPrompt',
  input: {schema: PersonalizedTipsInputSchema},
  output: {schema: PersonalizedTipsOutputSchema},
  prompt: `You are a personal diet coach. Based on the user's daily progress, provide personalized tips to help them improve their diet and reach their goals.

Here is the user's progress data:

Weight: {{weight}} kg
Energy Levels: {{energyLevels}} (1-10 scale)
Meal Completion: {{mealCompletion}}%
Goals: {{goals}}

Provide specific and actionable tips based on this data. Focus on areas where the user can make improvements.`,
});

const providePersonalizedTipsFlow = ai.defineFlow(
  {
    name: 'providePersonalizedTipsFlow',
    inputSchema: PersonalizedTipsInputSchema,
    outputSchema: PersonalizedTipsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
