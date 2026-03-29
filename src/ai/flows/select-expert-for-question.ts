'use server';
/**
 * @fileOverview This flow selects the most suitable expert(s) to answer a user's question based on their location.
 *
 * - selectExpertForQuestion - A function that takes a user's question and returns the names of the most suitable experts.
 * - SelectExpertForQuestionInput - The input type for the selectExpertForQuestion function.
 * - SelectExpertForQuestionOutput - The return type for the selectExpertForQuestion function.
 */
import {promises as fs} from 'fs';
import path from 'path';
import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SelectExpertForQuestionInputSchema = z.object({
  question: z.string().describe("The user's question."),
  knowledgeBaseId: z.enum(['kashmir', 'general']).describe('The identifier for the knowledge base to use.'),
  userProfile: z.string().describe("A summary of the user's health profile, goals, and preferences."),
});
export type SelectExpertForQuestionInput = z.infer<typeof SelectExpertForQuestionInputSchema>;

const SelectExpertForQuestionOutputSchema = z.object({
  answer: z
    .string()
    .describe(
      'The answer to the user question, based on the provided knowledge base. If the knowledge base does not contain relevant information, this should state that an answer could not be found.'
    ),
});
export type SelectExpertForQuestionOutput = z.infer<typeof SelectExpertForQuestionOutputSchema>;

async function searchKnowledgeBase(knowledgeBaseId: 'kashmir' | 'general', question: string): Promise<string> {
  const fileName = knowledgeBaseId === 'kashmir' ? 'knowledge-base-kashmir.txt' : 'knowledge-base-non-kashmir.txt';
  try {
    const knowledgeBase = await fs.readFile(
      path.join(process.cwd(), 'src', 'ai', fileName),
      'utf-8'
    );
    const paragraphs = knowledgeBase.split('\n\n');
    const lowerCaseQuestion = question.toLowerCase();

    // Simple keyword matching. For a real app, a vector DB would be better.
    const relevantParagraphs = paragraphs.filter(p =>
      p.toLowerCase().includes(lowerCaseQuestion.substring(0, 20)) || 
      lowerCaseQuestion.split(' ').some(word => p.toLowerCase().includes(word) && word.length > 3)
    );

    return relevantParagraphs.join('\n\n');
  } catch (error) {
    console.error(`Could not read knowledge base (${fileName}):`, error);
    return '';
  }
}

export async function selectExpertForQuestion(
  input: SelectExpertForQuestionInput
): Promise<SelectExpertForQuestionOutput> {
  const knowledgeContext = await searchKnowledgeBase(input.knowledgeBaseId, input.question);
  
  return selectExpertForQuestionFlow({
    question: input.question,
    userProfile: input.userProfile,
    knowledgeContext: knowledgeContext,
  });
}

const prompt = ai.definePrompt({
  name: 'selectExpertForQuestionPrompt',
  input: {
    schema: z.object({
      question: z.string(),
      userProfile: z.string(),
      knowledgeContext: z.string(),
    }),
  },
  output: {schema: SelectExpertForQuestionOutputSchema},
  prompt: `You are Azai, a helpful and friendly personal nutrition coach. Your personality is encouraging, knowledgeable, and supportive. You are answering a user who you know.

You MUST use the user's profile to personalize your answer.

Your primary goal is to answer the user's nutrition-related questions.

### User's Profile
{{{userProfile}}}

### User's Question
"{{{question}}}"

### Knowledge Base Context
"""
{{{knowledgeContext}}}
"""

Follow these rules STRICTLY:
1.  Address the user in a friendly, personal tone. Use their profile information to make the conversation feel like a one-on-one consultation.
2.  If the user's question is a general greeting (e.g., "hello", "how are you?"), respond in a friendly, conversational manner.
3.  First, try to formulate an answer using the "Knowledge Base Context". Your answer should be tailored to the user's specific profile. For example, if they ask about snacks and their goal is weight loss, recommend low-calorie options.
4.  If the "Knowledge Base Context" does NOT contain a relevant answer, use your general nutrition knowledge to answer the question. **DO NOT say you cannot find an answer.** Instead, provide a helpful, safe, and general nutrition-based answer that is still personalized to the user's profile.
5.  Keep your answers concise, helpful, and easy to understand.
`,
});

const selectExpertForQuestionFlow = ai.defineFlow(
  {
    name: 'selectExpertForQuestionFlow',
    inputSchema: z.object({
      question: z.string(),
      userProfile: z.string(),
      knowledgeContext: z.string(),
    }),
    outputSchema: SelectExpertForQuestionOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
