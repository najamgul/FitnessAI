'use server';

/**
 * @fileOverview A flow to filter expert responses for diet plans based on user health factors.
 *
 * - filterExpertResponses - A function that filters diet plan suggestions based on input from multiple experts and user health factors.
 * - FilterExpertResponsesInput - The input type for the filterExpertResponses function.
 * - FilterExpertResponsesOutput - The return type for the filterExpertResponses function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ExpertResponseSchema = z.object({
  expertName: z.string().describe('The name of the expert providing the response.'),
  dietPlanSuggestion: z.string().describe('The diet plan suggestion from the expert.'),
});

const FilterExpertResponsesInputSchema = z.object({
  expertResponses: z.array(ExpertResponseSchema).describe('An array of diet plan suggestions from multiple experts.'),
  userHealthFactors: z.string().describe('The user health factors to consider when filtering the responses.'),
});

export type FilterExpertResponsesInput = z.infer<typeof FilterExpertResponsesInputSchema>;

const FilterExpertResponsesOutputSchema = z.object({
  consolidatedDietPlan: z.string().describe('A consolidated and optimized diet plan based on the expert responses and user health factors.'),
});

export type FilterExpertResponsesOutput = z.infer<typeof FilterExpertResponsesOutputSchema>;

export async function filterExpertResponses(input: FilterExpertResponsesInput): Promise<FilterExpertResponsesOutput> {
  return filterExpertResponsesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'filterExpertResponsesPrompt',
  input: {schema: FilterExpertResponsesInputSchema},
  output: {schema: FilterExpertResponsesOutputSchema},
  prompt: `You are an expert in consolidating diet plans based on multiple expert opinions and user-specific health factors.

You will receive diet plan suggestions from multiple experts and the user's health factors. Your goal is to create a single, optimized diet plan that takes into account all the expert opinions and the user's specific health needs.

Expert Responses:
{{#each expertResponses}}
Expert Name: {{this.expertName}}
Diet Plan Suggestion: {{this.dietPlanSuggestion}}
{{/each}}

User Health Factors: {{{userHealthFactors}}}

Based on the expert responses and user health factors, create a consolidated and optimized diet plan.
`,
});

const filterExpertResponsesFlow = ai.defineFlow(
  {
    name: 'filterExpertResponsesFlow',
    inputSchema: FilterExpertResponsesInputSchema,
    outputSchema: FilterExpertResponsesOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
