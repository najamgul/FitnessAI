'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Download, Lightbulb } from 'lucide-react';
import Image from 'next/image';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { getMissedMealAdvice } from '@/ai/flows/get-missed-meal-advice';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

const initialDietPlan = {
    'Day 1': {
        'Breakfast': { meal: 'Oatmeal with berries and nuts', image: 'https://placehold.co/300x200.png', hint: 'oatmeal berries' },
        'Morning Snack': { meal: 'Apple slices with almond butter', image: 'https://placehold.co/300x200.png', hint: 'apple slices' },
        'Lunch': { meal: 'Grilled chicken salad with vinaigrette', image: 'https://placehold.co/300x200.png', hint: 'chicken salad' },
        'Afternoon Snack': { meal: 'Greek yogurt', image: 'https://placehold.co/300x200.png', hint: 'greek yogurt' },
        'Dinner': { meal: 'Salmon with roasted vegetables', image: 'https://placehold.co/300x200.png', hint: 'salmon vegetables' },
        'Evening Snack': { meal: 'Handful of mixed nuts', image: 'https://placehold.co/300x200.png', hint: 'mixed nuts' },
        'Before Bed': { meal: 'Chamomile tea', image: 'https://placehold.co/300x200.png', hint: 'chamomile tea' },
    },
    'Day 2': {
        'Breakfast': { meal: 'Greek yogurt with honey and fruits', image: 'https://placehold.co/300x200.png', hint: 'yogurt fruit' },
        'Morning Snack': { meal: 'Banana', image: 'https://placehold.co/300x200.png', hint: 'banana' },
        'Lunch': { meal: 'Quinoa bowl with black beans and corn', image: 'https://placehold.co/300x200.png', hint: 'quinoa bowl' },
        'Afternoon Snack': { meal: 'Carrot sticks with hummus', image: 'https://placehold.co/300x200.png', hint: 'carrots hummus' },
        'Dinner': { meal: 'Lean beef stir-fry with brown rice', image: 'https://placehold.co/300x200.png', hint: 'beef stir-fry' },
        'Evening Snack': { meal: 'Rice cakes', image: 'https://placehold.co/300x200.png', hint: 'rice cakes' },
        'Before Bed': { meal: 'Warm milk', image: 'https://placehold.co/300x200.png', hint: 'warm milk' },
    },
    'Day 3': {
        'Breakfast': { meal: 'Scrambled eggs with spinach and whole-wheat toast', image: 'https://placehold.co/300x200.png', hint: 'scrambled eggs' },
        'Morning Snack': { meal: 'Orange', image: 'https://placehold.co/300x200.png', hint: 'orange' },
        'Lunch': { meal: 'Lentil soup with a side of mixed greens', image: 'https://placehold.co/300x200.png', hint: 'lentil soup' },
        'Afternoon Snack': { meal: 'Cottage cheese with pineapple', image: 'https://placehold.co/300x200.png', hint: 'cottage cheese' },
        'Dinner': { meal: 'Baked cod with asparagus and lemon', image: 'https://placehold.co/300x200.png', hint: 'baked cod' },
        'Evening Snack': { meal: 'Dark chocolate square', image: 'https://placehold.co/300x200.png', hint: 'dark chocolate' },
        'Before Bed': { meal: 'Herbal tea', image: 'https://placehold.co/300x200.png', hint: 'herbal tea' },
    },
    'Day 4': {
        'Breakfast': { meal: 'Smoothie with spinach, banana, and protein powder', image: 'https://placehold.co/300x200.png', hint: 'green smoothie' },
        'Morning Snack': { meal: 'Handful of almonds', image: 'https://placehold.co/300x200.png', hint: 'almonds' },
        'Lunch': { meal: 'Turkey and avocado wrap on whole-wheat tortilla', image: 'https://placehold.co/300x200.png', hint: 'turkey wrap' },
        'Afternoon Snack': { meal: 'Hard-boiled egg', image: 'https://placehold.co/300x200.png', hint: 'hard-boiled egg' },
        'Dinner': { meal: 'Chicken cacciatore with whole-wheat pasta', image: 'https://placehold.co/300x200.png', hint: 'chicken pasta' },
        'Evening Snack': { meal: 'Popcorn', image: 'https://placehold.co/300x200.png', hint: 'popcorn' },
        'Before Bed': { meal: 'Peppermint tea', image: 'https://placehold.co/300x200.png', hint: 'peppermint tea' },
    },
    'Day 5': {
        'Breakfast': { meal: 'Oatmeal with berries and nuts', image: 'https://placehold.co/300x200.png', hint: 'oatmeal berries' },
        'Morning Snack': { meal: 'Pear', image: 'https://placehold.co/300x200.png', hint: 'pear' },
        'Lunch': { meal: 'Grilled chicken salad with vinaigrette', image: 'https://placehold.co/300x200.png', hint: 'chicken salad' },
        'Afternoon Snack': { meal: 'Edamame', image: 'https://placehold.co/300x200.png', hint: 'edamame' },
        'Dinner': { meal: 'Salmon with roasted vegetables', image: 'https://placehold.co/300x200.png', hint: 'salmon vegetables' },
        'Evening Snack': { meal: 'Berries', image: 'https://placehold.co/300x200.png', hint: 'berries' },
        'Before Bed': { meal: 'Ginger tea', image: 'https://placehold.co/300x200.png', hint: 'ginger tea' },
    },
    'Day 6': {
        'Breakfast': { meal: 'Greek yogurt with honey and fruits', image: 'https://placehold.co/300x200.png', hint: 'yogurt fruit' },
        'Morning Snack': { meal: 'Grapes', image: 'https://placehold.co/300x200.png', hint: 'grapes' },
        'Lunch': { meal: 'Quinoa bowl with black beans and corn', image: 'https://placehold.co/300x200.png', hint: 'quinoa bowl' },
        'Afternoon Snack': { meal: 'Beef jerky', image: 'https://placehold.co/300x200.png', hint: 'beef jerky' },
        'Dinner': { meal: 'Lean beef stir-fry with brown rice', image: 'https://placehold.co/300x200.png', hint: 'beef stir-fry' },
        'Evening Snack': { meal: 'Yogurt', image: 'https://placehold.co/300x200.png', hint: 'yogurt' },
        'Before Bed': { meal: 'Warm water with lemon', image: 'https://placehold.co/300x200.png', hint: 'lemon water' },
    },
    'Day 7': {
        'Breakfast': { meal: 'Scrambled eggs with spinach and whole-wheat toast', image: 'https://placehold.co/300x200.png', hint: 'scrambled eggs' },
        'Morning Snack': { meal: 'Peach', image: 'https://placehold.co/300x200.png', hint: 'peach' },
        'Lunch': { meal: 'Lentil soup with a side of mixed greens', image: 'https://placehold.co/300x200.png', hint: 'lentil soup' },
        'Afternoon Snack': { meal: 'Cucumber slices', image: 'https://placehold.co/300x200.png', hint: 'cucumber slices' },
        'Dinner': { meal: 'Baked cod with asparagus and lemon', image: 'https://placehold.co/300x200.png', hint: 'baked cod' },
        'Evening Snack': { meal: 'Celery sticks with cream cheese', image: 'https://placehold.co/300x200.png', hint: 'celery sticks' },
        'Before Bed': { meal: 'Decaf green tea', image: 'https://placehold.co/300x200.png', hint: 'green tea' },
    },
};

