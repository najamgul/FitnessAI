'use server';

/**
 * @fileOverview AI-powered diet plan generator.
 *
 * - generateDietPlan - A function that generates a personalized 7-day diet plan.
 * - GenerateDietPlanInput - The input type for the generateDietPlan function.
 * - GenerateDietPlanOutput - The return type for the generateDietPlan function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateDietPlanInputSchema = z.object({
  dietaryPreferences: z
    .string()
    .describe('Dietary preferences such as vegetarian, vegan, keto, etc.'),
  healthInformation: z.string().describe('Health information like allergies, medical conditions, etc.'),
  goals: z.string().describe('Goals such as weight loss, muscle gain, etc.'),
  geographicLocation: z.string().describe('The geographic location of the user.'),
});
export type GenerateDietPlanInput = z.infer<typeof GenerateDietPlanInputSchema>;

const GenerateDietPlanOutputSchema = z.object({
  dietPlan: z.string().describe('A personalized 7-day diet plan.'),
});
export type GenerateDietPlanOutput = z.infer<typeof GenerateDietPlanOutputSchema>;

export async function generateDietPlan(input: GenerateDietPlanInput): Promise<GenerateDietPlanOutput> {
  return generateDietPlanFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateDietPlanPrompt',
  input: {schema: GenerateDietPlanInputSchema},
  output: {schema: GenerateDietPlanOutputSchema},
  prompt: `You are a personal nutrition assistant.

  Based on the user's dietary preferences, health information, and goals, generate a personalized 7-day diet plan. Consider their geographic location when recommending food items. 

  Dietary Preferences: {{{dietaryPreferences}}}
  Health Information: {{{healthInformation}}}
  Goals: {{{goals}}}
  Geographic Location: {{{geographicLocation}}}

  Provide the 7-day diet plan in a well-formatted, easy-to-read format.
  `,
});

const generateDietPlanFlow = ai.defineFlow(
  {
    name: 'generateDietPlanFlow',
    inputSchema: GenerateDietPlanInputSchema,
    outputSchema: GenerateDietPlanOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
