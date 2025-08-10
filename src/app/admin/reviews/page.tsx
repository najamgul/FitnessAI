
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Sparkles, CheckCircle, User, Edit3, Save, X } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { generateDietPlan, GenerateDietPlanInput, GenerateDietPlanOutput } from '@/ai/flows/generate-diet-plan';
import { Badge } from '@/components/ui/badge';
import { collection, query, where, onSnapshot, doc, getDoc, updateDoc, deleteDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

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
};

type DietPlanDay = {
    day: number;
    meals: { [key: string]: Meal };
};

export default function AdminReviewsPage() {
    const { toast } = useToast();
    const [reviewQueue, setReviewQueue] = useState<ReviewTask[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [generatingFor, setGeneratingFor] = useState<string | null>(null);
    const [approvingFor, setApprovingFor] = useState<string | null>(null);
    const [editablePlans, setEditablePlans] = useState<{ [reviewId: string]: GenerateDietPlanOutput['dietPlan'] }>({});
    const [editingCell, setEditingCell] = useState<{ reviewId: string; dayIndex: number; mealTime: string; field: keyof Meal } | null>(null);
    const [tempValue, setTempValue] = useState<string | number>('');

    const fetchReviewQueue = useCallback(() => {
        setIsLoading(true);
        const q = query(collection(db, 'reviews'), where('status', 'in', ['pending_generation', 'pending_approval']));
        
        const unsubscribe = onSnapshot(q, async (snapshot) => {
            const queue: ReviewTask[] = [];
            const planPromises = snapshot.docs.map(async (reviewDoc) => {
                const reviewData = reviewDoc.data();
                
                const onboardingDocRef = doc(db, 'users', reviewData.userId, 'onboarding', 'profile');
                const onboardingDoc = await getDoc(onboardingDocRef);

                const task: ReviewTask = {
                    id: reviewDoc.id,
                    userId: reviewData.userId,
                    userName: reviewData.userName,
                    userEmail: reviewData.userEmail,
                    assignedTo: reviewData.assignedTo,
                    onboardingData: onboardingDoc.exists() ? onboardingDoc.data() : {},
                    generatedPlan: reviewData.generatedPlan || undefined,
                };
                
                if (task.generatedPlan && !editablePlans[task.id]) {
                    setEditablePlans(prev => ({...prev, [task.id]: task.generatedPlan!.dietPlan }));
                }
                return task;
            });

            const resolvedQueue = await Promise.all(planPromises);
            setReviewQueue(resolvedQueue);
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching review queue: ", error);
            toast({ title: "Error", description: "Could not fetch review queue.", variant: "destructive" });
            setIsLoading(false);
        });

        return unsubscribe;
    }, [toast, editablePlans]);

    useEffect(() => {
        const unsubscribe = fetchReviewQueue();
        return () => unsubscribe && unsubscribe();
    }, [fetchReviewQueue]);

    const handleGeneratePlan = async (task: ReviewTask) => {
        setGeneratingFor(task.id);
        try {
            const { onboardingData } = task;
            if (!onboardingData) throw new Error("Onboarding data not found.");

            const input: GenerateDietPlanInput = {
                dietaryPreferences: onboardingData.healthGoals.join(', ') + '. ' + onboardingData.otherGoal,
                healthInformation: `Age: ${onboardingData.age}, Gender: ${onboardingData.gender}, Weight: ${onboardingData.weight}kg, Height: ${onboardingData.heightFt}'${onboardingData.heightIn}", Activity: ${onboardingData.activityLevel}, Location: ${onboardingData.geographicLocation}`,
                goals: `Target weight: ${onboardingData.goalWeightKg}kg. Primary goal: ${onboardingData.goalAction}`,
                geographicLocation: onboardingData.geographicLocation,
                planDuration: parseInt(onboardingData.planDuration, 10),
                fastingPreference: onboardingData.fastingPreference
            };
            const result = await generateDietPlan(input);
            
            const reviewDocRef = doc(db, 'reviews', task.id);
            await updateDoc(reviewDocRef, {
                generatedPlan: result,
                status: 'pending_approval'
            });

            toast({ title: 'Plan Generated!', description: 'The plan is now ready for your review and edits.'});

        } catch (error: any) {
            toast({ title: 'Generation Failed', description: error.message || 'Could not generate diet plan.', variant: 'destructive' });
        } finally {
            setGeneratingFor(null);
        }
    };

    const handleCellEdit = (reviewId: string, dayIndex: number, mealTime: string, field: keyof Meal, currentValue: string | number) => {
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

    const renderEditableCell = (reviewId: string, dayIndex: number, mealTime: string, field: keyof Meal, value: string | number) => {
        const isEditing = editingCell?.reviewId === reviewId && editingCell?.dayIndex === dayIndex && editingCell?.mealTime === mealTime && editingCell?.field === field;
        const isTextArea = field === 'description';
        const isNumber = field === 'calories';
        
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

        return (
            <div
                className="group cursor-pointer hover:bg-muted/50 p-2 rounded min-h-[40px] flex items-start justify-between gap-2"
                onClick={() => handleCellEdit(reviewId, dayIndex, mealTime, field, value)}
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
                                            <h4 className="font-semibold mb-2">Diet Plan</h4>
                                            {!task.generatedPlan ? (
                                                <div className="h-full flex items-center justify-center bg-background rounded-md p-8">
                                                    <Button onClick={() => handleGeneratePlan(task)} disabled={generatingFor === task.id} size="lg">
                                                        {generatingFor === task.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                                                        Generate Plan
                                                    </Button>
                                                </div>
                                            ) : (
                                                <div className="space-y-4">
                                                     <ScrollArea className="w-full border rounded-lg">
                                                        <Table>
                                                            <TableHeader>
                                                                <TableRow>
                                                                    <TableHead className="w-16 sticky left-0 bg-muted z-10">Day</TableHead>
                                                                    <TableHead>Meal Time</TableHead>
                                                                    <TableHead>Meal</TableHead>
                                                                    <TableHead>Calories</TableHead>
                                                                    <TableHead>Description</TableHead>
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
