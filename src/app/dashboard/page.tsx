
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { UtensilsCrossed, LineChart, MessageSquareQuote, Sparkles, Weight, Zap, Target } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    ChartConfig,
} from '@/components/ui/chart';
import { LineChart as RechartsLineChart, CartesianGrid, XAxis, Tooltip, Line, PieChart, Pie, Cell } from 'recharts';

type ProgressEntry = {
    date: string;
    weight: number;
    energy: number;
    completion: number;
};

const chartConfig = {
    weight: {
        label: 'Weight (kg)',
        color: 'hsl(var(--primary))',
    },
} satisfies ChartConfig;

const pieChartConfig = {
    completed: {
        label: 'Completed',
        color: 'hsl(var(--primary))',
    },
    missed: {
        label: 'Missed',
        color: 'hsl(var(--muted))',
    },
} satisfies ChartConfig;

export default function DashboardPage() {
    const [progressHistory, setProgressHistory] = useState<ProgressEntry[]>([]);
    const [name, setName] = useState('User');
    const [tips, setTips] = useState('');
    const [showMotivationalDialog, setShowMotivationalDialog] = useState(false);

    useEffect(() => {
        try {
            const savedHistory = localStorage.getItem('progressHistory');
            if (savedHistory) {
                setProgressHistory(JSON.parse(savedHistory));
            }
            const savedTips = localStorage.getItem('personalizedTips');
            if (savedTips) {
                setTips(savedTips);
                 const hasSeenPopup = sessionStorage.getItem('seenMotivationalPopup');
                if (!hasSeenPopup) {
                    setShowMotivationalDialog(true);
                    sessionStorage.setItem('seenMotivationalPopup', 'true');
                }
            }

            const loggedInEmail = localStorage.getItem('loggedInEmail');
            if (loggedInEmail) {
                const username = loggedInEmail.split('@')[0];
                const capitalizedUsername = username.charAt(0).toUpperCase() + username.slice(1);
                setName(capitalizedUsername);
            }

        } catch (error) {
            console.error("Could not load dashboard data from localStorage", error);
        }
    }, []);

    const latestProgress = progressHistory.length > 0 ? progressHistory[progressHistory.length - 1] : null;

    const chartData = progressHistory.slice(-7).map(entry => ({
        date: entry.date,
        weight: entry.weight,
    }));
    
    const pieChartData = latestProgress ? [
        { name: 'completed', value: latestProgress.completion, fill: 'hsl(var(--primary))' },
        { name: 'missed', value: 100 - latestProgress.completion, fill: 'hsl(var(--muted))' }
    ] : [];

    return (
        <div className="space-y-8">
            <AlertDialog open={showMotivationalDialog} onOpenChange={setShowMotivationalDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2 font-headline">
                           <Sparkles className="text-primary"/> A Quick Note on Your Progress!
                        </AlertDialogTitle>
                        <AlertDialogDescription className="pt-2">
                           {tips || "Keep tracking your progress to get personalized tips and stay on the path to success!"}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogAction>Continue</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <div>
                <h1 className="text-3xl font-bold font-headline">Welcome back, {name}!</h1>
                <p className="text-muted-foreground">Here's your high-level health and progress analysis.</p>
            </div>
            
            {latestProgress ? (
                 <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Current Weight</CardTitle>
                            <Weight className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{latestProgress.weight} kg</div>
                            <p className="text-xs text-muted-foreground">
                                from your last entry on {latestProgress.date}
                            </p>
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Energy Level</CardTitle>
                            <Zap className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{latestProgress.energy} / 10</div>
                            <p className="text-xs text-muted-foreground">
                                How you felt on {latestProgress.date}
                            </p>
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Meal Completion</CardTitle>
                            <Target className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{latestProgress.completion}%</div>
                             <p className="text-xs text-muted-foreground">
                                Your adherence on {latestProgress.date}
                            </p>
                        </CardContent>
                    </Card>
                </div>
            ) : (
                <Alert>
                    <LineChart className="h-4 w-4" />
                    <AlertTitle>No Progress Logged</AlertTitle>
                    <AlertDescription>
                        Go to the <Link href="/dashboard/progress" className="font-semibold underline">Track Progress</Link> page to log your first entry and unlock your dashboard analytics.
                    </AlertDescription>
                </Alert>
            )}

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
                <Card className="lg:col-span-3">
                    <CardHeader>
                        <CardTitle className="font-headline">Weight Trend (Last 7 Entries)</CardTitle>
                         <CardDescription>This chart shows your weight fluctuation over your most recent entries.</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[250px] w-full">
                        {chartData.length > 1 ? (
                            <ChartContainer config={chartConfig} className="h-full w-full">
                                <RechartsLineChart
                                    accessibilityLayer
                                    data={chartData}
                                    margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
                                >
                                    <CartesianGrid vertical={false} />
                                    <XAxis
                                        dataKey="date"
                                        tickLine={false}
                                        axisLine={false}
                                        tickMargin={8}
                                        tickFormatter={(value) => value.slice(0, 5)} // Shorten date format
                                    />
                                    <ChartTooltip
                                        cursor={false}
                                        content={<ChartTooltipContent hideLabel />}
                                    />
                                    <Line
                                        dataKey="weight"
                                        type="monotone"
                                        stroke="var(--color-weight)"
                                        strokeWidth={2}
                                        dot={false}
                                    />
                                </RechartsLineChart>
                            </ChartContainer>
                        ) : (
                           <div className="flex h-full w-full items-center justify-center">
                                <p className="text-muted-foreground">Log at least two entries to see your weight trend.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
                 <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle className="font-headline">Meal Compliance</CardTitle>
                        <CardDescription>
                            Your meal completion from your last entry on {latestProgress?.date || "N/A"}.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="h-[250px] w-full flex items-center justify-center">
                         {latestProgress ? (
                            <ChartContainer config={pieChartConfig} className="h-full w-full">
                                <PieChart>
                                    <ChartTooltip
                                        cursor={false}
                                        content={<ChartTooltipContent hideLabel />}
                                    />
                                    <Pie
                                        data={pieChartData}
                                        dataKey="value"
                                        nameKey="name"
                                        innerRadius={60}
                                        strokeWidth={5}
                                    >
                                        <Cell key="cell-0" fill="var(--color-completed)" />
                                        <Cell key="cell-1" fill="var(--color-missed)" />
                                    </Pie>
                                </PieChart>
                            </ChartContainer>
                         ) : (
                             <div className="flex h-full w-full items-center justify-center">
                                <p className="text-muted-foreground">No compliance data available.</p>
                            </div>
                         )}
                    </CardContent>
                </Card>
            </div>
             <div className="grid gap-6 md:grid-cols-2">
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
                <Card>
                     <CardHeader>
                        <CardTitle className="font-headline">Quick Actions</CardTitle>
                        <CardDescription>Jump right back into your journey.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 gap-4">
                         <Button asChild>
                            <Link href="/dashboard/plan"><UtensilsCrossed /> View Diet Plan</Link>
                        </Button>
                        <Button asChild>
                            <Link href="/dashboard/progress"><LineChart /> Track Progress</Link>
                        </Button>
                        <Button asChild>
                            <Link href="/dashboard/ask"><MessageSquareQuote /> Ask Azai</Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
