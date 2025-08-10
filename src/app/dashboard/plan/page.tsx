
'use client';

import React, { useState, useEffect } from 'react';
import { 
  Apple, Brain, CheckCircle2, Clock, Download, 
  TrendingUp, Utensils, Zap, AlertTriangle, Target, 
  RefreshCw, ShoppingCart, Star, Moon,
  Coffee, UtensilsCrossed, Cookie, Salad
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';

type MealNutrients = {
    protein: number;
    carbs: number;
    fats: number;
    fiber: number;
};

type Meal = {
    id: number;
    type: string;
    time: string;
    name: string;
    calories: number;
    description: string;
    completed: boolean;
    missed?: boolean;
    isAdjusted?: boolean;
    nutrients: MealNutrients;
    benefits: string[];
    icon: React.ReactNode;
};

type Insight = {
    type: string;
    message: string;
    icon: React.ReactNode;
};

const SmartDietPlanner = () => {
    const [currentDay, setCurrentDay] = useState(1);
    const [totalCaloriesConsumed, setTotalCaloriesConsumed] = useState(0);
    const [dailyGoal] = useState(1750);
    const [adaptiveMode, setAdaptiveMode] = useState(true);
    const { toast } = useToast();
    
    const initialMealPlan: Meal[] = [
        {
          id: 1,
          type: 'Breakfast',
          time: '07:00',
          name: 'Girda with Kahwa',
          calories: 350,
          description: 'Girda with Kahwa provides slow-releasing carbs and warmth, essential for a Kashmiri morning.',
          completed: false,
          nutrients: { protein: 12, carbs: 55, fats: 8, fiber: 4 },
          benefits: ['Energy boost', 'Traditional warmth', 'Sustained release'],
          icon: <Coffee className="w-5 h-5" />
        },
        {
          id: 2,
          type: 'Morning Snack',
          time: '10:00',
          name: 'Apple (1 medium)',
          calories: 100,
          description: 'An apple provides fiber and vitamins to keep you energized between meals.',
          completed: false,
          nutrients: { protein: 0.5, carbs: 25, fats: 0.3, fiber: 4 },
          benefits: ['High fiber', 'Natural sugars', 'Vitamin C'],
          icon: <Apple className="w-5 h-5" />
        },
        {
          id: 3,
          type: 'Lunch',
          time: '13:00',
          name: 'Yakhni with Rice',
          calories: 450,
          description: 'Yakhni with rice is a light yet satisfying lunch, easy on digestion.',
          completed: false,
          nutrients: { protein: 25, carbs: 45, fats: 12, fiber: 3 },
          benefits: ['Easy digestion', 'Balanced protein', 'Comfort food'],
          icon: <Utensils className="w-5 h-5" />
        },
        {
          id: 4,
          type: 'Afternoon Snack',
          time: '16:00',
          name: 'Almonds (1/4 cup)',
          calories: 150,
          description: 'A handful of almonds provides healthy fats and keeps you feeling full.',
          completed: false,
          nutrients: { protein: 6, carbs: 6, fats: 14, fiber: 4 },
          benefits: ['Healthy fats', 'Sustained energy', 'Heart health'],
          icon: <Cookie className="w-5 h-5" />
        },
        {
          id: 5,
          type: 'Evening Snack',
          time: '18:00',
          name: 'Shufta (small serving)',
          calories: 200,
          description: 'Shufta provides quick energy and a sweet treat without refined sugars.',
          completed: false,
          nutrients: { protein: 4, carbs: 30, fats: 8, fiber: 2 },
          benefits: ['Natural sweetness', 'Quick energy', 'Traditional treat'],
          icon: <Star className="w-5 h-5" />
        },
        {
          id: 6,
          type: 'Dinner',
          time: '20:00',
          name: 'Rogan Josh with Rice',
          calories: 500,
          description: 'Rogan Josh with rice offers a balanced meal with protein and complex carbohydrates.',
          completed: false,
          nutrients: { protein: 35, carbs: 40, fats: 18, fiber: 3 },
          benefits: ['High protein', 'Complex carbs', 'Traditional flavor'],
          icon: <UtensilsCrossed className="w-5 h-5" />
        },
        {
          id: 7,
          type: 'Before Bed',
          time: '22:00',
          name: 'Warm Milk with Turmeric',
          calories: 100,
          description: 'Warm milk with a pinch of turmeric promotes relaxation and better sleep.',
          completed: false,
          nutrients: { protein: 8, carbs: 12, fats: 3, fiber: 0 },
          benefits: ['Sleep aid', 'Anti-inflammatory', 'Protein before rest'],
          icon: <Moon className="w-5 h-5" />
        }
    ];

    const [mealPlan, setMealPlan] = useState<Meal[]>(initialMealPlan);

    const [aiInsights, setAiInsights] = useState<Insight[]>([
        {
            type: 'suggestion',
            message: 'Begin your day by logging your meals to receive real-time insights!',
            icon: <Brain className="w-4 h-4 text-purple-500" />
        }
    ]);
    
    useEffect(() => {
        const consumed = mealPlan.filter(m => m.completed).reduce((sum, meal) => sum + meal.calories, 0);
        setTotalCaloriesConsumed(consumed);
        if (adaptiveMode) {
            generateNewInsights();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mealPlan, adaptiveMode]);

    const toggleMealCompletion = (mealId: number) => {
        setMealPlan(prev => prev.map(meal => 
            meal.id === mealId ? { ...meal, completed: !meal.completed } : meal
        ));
    };

    const generateNewInsights = () => {
        const completedMeals = mealPlan.filter(meal => meal.completed);
        const consumed = completedMeals.reduce((sum, meal) => sum + meal.calories, 0);
        const remainingCalories = dailyGoal - consumed;
        
        const newInsights: Insight[] = [];
        
        if (consumed === 0) {
            newInsights.push({
                type: 'suggestion',
                message: 'Ready for a great day! Log your first meal to get started.',
                icon: <Zap className="w-4 h-4 text-yellow-500" />
            });
        } else if (consumed > dailyGoal * 0.8) {
            newInsights.push({
            type: 'warning',
            message: 'You\'re close to your daily calorie goal. Consider lighter portions for remaining meals.',
            icon: <AlertTriangle className="w-4 h-4 text-yellow-500" />
            });
        } else if (consumed < dailyGoal * 0.3 && new Date().getHours() > 15) {
            newInsights.push({
            type: 'alert',
            message: 'You\'re behind on calories. Consider adding healthy snacks to meet your goals.',
            icon: <TrendingUp className="w-4 h-4 text-red-500" />
            });
        } else {
            newInsights.push({
            type: 'success',
            message: `Excellent progress! ${completedMeals.length} meals completed with perfect pacing.`,
            icon: <CheckCircle2 className="w-4 h-4 text-green-500" />
            });
        }
        
        newInsights.push({
            type: 'nutrition',
            message: `${remainingCalories} calories remaining. Focus on protein and vegetables.`,
            icon: <Target className="w-4 h-4 text-purple-500" />
        });

        const nextUncompleted = mealPlan.find(m => !m.completed && !m.missed);
        if (nextUncompleted) {
             newInsights.push({
                type: 'timing',
                message: `Next up: ${nextUncompleted.name} at ${nextUncompleted.time}.`,
                icon: <Clock className="w-4 h-4 text-orange-500" />
            });
        }
        
        setAiInsights(newInsights);
    };

    const missedMealHandler = (mealId: number) => {
        const missedMeal = mealPlan.find(meal => meal.id === mealId);
        if (!missedMeal) return;

        const missedCalories = missedMeal.calories;
        const remainingMeals = mealPlan.filter(meal => meal.id !== mealId && !meal.completed && !meal.missed);
        
        if (remainingMeals.length === 0) {
            setMealPlan(prev => prev.map(meal => meal.id === mealId ? { ...meal, missed: true, completed: false } : meal));
            toast({ title: 'Meal Missed', description: 'No remaining meals to redistribute calories to.' });
            return;
        }
        
        const caloriesPerMeal = Math.floor(missedCalories / remainingMeals.length);
        const extraCalories = missedCalories % remainingMeals.length;
        
        setMealPlan(prev => prev.map((meal, index) => {
            if (meal.id === mealId) {
                return { ...meal, missed: true, completed: false };
            }
            
            const remainingIndex = remainingMeals.findIndex(rm => rm.id === meal.id);
            if (remainingIndex !== -1) {
                const additionalCalories = caloriesPerMeal + (remainingIndex < extraCalories ? 1 : 0);
                const newCalories = meal.calories + additionalCalories;
                const multiplier = newCalories / meal.calories;
                
                const adjustedNutrients: MealNutrients = {
                    protein: Math.round(meal.nutrients.protein * multiplier),
                    carbs: Math.round(meal.nutrients.carbs * multiplier),
                    fats: Math.round(meal.nutrients.fats * multiplier),
                    fiber: Math.round(meal.nutrients.fiber * multiplier)
                };
                
                return { 
                    ...meal, 
                    calories: newCalories,
                    nutrients: adjustedNutrients,
                    description: `${meal.description.split(' (Redistributed')[0]} (Redistributed +${additionalCalories} kcal)`,
                    isAdjusted: true
                };
            }
            return meal;
        }));
        
        toast({
            title: 'Meal Calories Redistributed',
            description: `${missedCalories} kcal from ${missedMeal.name} spread across ${remainingMeals.length} upcoming meals.`
        });
    };

    const completionRate = dailyGoal > 0 ? Math.round((totalCaloriesConsumed / dailyGoal) * 100) : 0;
    
    const macroTotals = mealPlan.reduce((acc, meal) => {
        if (meal.completed) {
            acc.protein += meal.nutrients.protein;
            acc.carbs += meal.nutrients.carbs;
            acc.fats += meal.nutrients.fats;
            acc.fiber += meal.nutrients.fiber;
        }
        return acc;
    }, { protein: 0, carbs: 0, fats: 0, fiber: 0 });

    const macroTargets = { protein: 140, carbs: 175, fats: 58, fiber: 25 };

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
                                <h1 className="text-3xl font-bold font-headline">AI-Powered Diet Plan</h1>
                                <p className="text-green-100 mt-1">Personalized by Aziaf AI for optimal nutrition</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-4xl font-bold">{completionRate}%</div>
                            <div className="text-green-100">Daily Progress</div>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            onClick={() => setAdaptiveMode(!adaptiveMode)}
                            variant={adaptiveMode ? 'secondary' : 'outline'}
                            className={`transition-all ${adaptiveMode ? 'bg-yellow-400 text-primary-foreground' : 'bg-white/20 text-white'}`}
                        >
                            <Zap className="w-4 h-4" />
                            Adaptive Mode {adaptiveMode ? 'ON' : 'OFF'}
                        </Button>
                        <Button variant="outline"><RefreshCw className="w-4 h-4" />Regenerate Plan</Button>
                        <Button variant="outline"><ShoppingCart className="w-4 h-4" />Shopping List</Button>
                        <Button variant="outline"><Download className="w-4 h-4" />Download Plan</Button>
                    </div>
                </div>

                <div className="p-4 md:p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                        <Card className="text-center flex flex-col justify-center items-center p-4">
                             <div className="relative inline-block">
                                <svg className="w-40 h-40 transform -rotate-90" viewBox="0 0 200 200">
                                <circle cx="100" cy="100" r="80" stroke="hsl(var(--muted))" strokeWidth="12" fill="transparent" />
                                <circle
                                    cx="100" cy="100" r="80"
                                    stroke="url(#dietGradient)"
                                    strokeWidth="12" fill="transparent"
                                    strokeDasharray={`${completionRate * 5.03} 503`}
                                    strokeLinecap="round"
                                    className="transition-all duration-1000 ease-out"
                                />
                                <defs>
                                    <linearGradient id="dietGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" stopColor="hsl(var(--primary))" />
                                    <stop offset="100%" stopColor="hsl(var(--accent))" />
                                    </linearGradient>
                                </defs>
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center flex-col">
                                    <div className="text-3xl font-bold text-foreground">{totalCaloriesConsumed}</div>
                                    <div className="text-muted-foreground">of {dailyGoal} kcal</div>
                                </div>
                            </div>
                        </Card>

                        <Card className="p-4">
                            <CardTitle className="text-lg mb-4 font-headline">Macro Nutrients</CardTitle>
                            <div className="space-y-3">
                                {[
                                    { name: 'Protein', value: macroTotals.protein, target: macroTargets.protein, color: 'bg-sky-500' },
                                    { name: 'Carbs', value: macroTotals.carbs, target: macroTargets.carbs, color: 'bg-lime-500' },
                                    { name: 'Fats', value: macroTotals.fats, target: macroTargets.fats, color: 'bg-amber-500' },
                                    { name: 'Fiber', value: macroTotals.fiber, target: macroTargets.fiber, color: 'bg-fuchsia-500' }
                                ].map(macro => (
                                    <div key={macro.name}>
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className="font-medium text-muted-foreground">{macro.name}</span>
                                            <span>{macro.value}g / <span className="text-xs">{macro.target}g</span></span>
                                        </div>
                                        <Progress value={Math.min((macro.value / macro.target) * 100, 100)} className="h-2 [&>*]:bg-transparent" style={{'--progress-color': `var(--tw-bg-opacity, 1); background-color: ${macro.color.replace('bg-','').replace('-500','')} `} as React.CSSProperties}/>
                                    </div>
                                ))}
                            </div>
                        </Card>

                        <Card className="p-4">
                            <CardTitle className="text-lg mb-4 flex items-center gap-2 font-headline">
                                <Brain className="w-5 h-5 text-primary" />
                                AI Insights
                            </CardTitle>
                            <div className="space-y-3">
                                {aiInsights.map((insight, index) => (
                                    <div key={index} className="flex items-start gap-3 p-2 bg-secondary rounded-lg">
                                        {insight.icon}
                                        <span className="text-sm text-secondary-foreground">{insight.message}</span>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </div>
                    
                    <Tabs defaultValue="day-1" className="w-full">
                        <TabsList>
                            {[1,2,3,4,5,6,7].map(day => <TabsTrigger key={day} value={`day-${day}`}>Day {day}</TabsTrigger>)}
                        </TabsList>
                        <TabsContent value={`day-${currentDay}`}>
                            <div className="space-y-4 mt-4">
                                {mealPlan.map((meal) => (
                                <Card key={meal.id} className={`p-4 rounded-xl border-2 transition-all ${meal.completed ? 'bg-green-50 border-green-200' : meal.missed ? 'bg-red-50 border-red-200' : 'bg-background border-border hover:border-primary'}`}>
                                    <div className="flex items-center justify-between flex-wrap gap-4">
                                        <div className="flex items-center gap-4">
                                            <div className="text-center">
                                                <div className={`p-3 rounded-full ${meal.completed ? 'bg-green-100' : 'bg-muted'}`}>{meal.icon}</div>
                                                <div className="text-xs text-muted-foreground mt-1">{meal.time}</div>
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                    <h3 className="font-bold text-lg text-foreground">{meal.name}</h3>
                                                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">{meal.calories} kcal</span>
                                                    <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">{meal.type}</span>
                                                </div>
                                                <p className="text-muted-foreground text-sm mb-2">{meal.description}</p>
                                                <div className="flex flex-wrap gap-2">
                                                    {meal.benefits.map((benefit, i) => <span key={i} className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded">{benefit}</span>)}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-2">
                                            <Button onClick={() => toggleMealCompletion(meal.id)} variant={meal.completed ? 'default' : 'secondary'} size="sm">
                                                <CheckCircle2 className="w-4 h-4" />
                                                {meal.completed ? 'Completed' : 'Mark as Eaten'}
                                            </Button>
                                            {!meal.completed && !meal.missed && (
                                                <Button onClick={() => missedMealHandler(meal.id)} variant="outline" size="sm" className="text-destructive border-destructive hover:bg-destructive/10">
                                                    <AlertTriangle className="w-4 h-4" /> Missed Meal
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                    {meal.missed && <p className="text-center text-sm text-destructive font-medium mt-2">Meal Missed - Calories Redistributed</p>}
                                </Card>
                                ))}
                            </div>
                        </TabsContent>
                    </Tabs>

                </div>
            </div>
        </div>
    );
};

export default SmartDietPlanner;
