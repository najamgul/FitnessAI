
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
    quantity: z.string().describe("Detailed quantities for ALL ingredients in specific units (e.g., '150g grilled chicken breast, 100g steamed broccoli, 80g brown rice, 1 tbsp olive oil')."),
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
  try {
    // Force plan duration to 3 days
    const modifiedInput = { ...input, planDuration: 3 };
    const knowledgeContext = await getKnowledgeContext(modifiedInput.knowledgeBaseId);
    return await generateDietPlanFlow({...modifiedInput, knowledgeContext});
  } catch (error) {
    console.error('Error in generateDietPlan:', error);
    throw new Error(`Failed to generate diet plan: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

const defaultPromptTemplate = `You are a master nutritionist specializing in creating personalized diet plans, with deep knowledge of local cuisines depending on the context.

Based on the user's detailed information and the provided knowledge base, generate a personalized diet plan for 3 days. The output must be a valid JSON object with a 'dietPlan' field containing an array of 3 day plan objects.

CRITICAL REQUIREMENTS - YOU MUST FOLLOW THESE EXACTLY:
1. Generate exactly 3 complete days.
2. Each day MUST have ALL 7 meal slots: "Breakfast", "Morning Snack", "Lunch", "Afternoon Snack", "Dinner", "Evening Snack", "Before Bed"
3. Every meal must have all required fields: meal, quantity, hint, calories, description.
4. The 'quantity' field MUST contain specific measurements in grams (g), numbers (e.g., '2 eggs'), or milliliters (ml).
5. If a meal slot should be minimal (like during fasting), use "Herbal tea" or "Water" with 0 calories and a quantity like "1 cup".

Your response must be complete and valid JSON. Do not truncate any days or meals.

User Details:
- Health Information: {{{healthInformation}}}
- Dietary Preferences & Tastes: {{{dietaryPreferences}}}
- Primary Goal: {{{goals}}}
- Geographic Location: {{{geographicLocation}}}
- Fasting Preference: {{{fastingPreference}}}

Knowledge Base Context:
{{{knowledgeContext}}}

Example response format:
{
  "dietPlan": [
    {
      "day": 1,
      "meals": {
        "Breakfast": {
          "meal": "Oatmeal with Berries and Nuts",
          "quantity": "40g rolled oats, 250ml low-fat milk, 50g mixed berries, 15g chopped almonds",
          "hint": "oatmeal berries",
          "calories": 350,
          "description": "Rich in fiber and antioxidants to start your day with sustained energy and protein."
        },
        "Morning Snack": {
          "meal": "Greek Yogurt with Nuts",
          "quantity": "150g plain Greek yogurt, 10g walnuts",
          "hint": "greek yogurt",
          "calories": 180,
          "description": "High in protein and probiotics to keep you satisfied until lunch."
        },
        // ... continue with all 7 meals
      }
    }
    // ... continue for 2 more days
  ]
}`;

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
    try {
      // Step 1: Generate the base diet plan without images
      const { output: basePlan } = await prompt(input);
      
      if (!basePlan || !basePlan.dietPlan || !Array.isArray(basePlan.dietPlan)) {
        throw new Error("Invalid diet plan structure received from AI");
      }
      
      // Step 2: Validate and complete the generated plan
      const mealKeys: (keyof z.infer<typeof MealsSchema>)[] = [
        "Breakfast", "Morning Snack", "Lunch", "Afternoon Snack", 
        "Dinner", "Evening Snack", "Before Bed"
      ];
      
      const placeholderMeal: z.infer<typeof MealSchema> = {
        meal: "Not specified",
        quantity: "Quantities not specified - please regenerate plan",
        hint: "question mark",
        calories: 0,
        description: "This meal was not specified. Please review or regenerate the plan."
      };

      // Ensure the plan has the correct number of days before further validation
      while (basePlan.dietPlan.length < input.planDuration) {
          const missingDayIndex = basePlan.dietPlan.length;
          const placeholderMeals = mealKeys.reduce((acc, key) => {
              acc[key] = { ...placeholderMeal };
              return acc;
          }, {} as z.infer<typeof MealsSchema>);

          basePlan.dietPlan.push({
              day: missingDayIndex + 1,
              meals: placeholderMeals,
          });
      }

      // Validate and fix each day's structure to ensure all meals are present
      basePlan.dietPlan.forEach((day, dayIndex) => {
        if (!day.meals || typeof day.meals !== 'object') {
          day.meals = {} as z.infer<typeof MealsSchema>;
        }

        // Ensure all required meal slots exist
        mealKeys.forEach(mealKey => {
          if (!day.meals[mealKey]) {
            day.meals[mealKey] = { ...placeholderMeal };
          } else {
            // Validate existing meal structure
            const meal = day.meals[mealKey];
            if (!meal.meal) meal.meal = "Not specified";
            if (!meal.quantity) meal.quantity = "N/A";
            if (!meal.hint) meal.hint = "question mark";
            if (typeof meal.calories !== 'number') meal.calories = 0;
            if (!meal.description) meal.description = "No description provided.";
          }
        });

        // Ensure day number is set
        if (!day.day) {
          day.day = dayIndex + 1;
        }
      });

      // Step 3: Fetch images concurrently
      const imagePromises: Promise<{dayIndex: number, mealTime: string, imageUrl: string}>[] = [];

      basePlan.dietPlan.forEach((day, dayIndex) => {
        mealKeys.forEach(mealTime => {
          const meal = day.meals[mealTime];
          if (meal && meal.hint && meal.hint !== "question mark") {
            const promise = getPexelsImage({ query: meal.hint })
              .then(result => ({
                dayIndex,
                mealTime,
                imageUrl: result.imageUrl || '',
              }))
              .catch(error => {
                console.error(`Failed to fetch image for ${meal.hint}:`, error);
                return {
                  dayIndex,
                  mealTime,
                  imageUrl: '',
                };
              });
            imagePromises.push(promise);
          }
        });
      });

      // Step 4: Wait for all images and update the plan
      const imageResults = await Promise.allSettled(imagePromises);

      imageResults.forEach(result => {
        if (result.status === 'fulfilled' && result.value.imageUrl) {
          const { dayIndex, mealTime, imageUrl } = result.value;
          if (basePlan.dietPlan[dayIndex] && basePlan.dietPlan[dayIndex].meals[mealTime as keyof z.infer<typeof MealsSchema>]) {
            basePlan.dietPlan[dayIndex].meals[mealTime as keyof z.infer<typeof MealsSchema>].imageUrl = imageUrl;
          }
        }
      });

      return basePlan;
      
    } catch (error) {
      console.error('Error in generateDietPlanFlow:', error);
      throw new Error(`Failed to generate diet plan flow: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
);
