
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Sparkles, CheckCircle, User, Edit3, Save, X, Copy, Image as ImageIcon, RefreshCcw, BookOpen } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { generateDietPlan, GenerateDietPlanInput, GenerateDietPlanOutput } from '@/ai/flows/generate-diet-plan';
import { Badge } from '@/components/ui/badge';
import { collection, query, where, onSnapshot, doc, getDoc, updateDoc, deleteDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import NextImage from 'next/image';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
    hint: string;
    calories: number;
    description: string;
    imageUrl?: string;
};

type DietPlanDay = {
    day: number;
    meals: { [key: string]: Meal };
};

const constructDefaultPrompt = (onboardingData: any) => {
    if (!onboardingData) return '';
    
    return `You are a master nutritionist. Your goal is to create a personalized, culturally relevant diet plan based on the user's information and the provided knowledge base context.

User Details:
- Health Information: Age: ${onboardingData.age}, Gender: ${onboardingData.gender}, Weight: ${onboardingData.weight}kg, Height: ${onboardingData.heightFt}'${onboardingData.heightIn}", Activity: ${onboardingData.activityLevel}, Location: ${onboardingData.geographicLocation}
- Dietary Preferences & Tastes: ${onboardingData.healthGoals?.join(', ')}. ${onboardingData.otherGoal}
- Primary Goal: Target weight: ${onboardingData.goalWeightKg}kg. Primary goal: ${onboardingData.goalAction}
- Fasting Preference: ${onboardingData.fastingPreference}

Knowledge Base Context:
{{{knowledgeContext}}}

Based on all the information above, generate a personalized diet plan for ${onboardingData.planDuration} days.
The output must be an array of day plan objects. Each object should represent a single day, containing the day number and a 'meals' object with exactly seven meal slots: Breakfast, Morning Snack, Lunch, Afternoon Snack, Dinner, Evening Snack, and Before Bed.
For each meal, provide:
1.  'meal': The name of the meal.
2.  'hint': A 2-3 word hint for an image search.
3.  'calories': The approximate calorie count.
4.  'description': A brief 1-2 sentence description of the meal's benefits.

If fasting is requested (e.g., Intermittent Fasting), adjust the meal content accordingly (e.g., 'Breakfast' can be 'Water/Green Tea' with 0 calories), but still include all seven meal slots.
`;
};


