
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Sparkles, CheckCircle, User } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { generateDietPlan, GenerateDietPlanInput, GenerateDietPlanOutput } from '@/ai/flows/generate-diet-plan';
import { Badge } from '@/components/ui/badge';
import { collection, query, where, onSnapshot, doc, getDoc, updateDoc, deleteDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

type ReviewTask = {
    id: string; // review document ID
    userId: string;
    userName: string;
    userEmail: string;
    assignedTo: string;
    onboardingData?: any;
    generatedPlan?: GenerateDietPlanOutput;
};

export default function AdminReviewsPage() {
    const { toast } = useToast();
    const [reviewQueue, setReviewQueue] = useState<ReviewTask[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [generatingFor, setGeneratingFor] = useState<string | null>(null);
    const [approvingFor, setApprovingFor] = useState<string | null>(null);
    const [editablePlans, setEditablePlans] = useState<{ [reviewId: string]: string }>({});

    const fetchReviewQueue = useCallback(() => {
        setIsLoading(true);
        // In a real app, you'd filter by the currently logged-in admin's name/ID
        // For this prototype, we'll fetch all reviews.
        const q = query(collection(db, 'reviews'), where('status', 'in', ['pending_generation', 'pending_approval']));
        
        const unsubscribe = onSnapshot(q, async (snapshot) => {
            const queue: ReviewTask[] = [];
            for (const reviewDoc of snapshot.docs) {
                const reviewData = reviewDoc.data();
                
                // Fetch onboarding data for the user
                const onboardingDocRef = doc(db, 'users', reviewData.userId, 'onboarding', 'profile');
                const onboardingDoc = await getDoc(onboardingDocRef);

                const task = {
                    id: reviewDoc.id,
                    userId: reviewData.userId,
                    userName: reviewData.userName,
                    userEmail: reviewData.userEmail,
                    assignedTo: reviewData.assignedTo,
                    onboardingData: onboardingDoc.exists() ? onboardingDoc.data() : {},
                    generatedPlan: reviewData.generatedPlan || undefined,
                };
                queue.push(task);

                if (task.generatedPlan && !editablePlans[task.id]) {
                     setEditablePlans(prev => ({...prev, [task.id]: JSON.stringify(task.generatedPlan, null, 2)}));
                }
            }
            setReviewQueue(queue);
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

            setEditablePlans(prev => ({...prev, [task.id]: JSON.stringify(result, null, 2)}));

        } catch (error: any) {
            toast({ title: 'Generation Failed', description: error.message || 'Could not generate diet plan.', variant: 'destructive' });
        } finally {
            setGeneratingFor(null);
        }
    };
    
    const handlePlanChange = (reviewId: string, content: string) => {
        setEditablePlans(prev => ({...prev, [reviewId]: content}));
    };

    const handleApprovePlan = async (task: ReviewTask) => {
        setApprovingFor(task.id);
        try {
            const finalPlanString = editablePlans[task.id] || JSON.stringify(task.generatedPlan, null, 2);
            if (!finalPlanString) {
                 toast({ title: 'Error', description: 'No plan content to approve.', variant: 'destructive' });
                 setApprovingFor(null);
                 return;
            }
            
            // Validate JSON format before proceeding
            let finalPlan;
            try {
                finalPlan = JSON.parse(finalPlanString);
            } catch (jsonError) {
                 toast({ title: 'Invalid JSON', description: 'The edited plan is not a valid JSON. Please correct it.', variant: 'destructive' });
                 setApprovingFor(null);
                 return;
            }

            const dietPlanDocRef = doc(db, 'users', task.userId, 'dietPlan', 'current');
            await setDoc(dietPlanDocRef, { ...finalPlan, createdAt: new Date().toISOString() });

            const userDocRef = doc(db, 'users', task.userId);
            await updateDoc(userDocRef, { planStatus: 'approved' });

            await deleteDoc(doc(db, 'reviews', task.id));
            
            toast({ title: 'Plan Approved!', description: `Diet plan for ${task.userEmail} is now live.`});

        } catch (error: any) {
             toast({ title: 'Approval Failed', description: error.message || 'A database error occurred.', variant: 'destructive' });
        } finally {
             setApprovingFor(null);
        }
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
                    <Accordion type="single" collapsible className="w-full">
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
                                        <Badge variant={task.generatedPlan ? "secondary" : "default"}>{task.generatedPlan ? 'Pending Approval' : 'Needs Generation'}</Badge>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="p-4 bg-muted/50 rounded-b-lg">
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        <div>
                                            <h4 className="font-semibold mb-2">User Onboarding Data</h4>
                                            <pre className="p-4 bg-background rounded-md text-xs whitespace-pre-wrap max-h-96 overflow-auto">
                                                {JSON.stringify(task.onboardingData, null, 2)}
                                            </pre>
                                        </div>
                                        <div>
                                            <h4 className="font-semibold mb-2">Aziaf Diet Plan Suggestion</h4>
                                            {task.generatedPlan ? (
                                                 <Textarea
                                                    className="min-h-[300px] text-xs font-mono"
                                                    value={editablePlans[task.id] || ''}
                                                    onChange={(e) => handlePlanChange(task.id, e.target.value)}
                                                />
                                            ) : (
                                                <div className="h-full flex items-center justify-center bg-background rounded-md p-8">
                                                    <Button onClick={() => handleGeneratePlan(task)} disabled={generatingFor === task.id}>
                                                        {generatingFor === task.id ? (
                                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                        ) : (
                                                            <Sparkles className="mr-2 h-4 w-4" />
                                                        )}
                                                        Generate Plan
                                                    </Button>
                                                </div>
                                            )}
                                            {task.generatedPlan && (
                                                 <Button onClick={() => handleApprovePlan(task)} disabled={approvingFor === task.id} className="mt-4 w-full">
                                                    {approvingFor === task.id ? (
                                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <CheckCircle className="mr-2 h-4 w-4" />
                                                    )}
                                                    Approve & Finalize Plan
                                                </Button>
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
