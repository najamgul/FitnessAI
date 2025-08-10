
'use client';

import React, { useState, useEffect } from 'react';
import { 
  Apple, Brain, CheckCircle2, Clock, Download, 
  TrendingUp, Utensils, Zap, AlertTriangle, Target, 
  RefreshCw, ShoppingCart, Star, Moon,
  Coffee, UtensilsCrossed, Cookie, Salad, Loader2, FileClock, Image as ImageIcon
} from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { generateDietPlan, GenerateDietPlanOutput } from '@/ai/flows/generate-diet-plan';
import { generateShoppingList } from '@/ai/flows/generate-shopping-list';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

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
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);
    const [planStatus, setPlanStatus] = useState<'loading' | 'pending_review' | 'ready' | 'not_found'>('loading');
    const [fullPlan, setFullPlan] = useState<GenerateDietPlanOutput | null>(null);
    const [plan, setPlan] = useState<DayPlan[]>([]);
    const [currentDay, setCurrentDay] = useState(0);
    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
            } else {
                router.push('/login');
            }
        });
        return () => unsubscribeAuth();
    }, [router]);

    useEffect(() => {
        if (!user) return;

        const userDocRef = doc(db, 'users', user.uid);
        const unsubscribeUser = onSnapshot(userDocRef, (userDoc) => {
            if (userDoc.exists()) {
                const userData = userDoc.data();
                setPlanStatus(userData.planStatus || 'not_found');

                if (userData.planStatus === 'ready') {
                    const dietPlanDocRef = doc(db, 'users', user.uid, 'dietPlan', 'current');
                    const unsubscribePlan = onSnapshot(dietPlanDocRef, (planDoc) => {
                        if (planDoc.exists()) {
                            const fetchedPlan = planDoc.data() as GenerateDietPlanOutput;
                            setFullPlan(fetchedPlan);
                            const storedProgress = getStoredProgress();
                            const transformedPlan = fetchedPlan.dietPlan.map(dayPlan => ({
                                day: dayPlan.day,
                                meals: Object.entries(dayPlan.meals).map(([mealTime, mealDetails]) => ({
                                    ...mealDetails,
                                    mealTime,
                                    completed: storedProgress[dayPlan.day]?.[mealTime] || false
                                }))
                            }));
                            setPlan(transformedPlan);
                        } else {
                            setPlanStatus('not_found');
                        }
                        setIsLoading(false);
                    });
                     return () => unsubscribePlan();
                } else {
                    setIsLoading(false);
                }
            } else {
                setPlanStatus('not_found');
                setIsLoading(false);
            }
        });

        return () => unsubscribeUser();
    }, [user, router]);

    const getStoredProgress = () => {
        try {
            const today = new Date().toISOString().split('T')[0];
            const progressString = localStorage.getItem(`mealProgress_${today}`);
            return progressString ? JSON.parse(progressString) : {};
        } catch (e) {
            return {};
        }
    };

    const saveProgress = (dayIndex: number, mealTime: string, isCompleted: boolean) => {
        try {
            const today = new Date().toISOString().split('T')[0];
            const progress = getStoredProgress();
            const day = plan[dayIndex].day;

            if (!progress[day]) {
                progress[day] = {};
            }
            progress[day][mealTime] = isCompleted;
            localStorage.setItem(`mealProgress_${today}`, JSON.stringify(progress));
        } catch(e) {
            console.error("Could not save meal progress to localStorage");
        }
    }

    const toggleMealCompletion = (dayIndex: number, mealIndex: number) => {
        setPlan(prevPlan => {
            const newPlan = JSON.parse(JSON.stringify(prevPlan)); // Deep copy
            const isCompleted = !newPlan[dayIndex].meals[mealIndex].completed;
            newPlan[dayIndex].meals[mealIndex].completed = isCompleted;

            const mealTime = newPlan[dayIndex].meals[mealIndex].mealTime;
            saveProgress(dayIndex, mealTime, isCompleted);
            
            return newPlan;
        });
    };
    
    if (isLoading) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="mt-4 text-muted-foreground">Loading your diet plan...</p>
            </div>
        );
    }
    
    if (planStatus === 'pending_review') {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-4">
                <Card className="text-center max-w-md w-full">
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
            </div>
        );
    }
    
    if (planStatus !== 'ready' || plan.length === 0) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-4">
                <div className="text-center p-8 bg-card rounded-lg border max-w-md w-full">
                    <h3 className="text-xl font-semibold">Diet Plan Not Found</h3>
                    <p className="text-muted-foreground mt-2">We could not find an approved diet plan for your account. Please complete the onboarding process or contact support if you believe this is an error.</p>
                </div>
            </div>
        );
    }

    const currentDayPlan = plan[currentDay];
    const totalCaloriesConsumed = currentDayPlan.meals.filter(m => m.completed).reduce((sum, meal) => sum + meal.calories, 0);
    const dailyGoal = currentDayPlan.meals.reduce((sum, meal) => sum + meal.calories, 0);
    const completionRate = dailyGoal > 0 ? Math.round((totalCaloriesConsumed / dailyGoal) * 100) : 0;

    return (
        <div className="min-h-screen bg-background">
            <div className="min-h-screen flex flex-col">
                <div className="bg-card rounded-none shadow-lg overflow-hidden border-0 flex-1 flex flex-col">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-primary to-emerald-600 p-4 sm:p-6 text-primary-foreground">
                        <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                                <div className="p-2 sm:p-3 bg-white/20 rounded-full flex-shrink-0">
                                    <Brain className="w-6 h-6 sm:w-8 sm:h-8" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold font-headline leading-tight truncate">Your Diet Plan</h1>
                                    <p className="text-green-100 mt-1 text-sm sm:text-base">Curated by Aziaf & our experts</p>
                                </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                                <div className="text-2xl sm:text-3xl lg:text-4xl font-bold">{completionRate}%</div>
                                <div className="text-green-100 text-xs sm:text-sm">Daily Progress</div>
                            </div>
                        </div>
                    </div>

                    <div className="p-3 sm:p-4 md:p-6 flex-1 flex flex-col">
                        <Tabs value={`day-${currentDay + 1}`} onValueChange={(val) => setCurrentDay(parseInt(val.split('-')[1]) - 1)} className="w-full h-full flex flex-col">
                            <ScrollArea className="w-full whitespace-nowrap rounded-md mb-4 flex-shrink-0">
                                <TabsList className="w-full justify-start h-auto p-1">
                                    {plan.map((dayPlan) => (
                                        <TabsTrigger key={dayPlan.day} value={`day-${dayPlan.day}`} className="text-xs sm:text-sm px-3 py-2 sm:px-4 sm:py-2">
                                            Day {dayPlan.day}
                                        </TabsTrigger>
                                    ))}
                                </TabsList>
                                <ScrollBar orientation="horizontal" />
                            </ScrollArea>
                            
                            <TabsContent value={`day-${currentDay + 1}`} className="mt-0 flex-1 min-h-0">
                                <ScrollArea className="h-full pr-2">
                                    <div className="space-y-3 sm:space-y-4 pb-4">
                                        {plan[currentDay]?.meals.map((meal, mealIndex) => (
                                        <Card key={mealIndex} className={`overflow-hidden rounded-xl border-2 transition-all ${meal.completed ? 'bg-green-50 border-green-200' : 'bg-background border-border hover:border-primary'}`}>
                                            <div className="flex flex-col">
                                                {meal.imageUrl ? (
                                                    <Image 
                                                        src={meal.imageUrl}
                                                        alt={meal.meal}
                                                        width={128}
                                                        height={128}
                                                        className="w-full h-40 sm:h-48 object-cover"
                                                        unoptimized
                                                    />
                                                ) : (
                                                    <div className="w-full h-40 sm:h-48 bg-muted flex items-center justify-center">
                                                        <ImageIcon className="w-8 h-8 text-muted-foreground" />
                                                    </div>
                                                )}
                                                <div className="p-3 sm:p-4">
                                                    <div className="flex items-start justify-between gap-3 mb-3">
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                                                                <h3 className="font-bold text-base sm:text-lg text-foreground leading-tight">{meal.meal}</h3>
                                                            </div>
                                                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                                                                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">{meal.calories} kcal</span>
                                                                <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">{meal.mealTime}</span>
                                                            </div>
                                                            <p className="text-muted-foreground text-sm leading-relaxed">{meal.description}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex justify-end">
                                                        <Button 
                                                            onClick={() => toggleMealCompletion(currentDay, mealIndex)} 
                                                            variant={meal.completed ? 'default' : 'secondary'} 
                                                            size="sm"
                                                            className="w-full sm:w-auto"
                                                        >
                                                            <CheckCircle2 className="w-4 h-4 mr-2" />
                                                            {meal.completed ? 'Completed' : 'Mark as Eaten'}
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        </Card>
                                        ))}
                                    </div>
                                </ScrollArea>
                            </TabsContent>
                        </Tabs>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SmartDietPlanner;
