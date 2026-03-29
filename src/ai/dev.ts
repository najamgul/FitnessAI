
import { config } from 'dotenv';
config();

// Active AI flows
import '@/ai/flows/select-expert-for-question.ts';
import '@/ai/flows/generate-diet-plan.ts';
import '@/ai/flows/get-pexels-image.ts';
import '@/ai/flows/generate-body-image.ts';
import '@/ai/flows/get-missed-meal-advice.ts';
