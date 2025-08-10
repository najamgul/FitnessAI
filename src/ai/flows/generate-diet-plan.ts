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

// Helper function to create a complete placeholder meal
function createPlaceholderMeal(mealType: string, dayNumber: number): z.infer<typeof MealSchema> {
  const mealOptions = {
    "Breakfast": {
      meal: "Oatmeal with Berries",
      quantity: "40g rolled oats, 200ml almond milk, 50g mixed berries",
      hint: "oatmeal berries",
      calories: 280,
      description: "A nutritious breakfast providing fiber, vitamins, and sustained energy to start your day."
    },
    "Morning Snack": {
      meal: "Mixed Nuts",
      quantity: "30g mixed almonds and walnuts",
      hint: "mixed nuts",
      calories: 180,
      description: "Healthy fats and protein to keep you satisfied until lunch."
    },
    "Lunch": {
      meal: "Grilled Chicken Salad",
      quantity: "150g grilled chicken breast, 2 cups mixed greens, 1 tbsp olive oil dressing",
      hint: "chicken salad",
      calories: 380,
      description: "Lean protein with fresh vegetables providing essential nutrients and fiber."
    },
    "Afternoon Snack": {
      meal: "Greek Yogurt",
      quantity: "150g plain Greek yogurt",
      hint: "greek yogurt",
      calories: 130,
      description: "High-protein snack that supports muscle maintenance and provides probiotics."
    },
    "Dinner": {
      meal: "Baked Fish with Vegetables",
      quantity: "150g baked white fish, 200g steamed mixed vegetables, 100g brown rice",
      hint: "baked fish",
      calories: 450,
      description: "Light yet satisfying dinner with omega-3 fatty acids and complex carbohydrates."
    },
    "Evening Snack": {
      meal: "Apple with Almond Butter",
      quantity: "1 medium apple, 1 tbsp almond butter",
      hint: "apple almonds",
      calories: 180,
      description: "Natural sugars paired with healthy fats for a balanced evening snack."
    },
    "Before Bed": {
      meal: "Herbal Tea",
      quantity: "1 cup chamomile tea",
      hint: "herbal tea",
      calories: 5,
      description: "Calming herbal tea to promote relaxation and better sleep quality."
    }
  };

  return mealOptions[mealType as keyof typeof mealOptions] || {
    meal: `Day ${dayNumber} ${mealType}`,
    quantity: "Portion to be determined based on dietary needs",
    hint: "healthy meal",
    calories: 200,
    description: "A balanced meal providing essential nutrients for your health goals."
  };
}

// Helper function to ensure complete meal structure
function ensureCompleteDayStructure(
  incompletePlan: any, 
  targetDays: number
): z.infer<typeof GenerateDietPlanOutputSchema> {
  const mealKeys: (keyof z.infer<typeof MealsSchema>)[] = [
    "Breakfast", "Morning Snack", "Lunch", "Afternoon Snack", 
    "Dinner", "Evening Snack", "Before Bed"
  ];

  // Ensure we have an array
  if (!incompletePlan || !Array.isArray(incompletePlan.dietPlan)) {
    incompletePlan = { dietPlan: [] };
  }

  // Ensure we have the right number of days
  while (incompletePlan.dietPlan.length < targetDays) {
    incompletePlan.dietPlan.push({
      day: incompletePlan.dietPlan.length + 1,
      meals: {}
    });
  }

  // Remove extra days if any
  if (incompletePlan.dietPlan.length > targetDays) {
    incompletePlan.dietPlan = incompletePlan.dietPlan.slice(0, targetDays);
  }

  // Ensure each day has complete meal structure
  incompletePlan.dietPlan.forEach((day: any, dayIndex: number) => {
    // Ensure day number is correct
    day.day = dayIndex + 1;
    
    // Ensure meals object exists
    if (!day.meals || typeof day.meals !== 'object') {
      day.meals = {};
    }

    // Ensure all required meal slots exist with complete data
    mealKeys.forEach(mealKey => {
      if (!day.meals[mealKey] || typeof day.meals[mealKey] !== 'object') {
        day.meals[mealKey] = createPlaceholderMeal(mealKey, day.day);
      } else {
        // Validate and fix existing meal
        const meal = day.meals[mealKey];
        if (!meal.meal || typeof meal.meal !== 'string') {
          meal.meal = createPlaceholderMeal(mealKey, day.day).meal;
        }
        if (!meal.quantity || typeof meal.quantity !== 'string') {
          meal.quantity = createPlaceholderMeal(mealKey, day.day).quantity;
        }
        if (!meal.hint || typeof meal.hint !== 'string') {
          meal.hint = createPlaceholderMeal(mealKey, day.day).hint;
        }
        if (typeof meal.calories !== 'number' || isNaN(meal.calories)) {
          meal.calories = createPlaceholderMeal(mealKey, day.day).calories;
        }
        if (!meal.description || typeof meal.description !== 'string') {
          meal.description = createPlaceholderMeal(mealKey, day.day).description;
        }
        // imageUrl is optional, so we don't need to validate it
      }
    });
  });

  return incompletePlan as z.infer<typeof GenerateDietPlanOutputSchema>;
}