type Meal = {
    meal: string;
    image: string;
    hint: string;
};

type DayPlan = {
    [key: string]: Meal;
};

type DietPlan = {
    [key: string]: DayPlan;
};

type MealStatus = {
    [day: string]: {
        [mealTime: string]: boolean;
    };
};

export default function DietPlanPage() {
    const { toast } = useToast();
    const [mealStatus, setMealStatus] = useState<MealStatus>({});
    const [advice, setAdvice] = useState<{ day: string; mealTime: string; text: string } | null>(null);
    const [isLoadingAdvice, setIsLoadingAdvice] = useState(false);

    const handleCheckboxChange = (day: string, mealTime: string) => {
        setMealStatus(prev => ({
            ...prev,
            [day]: {
                ...prev[day],
                [mealTime]: !prev[day]?.[mealTime],
            },
        }));
        // If advice for this meal was shown, hide it when checked
        if (advice?.day === day && advice?.mealTime === mealTime) {
            setAdvice(null);
        }
    };

    const handleGetAdvice = async (day: string, mealTime: string, meal: string) => {
        setIsLoadingAdvice(true);
        setAdvice(null);
        try {
            const response = await getMissedMealAdvice({ mealTime, meal });
            setAdvice({ day, mealTime, text: response.advice });
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Could not get advice. Please try again.',
                variant: 'destructive',
            });
        } finally {
            setIsLoadingAdvice(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight font-headline">Your 7-Day Diet Plan</h2>
                    <p className="text-muted-foreground">Generated by Aziaf AI to help you reach your goals.</p>
                </div>
                <Button>
                    <Download className="mr-2 h-4 w-4" />
                    Download Plan
                </Button>
            </div>
            
            <Tabs defaultValue="Day 1" className="w-full">
                <TabsList className="grid w-full grid-cols-3 sm:grid-cols-4 md:grid-cols-7">
                    {Object.keys(initialDietPlan).map((day) => (
                        <TabsTrigger key={day} value={day}>{day.replace(' ', '\n')}</TabsTrigger>
                    ))}
                </TabsList>
                {Object.entries(initialDietPlan).map(([day, meals]) => (
                    <TabsContent key={day} value={day}>
                        <div className="grid gap-6 mt-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {Object.entries(meals as DayPlan).map(([mealTime, mealDetails]) => (
                                <Card key={mealTime} className="overflow-hidden flex flex-col">
                                    <CardHeader className="p-0">
                                        <Image
                                            src={mealDetails.image}
                                            alt={mealDetails.meal}
                                            width={300}
                                            height={200}
                                            className="rounded-t-lg object-cover w-full aspect-[3/2]"
                                            data-ai-hint={mealDetails.hint}
                                        />
                                    </CardHeader>
                                    <CardContent className="p-4 flex-grow">
                                        <h3 className="text-lg font-semibold font-headline">{mealTime}</h3>
                                        <p className="text-muted-foreground">{mealDetails.meal}</p>
                                    </CardContent>
                                    <CardFooter className="p-4 pt-0 mt-auto">
                                        <div className="w-full space-y-4">
                                            <div className="flex items-center space-x-2">
                                                <Checkbox
                                                    id={`${day}-${mealTime}-checkbox`}
                                                    checked={mealStatus[day]?.[mealTime] || false}
                                                    onCheckedChange={() => handleCheckboxChange(day, mealTime)}
                                                />
                                                <Label htmlFor={`${day}-${mealTime}-checkbox`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                                    Mark as Eaten
                                                </Label>
                                            </div>
                                            {!mealStatus[day]?.[mealTime] && (
                                                <div className="space-y-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="w-full"
                                                        onClick={() => handleGetAdvice(day, mealTime, mealDetails.meal)}
                                                        disabled={isLoadingAdvice}
                                                    >
                                                        {isLoadingAdvice ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lightbulb className="mr-2 h-4 w-4" />}
                                                        Missed this meal?
                                                    </Button>
                                                    {advice?.day === day && advice?.mealTime === mealTime && (
                                                        <Alert>
                                                            <Lightbulb className="h-4 w-4" />
                                                            <AlertTitle>Suggestion</AlertTitle>
                                                            <AlertDescription>
                                                                {advice.text}
                                                            </AlertDescription>
                                                        </Alert>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </CardFooter>
                                </Card>
                            ))}
                        </div>
                    </TabsContent>
                ))}
            </Tabs>
        </div>
    );
}
