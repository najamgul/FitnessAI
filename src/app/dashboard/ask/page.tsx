
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Users } from 'lucide-react';
import { selectExpertForQuestion } from '@/ai/flows/select-expert-for-question';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function AskExpertPage() {
    const { toast } = useToast();
    const [question, setQuestion] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [experts, setExperts] = useState<string[] | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setExperts(null);

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
            if (response.expertNames && response.expertNames.length > 0) {
                setExperts(response.expertNames);
                toast({
                    title: 'Query Sent!',
                    description: 'Your question has been routed to the best experts.',
                });
            } else {
                 toast({
                    title: 'No suitable expert found',
                    description: 'We could not find an expert for your question at this time.',
                    variant: 'destructive',
                });
            }
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Could not route your question. Please try again.',
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
                    <CardDescription>Have a specific dietary question? Our AI assistant, Azai, is here to help.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="question">Your Question</Label>
                            <Textarea
                                id="question"
                                placeholder="e.g., What are the best protein sources for a vegan diet?"
                                required
                                value={question}
                                onChange={(e) => setQuestion(e.target.value)}
                                rows={5}
                            />
                        </div>
                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? <Loader2 className="animate-spin" /> : 'Submit to Azai'}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            {experts && (
                <Alert className="animate-in fade-in-50">
                    <Users className="h-4 w-4" />
                    <AlertTitle className="font-headline">Experts Notified</AlertTitle>
                    <AlertDescription>
                        We have sent your question to the following expert(s): <span className="font-semibold">{experts.join(', ')}</span>. You will receive a response soon.
                    </AlertDescription>
                </Alert>
            )}
        </div>
    );
}
