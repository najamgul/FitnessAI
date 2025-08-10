
'use server';

/**
 * @fileOverview A flow to generate a personalized daily hydration schedule.
 *
 * - generateHydrationSchedule - A function that returns a timed water intake schedule.
 * - GenerateHydrationScheduleInput - The input type for the generateHydrationSchedule function.
 * - GenerateHydrationScheduleOutput - The return type for the generateHydrationSchedule function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateHydrationScheduleInputSchema = z.object({
  totalIntakeLiters: z.number().describe('The total daily water intake goal in liters.'),
  wakeUpTime: z.string().describe('The time the user wakes up (e.g., "7:00 AM").'),
  bedTime: z.string().describe('The time the user goes to bed (e.g., "11:00 PM").'),
});
export type GenerateHydrationScheduleInput = z.infer<typeof GenerateHydrationScheduleInputSchema>;

const ScheduleEntrySchema = z.object({
    time: z.string().describe('The specific time for this water intake (e.g., "9:00 AM").'),
    amount: z.number().describe('The amount of water to drink in milliliters (ml).'),
});

const GenerateHydrationScheduleOutputSchema = z.object({
  schedule: z.array(ScheduleEntrySchema).describe('An array of timed schedule entries for drinking water throughout the day.'),
  explanation: z.string().describe('A brief (1-2 sentence) explanation of the schedule strategy, e.g., "This schedule spreads your intake evenly..."'),
});
export type GenerateHydrationScheduleOutput = z.infer<typeof GenerateHydrationScheduleOutputSchema>;

export async function generateHydrationSchedule(input: GenerateHydrationScheduleInput): Promise<GenerateHydrationScheduleOutput> {
  return generateHydrationScheduleFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateHydrationSchedulePrompt',
  input: {schema: GenerateHydrationScheduleInputSchema},
  output: {schema: GenerateHydrationScheduleOutputSchema},
  prompt: `You are a hydration specialist. Create a practical and healthy daily water intake schedule for a user.

The goal is to help the user consume a total of {{totalIntakeLiters}} liters of water between their wake-up time of {{wakeUpTime}} and bedtime of {{bedTime}}.

Break down the total intake into manageable portions (e.g., 200-300ml) throughout the day. Avoid scheduling large amounts of water close to bedtime. The first glass should be upon waking.

Generate a schedule array with specific times and amounts in milliliters. Also provide a brief, one-sentence explanation of the strategy used.
`,
});

const generateHydrationScheduleFlow = ai.defineFlow(
  {
    name: 'generateHydrationScheduleFlow',
    inputSchema: GenerateHydrationScheduleInputSchema,
    outputSchema: GenerateHydrationScheduleOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
