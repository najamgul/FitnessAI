
'use client';

import { useState, useEffect } from 'react';
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
import { getPexelsImage } from '@/ai/flows/get-pexels-image';

const initialDietPlan = {
    'Day 1': {
        'Breakfast': { meal: 'Oatmeal with berries and nuts', hint: 'oatmeal berries' },
        'Morning Snack': { meal: 'Apple slices with almond butter', hint: 'apple slices' },
        'Lunch': { meal: 'Grilled chicken salad with vinaigrette', hint: 'chicken salad' },
        'Afternoon Snack': { meal: 'Greek yogurt', hint: 'greek yogurt' },
        'Dinner': { meal: 'Salmon with roasted vegetables', hint: 'salmon vegetables' },
        'Evening Snack': { meal: 'Handful of mixed nuts', hint: 'mixed nuts' },
        'Before Bed': { meal: 'Chamomile tea', hint: 'chamomile tea' },
    },
    'Day 2': {
        'Breakfast': { meal: 'Greek yogurt with honey and fruits', hint: 'yogurt fruit' },
        'Morning Snack': { meal: 'Banana', hint: 'banana' },
        'Lunch': { meal: 'Quinoa bowl with black beans and corn', hint: 'quinoa bowl' },
        'Afternoon Snack': { meal: 'Carrot sticks with hummus', hint: 'carrots hummus' },
        'Dinner': { meal: 'Lean beef stir-fry with brown rice', hint: 'beef stir-fry' },
        'Evening Snack': { meal: 'Rice cakes', hint: 'rice cakes' },
        'Before Bed': { meal: 'Warm milk', hint: 'warm milk' },
    },
    'Day 3': {
        'Breakfast': { meal: 'Scrambled eggs with spinach and whole-wheat toast', hint: 'scrambled eggs' },
        'Morning Snack': { meal: 'Orange', hint: 'orange' },
        'Lunch': { meal: 'Lentil soup with a side of mixed greens', hint: 'lentil soup' },
        'Afternoon Snack': { meal: 'Cottage cheese with pineapple', hint: 'cottage cheese' },
        'Dinner': { meal: 'Baked cod with asparagus and lemon', hint: 'baked cod' },
        'Evening Snack': { meal: 'Dark chocolate square', hint: 'dark chocolate' },
        'Before Bed': { meal: 'Herbal tea', hint: 'herbal tea' },
    },
    'Day 4': {
        'Breakfast': { meal: 'Smoothie with spinach, banana, and protein powder', hint: 'green smoothie' },
        'Morning Snack': { meal: 'Handful of almonds', hint: 'almonds' },
        'Lunch': { meal: 'Turkey and avocado wrap on whole-wheat tortilla', hint: 'turkey wrap' },
        'Afternoon Snack': { meal: 'Hard-boiled egg', hint: 'hard-boiled egg' },
        'Dinner': { meal: 'Chicken cacciatore with whole-wheat pasta', hint: 'chicken pasta' },
        'Evening Snack': { meal: 'Popcorn', hint: 'popcorn' },
        'Before Bed': { meal: 'Peppermint tea', hint: 'peppermint tea' },
    },
    'Day 5': {
        'Breakfast': { meal: 'Oatmeal with berries and nuts', hint: 'oatmeal berries' },
        'Morning Snack': { meal: 'Pear', hint: 'pear' },
        'Lunch': { meal: 'Grilled chicken salad with vinaigrette', hint: 'chicken salad' },
        'Afternoon Snack': { meal: 'Edamame', hint: 'edamame' },
        'Dinner': { meal: 'Salmon with roasted vegetables', hint: 'salmon vegetables' },
        'Evening Snack': { meal: 'Berries', hint: 'berries' },
        'Before Bed': { meal: 'Ginger tea', hint: 'ginger tea' },
    },
    'Day 6': {
        'Breakfast': { meal: 'Greek yogurt with honey and fruits', hint: 'yogurt fruit' },
        'Morning Snack': { meal: 'Grapes', hint: 'grapes' },
        'Lunch': { meal: 'Quinoa bowl with black beans and corn', hint: 'quinoa bowl' },
        'Afternoon Snack': { meal: 'Beef jerky', hint: 'beef jerky' },
        'Dinner': { meal: 'Lean beef stir-fry with brown rice', hint: 'beef stir-fry' },
        'Evening Snack': { meal: 'Yogurt', hint: 'yogurt' },
        'Before Bed': { meal: 'Warm water with lemon', hint: 'lemon water' },
    },
    'Day 7': {
        'Breakfast': { meal: 'Scrambled eggs with spinach and whole-wheat toast', hint: 'scrambled eggs' },
        'Morning Snack': { meal: 'Peach', hint: 'peach' },
        'Lunch': { meal: 'Lentil soup with a side of mixed greens', hint: 'lentil soup' },
        'Afternoon Snack': { meal: 'Cucumber slices', hint: 'cucumber slices' },
        'Dinner': { meal: 'Baked cod with asparagus and lemon', hint: 'baked cod' },
        'Evening Snack': { meal: 'Celery sticks with cream cheese', hint: 'celery sticks' },
        'Before Bed': { meal: 'Decaf green tea', hint: 'green tea' },
    },
};

type Meal = {
    meal: string;
    hint: string;
    image?: string;
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

const PexelsImage: React.FC<{ hint: string, alt: string }> = ({ hint, alt }) => {
    const [imageUrl, setImageUrl] = useState<string | null>(null);

    useEffect(() => {
        let isCancelled = false;
        const fetchImage = async () => {
            try {
                const response = await getPexelsImage({ query: hint });
                if (!isCancelled) {
                    setImageUrl(response.imageUrl);
                }
            } catch (error) {
                console.error("Failed to fetch image from Pexels", error);
                if (!isCancelled) {
                    // Fallback to Unsplash if Pexels fails
                    setImageUrl(`https://source.unsplash.com/300x200/?${hint}`);
                }
            }
        };

        fetchImage();
        
        return () => {
            isCancelled = true;
        };
    }, [hint]);

    if (!imageUrl) {
        return <div className="rounded-t-lg bg-muted aspect-[3/2] w-full flex items-center justify-center"><Loader2 className="animate-spin" /></div>;
    }

    return (
        <Image
            src={imageUrl}
            alt={alt}
            width={300}
            height={200}
            className="rounded-t-lg object-cover w-full aspect-[3/2]"
            data-ai-hint={hint}
            unoptimized // Necessary for external providers like Pexels/Unsplash
        />
    );
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
                                        <PexelsImage hint={mealDetails.hint} alt={mealDetails.meal} />
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
