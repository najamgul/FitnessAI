import { config } from 'dotenv';
config();

import '@/ai/flows/filter-expert-responses.ts';
import '@/ai/flows/select-expert-for-question.ts';
import '@/ai/flows/provide-personalized-tips.ts';
import '@/ai/flows/generate-diet-plan.ts';
import '@/ai/flows/route-query-to-expert.ts';
import '@/ai/flows/get-missed-meal-advice.ts';
import '@/ai/flows/get-pexels-image.ts';
import '@/ai/flows/generate-body-image.ts';
import '@/ai/flows/generate-shopping-list.ts';
import '@/ai/flows/get-hydration-advice.ts';
