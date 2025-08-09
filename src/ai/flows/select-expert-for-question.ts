'use server';
/**
 * @fileOverview This flow selects the most suitable expert(s) to answer a user's question.
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

async function searchKnowledgeBase(question: string): Promise<string> {
  try {
    const knowledgeBase = await fs.readFile(
      path.join(process.cwd(), 'src', 'ai', 'knowledge-base.txt'),
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
    console.error('Could not read knowledge base:', error);
    return '';
  }
}

export async function selectExpertForQuestion(
  input: SelectExpertForQuestionInput
): Promise<SelectExpertForQuestionOutput> {
  const knowledgeContext = await searchKnowledgeBase(input.question);
  
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
  prompt: `You are Azai, a helpful AI nutrition assistant. Your goal is to answer the user's question based *only* on the provided "Knowledge Base Context".

User's Question:
"{{{question}}}"

Knowledge Base Context:
"""
{{{knowledgeContext}}}
"""

Carefully analyze the "Knowledge Base Context".
- If the context contains information relevant to the user's question, formulate a clear and concise answer based *exclusively* on that information. Do not add any information that is not present in the context.
- If the context is empty or does not contain information relevant to the question, you MUST respond with: "I'm sorry, but I couldn't find a relevant answer in my knowledge base for your question. Please try rephrasing it or ask something else."
- Do not use any external knowledge. Stick strictly to the provided text.
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
    if (!input.knowledgeContext) {
      return { answer: "I'm sorry, but I couldn't find a relevant answer in my knowledge base for your question. Please try rephrasing it or ask something else." };
    }
    const {output} = await prompt(input);
    return output!;
  }
);
