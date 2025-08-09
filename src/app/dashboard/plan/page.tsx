
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Download, Lightbulb, RefreshCw, ShoppingCart, Flame } from 'lucide-react';
import Image from 'next/image';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { getMissedMealAdvice } from '@/ai/flows/get-missed-meal-advice';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { getPexelsImage } from '@/ai/flows/get-pexels-image';
import { generateDietPlan } from '@/ai/flows/generate-diet-plan';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { CardDescription } from '@/components/ui/card';
import { generateShoppingList } from '@/ai/flows/generate-shopping-list';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

type Meal = {
    meal: string;
    hint: string;
    calories: number;
    description: string;
    image?: string;
};

type DayMeals = {
    [key: string]: Meal;
};

type DayPlan = {
    day: number;
    meals: DayMeals;
};

type DietPlan = DayPlan[];

type MealStatus = {
    [day: string]: {
        [mealTime: string]: boolean;
    };
};

const PexelsImage: React.FC<{ hint: string, alt: string }> = ({ hint, alt }) => {
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let isCancelled = false;
        setIsLoading(true);
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
            } finally {
                if (!isCancelled) {
                    setIsLoading(false);
                }
            }
        };

        fetchImage();
        
        return () => {
            isCancelled = true;
        };
    }, [hint]);

    if (isLoading || !imageUrl) {
        return <Skeleton className="rounded-t-lg aspect-[3/2] w-full" />;
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
    const [dietPlan, setDietPlan] = useState<DietPlan | null>(null);
    const [isLoadingPlan, setIsLoadingPlan] = useState(true);
    const [mealStatus, setMealStatus] = useState<MealStatus>({});
    const [advice, setAdvice] = useState<{ day: string; mealTime: string; text: string } | null>(null);
    const [isLoadingAdvice, setIsLoadingAdvice] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);

    const fetchDietPlan = async () => {
        setIsLoadingPlan(true);
        setDietPlan(null);
        try {
            const onboardingDataString = localStorage.getItem('onboardingData');
            const userData = onboardingDataString ? JSON.parse(onboardingDataString) : {};
            const loggedInEmail = localStorage.getItem('loggedInEmail') || '';
            
            let planDuration = 7; // Default duration

            const approvedUsersString = localStorage.getItem('approvedUsers');
            const approvedUsers = approvedUsersString ? JSON.parse(approvedUsersString) : {};
            
            if (approvedUsers[loggedInEmail]?.approved && approvedUsers[loggedInEmail]?.days) {
                // Use admin-approved duration if available
                planDuration = parseInt(approvedUsers[loggedInEmail].days, 10);
            } else if (userData.planDuration) {
                // Otherwise, use duration from onboarding
                planDuration = parseInt(userData.planDuration, 10);
            }

            if (isNaN(planDuration) || planDuration <= 0) {
                planDuration = 7; // Fallback to 7 days if value is invalid
            }


            const response = await generateDietPlan({
                healthInformation: `Age: ${userData.age}, Gender: ${userData.gender}, Weight: ${userData.weight}kg, Height: ${userData.heightFt}'${userData.heightIn}", Activity: ${userData.activityLevel}`,
                dietaryPreferences: `Health goals: ${userData.healthGoals?.join(', ')}. Other notes: ${userData.otherGoal}`,
                goals: `${userData.goalAction} weight. Target: ${userData.goalWeightKg || 'N/A'}`,
                geographicLocation: 'Kashmir, India',
                planDuration: planDuration,
            });
            
            setDietPlan(response.dietPlan);

        } catch (error) {
            console.error(error);
            toast({
                title: 'Error Generating Plan',
                description: 'Could not generate your personalized diet plan. Please try regenerating.',
                variant: 'destructive',
            });
        } finally {
            setIsLoadingPlan(false);
        }
    };

    useEffect(() => {
        fetchDietPlan();
    }, []);

    const handleCheckboxChange = (day: string, mealTime: string) => {
        setMealStatus(prev => ({
            ...prev,
            [day]: {
                ...prev[day],
                [mealTime]: !prev[day]?.[mealTime],
            },
        }));
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

    const handleDownloadShoppingList = async () => {
        if (!dietPlan) {
            toast({ title: 'No diet plan available', variant: 'destructive' });
            return;
        }

        setIsDownloading(true);
        try {
            const { shoppingList } = await generateShoppingList({ dietPlan });
            
            const doc = new jsPDF();

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(20);
            doc.text('Your Shopping List', 14, 22);

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(11);
            doc.text(`This list is generated based on your ${dietPlan.length}-day diet plan.`, 14, 30);

            (doc as any).autoTable({
                startY: 40,
                head: [['Category', 'Item', 'Quantity']],
                body: shoppingList.flatMap(category => 
                    category.items.map((item, index) => [
                        index === 0 ? category.category : '',
                        item.name,
                        item.quantity
                    ])
                ),
                didDrawCell: (data: any) => {
                    if (data.section === 'body' && data.cell.raw !== '' && data.column.index === 0) {
                        (doc as any).autoTable.previous.finalY = data.cell.y + data.cell.height;
                    }
                },
                theme: 'striped',
                headStyles: { fillColor: [66, 133, 244] },
            });

            doc.save('Aziaf_Shopping_List.pdf');

        } catch (error) {
            console.error(error);
            toast({ title: 'Error generating shopping list', variant: 'destructive' });
        } finally {
            setIsDownloading(false);
        }
    };
    
    if (isLoadingPlan) {
        return (
            <div className="space-y-6">
                 <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <Skeleton className="h-9 w-72 mb-2" />
                        <Skeleton className="h-5 w-96" />
                    </div>
                    <div className="flex gap-2">
                        <Skeleton className="h-10 w-36" />
                        <Skeleton className="h-10 w-48" />
                    </div>
                </div>
                <div className="flex flex-wrap gap-1">
                    {Array.from({length: 7}).map((_, i) => <Skeleton key={i} className="h-10 w-20" />)}
                </div>
                <div className="grid gap-6 mt-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                     {Array.from({length: 4}).map((_, i) => (
                        <Card key={i} className="overflow-hidden flex flex-col">
                            <Skeleton className="aspect-[3/2] w-full rounded-b-none" />
                            <CardContent className="p-4 flex-grow">
                                <Skeleton className="h-6 w-32 mb-2" />
                                <Skeleton className="h-5 w-48" />
                            </CardContent>
                            <CardFooter className="p-4 pt-0 mt-auto">
                                <Skeleton className="h-10 w-full" />
                            </CardFooter>
                        </Card>
                     ))}
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight font-headline">Your Personalized Diet Plan</h2>
                    <p className="text-muted-foreground">Generated by Aziaf AI to help you reach your goals.</p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={fetchDietPlan} variant="outline" disabled={isLoadingPlan}>
                        <RefreshCw className={`mr-2 h-4 w-4 ${isLoadingPlan ? 'animate-spin' : ''}`} />
                        Regenerate
                    </Button>
                    <Button onClick={handleDownloadShoppingList} disabled={isDownloading || !dietPlan}>
                        {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShoppingCart className="mr-2 h-4 w-4" />}
                        Shopping List
                    </Button>
                </div>
            </div>
            
            {dietPlan && dietPlan.length > 0 ? (
                <Tabs defaultValue="Day 1" className="w-full">
                    <ScrollArea className="w-full whitespace-nowrap rounded-md">
                        <TabsList>
                            {dietPlan.map((dayPlan) => (
                                <TabsTrigger key={`trigger-${dayPlan.day}`} value={`Day ${dayPlan.day}`}>{`Day ${dayPlan.day}`}</TabsTrigger>
                            ))}
                        </TabsList>
                        <ScrollBar orientation="horizontal" />
                    </ScrollArea>
                    {dietPlan.map((dayPlan) => (
                        <TabsContent key={`content-${dayPlan.day}`} value={`Day ${dayPlan.day}`}>
                            <div className="grid gap-6 mt-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                {Object.entries(dayPlan.meals).map(([mealTime, mealDetails]) => (
                                    <Card key={mealTime} className="overflow-hidden flex flex-col">
                                        <CardHeader className="p-0 relative">
                                            <PexelsImage hint={mealDetails.hint} alt={mealDetails.meal} />
                                            <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded-full bg-black/50 px-2 py-1 text-xs font-semibold text-white">
                                                <Flame className="h-3 w-3" />
                                                {mealDetails.calories} kcal
                                            </div>
                                        </CardHeader>
                                        <CardContent className="p-4 flex-grow">
                                            <h3 className="text-lg font-semibold font-headline">{mealTime}</h3>
                                            <p className="text-muted-foreground font-semibold">{mealDetails.meal}</p>
                                            <p className="text-sm text-muted-foreground mt-2">{mealDetails.description}</p>
                                        </CardContent>
                                        <CardFooter className="p-4 pt-0 mt-auto">
                                            <div className="w-full space-y-4">
                                                <div className="flex items-center space-x-2">
                                                    <Checkbox
                                                        id={`Day ${dayPlan.day}-${mealTime}-checkbox`}
                                                        checked={mealStatus[`Day ${dayPlan.day}`]?.[mealTime] || false}
                                                        onCheckedChange={() => handleCheckboxChange(`Day ${dayPlan.day}`, mealTime)}
                                                    />
                                                    <Label htmlFor={`Day ${dayPlan.day}-${mealTime}-checkbox`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                                        Mark as Eaten
                                                    </Label>
                                                </div>
                                                {!mealStatus[`Day ${dayPlan.day}`]?.[mealTime] && (
                                                    <div className="space-y-2">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="w-full"
                                                            onClick={() => handleGetAdvice(`Day ${dayPlan.day}`, mealTime, mealDetails.meal)}
                                                            disabled={isLoadingAdvice && advice?.mealTime === mealTime}
                                                        >
                                                            {isLoadingAdvice && advice?.mealTime === mealTime ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lightbulb className="mr-2 h-4 w-4" />}
                                                            Missed this meal?
                                                        </Button>
                                                        {advice?.day === `Day ${dayPlan.day}` && advice?.mealTime === mealTime && (
                                                            <Alert className="mt-2">
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
            ) : (
                 <Card className="flex flex-col items-center justify-center p-8 text-center">
                    <CardHeader>
                        <CardTitle>No Plan Generated</CardTitle>
                        <CardDescription>
                            We couldn't generate a diet plan. This might be because the onboarding data is missing or your account is not yet approved.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button onClick={fetchDietPlan}>
                             <RefreshCw className="mr-2 h-4 w-4" />
                            Try Again
                        </Button>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
