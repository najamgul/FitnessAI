
'use client';

import React, { useState, useEffect } from 'react';
import { 
  Apple, Brain, CheckCircle2, Clock, Download, 
  TrendingUp, Utensils, Zap, AlertTriangle, Target, 
  RefreshCw, ShoppingCart, Star, Moon, XCircle,
  Coffee, UtensilsCrossed, Cookie, Salad, Loader2, FileClock, Image as ImageIcon,
  ChevronLeft, ChevronRight, Info, CalendarDays
} from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { GenerateDietPlanOutput } from '@/ai/flows/generate-diet-plan';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { useGamification } from '@/hooks/useGamification';
import { XPReward } from '@/components/xp-reward';
import { SoundEngine } from '@/components/sound-engine';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { addDays, differenceInDays, format, startOfWeek } from 'date-fns';
import { parseTime, cleanupOldLocalStorageEntries } from '@/lib/utils/helpers';

type Meal = GenerateDietPlanOutput['dietPlan'][0]['meals']['Breakfast'] & {
    mealTime: string;
    completed: boolean;
    skipped?: boolean;
    time: string;
    originalQuantity?: string;
    originalCalories?: number;
};

type DayPlan = {
    day: number;
    meals: Meal[];
};

const SmartDietPlanner = () => {
    const { toast } = useToast();
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);
    const [isAdjusting, setIsAdjusting] = useState<number | null>(null);
    const [planStatus, setPlanStatus] = useState<'loading' | 'pending_review' | 'ready' | 'not_found'>('loading');
    const [plan, setPlan] = useState<DayPlan[]>([]);
    const [planStartDate, setPlanStartDate] = useState<Date | null>(null);
    const [currentDayIndex, setCurrentDayIndex] = useState(0); // 0-indexed
    const [currentWeek, setCurrentWeek] = useState(0);
    const [user, setUser] = useState<User | null>(null);
    const [userGoals, setUserGoals] = useState('');
    const [adjustmentAdvice, setAdjustmentAdvice] = useState<string | null>(null);
    const { completeMeal, completeAllMeals } = useGamification();
    const [xpEvent, setXpEvent] = useState<{ amount: number; source: string; multiplied: boolean } | null>(null);

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
    
    // Clean up old meal progress entries on mount
    useEffect(() => {
        cleanupOldLocalStorageEntries('mealProgress_', 7);
    }, []);

    useEffect(() => {
        if (!user) return;
        
        const onboardingDocRef = doc(db, 'users', user.uid, 'onboarding', 'profile');
        getDoc(onboardingDocRef).then(doc => {
            if (doc.exists()) {
                const data = doc.data();
                setUserGoals(`To ${data.goalAction} weight, with a target of ${data.goalWeightKg || 'N/A'}. Other goals: ${data.healthGoals?.join(', ')}`);
            }
        });

        const userDocRef = doc(db, 'users', user.uid);
        const unsubscribeUser = onSnapshot(userDocRef, (userDoc) => {
            if (userDoc.exists()) {
                const userData = userDoc.data();
                setPlanStatus(userData.planStatus || 'not_found');

                if (userData.planStatus === 'ready') {
                    const dietPlanDocRef = doc(db, 'users', user.uid, 'dietPlan', 'current');
                    const unsubscribePlan = onSnapshot(dietPlanDocRef, (planDoc) => {
                        if (planDoc.exists()) {
                            const fetchedPlanData = planDoc.data() as (GenerateDietPlanOutput & { createdAt: string });
                            const fetchedPlan = fetchedPlanData.dietPlan;
                            const storedProgress = getStoredProgress();
                            
                            const transformedPlan = fetchedPlan.map(dayPlan => {
                                const mealsArray = Object.entries(dayPlan.meals).map(([mealTime, mealDetails]) => ({
                                    ...mealDetails,
                                    mealTime,
                                    completed: storedProgress[dayPlan.day]?.[mealTime]?.completed || false,
                                    skipped: storedProgress[dayPlan.day]?.[mealTime]?.skipped || false,
                                    time: mealDetails.time,
                                    originalQuantity: mealDetails.quantity,
                                    originalCalories: mealDetails.calories,
                                }));

                                mealsArray.sort((a, b) => parseTime(a.time).getTime() - parseTime(b.time).getTime());

                                return {
                                    day: dayPlan.day,
                                    meals: mealsArray
                                };
                            });
                            setPlan(transformedPlan);
                            
                            if (fetchedPlanData.createdAt) {
                                const startDate = new Date(fetchedPlanData.createdAt);
                                setPlanStartDate(startDate);
                                
                                const today = new Date();
                                const dayDifference = differenceInDays(today, startDate);
                                const todayIndex = dayDifference % transformedPlan.length;
                                setCurrentDayIndex(todayIndex < 0 ? 0 : todayIndex);
                                setCurrentWeek(Math.floor(dayDifference / 7));
                            }

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
        } catch (e) { return {}; }
    };

    const saveProgress = (dayIndex: number, mealTime: string, status: { completed?: boolean, skipped?: boolean }) => {
        try {
            const today = new Date().toISOString().split('T')[0];
            const progress = getStoredProgress();
            const day = plan[dayIndex].day;
            if (!progress[day]) progress[day] = {};
            progress[day][mealTime] = { ...progress[day][mealTime], ...status };
            localStorage.setItem(`mealProgress_${today}`, JSON.stringify(progress));
        } catch(e) {
            console.error("Could not save meal progress to localStorage");
        }
    }

    const toggleMealCompletion = async (dayIndex: number, mealIndex: number) => {
        let wasCompleted = false;
        setPlan(prevPlan => {
            const newPlan = JSON.parse(JSON.stringify(prevPlan));
            const meal = newPlan[dayIndex].meals[mealIndex];
            meal.completed = !meal.completed;
            wasCompleted = meal.completed;
            if (meal.completed) {
                meal.skipped = false;
            }
            saveProgress(dayIndex, meal.mealTime, { completed: meal.completed, skipped: meal.skipped });
            return newPlan;
        });

        // Award XP on completion
        if (wasCompleted) {
            SoundEngine.mealComplete();
            const event = await completeMeal();
            if (event) setXpEvent(event);

            // Check if ALL meals are now completed
            setTimeout(() => {
                const allDone = plan[dayIndex]?.meals.every(m => m.completed || m.skipped) &&
                                plan[dayIndex]?.meals.filter(m => m.completed).length === plan[dayIndex]?.meals.length;
                if (allDone) {
                    completeAllMeals().then(e => { if (e) setXpEvent(e); });
                }
            }, 500);
        }
    };

    const handleSkipMeal = (dayIndex: number, mealIndex: number) => {
        setIsAdjusting(mealIndex);
        setAdjustmentAdvice(null);

        const currentDayPlan = plan[dayIndex];
        const mealToSkip = currentDayPlan.meals[mealIndex];

        if (mealToSkip.completed || mealToSkip.skipped) {
            setIsAdjusting(null);
            return;
        }

        const updatedPlan = JSON.parse(JSON.stringify(plan));
        const dayToUpdate = updatedPlan[dayIndex];
        const mealToUpdate = dayToUpdate.meals[mealIndex];

        mealToUpdate.skipped = true;
        mealToUpdate.completed = false;
        saveProgress(dayIndex, mealToUpdate.mealTime, { completed: false, skipped: true });
        
        const remainingMeals = dayToUpdate.meals.slice(mealIndex + 1).filter((m: Meal) => !m.completed && !m.skipped);

        if (remainingMeals.length === 0) {
            setAdjustmentAdvice("You've missed your last meal. Just focus on starting fresh tomorrow!");
        } else {
            const caloriesToRedistribute = mealToUpdate.originalCalories || mealToUpdate.calories;
            const perMealIncrease = Math.round(caloriesToRedistribute / remainingMeals.length);

            remainingMeals.forEach((meal: Meal) => {
                const mealInPlan = dayToUpdate.meals.find((m: Meal) => m.mealTime === meal.mealTime);
                if (mealInPlan) {
                    mealInPlan.calories = (mealInPlan.originalCalories || mealInPlan.calories) + perMealIncrease;
                    mealInPlan.description = `${(mealInPlan.originalDescription || mealInPlan.description).split(' (Adjusted')[0]} (Adjusted for missed ${mealToUpdate.mealTime})`;
                }
            });

            setAdjustmentAdvice(`To keep you on track, ${caloriesToRedistribute} calories from your skipped meal have been distributed among your remaining meals.`);
            toast({ title: "Plan Adjusted", description: `Remaining meals updated to meet your daily goal.` });
        }
        
        setPlan(updatedPlan);
        setIsAdjusting(null);
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
                    <CardHeader><div className="mx-auto bg-primary text-primary-foreground rounded-full h-20 w-20 flex items-center justify-center mb-4"><FileClock className="h-10 w-10" /></div><CardTitle className="text-3xl font-headline">Plan Under Review</CardTitle></CardHeader>
                    <CardContent><p className="text-lg text-muted-foreground">Your personalized diet plan has been generated and is now being reviewed by one of our nutrition experts.</p><p className="mt-2 text-muted-foreground">This ensures your plan is perfectly tailored and safe. We will notify you as soon as it's ready!</p></CardContent>
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

    const currentDayPlan = plan[currentDayIndex];
    if (!currentDayPlan) {
        return null;
    }
    
    const totalCaloriesConsumed = currentDayPlan.meals.filter(m => m.completed).reduce((sum, meal) => sum + meal.calories, 0);
    const dailyGoal = currentDayPlan.meals.reduce((sum, meal) => sum + (meal.originalCalories || meal.calories), 0);
    const completionRate = dailyGoal > 0 ? Math.round((totalCaloriesConsumed / dailyGoal) * 100) : 0;
    
    const numWeeks = Math.ceil(plan.length / 7);
    const weekStart = currentWeek * 7;
    const weekEnd = Math.min(weekStart + 7, plan.length);
    const daysToShowIndices = Array.from({ length: weekEnd - weekStart }, (_, i) => weekStart + i);


    return (
        <div className="min-h-screen bg-background overflow-x-hidden">
            <XPReward amount={xpEvent?.amount ?? null} source={xpEvent?.source} multiplied={xpEvent?.multiplied} onComplete={() => setXpEvent(null)} />
            <div className="min-h-screen flex flex-col max-w-full">
                <div className="bg-card rounded-none shadow-lg overflow-hidden border-0 flex-1 flex flex-col max-w-full">
                    <div className="bg-gradient-to-r from-primary to-emerald-600 p-4 sm:p-6 text-primary-foreground w-full">
                        <div className="flex items-center justify-between mb-4 flex-wrap gap-4 max-w-full">
                            <div className="flex items-center gap-3 min-w-0 flex-1"><div className="p-2 sm:p-3 bg-white/20 rounded-full flex-shrink-0"><Brain className="w-6 h-6 sm:w-8 sm:h-8" /></div><div className="min-w-0 flex-1"><h1 className="text-xl sm:text-2xl lg:text-3xl font-bold font-headline leading-tight">Your Personalized Diet Plan</h1><p className="text-green-100 mt-1 text-sm sm:text-base">Curated by Azai & approved by our experts</p></div></div>
                            <div className="text-right flex-shrink-0"><div className="text-2xl sm:text-3xl lg:text-4xl font-bold">{completionRate}%</div><div className="text-green-100 text-xs sm:text-sm">Daily Progress</div></div>
                        </div>
                    </div>
                    <div className="p-3 sm:p-4 md:p-6 flex-1 w-full max-w-full overflow-x-hidden">
                        <Tabs value={`day-${currentDayIndex}`} onValueChange={(val) => setCurrentDayIndex(parseInt(val.split('-')[1]))} className="w-full h-full flex flex-col max-w-full">
                            <div className="flex items-center gap-2 mb-4">
                                <Button 
                                    variant="outline" 
                                    size="icon" 
                                    onClick={() => setCurrentWeek(w => Math.max(0, w - 1))}
                                    disabled={currentWeek === 0}
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <ScrollArea className="w-full whitespace-nowrap rounded-md">
                                    <TabsList className="w-full justify-start h-auto p-1">
                                        {daysToShowIndices.map(index => {
                                            const dayPlan = plan[index];
                                            const dayDate = planStartDate ? addDays(planStartDate, index) : null;
                                            const isToday = dayDate && format(dayDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
                                            return (
                                                <TabsTrigger 
                                                    key={dayPlan.day} 
                                                    value={`day-${index}`} 
                                                    className="text-xs sm:text-sm px-3 py-2 sm:px-4 sm:py-2 flex flex-col h-auto"
                                                >
                                                    <span>Day {dayPlan.day}</span>
                                                    {dayDate && (
                                                        <span className={`text-xs mt-1 ${isToday ? 'font-bold text-primary' : 'text-muted-foreground'}`}>
                                                            {format(dayDate, 'MMM-dd')}
                                                        </span>
                                                    )}
                                                </TabsTrigger>
                                            )
                                        })}
                                    </TabsList>
                                    <ScrollBar orientation="horizontal" />
                                </ScrollArea>
                                 <Button 
                                    variant="outline" 
                                    size="icon" 
                                    onClick={() => setCurrentWeek(w => Math.min(numWeeks - 1, w + 1))}
                                    disabled={currentWeek >= numWeeks - 1}
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                            <TabsContent value={`day-${currentDayIndex}`} className="mt-0 flex-1 w-full max-w-full">
                                <ScrollArea className="h-full w-full">
                                    {adjustmentAdvice && (<Alert className="mb-4 bg-blue-50 border-blue-200"><Info className="h-4 w-4 text-blue-600" /><AlertTitle className="text-blue-800 font-semibold">Plan Adjusted</AlertTitle><AlertDescription className="text-blue-700">{adjustmentAdvice}</AlertDescription></Alert>)}
                                    <div className="space-y-3 sm:space-y-4 pb-4 w-full max-w-full">
                                        {plan[currentDayIndex]?.meals.map((meal, mealIndex) => (
                                        <Card key={mealIndex} className={`w-full max-w-full overflow-hidden rounded-lg border-2 transition-all ${meal.completed ? 'bg-green-50 border-green-200' : meal.skipped ? 'bg-red-50 border-red-200' : 'bg-background border-border hover:border-primary'}`}>
                                            <div className="flex flex-row items-center">
                                                <div className="flex-1 p-3 min-w-0">
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                                            {meal.imageUrl ? (<Image src={meal.imageUrl} alt={meal.meal} width={64} height={64} className="w-16 h-16 rounded-md object-cover flex-shrink-0" unoptimized/>) : (<div className="w-16 h-16 rounded-md flex-shrink-0 bg-muted flex items-center justify-center"><ImageIcon className="w-6 h-6 text-muted-foreground" /></div>)}
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2">
                                                                     <h3 className="font-bold text-sm sm:text-base text-foreground leading-tight truncate">{meal.meal}</h3>
                                                                     <span className="px-2 py-0.5 bg-purple-100 text-purple-800 text-xs rounded-full font-medium whitespace-nowrap">{meal.mealTime}</span>
                                                                     {meal.calories !== meal.originalCalories && (
                                                                        <span className="px-2 py-0.5 bg-orange-100 text-orange-800 text-xs rounded-full font-medium whitespace-nowrap">Adjusted</span>
                                                                     )}
                                                                </div>
                                                                <p className="text-sm text-muted-foreground font-semibold">{meal.time}</p>
                                                                <p className="text-sm text-muted-foreground font-semibold">{meal.quantity}</p>
                                                                <div className="flex items-center gap-1 mt-1 flex-wrap">
                                                                    <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full font-medium whitespace-nowrap">
                                                                        {meal.calories}cal
                                                                        {meal.originalCalories && meal.calories !== meal.originalCalories && (
                                                                            <span className="text-blue-600 ml-1">(was {meal.originalCalories})</span>
                                                                        )}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
                                                            {isAdjusting === mealIndex ? (<Loader2 className="h-5 w-5 animate-spin"/>) : (
                                                                <>
                                                                    {!meal.completed && !meal.skipped && (<Button onClick={() => handleSkipMeal(currentDayIndex, mealIndex)} variant="ghost" size="sm" className="text-xs text-destructive hover:text-destructive"><XCircle className="w-3 h-3 mr-1"/>Missed</Button>)}
                                                                    <Button onClick={() => toggleMealCompletion(currentDayIndex, mealIndex)} variant={meal.completed ? 'default' : 'secondary'} size="sm" className="text-xs"><CheckCircle2 className="w-3 h-3 mr-1" />{meal.completed ? 'Goal!' : 'Goal!'}</Button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <p className="text-muted-foreground text-xs leading-relaxed line-clamp-2 mt-2 pl-[76px]">{meal.description}</p>
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
