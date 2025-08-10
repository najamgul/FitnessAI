
'use client';

import React, { useState, useEffect } from 'react';
import { 
  Brain, CheckCircle2, 
  Loader2, FileClock, Image as ImageIcon
} from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GenerateDietPlanOutput } from '@/ai/flows/generate-diet-plan';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
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
    const [plan, setPlan] = useState<DayPlan[]>([]);
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

    const saveProgress = (day: number, mealTime: string, isCompleted: boolean) => {
        try {
            const today = new Date().toISOString().split('T')[0];
            const progress = getStoredProgress();
            
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
            const newPlan = JSON.parse(JSON.stringify(prevPlan)); 
            const isCompleted = !newPlan[dayIndex].meals[mealIndex].completed;
            newPlan[dayIndex].meals[mealIndex].completed = isCompleted;

            const mealTime = newPlan[dayIndex].meals[mealIndex].mealTime;
            const day = newPlan[dayIndex].day;
            saveProgress(day, mealTime, isCompleted);
            
            return newPlan;
        });
    };
    
    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }
    
    if (planStatus === 'pending_review') {
        return (
            <div className="flex items-center justify-center h-full p-4">
                <Card className="text-center max-w-md w-full">
                    <div className="p-6">
                        <div className="mx-auto bg-primary text-primary-foreground rounded-full h-20 w-20 flex items-center justify-center mb-4">
                            <FileClock className="h-10 w-10" />
                        </div>
                        <h3 className="text-2xl font-bold font-headline">Plan Under Review</h3>
                        <p className="text-muted-foreground mt-2">
                            Your personalized plan is being reviewed by our experts. We'll notify you as soon as it's ready!
                        </p>
                    </div>
                </Card>
            </div>
        );
    }
    
    if (planStatus !== 'ready' || plan.length === 0) {
        return (
            <div className="flex items-center justify-center h-full p-4">
                <div className="text-center p-8 bg-card rounded-lg border max-w-md w-full">
                    <h3 className="text-xl font-semibold">Diet Plan Not Found</h3>
                    <p className="text-muted-foreground mt-2">We could not find an approved diet plan. Please contact support if you believe this is an error.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col">
            <div className="bg-gradient-to-r from-primary to-emerald-600 p-4 sm:p-6 text-primary-foreground flex-shrink-0">
                <div className="flex items-center gap-3">
                    <div className="p-2 sm:p-3 bg-white/20 rounded-full flex-shrink-0">
                        <Brain className="w-6 h-6 sm:w-8 sm:h-8" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold font-headline leading-tight truncate">Your Diet Plan</h1>
                        <p className="text-green-100 mt-1 text-sm sm:text-base">Curated by Aziaf & our experts</p>
                    </div>
                </div>
            </div>

            <Tabs defaultValue="day-1" className="p-3 sm:p-4 md:p-6 flex-1 flex flex-col min-h-0">
                <ScrollArea className="w-full whitespace-nowrap rounded-md flex-shrink-0">
                    <TabsList className="w-full justify-start h-auto p-1">
                        {plan.map((dayPlan) => (
                            <TabsTrigger key={dayPlan.day} value={`day-${dayPlan.day}`} className="text-xs sm:text-sm px-3 py-2 sm:px-4 sm:py-2">
                                Day {dayPlan.day}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                    <ScrollBar orientation="horizontal" />
                </ScrollArea>
                
                {plan.map((dayPlan, dayIndex) => (
                    <TabsContent key={dayPlan.day} value={`day-${dayPlan.day}`} className="mt-4 flex-1 min-h-0">
                        <ScrollArea className="h-full pr-2">
                            <div className="space-y-3 sm:space-y-4 pb-4">
                                {dayPlan.meals.map((meal, mealIndex) => (
                                <Card key={mealIndex} className={`overflow-hidden rounded-xl border-2 transition-all ${meal.completed ? 'bg-green-50 border-green-200' : 'bg-background border-border hover:border-primary'}`}>
                                    <div className="flex flex-col">
                                        {meal.imageUrl ? (
                                            <Image 
                                                src={meal.imageUrl}
                                                alt={meal.meal}
                                                width={200}
                                                height={200}
                                                className="w-full h-48 object-cover"
                                                unoptimized
                                            />
                                        ) : (
                                            <div className="w-full h-48 bg-muted flex items-center justify-center">
                                                <ImageIcon className="w-8 h-8 text-muted-foreground" />
                                            </div>
                                        )}
                                        <div className="p-4 flex flex-col flex-1">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                    <h3 className="font-bold text-lg text-foreground leading-tight">{meal.meal}</h3>
                                                </div>
                                                <div className="flex items-center gap-2 mb-2 flex-wrap">
                                                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">{meal.calories} kcal</span>
                                                    <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">{meal.mealTime}</span>
                                                </div>
                                                <p className="text-muted-foreground text-sm leading-relaxed mt-2">{meal.description}</p>
                                            </div>
                                            <div className="flex justify-end mt-4">
                                                <Button 
                                                    onClick={() => toggleMealCompletion(dayIndex, mealIndex)} 
                                                    variant={meal.completed ? 'default' : 'secondary'} 
                                                    size="sm"
                                                    className="w-full"
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
                ))}
            </Tabs>
        </div>
    );
};

export default SmartDietPlanner;
