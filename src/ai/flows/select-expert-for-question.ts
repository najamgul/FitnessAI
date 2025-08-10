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
    knowledgeContext: knowledgeContext,
  });
}

const prompt = ai.definePrompt({
  name: 'selectExpertForQuestionPrompt',
  input: {
    schema: z.object({
      question: z.string(),
      knowledgeContext: z.string(),
    }),
  },
  output: {schema: SelectExpertForQuestionOutputSchema},
  prompt: `You are Azai, a helpful and friendly nutrition assistant. Your personality is encouraging and supportive.

Your primary goal is to answer the user's nutrition-related questions based on the provided "Knowledge Base Context".

User's Question:
"{{{question}}}"

Knowledge Base Context:
"""
{{{knowledgeContext}}}
"""

Follow these rules:
1.  If the user's question is a general greeting or conversational (e.g., "hello", "how are you?"), respond in a friendly, conversational manner.
2.  If the user asks a question and the "Knowledge Base Context" contains a relevant answer, formulate a clear and concise answer based *exclusively* on that information. Do not add any information that is not present in the context.
3.  If the user asks a question and the context is empty or does not contain relevant information, you MUST respond with: "I'm sorry, but I couldn't find an answer to that in my knowledge base. Could you try rephrasing it, or ask something else about nutrition?"
4.  Do not use any external knowledge. Stick strictly to the provided text for nutrition answers.
`,
});

const selectExpertForQuestionFlow = ai.defineFlow(
  {
    name: 'selectExpertForQuestionFlow',
    inputSchema: z.object({
      question: z.string(),
      knowledgeContext: z.string(),
    }),
    outputSchema: SelectExpertForQuestionOutputSchema,
  },
  async input => {
    // We don't need the check here anymore, the prompt can handle an empty context.
    const {output} = await prompt(input);
    return output!;
  }
);
