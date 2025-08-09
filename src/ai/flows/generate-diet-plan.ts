'use server';

/**
 * @fileOverview AI-powered diet plan generator.
 *
 * - generateDietPlan - A function that generates a personalized diet plan for a specified duration.
 * - GenerateDietPlanInput - The input type for the generateDietPlan function.
 * - GenerateDietPlanOutput - The return type for the generateDietPlan function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateDietPlanInputSchema = z.object({
  dietaryPreferences: z
    .string()
    .describe('Dietary preferences such as vegetarian, vegan, keto, favorite foods, hated foods, spice tolerance etc.'),
  healthInformation: z.string().describe('Health information like age, gender, weight, height, activity level, medical conditions, etc.'),
  goals: z.string().describe('Goals such as weight loss, muscle gain, etc.'),
  geographicLocation: z.string().describe('The geographic location of the user.'),
  planDuration: z.number().describe('The number of days the diet plan should cover.'),
});
export type GenerateDietPlanInput = z.infer<typeof GenerateDietPlanInputSchema>;

const GenerateDietPlanOutputSchema = z.object({
  dietPlan: z.string().describe('A personalized diet plan for the specified number of days. The plan should be formatted as a JSON string within the string field. For example: \'{"Day 1": {"Breakfast": "Oatmeal", ...}, "Day 2": ...}\''),
});
export type GenerateDietPlanOutput = z.infer<typeof GenerateDietPlanOutputSchema>;

export async function generateDietPlan(input: GenerateDietPlanInput): Promise<GenerateDietPlanOutput> {
  return generateDietPlanFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateDietPlanPrompt',
  input: {schema: GenerateDietPlanInputSchema},
  output: {schema: GenerateDietPlanOutputSchema},
  prompt: `You are a master nutritionist specializing in creating personalized diet plans, with deep knowledge of Kashmiri cuisine.

  Based on the user's detailed information, generate a personalized diet plan for {{{planDuration}}} days. It is critical that each day includes exactly seven meals: Breakfast, Morning Snack, Lunch, Afternoon Snack, Dinner, Evening Snack, and Before Bed.

  The final output for the 'dietPlan' field must be a single JSON string. The JSON object should have keys for "Day 1" through "Day {{{planDuration}}}". Each day's value should be an object with keys for each of the 7 meals.

  User Details:
  - Health Information: {{{healthInformation}}}
  - Dietary Preferences & Tastes: {{{dietaryPreferences}}}
  - Primary Goal: {{{goals}}}
  - Geographic Location: {{{geographicLocation}}}

  Create a balanced, delicious, and culturally relevant plan that helps the user achieve their goals. Ensure the response for dietPlan is only the JSON string and nothing else.
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
