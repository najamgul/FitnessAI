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
        'Breakfast': { meal: 'Oatmeal with berries and nuts', image: 'https://source.unsplash.com/300x200/?oatmeal,berries', hint: 'oatmeal berries' },
        'Morning Snack': { meal: 'Apple slices with almond butter', image: 'https://source.unsplash.com/300x200/?apple,slices', hint: 'apple slices' },
        'Lunch': { meal: 'Grilled chicken salad with vinaigrette', image: 'https://source.unsplash.com/300x200/?chicken,salad', hint: 'chicken salad' },
        'Afternoon Snack': { meal: 'Greek yogurt', image: 'https://source.unsplash.com/300x200/?greek,yogurt', hint: 'greek yogurt' },
        'Dinner': { meal: 'Salmon with roasted vegetables', image: 'https://source.unsplash.com/300x200/?salmon,vegetables', hint: 'salmon vegetables' },
        'Evening Snack': { meal: 'Handful of mixed nuts', image: 'https://source.unsplash.com/300x200/?mixed,nuts', hint: 'mixed nuts' },
        'Before Bed': { meal: 'Chamomile tea', image: 'https://source.unsplash.com/300x200/?chamomile,tea', hint: 'chamomile tea' },
    },
    'Day 2': {
        'Breakfast': { meal: 'Greek yogurt with honey and fruits', image: 'https://source.unsplash.com/300x200/?yogurt,fruit', hint: 'yogurt fruit' },
        'Morning Snack': { meal: 'Banana', image: 'https://source.unsplash.com/300x200/?banana', hint: 'banana' },
        'Lunch': { meal: 'Quinoa bowl with black beans and corn', image: 'https://source.unsplash.com/300x200/?quinoa,bowl', hint: 'quinoa bowl' },
        'Afternoon Snack': { meal: 'Carrot sticks with hummus', image: 'https://source.unsplash.com/300x200/?carrots,hummus', hint: 'carrots hummus' },
        'Dinner': { meal: 'Lean beef stir-fry with brown rice', image: 'https://source.unsplash.com/300x200/?beef,stir-fry', hint: 'beef stir-fry' },
        'Evening Snack': { meal: 'Rice cakes', image: 'https://source.unsplash.com/300x200/?rice,cakes', hint: 'rice cakes' },
        'Before Bed': { meal: 'Warm milk', image: 'https://source.unsplash.com/300x200/?warm,milk', hint: 'warm milk' },
    },
    'Day 3': {
        'Breakfast': { meal: 'Scrambled eggs with spinach and whole-wheat toast', image: 'https://source.unsplash.com/300x200/?scrambled,eggs', hint: 'scrambled eggs' },
        'Morning Snack': { meal: 'Orange', image: 'https://source.unsplash.com/300x200/?orange', hint: 'orange' },
        'Lunch': { meal: 'Lentil soup with a side of mixed greens', image: 'https://source.unsplash.com/300x200/?lentil,soup', hint: 'lentil soup' },
        'Afternoon Snack': { meal: 'Cottage cheese with pineapple', image: 'https://source.unsplash.com/300x200/?cottage,cheese', hint: 'cottage cheese' },
        'Dinner': { meal: 'Baked cod with asparagus and lemon', image: 'https://source.unsplash.com/300x200/?baked,cod', hint: 'baked cod' },
        'Evening Snack': { meal: 'Dark chocolate square', image: 'https://source.unsplash.com/300x200/?dark,chocolate', hint: 'dark chocolate' },
        'Before Bed': { meal: 'Herbal tea', image: 'https://source.unsplash.com/300x200/?herbal,tea', hint: 'herbal tea' },
    },
    'Day 4': {
        'Breakfast': { meal: 'Smoothie with spinach, banana, and protein powder', image: 'https://source.unsplash.com/300x200/?green,smoothie', hint: 'green smoothie' },
        'Morning Snack': { meal: 'Handful of almonds', image: 'https://source.unsplash.com/300x200/?almonds', hint: 'almonds' },
        'Lunch': { meal: 'Turkey and avocado wrap on whole-wheat tortilla', image: 'https://source.unsplash.com/300x200/?turkey,wrap', hint: 'turkey wrap' },
        'Afternoon Snack': { meal: 'Hard-boiled egg', image: 'https://source.unsplash.com/300x200/?hard-boiled,egg', hint: 'hard-boiled egg' },
        'Dinner': { meal: 'Chicken cacciatore with whole-wheat pasta', image: 'https://source.unsplash.com/300x200/?chicken,pasta', hint: 'chicken pasta' },
        'Evening Snack': { meal: 'Popcorn', image: 'https://source.unsplash.com/300x200/?popcorn', hint: 'popcorn' },
        'Before Bed': { meal: 'Peppermint tea', image: 'https://source.unsplash.com/300x200/?peppermint,tea', hint: 'peppermint tea' },
    },
    'Day 5': {
        'Breakfast': { meal: 'Oatmeal with berries and nuts', image: 'https://source.unsplash.com/300x200/?oatmeal,berries', hint: 'oatmeal berries' },
        'Morning Snack': { meal: 'Pear', image: 'https://source.unsplash.com/300x200/?pear', hint: 'pear' },
        'Lunch': { meal: 'Grilled chicken salad with vinaigrette', image: 'https://source.unsplash.com/300x200/?chicken,salad', hint: 'chicken salad' },
        'Afternoon Snack': { meal: 'Edamame', image: 'https://source.unsplash.com/300x200/?edamame', hint: 'edamame' },
        'Dinner': { meal: 'Salmon with roasted vegetables', image: 'https://source.unsplash.com/300x200/?salmon,vegetables', hint: 'salmon vegetables' },
        'Evening Snack': { meal: 'Berries', image: 'https://source.unsplash.com/300x200/?berries', hint: 'berries' },
        'Before Bed': { meal: 'Ginger tea', image: 'https://source.unsplash.com/300x200/?ginger,tea', hint: 'ginger tea' },
    },
    'Day 6': {
        'Breakfast': { meal: 'Greek yogurt with honey and fruits', image: 'https://source.unsplash.com/300x200/?yogurt,fruit', hint: 'yogurt fruit' },
        'Morning Snack': { meal: 'Grapes', image: 'https://source.unsplash.com/300x200/?grapes', hint: 'grapes' },
        'Lunch': { meal: 'Quinoa bowl with black beans and corn', image: 'https://source.unsplash.com/300x200/?quinoa,bowl', hint: 'quinoa bowl' },
        'Afternoon Snack': { meal: 'Beef jerky', image: 'https://source.unsplash.com/300x200/?beef,jerky', hint: 'beef jerky' },
        'Dinner': { meal: 'Lean beef stir-fry with brown rice', image: 'https://source.unsplash.com/300x200/?beef,stir-fry', hint: 'beef stir-fry' },
        'Evening Snack': { meal: 'Yogurt', image: 'https://source.unsplash.com/300x200/?yogurt', hint: 'yogurt' },
        'Before Bed': { meal: 'Warm water with lemon', image: 'https://source.unsplash.com/300x200/?lemon,water', hint: 'lemon water' },
    },
    'Day 7': {
        'Breakfast': { meal: 'Scrambled eggs with spinach and whole-wheat toast', image: 'https://source.unsplash.com/300x200/?scrambled,eggs', hint: 'scrambled eggs' },
        'Morning Snack': { meal: 'Peach', image: 'https://source.unsplash.com/300x200/?peach', hint: 'peach' },
        'Lunch': { meal: 'Lentil soup with a side of mixed greens', image: 'https://source.unsplash.com/300x200/?lentil,soup', hint: 'lentil soup' },
        'Afternoon Snack': { meal: 'Cucumber slices', image: 'https://source.unsplash.com/300x200/?cucumber,slices', hint: 'cucumber slices' },
        'Dinner': { meal: 'Baked cod with asparagus and lemon', image: 'https://source.unsplash.com/300x200/?baked,cod', hint: 'baked cod' },
        'Evening Snack': { meal: 'Celery sticks with cream cheese', image: 'https://source.unsplash.com/300x200/?celery,sticks', hint: 'celery sticks' },
        'Before Bed': { meal: 'Decaf green tea', image: 'https://source.unsplash.com/300x200/?green,tea', hint: 'green tea' },
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
