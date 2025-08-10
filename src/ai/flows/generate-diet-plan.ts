
'use server';

/**
 * @fileOverview Aziaf-powered diet plan generator.
 *
 * - generateDietPlan - A function that generates a personalized diet plan for a specified duration.
 * - GenerateDietPlanInput - The input type for the generateDietPlan function.
 * - GenerateDietPlanOutput - The return type for the generateDietPlan function.
 */
import {promises as fs} from 'fs';
import path from 'path';
import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { getPexelsImage } from './get-pexels-image';

const GenerateDietPlanInputSchema = z.object({
  dietaryPreferences: z
    .string()
    .describe('Dietary preferences such as vegetarian, vegan, keto, favorite foods, hated foods, spice tolerance etc.'),
  healthInformation: z.string().describe('Health information like age, gender, weight, height, activity level, medical conditions, etc.'),
  goals: z.string().describe('Goals such as weight loss, muscle gain, etc.'),
  geographicLocation: z.string().describe('The geographic location of the user.'),
  planDuration: z.number().describe('The number of days the diet plan should cover.'),
  fastingPreference: z.string().optional().describe('The user\'s preference for fasting, e.g., "No Fasting", "Intermittent Fasting".'),
  customPrompt: z.string().optional().describe('An optional custom prompt to override the default generation logic.'),
  knowledgeBaseId: z.enum(['kashmir', 'general']).optional().describe('The identifier for the knowledge base to use for context.'),
});
export type GenerateDietPlanInput = z.infer<typeof GenerateDietPlanInputSchema>;

