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

const MealSchema = z.object({
    meal: z.string().describe("The name of the meal to be eaten."),
    hint: z.string().describe("A 2-3 word hint for generating an image for this meal, e.g., 'oatmeal berries'.")
});

const DayPlanSchema = z.object({
    "Breakfast": MealSchema,
    "Morning Snack": MealSchema,
    "Lunch": MealSchema,
    "Afternoon Snack": MealSchema,
    "Dinner": MealSchema,
    "Evening Snack": MealSchema,
    "Before Bed": MealSchema,
});

// Using z.record for a dynamic number of days
const DietPlanSchema = z.record(z.string().regex(/^Day \d+$/), DayPlanSchema);

const GenerateDietPlanOutputSchema = z.object({
  dietPlan: DietPlanSchema.describe('A personalized diet plan object where each key is "Day X" and the value contains the 7 meals for that day.'),
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

  For each meal, provide the meal name and a short 2-3 word hint for an image search (e.g., 'chicken salad', 'oatmeal berries').

  The final output for the 'dietPlan' field must be a JSON object. The JSON object should have keys for "Day 1" through "Day {{{planDuration}}}". Each day's value should be an object with keys for each of the 7 meals, and each meal should have a 'meal' and 'hint' property.

  User Details:
  - Health Information: {{{healthInformation}}}
  - Dietary Preferences & Tastes: {{{dietaryPreferences}}}
  - Primary Goal: {{{goals}}}
  - Geographic Location: {{{geographicLocation}}}

  Create a balanced, delicious, and culturally relevant plan that helps the user achieve their goals. Ensure the response for dietPlan is only the JSON object and nothing else.
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