export default function AdminReviewsPage() {
    const { toast } = useToast();
    const [reviewQueue, setReviewQueue] = useState<ReviewTask[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [generatingFor, setGeneratingFor] = useState<string | null>(null);
    const [approvingFor, setApprovingFor] = useState<string | null>(null);
    const [editablePlans, setEditablePlans] = useState<{ [reviewId: string]: DietPlanDay[] }>({});
    const [editingCell, setEditingCell] = useState<{ reviewId: string; dayIndex: number; mealTime: string; field: keyof Meal | 'imageUrl' } | null>(null);
    const [tempValue, setTempValue] = useState<string | number>('');
    const [customPrompts, setCustomPrompts] = useState<{ [reviewId: string]: string }>({});
    const [knowledgeBaseIds, setKnowledgeBaseIds] = useState<{ [reviewId: string]: 'kashmir' | 'general' }>({});

    const fetchReviewQueue = useCallback(() => {
        setIsLoading(true);
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
                     setEditablePlans(prev => ({...prev, [task.id]: task.generatedPlan!.dietPlan}));
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
            toast({ title: "Error", description: "Could not fetch review queue.", variant: "destructive" });
            setIsLoading(false);
        });

        return unsubscribe;
    }, [toast]);

    useEffect(() => {
        const unsubscribe = fetchReviewQueue();
        return () => unsubscribe && unsubscribe();
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
                dietaryPreferences: onboardingData.healthGoals.join(', ') + '. ' + onboardingData.otherGoal,
                healthInformation: `Age: ${onboardingData.age}, Gender: ${onboardingData.gender}, Weight: ${onboardingData.weight}kg, Height: ${onboardingData.heightFt}'${onboardingData.heightIn}", Activity: ${onboardingData.activityLevel}, Location: ${onboardingData.geographicLocation}`,
                goals: `Target weight: ${onboardingData.goalWeightKg}kg. Primary goal: ${onboardingData.goalAction}`,
                geographicLocation: onboardingData.geographicLocation,
                planDuration: parseInt(onboardingData.planDuration, 10),
                fastingPreference: onboardingData.fastingPreference,
                customPrompt: prompt,
                knowledgeBaseId: knowledgeBaseId
            };
            const result = await generateDietPlan(input);
            
            const reviewDocRef = doc(db, 'reviews', task.id);
            await updateDoc(reviewDocRef, {
                generatedPlan: result,
                status: 'pending_approval'
            });

            // This direct state update will make the UI refresh instantly
            setEditablePlans(prev => ({...prev, [task.id]: result.dietPlan}));
            
            toast({ title: 'Plan Generated!', description: 'The plan is now ready for your review and edits.'});

        } catch (error: any) {
            toast({ title: 'Generation Failed', description: error.message || 'Could not generate diet plan.', variant: 'destructive' });
        } finally {
            setGeneratingFor(null);
        }
    };

    const handleCellEdit = (reviewId: string, dayIndex: number, mealTime: string, field: keyof Meal | 'imageUrl', currentValue: string | number) => {
        setEditingCell({ reviewId, dayIndex, mealTime, field });
        setTempValue(currentValue);
    };
    
    const handleCellSave = () => {
        if (!editingCell) return;
        const { reviewId, dayIndex, mealTime, field } = editingCell;

        setEditablePlans(prev => {
            const newPlans = { ...prev };
            const newDayPlan = [...newPlans[reviewId]];
            const valueToSave = field === 'calories' ? Number(tempValue) : tempValue;
            
            (newDayPlan[dayIndex].meals[mealTime] as any)[field] = valueToSave;

            newPlans[reviewId] = newDayPlan;
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
            await setDoc(dietPlanDocRef, { ...finalPlan, createdAt: new Date().toISOString() });

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

    const renderEditableCell = (reviewId: string, dayIndex: number, mealTime: string, field: keyof Meal | 'imageUrl', value: string | number | undefined) => {
        const isEditing = editingCell?.reviewId === reviewId && editingCell?.dayIndex === dayIndex && editingCell?.mealTime === mealTime && editingCell?.field === field;
        const isTextArea = field === 'description';
        const isNumber = field === 'calories';
        const isImage = field === 'imageUrl';

        if (isEditing) {
            return (
                <div className="flex flex-col gap-2 p-1">
                     {isTextArea ? (
                        <Textarea
                            value={tempValue as string}
                            onChange={(e) => setTempValue(e.target.value)}
                            className="min-h-[80px] text-sm"
                        />
                    ) : (
                        <Input
                            type={isNumber ? 'number' : 'text'}
                            value={tempValue}
                            onChange={(e) => setTempValue(e.target.value)}
                            className="text-sm h-8"
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
                        <span className="text-xs text-muted-foreground truncate">{value || 'N/A'}</span>
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
                <CardDescription>Review, modify, and approve Aziaf-generated diet plans for new users.</CardDescription>
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
                                    <div className="flex flex-col lg:flex-row gap-6">
                                        {/* User Onboarding Data */}
                                        <div className="lg:w-1/3 xl:w-1/4">
                                            <h4 className="font-semibold mb-2">User Onboarding Data</h4>
                                            <pre className="p-4 bg-background rounded-md text-xs whitespace-pre-wrap max-h-[600px] overflow-auto">
                                                {JSON.stringify(task.onboardingData, null, 2)}
                                            </pre>
                                        </div>
                                        
                                        {/* Diet Plan Table or Generate Button */}
                                        <div className="flex-1">
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
                                                     <ScrollArea className="w-full border rounded-lg">
                                                        <Table>
                                                            <TableHeader>
                                                                <TableRow>
                                                                    <TableHead className="w-16 sticky left-0 bg-muted z-10">Day</TableHead>
                                                                    <TableHead>Meal Time</TableHead>
                                                                    <TableHead>Meal</TableHead>
                                                                    <TableHead>Calories</TableHead>
                                                                    <TableHead>Description</TableHead>
                                                                    <TableHead>Image</TableHead>
                                                                    <TableHead className="w-24">Actions</TableHead>
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
                                                                                    <Button variant="outline" size="icon" onClick={() => handleDuplicateDay(task.id, dayIndex)} title={`Duplicate Day ${dayPlan.day}`}>
                                                                                        <Copy className="h-4 w-4" />
                                                                                    </Button>
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

