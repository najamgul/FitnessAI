'use server';
/**
 * @fileOverview This flow selects the most suitable expert(s) to answer a user's question.
 *
 * - selectExpertForQuestion - A function that takes a user's question and returns the names of the most suitable experts.
 * - SelectExpertForQuestionInput - The input type for the selectExpertForQuestion function.
 * - SelectExpertForQuestionOutput - The return type for the selectExpertForQuestion function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SelectExpertForQuestionInputSchema = z.object({
  question: z.string().describe('The user\'s question.'),
});
export type SelectExpertForQuestionInput = z.infer<typeof SelectExpertForQuestionInputSchema>;

const SelectExpertForQuestionOutputSchema = z.object({
  expertNames: z.array(z.string()).describe('An array of the names of the most suitable experts to answer the question.'),
});
export type SelectExpertForQuestionOutput = z.infer<typeof SelectExpertForQuestionOutputSchema>;

export async function selectExpertForQuestion(input: SelectExpertForQuestionInput): Promise<SelectExpertForQuestionOutput> {
  return selectExpertForQuestionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'selectExpertForQuestionPrompt',
  input: {schema: SelectExpertForQuestionInputSchema},
  output: {schema: SelectExpertForQuestionOutputSchema},
  prompt: `You are an expert system for routing questions to the most appropriate expert.  You will be given a user's question, and you will return a list of the names of the experts who are most qualified to answer the question.

Question: {{{question}}}

Experts:
- Dr. Anya Sharma (General Nutrition)
- Dr. Ben Carter (Sports Nutrition)
- Dr. Chloe Davis (Pediatric Nutrition)
- Dr. David Evans (Geriatric Nutrition)

Return ONLY the array of expert names.  If no expert is appropriate, return an empty array. Do not explain your reasoning.
`, 
});

const selectExpertForQuestionFlow = ai.defineFlow(
  {
    name: 'selectExpertForQuestionFlow',
    inputSchema: SelectExpertForQuestionInputSchema,
    outputSchema: SelectExpertForQuestionOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
