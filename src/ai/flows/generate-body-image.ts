'use server';

/**
 * @fileOverview A flow to generate a representative body image based on gender and BMI.
 *
 * - generateBodyImage - A function that returns a URL for a generated image.
 * - GenerateBodyImageInput - The input type for the generateBodyImage function.
 * - GenerateBodyImageOutput - The return type for the generateBodyImage function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateBodyImageInputSchema = z.object({
  gender: z.string().describe('The gender of the person (e.g., male, female).'),
  bmi: z.number().describe('The Body Mass Index (BMI) of the person.'),
});
export type GenerateBodyImageInput = z.infer<typeof GenerateBodyImageInputSchema>;

const GenerateBodyImageOutputSchema = z.object({
  imageUrl: z.string().url().describe('The URL of the generated image.'),
});
export type GenerateBodyImageOutput = z.infer<typeof GenerateBodyImageOutputSchema>;

function getBmiDescription(bmi: number): string {
    if (bmi < 18.5) return 'an underweight';
    if (bmi < 24.9) return 'a normal weight';
    if (bmi < 29.9) return 'an overweight';
    return 'an obese';
}

const generateBodyImageFlow = ai.defineFlow({
    name: 'generateBodyImageFlow',
    inputSchema: GenerateBodyImageInputSchema,
    outputSchema: GenerateBodyImageOutputSchema,
}, async (input) => {
    const { media } = await ai.generate({
        model: 'googleai/gemini-2.0-flash-preview-image-generation',
        prompt: `Generate a simple, minimalist, abstract, faceless graphic of ${getBmiDescription(input.bmi)} ${input.gender} person's body silhouette. Use a plain, neutral background. The style should be clean and representational, not overly detailed or realistic.`,
        config: {
            responseModalities: ['TEXT', 'IMAGE'],
        },
    });

    if (!media?.url) {
        throw new Error('Image generation failed to return a valid URL.');
    }

    return { imageUrl: media.url };
});


export async function generateBodyImage(input: GenerateBodyImageInput): Promise<GenerateBodyImageOutput> {
  return await generateBodyImageFlow(input);
}
