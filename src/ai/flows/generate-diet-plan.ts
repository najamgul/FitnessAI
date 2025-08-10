'use server';

/**
 * @fileOverview Aziaf-powered diet plan generator.
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
  fastingPreference: z.string().optional().describe('The user\'s preference for fasting, e.g., "No Fasting", "Intermittent Fasting".'),
});
export type GenerateDietPlanInput = z.infer<typeof GenerateDietPlanInputSchema>;

const MealSchema = z.object({
    meal: z.string().describe("The name of the meal to be eaten."),
    hint: z.string().describe("A 2-3 word hint for generating an image for this meal, e.g., 'oatmeal berries'."),
    calories: z.number().describe("The approximate calorie count for this meal."),
    description: z.string().describe("A brief explanation of the meal's benefits, its nutritional importance, and its role in the diet plan (1-2 sentences).")
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
    day: z.number().describe("The day number of the plan, starting from 1."),
    meals: MealsSchema,
});

const GenerateDietPlanOutputSchema = z.object({
  dietPlan: z.array(DayPlanSchema).describe('An array of personalized daily diet plans.'),
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

  Based on the user's detailed information, generate a personalized diet plan for {{{planDuration}}} days. The output must be an array of day plan objects. Each object should represent a single day, containing the day number and a 'meals' object.
  
  Crucially, you must adapt the meal timings and structure based on the user's fasting preference.
  - If Intermittent Fasting is chosen, structure the meals within an 8-hour eating window (e.g., 12 PM to 8 PM). This means some meals like 'Breakfast' or 'Morning Snack' might be combined, shifted, or removed. Adjust the plan accordingly.
  - If 'No Fasting' is chosen, spread the meals throughout the day.

  It is critical that each day's 'meals' object includes exactly seven meals: Breakfast, Morning Snack, Lunch, Afternoon Snack, Dinner, Evening Snack, and Before Bed. If fasting is requested, you must still provide all seven meal slots, but you can adjust their content. For example, for Intermittent Fasting, 'Breakfast' could be 'Water/Green Tea' with 0 calories and a note that the eating window starts later.

  For each meal, provide the meal name and a short 2-3 word hint for an image search (e.g., 'chicken salad', 'oatmeal berries'). You must also include the approximate calorie count for the meal, and a brief 1-2 sentence description of the meal's benefits and importance within the diet plan.

  User Details:
  - Health Information: {{{healthInformation}}}
  - Dietary Preferences & Tastes: {{{dietaryPreferences}}}
  - Primary Goal: {{{goals}}}
  - Geographic Location: {{{geographicLocation}}}
  - Fasting Preference: {{{fastingPreference}}}

  Create a balanced, delicious, and culturally relevant plan that helps the user achieve their goals. Ensure the final response for the 'dietPlan' field is only the JSON array and nothing else.
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