const MealSchema = z.object({
    meal: z.string().describe("The name of the meal to be eaten."),
    quantity: z.string().describe("The quantity of the main ingredients in grams or other appropriate units (e.g., '100g chicken breast', '1 cup cooked lentils')."),
    hint: z.string().describe("A 2-3 word hint for generating an image for this meal, e.g., 'oatmeal berries'."),
    calories: z.number().describe("The approximate calorie count for this meal."),
    description: z.string().describe("A brief explanation of the meal's benefits, its nutritional importance, and its role in the diet plan (1-2 sentences)."),
    imageUrl: z.string().optional().describe("URL of an image for the meal from Pexels."),
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

async function getKnowledgeContext(knowledgeBaseId?: 'kashmir' | 'general'): Promise<string> {
  if (!knowledgeBaseId) return 'No specific knowledge base provided.';
  
  const fileName = knowledgeBaseId === 'kashmir' ? 'knowledge-base-kashmir.txt' : 'knowledge-base-non-kashmir.txt';
  try {
    const knowledgeBase = await fs.readFile(
      path.join(process.cwd(), 'src', 'ai', fileName),
      'utf-8'
    );
    return knowledgeBase;
  } catch (error) {
    console.error(`Could not read knowledge base (${fileName}):`, error);
    return 'Could not load knowledge base content.';
  }
}

export async function generateDietPlan(input: GenerateDietPlanInput): Promise<GenerateDietPlanOutput> {
  const knowledgeContext = await getKnowledgeContext(input.knowledgeBaseId);
  return generateDietPlanFlow({...input, knowledgeContext});
}

const defaultPromptTemplate = `You are a master nutritionist specializing in creating personalized diet plans, with deep knowledge of local cuisines depending on the context.

  Based on the user's detailed information and the provided knowledge base, generate a personalized diet plan for {{{planDuration}}} days. The output must be an array of day plan objects. Each object should represent a single day, containing the day number and a 'meals' object.
  
  Crucially, you must adapt the meal timings and structure based on the user's fasting preference.
  - If Intermittent Fasting is chosen, structure the meals within an 8-hour eating window (e.g., 12 PM to 8 PM). This means some meals like 'Breakfast' or 'Morning Snack' might be combined, shifted, or removed. Adjust the plan accordingly.
  - If 'No Fasting' is chosen, spread the meals throughout the day.

  It is critical that each day's 'meals' object includes exactly seven meals: Breakfast, Morning Snack, Lunch, Afternoon Snack, Dinner, Evening Snack, and Before Bed. If fasting is requested, you must still provide all seven meal slots, but you can adjust their content. For example, for Intermittent Fasting, 'Breakfast' could be 'Water/Green Tea' with 0 calories and a note that the eating window starts later.

  For each meal, provide the meal name, the quantity of the main ingredients (e.g., '100g', '1 cup'), and a short 2-3 word hint for an image search (e.g., 'chicken salad', 'oatmeal berries'). You must also include the approximate calorie count for the meal, and a brief 1-2 sentence description of the meal's benefits and importance within the diet plan.

  User Details:
  - Health Information: {{{healthInformation}}}
  - Dietary Preferences & Tastes: {{{dietaryPreferences}}}
  - Primary Goal: {{{goals}}}
  - Geographic Location: {{{geographicLocation}}}
  - Fasting Preference: {{{fastingPreference}}}

  Knowledge Base Context:
  {{{knowledgeContext}}}

  Create a balanced, delicious, and culturally relevant plan that helps the user achieve their goals. Ensure the final response for the 'dietPlan' field is only the JSON array and nothing else.
  `;

const prompt = ai.definePrompt({
  name: 'generateDietPlanPrompt',
  input: {schema: z.object({
      ...GenerateDietPlanInputSchema.shape,
      knowledgeContext: z.string(),
  })},
  output: {schema: GenerateDietPlanOutputSchema},
  prompt: `{{#if customPrompt}}{{{customPrompt}}}{{else}}${defaultPromptTemplate}{{/if}}`
});

const generateDietPlanFlow = ai.defineFlow(
  {
    name: 'generateDietPlanFlow',
    inputSchema: z.object({
      ...GenerateDietPlanInputSchema.shape,
      knowledgeContext: z.string(),
    }),
    outputSchema: GenerateDietPlanOutputSchema,
  },
  async input => {
    // Step 1: Generate the base diet plan without images
    const { output: basePlan } = await prompt(input);
    if (!basePlan) {
        throw new Error("Failed to generate the base diet plan.");
    }
    
    // Step 1.5: Validate and complete the generated plan
    const mealKeys: (keyof z.infer<typeof MealsSchema>)[] = ["Breakfast", "Morning Snack", "Lunch", "Afternoon Snack", "Dinner", "Evening Snack", "Before Bed"];
    const placeholderMeal: z.infer<typeof MealSchema> = {
        meal: "Not specified",
        quantity: "N/A",
        hint: "question mark",
        calories: 0,
        description: "This meal was not specified by the AI. Please review or regenerate the plan."
    };

    basePlan.dietPlan.forEach(day => {
        let needsCompletion = false;
        for (const key of mealKeys) {
            if (!day.meals[key]) {
                needsCompletion = true;
                break;
            }
        }
        if (needsCompletion) {
            const completedMeals = { ...day.meals };
            for (const key of mealKeys) {
                if (!completedMeals[key]) {
                    completedMeals[key] = placeholderMeal;
                }
            }
            day.meals = completedMeals as z.infer<typeof MealsSchema>;
        }
    });

    // Step 2: Create a list of all image queries to be fetched
    const imagePromises: Promise<{dayIndex: number, mealTime: string, imageUrl: string}>[] = [];

    basePlan.dietPlan.forEach((day, dayIndex) => {
        Object.entries(day.meals).forEach(([mealTime, mealDetails]) => {
            if (mealDetails.hint) {
                const promise = getPexelsImage({ query: mealDetails.hint })
                    .then(result => ({
                        dayIndex,
                        mealTime,
                        imageUrl: result.imageUrl,
                    }));
                imagePromises.push(promise);
            }
        });
    });

    // Step 3: Fetch all images concurrently
    const settledImages = await Promise.allSettled(imagePromises);

    // Step 4: Augment the plan with the fetched image URLs
    settledImages.forEach(result => {
        if (result.status === 'fulfilled') {
            const { dayIndex, mealTime, imageUrl } = result.value;
            // This is a safe cast because we know the structure of MealsSchema
            const meal = (basePlan.dietPlan[dayIndex].meals as any)[mealTime];
            if (meal) {
                meal.imageUrl = imageUrl;
            }
        } else {
            console.error("Failed to fetch an image:", result.reason);
        }
    });

    return basePlan;
  }
);
