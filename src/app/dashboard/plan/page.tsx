'use client';

import React, { useState, useEffect } from 'react';
import { 
  Apple, Brain, CheckCircle2, Clock, Download, 
  TrendingUp, Utensils, Zap, AlertTriangle, Target, 
  RefreshCw, ShoppingCart, Star, Moon,
  Coffee, UtensilsCrossed, Cookie, Salad, Loader2, FileClock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { generateDietPlan, GenerateDietPlanOutput } from '@/ai/flows/generate-diet-plan';
import { generateShoppingList } from '@/ai/flows/generate-shopping-list';

type Meal = GenerateDietPlanOutput['dietPlan'][0]['meals']['Breakfast'] & {
    mealTime: string;
    completed: boolean;
};

type DayPlan = {
    day: number;
    meals: Meal[];
};

const SmartDietPlanner = () => {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(true);
    const [planStatus, setPlanStatus] = useState<'loading' | 'pending_review' | 'ready' | 'not_found'>('loading');
    const [fullPlan, setFullPlan] = useState<GenerateDietPlanOutput['dietPlan'] | null>(null);
    const [plan, setPlan] = useState<DayPlan[]>([]);
    const [currentDay, setCurrentDay] = useState(0);

    useEffect(() => {
        const fetchUserPlan = () => {
            const loggedInEmail = localStorage.getItem('loggedInEmail');
            if (!loggedInEmail) {
                setPlanStatus('not_found');
                setIsLoading(false);
                return;
            }

            const approvedUsersString = localStorage.getItem('approvedUsers');
            const approvedUsers = approvedUsersString ? JSON.parse(approvedUsersString) : {};
            const userProfile = approvedUsers[loggedInEmail];

            if (!userProfile) {
                setPlanStatus('not_found');
                setIsLoading(false);
                return;
            }
            
            if (userProfile.planStatus === 'pending_review' || !userProfile.dietPlan) {
                setPlanStatus('pending_review');
                setIsLoading(false);
                return;
            }
            
            if (userProfile.planStatus === 'approved' && userProfile.dietPlan) {
                const fetchedPlan = userProfile.dietPlan;
                setFullPlan(fetchedPlan);
                const transformedPlan = fetchedPlan.map(dayPlan => ({
                    day: dayPlan.day,
                    meals: Object.entries(dayPlan.meals).map(([mealTime, mealDetails]) => ({
                        ...mealDetails,
                        mealTime,
                        completed: false // Initialize completion status
                    }))
                }));
                setPlan(transformedPlan);
                setPlanStatus('ready');
            }
            setIsLoading(false);
        };
        fetchUserPlan();
    }, []);

    const toggleMealCompletion = (dayIndex: number, mealIndex: number) => {
        setPlan(prevPlan => {
            const newPlan = [...prevPlan];
            newPlan[dayIndex].meals[mealIndex].completed = !newPlan[dayIndex].meals[mealIndex].completed;
            return newPlan;
        });
    };
    
    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-64">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="mt-4 text-muted-foreground">Loading your diet plan...</p>
            </div>
        );
    }
    
    if (planStatus === 'pending_review') {
        return (
            <Card className="text-center">
                <CardHeader>
                    <div className="mx-auto bg-primary text-primary-foreground rounded-full h-20 w-20 flex items-center justify-center mb-4">
                        <FileClock className="h-10 w-10" />
                    </div>
                    <CardTitle className="text-3xl font-headline">Plan Under Review</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-lg text-muted-foreground">
                        Your personalized diet plan has been generated and is now being reviewed by one of our nutrition experts.
                    </p>
                    <p className="mt-2 text-muted-foreground">
                        This ensures your plan is perfectly tailored and safe. We will notify you as soon as it's ready!
                    </p>
                </CardContent>
            </Card>
        );
    }
    
    if (planStatus !== 'ready' || plan.length === 0) {
        return <div className="text-center">Could not load diet plan. Please contact support.</div>;
    }

    const currentDayPlan = plan[currentDay];
    const totalCaloriesConsumed = currentDayPlan.meals.filter(m => m.completed).reduce((sum, meal) => sum + meal.calories, 0);
    const dailyGoal = currentDayPlan.meals.reduce((sum, meal) => sum + meal.calories, 0);
    const completionRate = dailyGoal > 0 ? Math.round((totalCaloriesConsumed / dailyGoal) * 100) : 0;

    return (
        <div className="bg-background">
            <div className="bg-card rounded-3xl shadow-lg overflow-hidden border">
                {/* Header */}
                <div className="bg-gradient-to-r from-primary to-emerald-600 p-6 text-primary-foreground">
                    <div className="flex items-center justify-between mb-4 flex-wrap">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-white/20 rounded-full">
                                <Brain className="w-8 h-8" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold font-headline">Your Personalized Diet Plan</h1>
                                <p className="text-green-100 mt-1">Curated by Aziaf & approved by our experts</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-4xl font-bold">{completionRate}%</div>
                            <div className="text-green-100">Daily Progress</div>
                        </div>
                    </div>
                </div>

                <div className="p-4 md:p-6">
                    <Tabs value={`day-${currentDay + 1}`} onValueChange={(val) => setCurrentDay(parseInt(val.split('-')[1]) - 1)} className="w-full">
                        <TabsList>
                            {plan.map((dayPlan) => (
                                <TabsTrigger key={dayPlan.day} value={`day-${dayPlan.day}`}>
                                    Day {dayPlan.day}
                                </TabsTrigger>
                            ))}
                        </TabsList>
                            <TabsContent value={`day-${currentDay + 1}`} className="space-y-4 mt-4">
                                {currentDayPlan.meals.map((meal, mealIndex) => (
                                <Card key={mealIndex} className={`p-4 rounded-xl border-2 transition-all ${meal.completed ? 'bg-green-50 border-green-200' : 'bg-background border-border hover:border-primary'}`}>
                                    <div className="flex items-center justify-between flex-wrap gap-4">
                                        <div className="flex items-center gap-4">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                    <h3 className="font-bold text-lg text-foreground">{meal.meal}</h3>
                                                     <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">{meal.calories} kcal</span>
                                                    <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">{meal.mealTime}</span>
                                                </div>
                                                <p className="text-muted-foreground text-sm mb-2">{meal.description}</p>
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <Button onClick={() => toggleMealCompletion(currentDay, mealIndex)} variant={meal.completed ? 'default' : 'secondary'} size="sm">
                                                <CheckCircle2 className="w-4 h-4 mr-2" />
                                                {meal.completed ? 'Completed' : 'Mark as Eaten'}
                                            </Button>
                                        </div>
                                    </div>
                                </Card>
                                ))}
                            </TabsContent>
                    </Tabs>
                </div>
            </div>
        </div>
    );
};

export default SmartDietPlanner;
