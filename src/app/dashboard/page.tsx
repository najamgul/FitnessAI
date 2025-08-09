
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { UtensilsCrossed, LineChart, MessageSquareQuote, ArrowRight, Sparkles } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

type ProgressEntry = {
    date: string;
    weight: number;
    energy: number;
    completion: number;
};

export default function DashboardPage() {
    const [latestProgress, setLatestProgress] = useState<ProgressEntry | null>(null);
    const [name, setName] = useState('User');
    const [tips, setTips] = useState('');

    useEffect(() => {
        try {
            const savedHistory = localStorage.getItem('progressHistory');
            if (savedHistory) {
                const history = JSON.parse(savedHistory);
                if (history.length > 0) {
                    setLatestProgress(history[history.length - 1]);
                }
            }
            const savedTips = localStorage.getItem('personalizedTips');
             if (savedTips) {
                setTips(savedTips);
            }

            const loggedInEmail = localStorage.getItem('loggedInEmail');
            if (loggedInEmail) {
                // In a real app, you'd fetch the user's name. Here we'll derive it.
                const username = loggedInEmail.split('@')[0];
                const capitalizedUsername = username.charAt(0).toUpperCase() + username.slice(1);
                setName(capitalizedUsername);
            }

        } catch (error) {
            console.error("Could not load dashboard data from localStorage", error);
        }
    }, []);

    const quickLinks = [
        { title: 'View Diet Plan', description: 'See your daily meals.', href: '/dashboard/plan', icon: UtensilsCrossed },
        { title: 'Track Progress', description: 'Log your daily stats.', href: '/dashboard/progress', icon: LineChart },
        { title: 'Ask Azai', description: 'Get expert answers.', href: '/dashboard/ask', icon: MessageSquareQuote },
    ];

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold font-headline">Welcome back, {name}!</h1>
                <p className="text-muted-foreground">Here's a snapshot of your journey. Ready to continue?</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {quickLinks.map((link) => (
                    <Card key={link.href} className="flex flex-col">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">{link.title}</CardTitle>
                            <link.icon className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent className="flex-grow">
                            <p className="text-sm text-muted-foreground">{link.description}</p>
                        </CardContent>
                        <CardContent>
                             <Button asChild size="sm" className="w-full">
                                <Link href={link.href}>Go to page <ArrowRight className="ml-2 h-4 w-4" /></Link>
                            </Button>
                        </CardContent>
                    </Card>
                ))}
            </div>
            
            <div className="grid gap-6 md:grid-cols-2">
                 <Card>
                    <CardHeader>
                        <CardTitle className="font-headline">Latest Progress Update</CardTitle>
                        <CardDescription>Your most recent check-in.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {latestProgress ? (
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div className="font-semibold">Date:</div><div>{latestProgress.date}</div>
                                <div className="font-semibold">Weight:</div><div>{latestProgress.weight} kg</div>
                                <div className="font-semibold">Energy Level:</div><div>{latestProgress.energy} / 10</div>
                                <div className="font-semibold">Meal Completion:</div><div>{latestProgress.completion}%</div>
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground">No progress logged yet. Go to "Track Progress" to start!</p>
                        )}
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle className="font-headline">Today's Tip from Azai</CardTitle>
                        <CardDescription>A little advice to keep you going.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {tips ? (
                             <Alert>
                                <Sparkles className="h-4 w-4" />
                                <AlertTitle>Suggestion</AlertTitle>
                                <AlertDescription>
                                   {tips}
                                </AlertDescription>
                            </Alert>
                        ) : (
                            <p className="text-sm text-muted-foreground">Log your progress to receive a personalized tip from our AI assistant.</p>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
