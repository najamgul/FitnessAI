
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

const aziafBrandImageBase64 = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/4QAiRXhpZgAATU0AKgAAAAgAAQESAAMAAAABAAEAAAAAAAD/2wBDAAIBAQIBAQICAgICAgICAwUDAwMDAwYEBAMFBwYHBwcGBwcICQsJCAgKCAcHCg0KCgsMDAwMBwkODw0MDgsMDAz/2wBDAQICAgMDAwYDAwYMCAcIDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAz/wAARCAD2APYDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1VZXWFlaY2RlZmdoaWpzdHV2d3h5eoKDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD9/KKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooA/9k=";

export default function DietPlanPage() {
    const { toast } = useToast();
    const [dietPlan, setDietPlan] = useState<DietPlan | null>(null);
    const [isLoadingPlan, setIsLoadingPlan] = useState(true);
    const [mealStatus, setMealStatus] = useState<MealStatus>({});
    const [advice, setAdvice] = useState<{ day: string; mealTime: string; text: string } | null>(null);
    const [isLoadingAdvice, setIsLoadingAdvice] = useState(false);
    const [isDownloadingShoppingList, setIsDownloadingShoppingList] = useState(false);
    const [isDownloadingPlan, setIsDownloadingPlan] = useState(false);


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
                planDuration = parseInt(approvedUsers[loggedInEmail].days, 10);
            } else if (userData.planDuration) {
                planDuration = parseInt(userData.planDuration, 10);
            }

            if (isNaN(planDuration) || planDuration <= 0) {
                planDuration = 7; // Fallback to 7 days if value is invalid
            }

            const dietaryPreferences = `Health goals: ${userData.healthGoals?.join(', ')}. Other notes: ${userData.otherGoal}.`;

            const fastingPreference = `${userData.fastingPreference}${userData.fastingDetails ? `: ${userData.fastingDetails}` : ''}`;

            const response = await generateDietPlan({
                healthInformation: `Age: ${userData.age}, Gender: ${userData.gender}, Weight: ${userData.weight}kg, Height: ${userData.heightFt}'${userData.heightIn}", Activity: ${userData.activityLevel}`,
                dietaryPreferences: dietaryPreferences,
                goals: `${userData.goalAction} weight. Target: ${userData.goalWeightKg || 'N/A'}`,
                geographicLocation: userData.geographicLocation || 'Kashmir, India',
                planDuration: planDuration,
                fastingPreference: fastingPreference,
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

        setIsDownloadingShoppingList(true);
        try {
            const { shoppingList } = await generateShoppingList({ dietPlan });
            
            const doc = new jsPDF();
            
            doc.addImage(aziafBrandImageBase64, 'JPEG', 15, 15, 50, 50);

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(20);
            doc.text('Your Shopping List', 75, 30);

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(11);
            doc.text(`This list is generated based on your ${dietPlan.length}-day diet plan.`, 75, 40);

            const tableBody = shoppingList.flatMap(category => 
                category.items.map((item, index) => {
                    const categoryCell = {
                        content: category.category,
                        rowSpan: category.items.length,
                    };
                    return [
                        index === 0 ? categoryCell : '',
                        item.name,
                        item.quantity,
                    ];
                })
            );

            (doc as any).autoTable({
                startY: 75,
                head: [['Category', 'Item', 'Quantity']],
                body: tableBody,
                theme: 'striped',
                headStyles: { fillColor: [66, 133, 244] },
            });

            doc.save('Aziaf_Shopping_List.pdf');

        } catch (error) {
            console.error(error);
            toast({ title: 'Error generating shopping list', variant: 'destructive' });
        } finally {
            setIsDownloadingShoppingList(false);
        }
    };

    const handleDownloadPlan = async () => {
        if (!dietPlan) {
            toast({ title: 'No diet plan available', variant: 'destructive' });
            return;
        }

        setIsDownloadingPlan(true);
        try {
            const doc = new jsPDF();
            
            doc.addImage(aziafBrandImageBase64, 'JPEG', 15, 15, 50, 50);

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(20);
            doc.text('Your Personalized Diet Plan', 75, 30);

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(11);
            doc.text(`This is your ${dietPlan.length}-day diet plan generated by Aziaf AI.`, 75, 40);
            
            let yPos = 75;

            dietPlan.forEach(dayPlan => {
                const dayHeader = `Day ${dayPlan.day}`;
                const meals = Object.entries(dayPlan.meals);
                const tableBody = meals.map(([mealTime, mealDetails]) => [
                    mealTime,
                    mealDetails.meal,
                    `${mealDetails.calories} kcal`,
                    mealDetails.description
                ]);
                
                const tableHeight = (tableBody.length + 1) * 10 + 20; // Rough estimation
                if (yPos + tableHeight > 280) { // Check if new page is needed
                    doc.addPage();
                    yPos = 20;
                }
                
                (doc as any).autoTable({
                    head: [[{content: dayHeader, colSpan: 4, styles: { halign: 'center', fillColor: [66, 133, 244]}}]],
                    body: tableBody,
                    startY: yPos,
                    columns: [
                        { header: 'Time', dataKey: 'time' },
                        { header: 'Meal', dataKey: 'meal' },
                        { header: 'Calories', dataKey: 'calories' },
                        { header: 'Description', dataKey: 'description' },
                    ],
                    headStyles: { fillColor: [66, 133, 244] }, // Primary color
                    theme: 'grid',
                    columnStyles: {
                        0: { fontStyle: 'bold', cellWidth: 35 },
                        2: { cellWidth: 25 },
                        3: { cellWidth: 'auto' }
                    },
                    didDrawPage: (data: any) => {
                         yPos = data.cursor.y;
                    }
                });
                yPos = (doc as any).autoTable.previous.finalY + 10;
            });

            doc.save('Aziaf_Diet_Plan.pdf');
        } catch (error) {
            console.error(error);
            toast({ title: 'Error generating PDF', variant: 'destructive' });
        } finally {
            setIsDownloadingPlan(false);
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
                <div className="flex flex-wrap gap-2">
                    <Button onClick={fetchDietPlan} variant="outline" disabled={isLoadingPlan}>
                        <RefreshCw className={`mr-2 h-4 w-4 ${isLoadingPlan ? 'animate-spin' : ''}`} />
                        Regenerate
                    </Button>
                    <Button onClick={handleDownloadShoppingList} disabled={isDownloadingShoppingList || !dietPlan}>
                        {isDownloadingShoppingList ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShoppingCart className="mr-2 h-4 w-4" />}
                        Shopping List
                    </Button>
                     <Button onClick={handleDownloadPlan} disabled={isDownloadingPlan || !dietPlan}>
                        {isDownloadingPlan ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                        Download Plan
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
                                            <Image
                                                src={`https://source.unsplash.com/300x200/?${mealDetails.hint}`}
                                                alt={mealDetails.meal}
                                                width={300}
                                                height={200}
                                                className="rounded-t-lg object-cover w-full aspect-[3/2]"
                                                data-ai-hint={mealDetails.hint}
                                                unoptimized
                                            />
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

    