export async function generateDietPlan(input: GenerateDietPlanInput): Promise<GenerateDietPlanOutput> {
  try {
    // Force plan duration to exactly 3 days
    const modifiedInput = { ...input, planDuration: 3 };
    const knowledgeContext = await getKnowledgeContext(modifiedInput.knowledgeBaseId);
    return await generateDietPlanFlow({...modifiedInput, knowledgeContext});
  } catch (error) {
    console.error('Error in generateDietPlan:', error);
    throw new Error(`Failed to generate diet plan: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

const defaultPromptTemplate = `You are a master nutritionist specializing in creating personalized diet plans, with deep knowledge of local cuisines depending on the context.

Based on the user's detailed information and the provided knowledge base, generate a personalized diet plan for exactly 3 days. 

CRITICAL REQUIREMENTS - YOU MUST FOLLOW THESE EXACTLY:
1. Generate exactly 3 complete days - NO MORE, NO LESS.
2. Each day MUST have ALL 7 meal slots: "Breakfast", "Morning Snack", "Lunch", "Afternoon Snack", "Dinner", "Evening Snack", "Before Bed"
3. Every meal must have all required fields: meal, quantity, hint, calories, description.
4. The 'quantity' field MUST contain specific measurements in grams (g), cups, tablespoons, or pieces (e.g., '150g grilled chicken, 100g rice, 1 tbsp olive oil').
5. If a meal slot should be minimal (like during fasting), use "Herbal tea" or "Water" with appropriate calories and quantities.
6. NEVER leave any meal slot empty or incomplete.

Your response must be complete and valid JSON. Generate ALL 3 days completely.

User Details:
- Health Information: {{{healthInformation}}}
- Dietary Preferences & Tastes: {{{dietaryPreferences}}}
- Primary Goal: {{{goals}}}
- Geographic Location: {{{geographicLocation}}}
- Fasting Preference: {{{fastingPreference}}}

Knowledge Base Context:
{{{knowledgeContext}}}

Return only valid JSON in this exact format with exactly 3 days:
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
        "Morning Snack": { ... },
        "Lunch": { ... },
        "Afternoon Snack": { ... },
        "Dinner": { ... },
        "Evening Snack": { ... },
        "Before Bed": { ... }
      }
    },
    {
      "day": 2,
      "meals": {
        // All 7 meals for day 2
      }
    },
    {
      "day": 3,
      "meals": {
        // All 7 meals for day 3
      }
    }
  ]
}`;

const prompt = ai.definePrompt({
  name: 'generateDietPlanPrompt',
  input: {schema: z.object({
      ...GenerateDietPlanInputSchema.shape,
      knowledgeContext: z.string(),
  })},
  output: {schema: GenerateDietPlanOutputSchema, format: 'json'},
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
      console.log(`Generating diet plan for exactly 3 days...`);
      
      // Step 1: Generate the base diet plan without images
      let basePlan: any;
      
      try {
        const { output } = await prompt(input);
        basePlan = output;
      } catch (error) {
        console.error('AI generation error:', error);
        // Create a minimal fallback structure
        basePlan = { dietPlan: [] };
      }
      
      // Step 2: Ensure complete structure for exactly 3 days BEFORE validation
      const completePlan = ensureCompleteDayStructure(basePlan, 3);
      
      console.log(`Plan structure completed. Days: ${completePlan.dietPlan.length} (fixed to 3 days)`);
      
      // Step 3: Validate the structure matches schema
      try {
        GenerateDietPlanOutputSchema.parse(completePlan);
        console.log('Schema validation passed');
      } catch (validationError) {
        console.error('Schema validation failed after completion:', validationError);
        // If validation still fails, recreate with placeholders for exactly 3 days
        const fallbackPlan = ensureCompleteDayStructure({ dietPlan: [] }, 3);
        console.log('Using fallback plan structure for 3 days');
        return fallbackPlan;
      }
      
      // Step 4: Fetch images (do this last to avoid interfering with structure)
      const imagePromises: Promise<void>[] = [];
      const mealKeys: (keyof z.infer<typeof MealsSchema>)[] = [
        "Breakfast", "Morning Snack", "Lunch", "Afternoon Snack", 
        "Dinner", "Evening Snack", "Before Bed"
      ];

      completePlan.dietPlan.forEach((day, dayIndex) => {
        mealKeys.forEach(mealTime => {
          const meal = day.meals[mealTime];
          if (meal && meal.hint && meal.hint !== "question mark") {
            const promise = getPexelsImage({ query: meal.hint })
              .then(result => {
                if (result.imageUrl) {
                  completePlan.dietPlan[dayIndex].meals[mealTime].imageUrl = result.imageUrl;
                }
              })
              .catch(error => {
                console.error(`Failed to fetch image for ${meal.hint}:`, error);
                // Set empty string as fallback
                completePlan.dietPlan[dayIndex].meals[mealTime].imageUrl = '';
              });
            imagePromises.push(promise);
          }
        });
      });

      // Wait for all images with a timeout
      try {
        await Promise.allSettled(imagePromises);
        console.log('Image fetching completed');
      } catch (error) {
        console.error('Error during image fetching:', error);
      }

      return completePlan;
      
    } catch (error) {
      console.error('Error in generateDietPlanFlow:', error);
      
      // Return a complete fallback plan for exactly 3 days rather than throwing
      const fallbackPlan = ensureCompleteDayStructure({ dietPlan: [] }, 3);
      console.log('Returning fallback plan for 3 days due to error');
      return fallbackPlan;
    }
  }
);
