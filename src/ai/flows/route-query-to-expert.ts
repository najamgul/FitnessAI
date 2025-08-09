'use server';

/**
 * @fileOverview Routes a dietary query to the most appropriate expert based on user location and health status.
 *
 * - routeQueryToExpert - A function that routes a user's dietary query to the appropriate expert.
 * - RouteQueryToExpertInput - The input type for the routeQueryToExpert function.
 * - RouteQueryToExpertOutput - The return type for the routeQueryToExpert function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const RouteQueryToExpertInputSchema = z.object({
  query: z.string().describe('The dietary query from the user.'),
  location: z.string().describe('The user\u2019s geographic location.'),
  healthStatus: z.string().describe('The user\u2019s health status and dietary preferences.'),
});
export type RouteQueryToExpertInput = z.infer<typeof RouteQueryToExpertInputSchema>;

const RouteQueryToExpertOutputSchema = z.object({
  expert: z.string().describe('The name or identifier of the most appropriate expert.'),
  reason: z.string().describe('The reason why this expert was selected.'),
});
export type RouteQueryToExpertOutput = z.infer<typeof RouteQueryToExpertOutputSchema>;

export async function routeQueryToExpert(input: RouteQueryToExpertInput): Promise<RouteQueryToExpertOutput> {
  return routeQueryToExpertFlow(input);
}

const prompt = ai.definePrompt({
  name: 'routeQueryToExpertPrompt',
  input: {schema: RouteQueryToExpertInputSchema},
  output: {schema: RouteQueryToExpertOutputSchema},
  prompt: `You are an expert system for routing dietary queries to the most appropriate expert.

  Given the following user query, location, and health status, determine the best expert to handle the query.

  Query: {{{query}}}
  Location: {{{location}}}
  Health Status: {{{healthStatus}}}

  Consider factors such as the expert's specialization, location, and availability.

  Return the name of the expert and a brief explanation of why they were chosen.
  `,
});

const routeQueryToExpertFlow = ai.defineFlow(
  {
    name: 'routeQueryToExpertFlow',
    inputSchema: RouteQueryToExpertInputSchema,
    outputSchema: RouteQueryToExpertOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
