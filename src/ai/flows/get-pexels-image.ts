
'use server';

/**
 * @fileOverview A flow to fetch an image from Pexels based on a query.
 *
 * - getPexelsImage - A function that fetches an image URL from Pexels.
 */

import { z } from 'genkit';

type GetPexelsImageInput = {
    query: string;
};

type GetPexelsImageOutput = {
    imageUrl: string;
};

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
