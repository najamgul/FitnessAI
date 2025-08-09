'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { providePersonalizedTips } from '@/ai/flows/provide-personalized-tips';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Sparkles } from 'lucide-react';

export default function ProgressPage() {
    const { toast } = useToast();
    const [weight, setWeight] = useState('');
    const [energy, setEnergy] = useState([5]);
    const [completion, setCompletion] = useState([80]);
    const [isLoading, setIsLoading] = useState(false);
    const [tips, setTips] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setTips('');

        try {
            if (!weight) {
                toast({
                    title: 'Missing Information',
                    description: 'Please enter your current weight.',
                    variant: 'destructive',
                });
                setIsLoading(false);
                return;
            }

            const response = await providePersonalizedTips({
                weight: parseFloat(weight),
                energyLevels: energy[0],
                mealCompletion: completion[0],
                goals: 'General well-being and slight weight loss.',
            });

            setTips(response.tips);

            toast({
                title: 'Progress Logged',
                description: "We've saved your progress for today.",
            });
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Could not get personalized tips. Please try again.',
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
                    <CardTitle className="text-3xl font-bold font-headline">Track Your Daily Progress</CardTitle>
                    <CardDescription>Consistency is key. Log your daily metrics to stay on track.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="weight">Today's Weight (kg)</Label>
                            <Input
                                id="weight"
                                type="number"
                                step="0.1"
                                placeholder="e.g., 75.5"
                                required
                                value={weight}
                                onChange={(e) => setWeight(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="energy">Energy Level (1-10)</Label>
                             <div className="flex items-center gap-4">
                                <Slider
                                    id="energy"
                                    min={1}
                                    max={10}
                                    step={1}
                                    value={energy}
                                    onValueChange={setEnergy}
                                />
                                <span className="font-semibold text-lg text-primary w-12 text-center">{energy[0]}</span>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="completion">Meal Completion (%)</Label>
                            <div className="flex items-center gap-4">
                                <Slider
                                    id="completion"
                                    min={0}
                                    max={100}
                                    step={10}
                                    value={completion}
                                    onValueChange={setCompletion}
                                />
                                <span className="font-semibold text-lg text-primary w-12 text-center">{completion[0]}%</span>
                            </div>
                        </div>
                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? <Loader2 className="animate-spin" /> : 'Log Progress & Get Tips'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
            {tips && (
                <Alert className="animate-in fade-in-50">
                    <Sparkles className="h-4 w-4" />
                    <AlertTitle className="font-headline">Personalized Tip</AlertTitle>
                    <AlertDescription>
                       {tips}
                    </AlertDescription>
                </Alert>
            )}
        </div>
    );
}
