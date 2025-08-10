
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { 
  Brain, TrendingUp, Target, Zap, Award, 
  Activity, Scale, Battery, Utensils, Heart, Moon,
  Droplets, Sun, Sparkles,
  ArrowDown, LineChart as ChartIcon,
  PlayCircle, MessageSquare, Flame,
  Rocket, Crown, Diamond, Star
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
} from '@/components/ui/chart';
import { LineChart as RechartsLineChart, CartesianGrid, XAxis, Tooltip, Line } from 'recharts';

type ProgressEntry = {
    date: string;
    weight: number;
    energy: number;
    meals: number;
    water: number;
    sleep: number;
    mood: number;
    exercise: number;
    stress: number;
};

const DashboardPage = () => {
    const [userName, setUserName] = useState('User');
    const [progressHistory, setProgressHistory] = useState<ProgressEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        try {
            const onboardingDataString = localStorage.getItem('onboardingData');
            if (onboardingDataString) {
                const onboardingData = JSON.parse(onboardingDataString);
                setUserName(onboardingData.name.split(' ')[0] || 'User');
            } else {
                 const loggedInEmail = localStorage.getItem('loggedInEmail');
                 if(loggedInEmail) {
                    setUserName(loggedInEmail.split('@')[0]);
                 }
            }

            const historyString = localStorage.getItem('progressHistory');
            if (historyString) {
                setProgressHistory(JSON.parse(historyString));
            }
        } catch (error) {
            console.error("Failed to load data from localStorage", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const weightProgress = useMemo(() => {
        if (progressHistory.length < 2) return 0;
        const initialWeight = progressHistory[0].weight;
        const currentWeight = progressHistory[progressHistory.length - 1].weight;
        return initialWeight - currentWeight;
    }, [progressHistory]);

    const consistency = useMemo(() => {
        if (progressHistory.length === 0) return 0;
        const totalMealCompletion = progressHistory.reduce((acc, entry) => acc + entry.meals, 0);
        return Math.round(totalMealCompletion / progressHistory.length);
    }, [progressHistory]);

    const chartData = useMemo(() => progressHistory.map(entry => ({
        name: new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        Weight: entry.weight,
        Energy: entry.energy,
    })), [progressHistory]);

    if (isLoading) {
        return <div className="flex justify-center items-center h-full"><Sparkles className="h-8 w-8 animate-spin" /></div>;
    }

    if (progressHistory.length === 0) {
        return (
            <div className="text-center flex flex-col items-center justify-center h-full py-16">
                 <div className="w-32 h-32 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full mx-auto mb-8 flex items-center justify-center">
                    <ChartIcon className="w-16 h-16 text-gray-400" />
                </div>
                <h2 className="text-3xl font-bold text-foreground mb-4 font-headline">Welcome, {userName}!</h2>
                <p className="text-xl text-muted-foreground mb-8">Log your first entry on the 'Track Progress' page to unlock your dashboard.</p>
                <Link href="/dashboard/progress">
                    <Button size="lg" className="bg-gradient-to-r from-primary to-accent text-primary-foreground">
                        <Sparkles className="mr-2 h-5 w-5" />
                        Start Tracking Now
                    </Button>
                </Link>
            </div>
        )
    }

    return (
        <div className="space-y-8">
            <Card className="bg-gradient-to-r from-primary via-accent to-secondary border-none shadow-lg">
                <CardHeader>
                    <CardTitle className="text-4xl font-bold text-primary-foreground font-headline">Welcome back, {userName}!</CardTitle>
                    <CardDescription className="text-primary-foreground/80 text-lg">Here's a snapshot of your journey so far.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-6 md:grid-cols-3">
                    <div className="flex items-center gap-4 rounded-lg bg-primary/20 p-4">
                        <div className="rounded-full bg-primary/80 p-3">
                            <Flame className="h-6 w-6 text-primary-foreground" />
                        </div>
                        <div>
                            <div className="text-3xl font-bold text-primary-foreground">{progressHistory.length} Day</div>
                            <p className="text-primary-foreground/80">Tracking Streak</p>
                        </div>
                    </div>
                     <div className="flex items-center gap-4 rounded-lg bg-primary/20 p-4">
                        <div className="rounded-full bg-primary/80 p-3">
                            <TrendingUp className="h-6 w-6 text-primary-foreground" />
                        </div>
                        <div>
                            <div className="text-3xl font-bold text-primary-foreground">{weightProgress.toFixed(1)} kg</div>
                            <p className="text-primary-foreground/80">Total Weight Loss</p>
                        </div>
                    </div>
                     <div className="flex items-center gap-4 rounded-lg bg-primary/20 p-4">
                        <div className="rounded-full bg-primary/80 p-3">
                            <Award className="h-6 w-6 text-primary-foreground" />
                        </div>
                        <div>
                            <div className="text-3xl font-bold text-primary-foreground">{consistency}%</div>
                            <p className="text-primary-foreground/80">Meal Consistency</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-7">
                <Card className="lg:col-span-4">
                    <CardHeader>
                        <CardTitle className="font-headline flex items-center gap-2"><ChartIcon/> Progress Overview</CardTitle>
                        <CardDescription>Your weight and energy levels over the last {chartData.length} entries.</CardDescription>
                    </CardHeader>
                    <CardContent className="pl-2 h-80">
                         <ChartContainer config={{
                            Weight: { label: "Weight (kg)", color: "hsl(var(--chart-1))" },
                            Energy: { label: "Energy", color: "hsl(var(--chart-2))" }
                         }}>
                            <RechartsLineChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 0 }}>
                                <CartesianGrid vertical={false} />
                                <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} />
                                <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
                                <Line dataKey="Weight" type="monotone" strokeWidth={2} stroke="var(--color-Weight)" dot={true} />
                                <Line dataKey="Energy" type="monotone" strokeWidth={2} stroke="var(--color-Energy)" dot={true} />
                            </RechartsLineChart>
                         </ChartContainer>
                    </CardContent>
                </Card>
                <Card className="lg:col-span-3">
                     <CardHeader>
                        <CardTitle className="font-headline flex items-center gap-2"><Brain/> Aziaf Quick Actions</CardTitle>
                        <CardDescription>Jump right back into your journey.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4">
                         <Link href="/dashboard/progress">
                            <Button className="w-full justify-start h-14 text-base" variant="outline"><Target className="mr-4"/> Log Today's Progress</Button>
                        </Link>
                         <Link href="/dashboard/plan">
                            <Button className="w-full justify-start h-14 text-base" variant="outline"><Utensils className="mr-4"/> View Your Diet Plan</Button>
                        </Link>
                         <Link href="/dashboard/ask">
                            <Button className="w-full justify-start h-14 text-base" variant="outline"><MessageSquare className="mr-4"/> Chat with Aziaf</Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
             <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Your Health Dashboard</CardTitle>
                    <CardDescription>A summary of your key health metrics.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="p-4 bg-secondary rounded-lg">
                        <h3 className="text-lg font-semibold flex items-center gap-2 text-secondary-foreground"><Scale/> Weight</h3>
                        <p className="text-3xl font-bold mt-2">{progressHistory.length > 0 ? progressHistory[progressHistory.length-1].weight : 'N/A'} kg</p>
                    </div>
                     <div className="p-4 bg-secondary rounded-lg">
                        <h3 className="text-lg font-semibold flex items-center gap-2 text-secondary-foreground"><Battery/> Energy</h3>
                        <p className="text-3xl font-bold mt-2">{progressHistory.length > 0 ? progressHistory[progressHistory.length-1].energy : 'N/A'}/10</p>
                    </div>
                     <div className="p-4 bg-secondary rounded-lg">
                        <h3 className="text-lg font-semibold flex items-center gap-2 text-secondary-foreground"><Droplets/> Water</h3>
                         <p className="text-3xl font-bold mt-2">{progressHistory.length > 0 ? progressHistory[progressHistory.length-1].water : 'N/A'} ml</p>
                    </div>
                     <div className="p-4 bg-secondary rounded-lg">
                        <h3 className="text-lg font-semibold flex items-center gap-2 text-secondary-foreground"><Moon/> Sleep</h3>
                        <p className="text-3xl font-bold mt-2">{progressHistory.length > 0 ? progressHistory[progressHistory.length-1].sleep : 'N/A'} hrs</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default DashboardPage;
