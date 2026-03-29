
'use server';

/**
 * @fileOverview Azai-powered diet plan generator.
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
  medicalHistory: z.string().optional().describe('The user\'s past and present medical history, including any conditions, allergies, or medications.'),
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
    time: z.string().describe("The specific time for the meal in AM/PM format, e.g., '8:00 AM'."),
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
  
  // First, try Firestore (admin-managed knowledge base)
  try {
    const { initializeApp, getApps } = await import('firebase-admin/app');
    const { getFirestore } = await import('firebase-admin/firestore');
    
    const app = getApps().length > 0 ? getApps()[0] : initializeApp({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    });
    
    const adminDb = getFirestore(app);
    const firestoreDocId = knowledgeBaseId === 'kashmir' ? 'kashmir' : 'non-kashmir';
    const kbDoc = await adminDb.collection('knowledge-base').doc(firestoreDocId).get();
    
    if (kbDoc.exists && kbDoc.data()?.content) {
      return kbDoc.data()!.content;
    }
  } catch (firestoreError) {
    console.warn('Could not read knowledge base from Firestore, falling back to local files:', firestoreError);
  }
  
  // Fallback: try local files
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

// Helper function to create a complete placeholder meal with detailed quantities
function createPlaceholderMeal(mealType: string, dayNumber: number): z.infer<typeof MealSchema> {
  const mealOptions = {
    "Breakfast": {
      meal: "Oatmeal with Berries and Nuts",
      time: "8:00 AM",
      quantity: "40g rolled oats, 200ml low-fat milk, 50g mixed berries, 15g chopped almonds, 1 tsp honey",
      hint: "oatmeal berries",
      calories: 320,
      description: "A nutritious breakfast providing fiber, vitamins, and sustained energy to start your day."
    },
    "Morning Snack": {
      meal: "Mixed Nuts and Fruit",
      time: "11:00 AM",
      quantity: "20g almonds, 10g walnuts, 1 medium apple (150g)",
      hint: "mixed nuts",
      calories: 200,
      description: "Healthy fats and protein to keep you satisfied until lunch."
    },
    "Lunch": {
      meal: "Grilled Chicken Salad Bowl",
      time: "1:00 PM",
      quantity: "150g grilled chicken breast, 100g mixed greens, 50g cherry tomatoes, 30g cucumber, 20g avocado, 1 tbsp olive oil dressing",
      hint: "chicken salad",
      calories: 420,
      description: "Lean protein with fresh vegetables providing essential nutrients and fiber."
    },
    "Afternoon Snack": {
      meal: "Greek Yogurt with Berries",
      time: "4:00 PM",
      quantity: "150g plain Greek yogurt (2% fat), 30g blueberries",
      hint: "greek yogurt",
      calories: 150,
      description: "High-protein snack that supports muscle maintenance and provides probiotics."
    },
    "Dinner": {
      meal: "Baked Fish with Quinoa and Vegetables",
      time: "7:00 PM",
      quantity: "150g baked salmon fillet, 80g cooked quinoa, 100g steamed broccoli, 50g roasted bell peppers, 1 tsp olive oil",
      hint: "baked fish",
      calories: 480,
      description: "Light yet satisfying dinner with omega-3 fatty acids and complex carbohydrates."
    },
    "Evening Snack": {
      meal: "Apple with Almond Butter",
      time: "9:00 PM",
      quantity: "1 medium apple (150g), 1 tbsp natural almond butter (15g)",
      hint: "apple almonds",
      calories: 180,
      description: "Natural sugars paired with healthy fats for a balanced evening snack."
    },
    "Before Bed": {
      meal: "Chamomile Tea",
      time: "10:30 PM",
      quantity: "1 cup (250ml) chamomile tea, no added sugar",
      hint: "herbal tea",
      calories: 5,
      description: "Calming herbal tea to promote relaxation and better sleep quality."
    }
  };

  return mealOptions[mealType as keyof typeof mealOptions] || {
    meal: `Day ${dayNumber} ${mealType}`,
    time: "N/A",
    quantity: "Portion to be determined based on dietary needs - consult nutritionist",
    hint: "healthy meal",
    calories: 200,
    description: "A balanced meal providing essential nutrients for your health goals."
  };
}

// Helper function to ensure complete meal structure with proper quantity validation
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
        const placeholder = createPlaceholderMeal(mealKey, day.day);
        
        if (!meal.meal || typeof meal.meal !== 'string') {
          meal.meal = placeholder.meal;
        }

        if (!meal.time || typeof meal.time !== 'string') {
          meal.time = placeholder.time;
        }
        
        // Enhanced quantity validation - ensure it's detailed and specific
        if (!meal.quantity || typeof meal.quantity !== 'string' || meal.quantity.trim().length < 10) {
          meal.quantity = placeholder.quantity;
          console.warn(`Using placeholder quantity for ${mealKey} on day ${day.day}: ${meal.quantity}`);
        }
        
        if (!meal.hint || typeof meal.hint !== 'string') {
          meal.hint = placeholder.hint;
        }
        if (typeof meal.calories !== 'number' || isNaN(meal.calories)) {
          meal.calories = placeholder.calories;
        }
        if (!meal.description || typeof meal.description !== 'string') {
          meal.description = placeholder.description;
        }
        // imageUrl is optional, so we don't need to validate it
      }
    });
  });

  return incompletePlan as z.infer<typeof GenerateDietPlanOutputSchema>;
}

export async function generateDietPlan(input: GenerateDietPlanInput): Promise<GenerateDietPlanOutput> {
  try {
    // Cap AI generation at 7 days for quality. Admin can duplicate days for longer plans.
    const aiDays = Math.min(input.planDuration, 7);
    const modifiedInput = { ...input, planDuration: aiDays };
    const knowledgeContext = await getKnowledgeContext(modifiedInput.knowledgeBaseId);
    return await generateDietPlanFlow({...modifiedInput, knowledgeContext});
  } catch (error) {
    console.error('Error in generateDietPlan:', error);
    throw new Error(`Failed to generate diet plan: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

const defaultPromptTemplate = `You are Azai, a master nutritionist specializing in creating personalized diet plans, with deep knowledge of local cuisines depending on the context.

Based on the user's detailed information and the provided knowledge base, generate a personalized diet plan for exactly {{{planDuration}}} days. This plan MUST take into account the user's medical history for safety and effectiveness.

CRITICAL REQUIREMENTS - YOU MUST FOLLOW THESE EXACTLY:
1. Generate exactly {{{planDuration}}} complete days - NO MORE, NO LESS.
2. Each day MUST have ALL 7 meal slots: "Breakfast", "Morning Snack", "Lunch", "Afternoon Snack", "Dinner", "Evening Snack", "Before Bed"
3. Every meal must have all required fields: meal, time, quantity, hint, calories, description.
4. The 'time' field MUST be a string in AM/PM format, e.g., "8:00 AM".
5. The 'quantity' field is ABSOLUTELY CRITICAL and MUST contain specific, detailed measurements:
   - Use exact weights in grams (g) for solids: "150g grilled chicken breast"
   - Use volume measurements for liquids: "250ml almond milk", "1 tbsp olive oil"  
   - Use pieces/units where appropriate: "1 medium apple", "2 slices whole grain bread"
   - Include ALL ingredients with their quantities: "150g grilled chicken, 100g steamed broccoli, 80g brown rice, 1 tbsp olive oil"
   - NEVER use vague terms like "portion" or "serving" - always be specific
6. If a meal slot should be minimal (like during fasting), use "Herbal tea" or "Water" with appropriate calories and exact quantities like "250ml chamomile tea".
7. NEVER leave any meal slot empty or incomplete.

QUANTITY EXAMPLES (follow this format exactly):
- "40g rolled oats, 250ml low-fat milk, 50g mixed berries, 15g chopped almonds, 1 tsp honey"
- "150g grilled salmon fillet, 100g quinoa, 80g steamed asparagus, 1 tbsp lemon juice, 1 tsp olive oil"
- "200g plain Greek yogurt, 30g blueberries, 20g chopped walnuts, 1 tsp maple syrup"

Your response must be complete and valid JSON. Generate ALL {{{planDuration}}} days completely with detailed quantities for every meal.

User Details:
- Health Information: {{{healthInformation}}}
- Medical History: {{{medicalHistory}}}
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
          "time": "8:00 AM",
          "quantity": "40g rolled oats, 250ml low-fat milk, 50g mixed berries, 15g chopped almonds, 1 tsp honey",
          "hint": "oatmeal berries",
          "calories": 350,
          "description": "Rich in fiber and antioxidants to start your day with sustained energy and protein."
        },
        "Morning Snack": { 
          "meal": "Apple with Almond Butter",
          "time": "11:00 AM",
          "quantity": "1 medium apple (150g), 1 tbsp natural almond butter (15g)",
          "hint": "apple almonds",
          "calories": 180,
          "description": "Natural sugars paired with healthy fats for sustained energy."
        },
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
        // All 7 meals for day 2 with detailed quantities and times
      }
    },
    {
      "day": 3,
      "meals": {
        // All 7 meals for day 3 with detailed quantities and times
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
      const targetDays = input.planDuration;
      console.log(`Generating diet plan for ${targetDays} days with detailed quantities...`);
      
      // Step 1: Generate the base diet plan without images
      let basePlan: any;
      
      try {
        const { output } = await prompt(input);
        basePlan = output;
        console.log('Azai generation completed successfully');
      } catch (error) {
        console.error('Azai generation error:', error);
        // Create a minimal fallback structure
        basePlan = { dietPlan: [] };
      }
      
      // Step 2: Ensure complete structure for the target days BEFORE validation
      const completePlan = ensureCompleteDayStructure(basePlan, targetDays);
      
      console.log(`Plan structure completed. Days: ${completePlan.dietPlan.length} (target: ${targetDays} days)`);
      
      // Step 3: Log quantity information for debugging
      completePlan.dietPlan.forEach((day, dayIndex) => {
        console.log(`Day ${day.day} quantities check:`);
        Object.entries(day.meals).forEach(([mealTime, meal]) => {
          if (meal && typeof meal === 'object' && 'quantity' in meal) {
            console.log(`  ${mealTime}: "${meal.quantity}" (${meal.quantity?.length || 0} chars)`);
          } else {
            console.warn(`  ${mealTime}: Missing or invalid quantity data`);
          }
        });
      });
      
      // Step 4: Validate the structure matches schema
      try {
        GenerateDietPlanOutputSchema.parse(completePlan);
        console.log('Schema validation passed');
      } catch (validationError) {
        console.error('Schema validation failed after completion:', validationError);
        // If validation still fails, recreate with placeholders
        const fallbackPlan = ensureCompleteDayStructure({ dietPlan: [] }, targetDays);
        console.log(`Using fallback plan structure for ${targetDays} days`);
        return fallbackPlan;
      }
      
      // Step 5: Fetch images (do this last to avoid interfering with structure)
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

      console.log('Diet plan generation completed successfully with quantities');
      return completePlan;
      
    } catch (error) {
      console.error('Error in generateDietPlanFlow:', error);
      
      // Return a complete fallback plan rather than throwing
      const fallbackPlan = ensureCompleteDayStructure({ dietPlan: [] }, input.planDuration);
      console.log(`Returning fallback plan for ${input.planDuration} days due to error`);
      return fallbackPlan;
    }
  }
);
