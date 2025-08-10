
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { 
  Brain, TrendingUp, Target, Zap, Award, 
  Activity, Scale, Battery, Utensils, Heart, Moon,
  Droplets, Sun, Sparkles,
  ArrowUp, ArrowDown, Bell, Settings, User,
  PlayCircle, BookOpen, MessageSquare, Flame,
  Rocket, Crown, Diamond, ThumbsUp, LineChart as ChartIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
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
import { useToast } from '@/hooks/use-toast';


type ProgressEntry = {
    date: string;
    weight: number;
    energy: number;
    meals: number;
    water: number;
    sleep: number;
    mood: number;
};

const UltimateMainDashboard = () => {
    const [currentTime, setCurrentTime] = useState(new Date());
    const [name, setName] = useState('User');
    const [showWelcome, setShowWelcome] = useState(false);
    
    // Default to hasProgress = true, can be toggled for testing empty state
    const [hasProgress, setHasProgress] = useState(true); 

    const [userData, setUserData] = useState({
        streak: 7,
        totalLogs: 28,
        startDate: '2024-01-01',
        currentWeight: 68.5,
        goalWeight: 65.0,
        progressData: [
            { date: '2024-01-02', weight: 69.8, energy: 4, meals: 50, water: 1400, sleep: 5.5, mood: 4 },
            { date: '2024-01-03', weight: 69.5, energy: 7, meals: 85, water: 2100, sleep: 7.5, mood: 7 },
            { date: '2024-01-04', weight: 69.3, energy: 6, meals: 75, water: 1900, sleep: 7, mood: 6 },
            { date: '2024-01-05', weight: 69.1, energy: 5, meals: 60, water: 1600, sleep: 6, mood: 5 },
            { date: '2024-01-06', weight: 68.8, energy: 8, meals: 90, water: 2200, sleep: 8, mood: 8 },
            { date: '2024-01-07', weight: 69.0, energy: 7, meals: 80, water: 2000, sleep: 7, mood: 7 },
            { date: '2024-01-08', weight: 68.5, energy: 8, meals: 85, water: 2300, sleep: 7.5, mood: 8 }
        ],
        achievements: [
            { id: 1, name: 'First Week Champion', earned: true, rarity: 'gold' },
            { id: 2, name: 'Consistency Master', earned: true, rarity: 'platinum' },
            { id: 3, name: 'Weight Loss Hero', earned: true, rarity: 'diamond' }
        ]
    });

    const [aiInsights] = useState([
        {
            type: 'success',
            priority: 'high',
            title: 'Outstanding Progress Momentum',
            message: 'Your 7-day streak shows exceptional commitment! Weight loss is accelerating at the optimal rate of 0.5kg/week.',
            confidence: 96,
            impact: '+25% goal achievement likelihood'
        },
        {
            type: 'optimization',
            priority: 'medium',
            title: 'Sleep-Performance Correlation Detected',
            message: 'Your best days (8+ energy) consistently follow 7.5+ hours of sleep. Tonight\'s rest could boost tomorrow\'s performance by 30%.',
            confidence: 89,
            impact: '+2 energy points tomorrow'
        },
        {
            type: 'prediction',
            priority: 'high',
            title: 'Goal Achievement Forecast',
            message: 'Based on current trends, you\'ll reach your target weight in 5 weeks with 94% probability. Stay consistent!',
            confidence: 94,
            impact: 'Goal date: ~Feb 15, 2024'
        }
    ]);

    useEffect(() => {
        const loggedInEmail = localStorage.getItem('loggedInEmail');
        if (loggedInEmail) {
            const username = loggedInEmail.split('@')[0];
            const capitalizedUsername = username.charAt(0).toUpperCase() + username.slice(1);
            setName(capitalizedUsername);
        }
        const savedHistory = localStorage.getItem('progressHistory');
        if (savedHistory) {
            const history = JSON.parse(savedHistory);
            if(history.length > 0) {
              setUserData(prev => ({...prev, progressData: history, currentWeight: history[history.length-1].weight}));
              setHasProgress(true);
            } else {
              setHasProgress(false);
            }
        } else {
            setHasProgress(false);
        }

        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    const stats = useMemo(() => {
        if (!hasProgress || userData.progressData.length === 0) {
            return {
                totalWeightLoss: '0.0',
                goalProgress: '0',
                weeklyTrend: 'stable',
                avgEnergy: '0.0',
                avgMeals: '0',
                avgWater: '0',
                avgSleep: '0.0',
                daysToGoal: 'N/A',
                consistencyScore: 0,
            };
        }
        const progressData = userData.progressData;
        const latest = progressData[progressData.length - 1];
        const initialWeight = progressData[0].weight;
        const totalWeightLoss = initialWeight - latest.weight;
        const goalRange = initialWeight - userData.goalWeight;
        const goalProgress = goalRange > 0 ? ((initialWeight - latest.weight) / goalRange) * 100 : 0;
        
        const avgEnergy = progressData.reduce((sum, day) => sum + day.energy, 0) / progressData.length;
        const avgMeals = progressData.reduce((sum, day) => sum + day.meals, 0) / progressData.length;
        const avgWater = progressData.reduce((sum, day) => sum + day.water, 0) / progressData.length;
        const avgSleep = progressData.reduce((sum, day) => sum + day.sleep, 0) / progressData.length;
        
        const weeklyLoss = (progressData[0].weight - latest.weight) / progressData.length * 7;
        const daysToGoal = weeklyLoss > 0 ? Math.ceil((latest.weight - userData.goalWeight) / (weeklyLoss / 7)) : 'N/A';

        return {
            totalWeightLoss: totalWeightLoss.toFixed(1),
            goalProgress: Math.min(goalProgress, 100).toFixed(0),
            avgEnergy: avgEnergy.toFixed(1),
            avgMeals: avgMeals.toFixed(0),
            avgWater: avgWater.toFixed(0),
            avgSleep: avgSleep.toFixed(1),
            daysToGoal: daysToGoal,
            consistencyScore: Math.round(avgMeals)
        };
    }, [userData, hasProgress]);

    const smartTip = useMemo(() => {
        const hour = currentTime.getHours();
        if (hour < 9) {
            return { title: 'Morning Energy Boost', message: 'Start your day with 500ml of water and a protein-rich breakfast to maximize morning energy.', icon: <Sun className="w-6 h-6 text-yellow-500" />, action: 'View Breakfast Plan', href: '/dashboard/plan' };
        } else if (hour < 14) {
            return { title: 'Hydration Optimization', message: `You average ${stats.avgWater}ml daily. Increasing this could boost your energy by 15% based on your patterns.`, icon: <Droplets className="w-6 h-6 text-blue-500" />, action: 'Track Water Intake', href: '/dashboard/hydration' };
        } else if (hour < 18) {
            return { title: 'Afternoon Energy Sustainer', message: 'Your data shows energy can dip now. A 10-min walk or healthy snack prevents the 3pm crash.', icon: <Activity className="w-6 h-6 text-green-500" />, action: 'Log Quick Activity', href: '/dashboard/progress' };
        } else {
            return { title: 'Sleep Quality Optimizer', message: `Your average of ${stats.avgSleep}h is good, but 8h+ correlates with your best performance days. Wind down early tonight!`, icon: <Moon className="w-6 h-6 text-purple-500" />, action: 'Set Sleep Reminder', href: '/dashboard/progress' };
        }
    }, [currentTime, stats]);

    const healthScore = useMemo(() => {
      if (!hasProgress) return 0;
      const energyScore = (parseFloat(stats.avgEnergy) / 10) * 25;
      const mealScore = (parseFloat(stats.avgMeals) / 100) * 25;
      const waterScore = Math.min((parseFloat(stats.avgWater) / 2500), 1) * 25;
      const sleepScore = Math.min((parseFloat(stats.avgSleep) / 8), 1) * 25;
      return Math.round(energyScore + mealScore + waterScore + sleepScore);
    }, [stats, hasProgress]);

    const getGreeting = () => {
        const hour = currentTime.getHours();
        if (hour < 12) return 'Good morning';
        if (hour < 18) return 'Good afternoon';
        return 'Good evening';
    };

    const EmptyState = () => (
        <div className="text-center py-16 px-4">
            <div className="w-32 h-32 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full mx-auto mb-8 flex items-center justify-center">
                <ChartIcon className="w-16 h-16 text-muted-foreground" />
            </div>
            <h2 className="text-3xl font-bold text-foreground mb-4">Ready to Start Your Journey?</h2>
            <p className="text-xl text-muted-foreground mb-8">Log your first progress entry to unlock your personalized AI dashboard.</p>
            <div className="space-y-4">
                <Button asChild size="lg" className="bg-gradient-to-r from-primary to-purple-600 text-white px-12 py-8 rounded-2xl font-bold text-lg hover:from-primary/90 hover:to-purple-700/90 transition-all transform hover:scale-105">
                   <Link href="/dashboard/progress">Track Your First Entry</Link>
                </Button>
                <p className="text-muted-foreground">Once logged, you'll see weight trends, meal compliance, and personalized AI insights.</p>
            </div>
        </div>
    );

    if (!hasProgress) {
        return (
            <div className="max-w-7xl mx-auto p-4 md:p-6 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 min-h-screen">
                <div className="bg-background rounded-3xl shadow-2xl overflow-hidden">
                    <div className="bg-gradient-to-r from-primary via-purple-600 to-pink-600 p-8 text-primary-foreground">
                        <h1 className="text-4xl font-bold">Welcome back, {name}! 👋</h1>
                        <p className="text-indigo-100 mt-2">Your intelligent health companion is ready to analyze your progress.</p>
                    </div>
                    <EmptyState />
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
             <div className="bg-gradient-to-r from-primary via-purple-600 to-pink-600 p-8 text-primary-foreground rounded-3xl">
                <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
                    <div>
                        <h1 className="text-4xl font-bold">{getGreeting()}, {name}! 👋</h1>
                        <p className="text-indigo-100 mt-2 text-xl">Here's your intelligent health & progress analysis.</p>
                    </div>
                    
                    <div className="text-right">
                        <div className="text-3xl font-bold flex items-center gap-2">
                           {userData.streak} Day Streak <Flame />
                        </div>
                        <div className="text-indigo-100">Keep it going!</div>
                    </div>
                </div>

                <div className="bg-black/20 backdrop-blur-sm rounded-2xl p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { label: 'Health Score', value: healthScore },
                        { label: 'Goal Progress', value: `${stats.goalProgress}%` },
                        { label: 'Weight Lost', value: `${stats.totalWeightLoss}kg` },
                        { label: 'Total Logs', value: userData.totalLogs },
                    ].map(stat => (
                         <div key={stat.label} className="text-center">
                            <div className="text-3xl font-bold">{stat.value}</div>
                            <div className="text-indigo-200 text-sm">{stat.label}</div>
                        </div>
                    ))}
                </div>
            </div>

            <Card className="bg-gradient-to-br from-purple-50/50 to-pink-50/50 border-purple-100">
                <CardHeader>
                    <div className="flex items-center gap-4 mb-2">
                        <div className="p-3 bg-primary rounded-full">
                            <Brain className="w-8 h-8 text-primary-foreground" />
                        </div>
                        <div>
                            <CardTitle className="text-3xl font-bold font-headline">AI Intelligence Center</CardTitle>
                            <CardDescription className="text-primary/90">Real-time analysis of your health patterns</CardDescription>
                        </div>
                        <div className="ml-auto flex items-center gap-2">
                            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                            <span className="text-sm text-muted-foreground">AI Analysis Active</span>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {aiInsights.map((insight, index) => (
                        <Card key={index} className="bg-background/80 shadow-lg">
                            <CardHeader>
                                <div className="flex items-start justify-between mb-2">
                                     <div className={`p-2 rounded-lg ${
                                        insight.type === 'success' ? 'bg-green-100' :
                                        insight.type === 'optimization' ? 'bg-blue-100' :
                                        'bg-purple-100'
                                    }`}>
                                    <Sparkles className={`w-5 h-5 ${
                                        insight.type === 'success' ? 'text-green-600' :
                                        insight.type === 'optimization' ? 'text-blue-600' :
                                        'text-purple-600'
                                    }`} />
                                    </div>
                                    <span className="bg-secondary text-secondary-foreground text-xs px-3 py-1 rounded-full font-bold">
                                        {insight.confidence}% confidence
                                    </span>
                                </div>
                                <CardTitle className="text-lg">{insight.title}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-muted-foreground mb-4 leading-relaxed">{insight.message}</p>
                                <div className="bg-secondary/50 rounded-lg p-3">
                                    <p className="text-sm font-semibold text-secondary-foreground mb-1">Impact Prediction</p>
                                    <p className="text-sm text-primary font-medium">{insight.impact}</p>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <Card className="lg:col-span-2">
                   <CardHeader>
                        <CardTitle className="text-2xl font-bold font-headline flex items-center gap-3"><Scale className="text-primary"/>Weight Trend Analysis</CardTitle>
                        <CardDescription>Last 7 entries with AI trend prediction</CardDescription>
                   </CardHeader>
                   <CardContent>
                       <div className="h-64">
                         <ChartContainer config={{}} className="h-full w-full">
                            <RechartsLineChart data={userData.progressData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="weightGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid vertical={false} />
                                <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(value) => value.slice(5)} />
                                <Tooltip
                                    cursor={false}
                                    content={<ChartTooltipContent 
                                        indicator="line" 
                                        nameKey="weight"
                                        labelFormatter={(label, payload) => `Date: ${payload?.[0]?.payload.date}`}
                                    />}
                                />
                                <Line dataKey="weight" type="monotone" stroke="hsl(var(--primary))" strokeWidth={3} dot={false} fillOpacity={1} fill="url(#weightGradient)" />
                            </RechartsLineChart>
                        </ChartContainer>
                       </div>
                   </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-2xl font-bold font-headline flex items-center gap-3"><Heart className="text-destructive"/>Overall Health</CardTitle>
                        <CardDescription>AI-calculated wellness index</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="text-center">
                            <div className="text-5xl font-bold text-primary mb-2">{healthScore}</div>
                            <div className="text-lg text-muted-foreground">Excellent Health</div>
                            <Progress value={healthScore} className="h-3 mt-4" />
                        </div>
                        <div className="space-y-3 pt-4">
                            {[
                                { label: 'Energy', value: parseFloat(stats.avgEnergy), max: 10, color: 'bg-yellow-400' },
                                { label: 'Sleep', value: parseFloat(stats.avgSleep), max: 8, color: 'bg-blue-400' },
                                { label: 'Hydration', value: (parseFloat(stats.avgWater) / 2500 * 10), max: 10, color: 'bg-cyan-400' }
                            ].map((metric) => (
                                <div key={metric.label} className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">{metric.label}</span>
                                    <div className="flex items-center gap-2">
                                        <Progress value={(metric.value / metric.max) * 100} className="w-24 h-2" indicatorClassName={metric.color} />
                                        <span className="font-medium text-foreground">{metric.value.toFixed(1)}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card className="bg-gradient-to-br from-yellow-50/80 to-orange-50/80 border-yellow-200">
                <CardContent className="p-8 flex items-start gap-6">
                    <div className="p-4 bg-gradient-to-br from-yellow-400 to-orange-400 rounded-2xl text-primary-foreground">
                        {smartTip.icon}
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                            <h2 className="text-2xl font-bold font-headline">Today's AI Tip</h2>
                             <span className="bg-yellow-200 text-yellow-800 text-sm px-3 py-1 rounded-full font-medium">Personalized for you</span>
                        </div>
                        <h3 className="text-xl font-semibold text-foreground mb-3">{smartTip.title}</h3>
                        <p className="text-muted-foreground leading-relaxed mb-4">{smartTip.message}</p>
                         <Button asChild className="bg-gradient-to-r from-yellow-500 to-orange-500 text-primary-foreground font-semibold hover:from-yellow-600 hover:to-orange-600 transition-all">
                           <Link href={smartTip.href}>{smartTip.action}</Link>
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <Card>
                    <CardHeader>
                        <CardTitle className="text-2xl font-bold font-headline flex items-center gap-3"><Crown className="text-yellow-500"/>Recent Achievements</CardTitle>
                        <CardDescription>Your journey milestones</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {userData.achievements.map((achievement) => (
                        <div key={achievement.id} className="flex items-center gap-4 p-4 bg-secondary rounded-xl">
                             <div className={`p-3 rounded-full ${
                                achievement.rarity === 'diamond' ? 'bg-purple-100' :
                                achievement.rarity === 'platinum' ? 'bg-gray-200' :
                                'bg-yellow-100'
                            }`}>
                            {achievement.rarity === 'diamond' ? <Diamond className="w-6 h-6 text-purple-600" /> :
                            achievement.rarity === 'platinum' ? <Star className="w-6 h-6 text-gray-600" /> :
                            <Award className="w-6 h-6 text-yellow-600" />}
                            </div>
                            <div className="flex-1">
                                <p className="font-bold text-foreground">{achievement.name}</p>
                                <p className={`text-sm capitalize ${
                                    achievement.rarity === 'diamond' ? 'text-purple-600' :
                                    achievement.rarity === 'platinum' ? 'text-gray-600' :
                                    'text-yellow-600'
                                }`}>
                                    {achievement.rarity} Achievement
                                </p>
                            </div>
                            <CheckCircle2 className="w-6 h-6 text-green-500" />
                        </div>
                        ))}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-2xl font-bold font-headline flex items-center gap-3"><Rocket className="text-primary"/>Quick Actions</CardTitle>
                        <CardDescription>Jump right back into your journey</CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 gap-4">
                         {[
                            { title: 'Track Today\'s Progress', href: '/dashboard/progress', icon: <Target className="text-blue-600" />, urgent: true },
                            { title: 'View AI Diet Plan', href: '/dashboard/plan', icon: <Utensils className="text-green-600" /> },
                            { title: 'Smart Water Tracker', href: '/dashboard/hydration', icon: <Droplets className="text-cyan-600" /> },
                            { title: 'Ask Azai AI', href: '/dashboard/ask', icon: <MessageSquare className="text-purple-600" /> },
                         ].map((action) => (
                            <Button key={action.title} asChild variant="outline" size="lg" className={`justify-start h-16 ${action.urgent ? 'border-primary border-2' : ''}`}>
                               <Link href={action.href} className="flex items-center gap-4">
                                    <div className={`p-3 rounded-full ${action.urgent ? 'bg-blue-100' : 'bg-secondary'}`}>
                                        {action.icon}
                                    </div>
                                    <span className="font-semibold text-foreground">{action.title}</span>
                                    <PlayCircle className="w-6 h-6 ml-auto text-muted-foreground" />
                               </Link>
                            </Button>
                         ))}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default UltimateMainDashboard;

// Add a new className to the Progress component to allow custom indicator colors
declare module "react" {
    interface HTMLAttributes<T> extends AriaAttributes, DOMAttributes<T> {
      indicatorClassName?: string;
    }
}

    