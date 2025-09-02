
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Sparkles, CheckCircle, User, Edit3, Save, X, Copy, Image as ImageIcon, RefreshCcw, BookOpen, Trash2, ChevronDown } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { generateDietPlan, GenerateDietPlanInput, GenerateDietPlanOutput } from '@/ai/flows/generate-diet-plan';
import { Badge } from '@/components/ui/badge';
import { collection, query, where, onSnapshot, doc, getDoc, updateDoc, deleteDoc, setDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import NextImage from 'next/image';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

type ReviewTask = {
    id: string; // review document ID
    userId: string;
    userName: string;
    userEmail: string;
    assignedTo: string;
    onboardingData?: any;
    generatedPlan?: GenerateDietPlanOutput;
};

type Meal = {
    meal: string;
    time: string;
    quantity: string;
    hint: string;
    calories: number;
    description: string;
    imageUrl?: string;
};

type DietPlanDay = {
    day: number;
    meals: { [key: string]: Meal };
};

const parseTime = (timeStr: string): Date => {
    // Use a fixed date to avoid hydration errors, only the time matters for sorting.
    const referenceDate = new Date(0); 
    if (typeof timeStr !== 'string' || !timeStr.includes(' ')) {
        return referenceDate; // Return a default time if format is invalid
    }
    const [time, modifier] = timeStr.split(' ');
    let [hours, minutes] = time.split(':').map(Number);

    if (hours === 12) {
        hours = modifier?.toUpperCase() === 'AM' ? 0 : 12;
    } else if (modifier?.toUpperCase() === 'PM') {
        hours += 12;
    }

    referenceDate.setHours(hours || 0, minutes || 0, 0, 0);
    return referenceDate;
};


const constructDefaultPrompt = (onboardingData: any) => {
    if (!onboardingData) return '';
    
    // Construct a detailed prompt string from the onboarding data
    const healthGoalsString = onboardingData.healthGoals?.length > 0 ? onboardingData.healthGoals.join(', ') : 'No specific conditions listed.';
    const preferences = `Primary health conditions or goals: ${healthGoalsString}. Other notes: ${onboardingData.otherGoal || 'None'}`;
    const healthInfo = `Age: ${onboardingData.age}, Gender: ${onboardingData.gender}, Weight: ${onboardingData.weight}kg, Height: ${onboardingData.heightFt}'${onboardingData.heightIn}", Activity Level: ${onboardingData.activityLevel}, Location: ${onboardingData.geographicLocation}`;
    const goals = `Primary Action: ${onboardingData.goalAction}. Target weight: ${onboardingData.goalWeightKg ? onboardingData.goalWeightKg + 'kg' : 'N/A'}.`;
    
    return `You are a master nutritionist creating a personalized diet plan.
Please use the following user details and the provided knowledge base context.

### User Details
- **Health Information:** ${healthInfo}
- **Medical History:** ${onboardingData.medicalHistory || 'No specific medical history provided.'}
- **Dietary Preferences & Tastes:** ${preferences}
- **Primary Goal:** ${goals}
- **Geographic Location:** ${onboardingData.geographicLocation}
- **Fasting Preference:** ${onboardingData.fastingPreference || 'Not specified'}

### Knowledge Base Context
{{{knowledgeContext}}}

### Instructions
Generate a personalized diet plan for **3 days**.

The output must be an array of day plan objects. Each object must represent a single day and contain:
1.  **day**: The day number.
2.  **meals**: An object with exactly seven meal slots: "Breakfast", "Morning Snack", "Lunch", "Afternoon Snack", "Dinner", "Evening Snack", and "Before Bed".

For each of the seven meal slots, provide:
1.  **meal**: The name of the meal.
2.  **time**: The specific time for the meal in AM/PM format, e.g., '8:00 AM'.
3.  **quantity**: Detailed quantities for ALL ingredients in specific units (e.g., '150g grilled chicken breast, 100g steamed broccoli, 80g brown rice, 1 tbsp olive oil').
4.  **hint**: A 2-3 word hint for an image search (e.g., 'chicken salad', 'oatmeal berries').
5.  **calories**: The approximate calorie count for the meal.
6.  **description**: A brief 1-2 sentence description of the meal's benefits.

**Crucially**, if a fasting preference is specified (e.g., Intermittent Fasting), you must still provide all seven meal slots, but adjust their content. For example, for Intermittent Fasting, 'Breakfast' could be 'Water/Green Tea' with 0 calories and a note that the eating window starts later.
`;
};


export default function AdminReviewsPage() {
    const { toast } = useToast();
    const [reviewQueue, setReviewQueue] = useState<ReviewTask[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [generatingFor, setGeneratingFor] = useState<string | null>(null);
    const [approvingFor, setApprovingFor] = useState<string | null>(null);
    const [editablePlans, setEditablePlans] = useState<{ [reviewId: string]: DietPlanDay[] }>({});
    const [editingCell, setEditingCell] = useState<{ reviewId: string; dayIndex: number; mealTime: string; field: keyof Meal | 'imageUrl' | 'quantity' } | null>(null);
    const [tempValue, setTempValue] = useState<string | number>('');
    const [customPrompts, setCustomPrompts] = useState<{ [reviewId: string]: string }>({});
    const [knowledgeBaseIds, setKnowledgeBaseIds] = useState<{ [reviewId: string]: 'kashmir' | 'general' }>({});

    const fetchReviewQueue = useCallback(() => {
        setIsLoading(true);
        // Admin role check will happen in the useEffect hook that calls this.
        const q = query(collection(db, 'reviews'), where('status', 'in', ['pending_generation', 'pending_approval']));
        
        const unsubscribe = onSnapshot(q, async (snapshot) => {
            const queue: ReviewTask[] = [];

            for (const reviewDoc of snapshot.docs) {
                const reviewData = reviewDoc.data();
                
                const onboardingDocRef = doc(db, 'users', reviewData.userId, 'onboarding', 'profile');
                const onboardingDoc = await getDoc(onboardingDocRef);
                const onboardingData = onboardingDoc.exists() ? onboardingDoc.data() : {};

                const task: ReviewTask = {
                    id: reviewDoc.id,
                    userId: reviewData.userId,
                    userName: reviewData.userName,
                    userEmail: reviewData.userEmail,
                    assignedTo: reviewData.assignedTo,
                    onboardingData: onboardingData,
                    generatedPlan: reviewData.generatedPlan || undefined,
                };

                // Set initial knowledge base based on location
                setKnowledgeBaseIds(prev => {
                    if (prev[task.id]) return prev;
                    const isKashmir = onboardingData.geographicLocation?.toLowerCase().includes('kashmir');
                    return {...prev, [task.id]: isKashmir ? 'kashmir' : 'general' };
                });
                
                // Set editable plan if it exists
                if (task.generatedPlan) {
                    const sortedPlan = task.generatedPlan.dietPlan.map(day => {
                        const sortedMeals = Object.entries(day.meals)
                            .sort(([, a], [, b]) => parseTime(a.time).getTime() - parseTime(b.time).getTime())
                            .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});
                        return { ...day, meals: sortedMeals };
                    });
                    setEditablePlans(prev => ({...prev, [task.id]: sortedPlan}));
                }
                
                // Set default prompt
                setCustomPrompts(prev => {
                     if (prev[task.id]) return prev;
                     return {...prev, [task.id]: constructDefaultPrompt(onboardingData)};
                });

                queue.push(task);
            }
            
            setReviewQueue(queue);
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching review queue: ", error);
            // Don't toast on permission errors which are expected before auth is ready
            if (error.code !== 'permission-denied') {
                toast({ title: "Error", description: "Could not fetch review queue.", variant: "destructive" });
            }
            setIsLoading(false);
        });

        return unsubscribe;
    }, [toast]);

    useEffect(() => {
        let unsubscribe: (() => void) | undefined;
    
        const authUnsubscribe = onAuthStateChanged(auth, user => {
            if (user) {
                const userDocRef = doc(db, 'users', user.uid);
                getDoc(userDocRef).then(userDoc => {
                    if(userDoc.exists() && userDoc.data().role === 'admin') {
                        // Only fetch data if the user is an admin
                        unsubscribe = fetchReviewQueue();
                    } else {
                        // Not an admin or user doc doesn't exist
                        setIsLoading(false);
                        setReviewQueue([]); // Clear queue if not admin
                    }
                })
            } else {
                 // No user logged in
                 setIsLoading(false);
                 setReviewQueue([]);
            }
        });
    
        return () => {
            authUnsubscribe();
            unsubscribe && unsubscribe();
        };
    }, [fetchReviewQueue]);


    const handleDuplicateDay = (reviewId: string, dayIndex: number) => {
        setEditablePlans(prev => {
            const currentPlan = prev[reviewId];
            if (!currentPlan) return prev;

            const dayToDuplicate = JSON.parse(JSON.stringify(currentPlan[dayIndex]));
            
            const newPlan = [
                ...currentPlan.slice(0, dayIndex + 1),
                dayToDuplicate,
                ...currentPlan.slice(dayIndex + 1)
            ];

            const renumberedPlan = newPlan.map((day, index) => ({
                ...day,
                day: index + 1
            }));

            return { ...prev, [reviewId]: renumberedPlan };
        });
    };

    const handleDeleteDay = (reviewId: string, dayIndex: number) => {
        setEditablePlans(prev => {
            const currentPlan = prev[reviewId];
            if (!currentPlan || currentPlan.length <= 1) {
                setTimeout(() => {
                    toast({ title: "Cannot Delete", description: "You must have at least one day in the plan.", variant: "destructive"});
                }, 0);
                return prev;
            };

            const newPlan = currentPlan.filter((_, index) => index !== dayIndex);

            const renumberedPlan = newPlan.map((day, index) => ({
                ...day,
                day: index + 1
            }));

            return { ...prev, [reviewId]: renumberedPlan };
        });
    }

    const handleGeneratePlan = async (task: ReviewTask) => {
        setGeneratingFor(task.id);
        try {
            const { onboardingData } = task;
            if (!onboardingData) throw new Error("Onboarding data not found.");

            const prompt = customPrompts[task.id];
            const knowledgeBaseId = knowledgeBaseIds[task.id];

            if (!prompt || !knowledgeBaseId) {
                 throw new Error("Prompt or knowledge base not selected.");
            }

            const input: GenerateDietPlanInput = {
                dietaryPreferences: onboardingData.healthGoals?.join(', ') + '. ' + onboardingData.otherGoal,
                healthInformation: `Age: ${onboardingData.age}, Gender: ${onboardingData.gender}, Weight: ${onboardingData.weight}kg, Height: ${onboardingData.heightFt}'${onboardingData.heightIn}", Activity: ${onboardingData.activityLevel}, Location: ${onboardingData.geographicLocation}`,
                medicalHistory: onboardingData.medicalHistory,
                goals: `Target weight: ${onboardingData.goalWeightKg}kg. Primary goal: ${onboardingData.goalAction}`,
                geographicLocation: onboardingData.geographicLocation,
                planDuration: 3, // Hardcoded to 3 days
                fastingPreference: onboardingData.fastingPreference,
                customPrompt: prompt,
                knowledgeBaseId: knowledgeBaseId
            };

            const result = await generateDietPlan(input);
            
            if (result && result.dietPlan) {
                const reviewDocRef = doc(db, 'reviews', task.id);
                await updateDoc(reviewDocRef, {
                    generatedPlan: JSON.parse(JSON.stringify(result)), // Use clean data
                    status: 'pending_approval'
                });
                const sortedPlan = result.dietPlan.map(day => {
                    const sortedMeals = Object.entries(day.meals)
                        .sort(([, a], [, b]) => parseTime(a.time).getTime() - parseTime(b.time).getTime())
                        .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});
                    return { ...day, meals: sortedMeals };
                });

                setEditablePlans(prev => ({...prev, [task.id]: sortedPlan}));
                
                toast({ title: 'Plan Generated!', description: 'The plan is now ready for your review and edits.'});
            } else {
                // This case handles if the flow returns something unexpected but not an error
                throw new Error("Received an invalid response from the Azai flow.");
            }

        } catch (error) {
            console.error("Plan Generation Error:", error);
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred during plan generation.";
            toast({ 
                title: 'Generation Failed', 
                description: errorMessage, 
                variant: 'destructive' 
            });
        } finally {
            setGeneratingFor(null);
        }
    };

    const handleCellEdit = (reviewId: string, dayIndex: number, mealTime: string, field: keyof Meal | 'imageUrl' | 'quantity', currentValue: string | number | undefined) => {
        setEditingCell({ reviewId, dayIndex, mealTime, field });
        setTempValue(currentValue || '');
    };
    
    const handleCellSave = () => {
        if (!editingCell) return;
        const { reviewId, dayIndex, mealTime, field } = editingCell;
    
        setEditablePlans(prev => {
            const newPlans = { ...prev };
            const dayPlanToUpdate = newPlans[reviewId]?.[dayIndex];
            if (!dayPlanToUpdate) return prev;
    
            const mealToUpdate = dayPlanToUpdate.meals[mealTime as keyof typeof dayPlanToUpdate.meals];
            
            if (mealToUpdate) {
                const valueToSave = field === 'calories' ? Number(tempValue) : tempValue;
                (mealToUpdate as any)[field] = valueToSave;
            }
            
            return newPlans;
        });
    
        setEditingCell(null);
        setTempValue('');
    };


    const handleCellCancel = () => {
        setEditingCell(null);
        setTempValue('');
    };

    const handleApprovePlan = async (task: ReviewTask) => {
        setApprovingFor(task.id);
        try {
            const finalPlanData = editablePlans[task.id];
            if (!finalPlanData || finalPlanData.length === 0) {
                toast({ title: 'Error', description: 'No plan content to approve.', variant: 'destructive' });
                setApprovingFor(null);
                return;
            }

            const finalPlan: GenerateDietPlanOutput = { dietPlan: finalPlanData };

            const dietPlanDocRef = doc(db, 'users', task.userId, 'dietPlan', 'current');
            await setDoc(dietPlanDocRef, { ...JSON.parse(JSON.stringify(finalPlan)), createdAt: new Date().toISOString() });

            const userDocRef = doc(db, 'users', task.userId);
            await updateDoc(userDocRef, { planStatus: 'ready' });

            await deleteDoc(doc(db, 'reviews', task.id));
            
            toast({ title: 'Plan Approved!', description: `Diet plan for ${task.userEmail} is now live.`});

        } catch (error: any)
         {
            toast({ title: 'Approval Failed', description: error.message || 'A database error occurred.', variant: 'destructive' });
        } finally {
            setApprovingFor(null);
        }
    };

    const renderEditableCell = (reviewId: string, dayIndex: number, mealTime: string, field: keyof Meal | 'imageUrl' | 'quantity', value: string | number | undefined) => {
        const isEditing = editingCell?.reviewId === reviewId && editingCell?.dayIndex === dayIndex && editingCell?.mealTime === mealTime && editingCell?.field === field;
        const isTextArea = field === 'description' || field === 'meal' || field ==='quantity' || field === 'time';
        const isNumber = field === 'calories';
        const isImage = field === 'imageUrl';

        if (isEditing) {
            return (
                <div className="flex flex-col gap-2 p-1">
                     {isTextArea || isImage ? (
                        <Textarea
                            value={tempValue as string}
                            onChange={(e) => setTempValue(e.target.value)}
                            className="min-h-[80px] text-sm"
                            autoFocus
                        />
                    ) : (
                        <Input
                            type={isNumber ? 'number' : 'text'}
                            value={tempValue}
                            onChange={(e) => setTempValue(e.target.value)}
                            className="text-sm h-8"
                            autoFocus
                        />
                    )}
                    <div className="flex gap-2 justify-end">
                        <Button size="icon" onClick={handleCellSave} className="h-6 w-6">
                            <Save className="h-3 w-3" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={handleCellCancel} className="h-6 w-6">
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            );
        }

        if (isImage) {
            return (
                 <div
                    className="group cursor-pointer hover:bg-muted/50 p-2 rounded min-h-[40px] flex items-center justify-between gap-2"
                    onClick={() => handleCellEdit(reviewId, dayIndex, mealTime, field, value || '')}
                 >
                    <div className="flex-1 flex items-center gap-2">
                        {value ? (
                             <NextImage src={value as string} alt="Meal" width={40} height={40} className="rounded object-cover" unoptimized/>
                        ) : (
                            <div className="w-10 h-10 bg-muted rounded flex items-center justify-center"><ImageIcon className="w-4 h-4 text-muted-foreground"/></div>
                        )}
                        <span className="text-xs text-muted-foreground truncate w-24">{typeof value === 'string' && value.startsWith('http') ? new URL(value).pathname.split('/').pop() : 'N/A'}</span>
                    </div>
                    <Edit3 className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                </div>
            )
        }

        return (
            <div
                className="group cursor-pointer hover:bg-muted/50 p-2 rounded min-h-[40px] flex items-start justify-between gap-2"
                onClick={() => handleCellEdit(reviewId, dayIndex, mealTime, field, value || '')}
            >
                <span className="text-sm flex-1 whitespace-pre-wrap">{value || <span className="text-muted-foreground">N/A</span>}</span>
                <Edit3 className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
            </div>
        );
    };
    
    if (isLoading) {
        return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-3xl font-bold font-headline">Diet Plan Review Queue</CardTitle>
                <CardDescription>Review, modify, and approve Azai-generated diet plans for new users.</CardDescription>
            </CardHeader>
            <CardContent>
                {reviewQueue.length > 0 ? (
                    <Accordion type="single" collapsible className="w-full" defaultValue={reviewQueue[0]?.id}>
                        {reviewQueue.map(task => (
                            <AccordionItem key={task.id} value={task.id}>
                                <AccordionTrigger>
                                    <div className="flex justify-between items-center w-full pr-4">
                                        <div className="flex items-center gap-3">
                                            <User />
                                            <div>
                                                <div className="font-bold">{task.userName}</div>
                                                <div className="text-sm text-muted-foreground">{task.userEmail}</div>
                                            </div>
                                        </div>
                                        <Badge variant={task.generatedPlan ? "secondary" : "default"}>
                                            {task.generatedPlan ? 'Pending Approval' : 'Needs Generation'}
                                        </Badge>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="p-4 bg-muted/50 rounded-b-lg">
                                    <div className="space-y-6">
                                        
                                        <Collapsible>
                                            <CollapsibleTrigger asChild>
                                                <Button variant="outline" className="w-full justify-between">
                                                   <span>View User Onboarding Data</span>
                                                   <ChevronDown className="h-4 w-4" />
                                                </Button>
                                            </CollapsibleTrigger>
                                            <CollapsibleContent className="mt-2">
                                                 <ScrollArea className="max-h-[300px] overflow-auto">
                                                    <pre className="p-4 bg-background rounded-md text-xs whitespace-pre-wrap">
                                                        {JSON.stringify(task.onboardingData, null, 2)}
                                                    </pre>
                                                </ScrollArea>
                                            </CollapsibleContent>
                                        </Collapsible>
                                        
                                        <div>
                                            <h4 className="font-semibold mb-2">Generation Controls</h4>
                                            <div className='space-y-4 p-4 border rounded-lg bg-background'>
                                                 <div>
                                                     <Label htmlFor={`prompt-${task.id}`} className='font-semibold'>Generation Prompt</Label>
                                                     <Textarea 
                                                        id={`prompt-${task.id}`}
                                                        placeholder="The prompt to generate the plan will appear here..."
                                                        value={customPrompts[task.id] || ''}
                                                        onChange={(e) => setCustomPrompts(prev => ({...prev, [task.id]: e.target.value}))}
                                                        className="min-h-[200px] mt-1"
                                                     />
                                                 </div>
                                                 <div className="flex items-end gap-4">
                                                    <div className="flex-1">
                                                        <Label htmlFor={`kb-${task.id}`} className="font-semibold flex items-center gap-1.5"><BookOpen size={14}/> Knowledge Base</Label>
                                                        <Select 
                                                            value={knowledgeBaseIds[task.id] || 'general'} 
                                                            onValueChange={(v) => setKnowledgeBaseIds(prev => ({...prev, [task.id]: v as 'kashmir' | 'general'}))}
                                                        >
                                                            <SelectTrigger id={`kb-${task.id}`} className="mt-1">
                                                                <SelectValue placeholder="Select KB" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="kashmir">Kashmir</SelectItem>
                                                                <SelectItem value="general">General</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                     <Button onClick={() => handleGeneratePlan(task)} disabled={generatingFor === task.id || !customPrompts[task.id]}>
                                                         {generatingFor === task.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                                                         {editablePlans[task.id] ? 'Regenerate' : 'Generate Plan'}
                                                     </Button>
                                                 </div>
                                            </div>

                                            {editablePlans[task.id] && (
                                                <div className="space-y-4 mt-6">
                                                     <h4 className="font-semibold">Review & Edit Plan</h4>
                                                     <ScrollArea className="w-full border rounded-lg bg-background">
                                                        <Table>
                                                            <TableHeader>
                                                                <TableRow>
                                                                    <TableHead className="w-16 sticky left-0 bg-muted z-10">Day</TableHead>
                                                                    <TableHead>Meal Time</TableHead>
                                                                    <TableHead>Meal</TableHead>
                                                                    <TableHead>Time</TableHead>
                                                                    <TableHead>Quantity</TableHead>
                                                                    <TableHead>Calories</TableHead>
                                                                    <TableHead>Description</TableHead>
                                                                    <TableHead>Image</TableHead>
                                                                    <TableHead className="w-28 text-center">Actions</TableHead>
                                                                </TableRow>
                                                            </TableHeader>
                                                            <TableBody>
                                                                {(editablePlans[task.id] || []).map((dayPlan, dayIndex) => (
                                                                    Object.entries(dayPlan.meals).map(([mealTime, mealDetails], mealIndex) => (
                                                                        <TableRow key={`${dayPlan.day}-${mealTime}`}>
                                                                            {mealIndex === 0 && (
                                                                                 <TableCell rowSpan={Object.keys(dayPlan.meals).length} className="font-medium align-top sticky left-0 bg-background z-10">
                                                                                    Day {dayPlan.day}
                                                                                </TableCell>
                                                                            )}
                                                                            <TableCell className="font-semibold min-w-[150px]">{mealTime}</TableCell>
                                                                            <TableCell className="min-w-[200px]">
                                                                                {renderEditableCell(task.id, dayIndex, mealTime, 'meal', mealDetails.meal)}
                                                                            </TableCell>
                                                                            <TableCell className="min-w-[120px]">
                                                                                {renderEditableCell(task.id, dayIndex, mealTime, 'time', mealDetails.time)}
                                                                            </TableCell>
                                                                            <TableCell className="min-w-[200px]">
                                                                                {renderEditableCell(task.id, dayIndex, mealTime, 'quantity', mealDetails.quantity)}
                                                                            </TableCell>
                                                                             <TableCell className="min-w-[120px]">
                                                                                {renderEditableCell(task.id, dayIndex, mealTime, 'calories', mealDetails.calories)}
                                                                            </TableCell>
                                                                            <TableCell className="min-w-[300px]">
                                                                                {renderEditableCell(task.id, dayIndex, mealTime, 'description', mealDetails.description)}
                                                                            </TableCell>
                                                                             <TableCell className="min-w-[250px]">
                                                                                {renderEditableCell(task.id, dayIndex, mealTime, 'imageUrl', mealDetails.imageUrl)}
                                                                            </TableCell>
                                                                            {mealIndex === 0 && (
                                                                                <TableCell rowSpan={Object.keys(dayPlan.meals).length} className="align-middle">
                                                                                     <div className="flex flex-col gap-2 items-center">
                                                                                        <Button variant="outline" size="icon" onClick={() => handleDuplicateDay(task.id, dayIndex)} title={`Duplicate Day ${dayPlan.day}`}>
                                                                                            <Copy className="h-4 w-4" />
                                                                                        </Button>
                                                                                        <Button variant="destructive" size="icon" onClick={() => handleDeleteDay(task.id, dayIndex)} title={`Delete Day ${dayPlan.day}`}>
                                                                                            <Trash2 className="h-4 w-4" />
                                                                                        </Button>
                                                                                    </div>
                                                                                </TableCell>
                                                                            )}
                                                                        </TableRow>
                                                                    ))
                                                                ))}
                                                            </TableBody>
                                                        </Table>
                                                        <ScrollBar orientation="horizontal" />
                                                    </ScrollArea>
                                                    
                                                    <Button onClick={() => handleApprovePlan(task)} disabled={approvingFor === task.id} className="w-full">
                                                        {approvingFor === task.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                                                        Approve & Finalize Plan
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                ) : (
                    <div className="text-center py-12">
                        <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
                        <h3 className="mt-2 text-lg font-medium">All Clear!</h3>
                        <p className="mt-1 text-sm text-muted-foreground">The review queue is empty. Good job!</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

    