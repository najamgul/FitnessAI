
'use server';

/**
 * @fileOverview A flow to fetch an image from Pexels based on a query.
 *
 * - getPexelsImage - A function that fetches an image URL from Pexels.
 * - GetPexelsImageInput - The input type for the getPexelsImage function.
 * - GetPexelsImageOutput - The return type for the getPexelsImage function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

export const GetPexelsImageInputSchema = z.object({
    query: z.string().describe('The search query for the image.'),
});
export type GetPexelsImageInput = z.infer<typeof GetPexelsImageInputSchema>;

export const GetPexelsImageOutputSchema = z.object({
    imageUrl: z.string().describe('The URL of the fetched image.'),
});
export type GetPexelsImageOutput = z.infer<typeof GetPexelsImageOutputSchema>;

// This flow is not defined with ai.defineFlow because it does not use an LLM.
// It's a standard server-side function that securely calls the Pexels API.
export async function getPexelsImage(input: GetPexelsImageInput): Promise<GetPexelsImageOutput> {
    const apiKey = process.env.PEXELS_API_KEY;

    if (!apiKey) {
        console.error('Pexels API key is not set.');
        // Return a placeholder if the key is missing
        return { imageUrl: `https://source.unsplash.com/300x200/?${input.query}` };
    }

    const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(input.query)}&per_page=1`;

    try {
        const response = await fetch(url, {
            headers: {
                Authorization: apiKey,
            },
        });

        if (!response.ok) {
            console.error('Pexels API request failed:', response.statusText);
            return { imageUrl: `https://source.unsplash.com/300x200/?${input.query}` };
        }

        const data = await response.json();
        const imageUrl = data.photos?.[0]?.src?.medium || `https://source.unsplash.com/300x200/?${input.query}`;
        
        return { imageUrl };

    } catch (error) {
        console.error('Error fetching from Pexels API:', error);
        return { imageUrl: `https://source.unsplash.com/300x200/?${input.query}` };
    }
}
