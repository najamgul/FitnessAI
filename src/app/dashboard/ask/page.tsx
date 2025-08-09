
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Sparkles } from 'lucide-react';
import { selectExpertForQuestion } from '@/ai/flows/select-expert-for-question';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function AskExpertPage() {
    const { toast } = useToast();
    const [question, setQuestion] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [answer, setAnswer] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setAnswer(null);

        if (!question) {
            toast({
                title: 'Question is empty',
                description: 'Please write your question before submitting.',
                variant: 'destructive',
            });
            setIsLoading(false);
            return;
        }

        try {
            const response = await selectExpertForQuestion({ question });
            if (response.answer) {
                setAnswer(response.answer);
            } else {
                 toast({
                    title: 'No answer found',
                    description: 'We could not find an answer for your question at this time.',
                    variant: 'destructive',
                });
            }
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Could not process your question. Please try again.',
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle className="text-3xl font-bold font-headline">Ask Azai</CardTitle>
                    <CardDescription>Have a specific dietary question? Our AI assistant, Azai, is here to help, using our curated knowledge base.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="question">Your Question</Label>
                            <Textarea
                                id="question"
                                placeholder="e.g., What are the benefits of hydration?"
                                required
                                value={question}
                                onChange={(e) => setQuestion(e.target.value)}
                                rows={5}
                            />
                        </div>
                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? <Loader2 className="animate-spin" /> : 'Ask Azai'}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            {answer && (
                <Alert className="animate-in fade-in-50">
                    <Sparkles className="h-4 w-4" />
                    <AlertTitle className="font-headline">Azai's Answer</AlertTitle>
                    <AlertDescription className="whitespace-pre-wrap">
                        {answer}
                    </AlertDescription>
                </Alert>
            )}
        </div>
    );
}
