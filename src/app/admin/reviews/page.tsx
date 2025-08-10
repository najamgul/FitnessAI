'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Sparkles, CheckCircle, AlertCircle, User, Clock } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { generateDietPlan, GenerateDietPlanInput, GenerateDietPlanOutput } from '@/ai/flows/generate-diet-plan';
import { Badge } from '@/components/ui/badge';

type ReviewUser = {
    email: string;
    name: string;
    onboardingData: any;
    dietPlan: GenerateDietPlanOutput | null;
    planStatus: 'pending_review' | 'approved';
    assignedTo: string;
};

export default function AdminReviewsPage() {
    const { toast } = useToast();
    const [usersForReview, setUsersForReview] = useState<ReviewUser[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [generatingFor, setGeneratingFor] = useState<string | null>(null);
    const [approvingFor, setApprovingFor] = useState<string | null>(null);
    const [editablePlans, setEditablePlans] = useState<{ [email: string]: string }>({});

    const fetchUsersForReview = useCallback(() => {
        setIsLoading(true);
        const approvedUsersString = localStorage.getItem('approvedUsers');
        const approvedUsers = approvedUsersString ? JSON.parse(approvedUsersString) : {};
        
        const reviewList: ReviewUser[] = [];
        for (const email in approvedUsers) {
            if (approvedUsers[email].planStatus === 'pending_review') {
                const onboardingDataString = localStorage.getItem(`onboardingData_${email}`); // Each user's data stored separately
                const onboardingData = onboardingDataString ? JSON.parse(onboardingDataString) : {};
                reviewList.push({
                    email,
                    name: onboardingData.name || email.split('@')[0],
                    onboardingData,
                    dietPlan: approvedUsers[email].dietPlan || null,
                    planStatus: 'pending_review',
                    assignedTo: approvedUsers[email].assignedTo
                });
            }
        }
        setUsersForReview(reviewList);
        setIsLoading(false);
    }, []);

    useEffect(() => {
        fetchUsersForReview();
    }, [fetchUsersForReview]);

    const handleGeneratePlan = async (user: ReviewUser) => {
        setGeneratingFor(user.email);
        try {
            const { onboardingData } = user;
            const input: GenerateDietPlanInput = {
                dietaryPreferences: onboardingData.otherGoal || 'None',
                healthInformation: `Age: ${onboardingData.age}, Gender: ${onboardingData.gender}, Weight: ${onboardingData.weight}kg, Height: ${onboardingData.heightFt}'${onboardingData.heightIn}", Activity: ${onboardingData.activityLevel}`,
                goals: onboardingData.goalAction,
                geographicLocation: onboardingData.geographicLocation,
                planDuration: parseInt(onboardingData.planDuration, 10),
                fastingPreference: onboardingData.fastingPreference
            };
            const result = await generateDietPlan(input);
            
            setUsersForReview(prev => prev.map(u => u.email === user.email ? { ...u, dietPlan: result } : u));
            setEditablePlans(prev => ({...prev, [user.email]: JSON.stringify(result, null, 2)}));

        } catch (error) {
            toast({ title: 'Generation Failed', description: 'Could not generate diet plan.', variant: 'destructive' });
        } finally {
            setGeneratingFor(null);
        }
    };
    
    const handlePlanChange = (email: string, content: string) => {
        setEditablePlans(prev => ({...prev, [email]: content}));
    };

    const handleApprovePlan = (userEmail: string) => {
        setApprovingFor(userEmail);
        try {
            const finalPlanString = editablePlans[userEmail];
            if (!finalPlanString) {
                 toast({ title: 'Error', description: 'No plan content to approve.', variant: 'destructive' });
                 return;
            }
            const finalPlan = JSON.parse(finalPlanString);

            const approvedUsersString = localStorage.getItem('approvedUsers');
            const approvedUsers = approvedUsersString ? JSON.parse(approvedUsersString) : {};

            if(approvedUsers[userEmail]) {
                approvedUsers[userEmail].dietPlan = finalPlan;
                approvedUsers[userEmail].planStatus = 'approved';
                localStorage.setItem('approvedUsers', JSON.stringify(approvedUsers));

                toast({ title: 'Plan Approved!', description: `Diet plan for ${userEmail} is now live.`});
                
                // Refetch to remove from review queue
                fetchUsersForReview();
            }

        } catch (error) {
             toast({ title: 'Approval Failed', description: 'The plan has invalid JSON format.', variant: 'destructive' });
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
                {usersForReview.length > 0 ? (
                    <Accordion type="single" collapsible className="w-full">
                        {usersForReview.map(user => (
                            <AccordionItem key={user.email} value={user.email}>
                                <AccordionTrigger>
                                    <div className="flex justify-between items-center w-full pr-4">
                                        <div className="flex items-center gap-3">
                                            <User />
                                            <div>
                                                <div className="font-bold">{user.name}</div>
                                                <div className="text-sm text-muted-foreground">{user.email}</div>
                                            </div>
                                        </div>
                                        <Badge>Assigned to: {user.assignedTo}</Badge>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="p-4 bg-muted/50 rounded-b-lg">
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        <div>
                                            <h4 className="font-semibold mb-2">User Onboarding Data</h4>
                                            <pre className="p-4 bg-background rounded-md text-xs whitespace-pre-wrap">
                                                {JSON.stringify(user.onboardingData, null, 2)}
                                            </pre>
                                        </div>
                                        <div>
                                            <h4 className="font-semibold mb-2">Aziaf Diet Plan Suggestion</h4>
                                            {user.dietPlan ? (
                                                 <Textarea
                                                    className="min-h-[300px] text-xs font-mono"
                                                    value={editablePlans[user.email] || ''}
                                                    onChange={(e) => handlePlanChange(user.email, e.target.value)}
                                                />
                                            ) : (
                                                <Button onClick={() => handleGeneratePlan(user)} disabled={generatingFor === user.email}>
                                                    {generatingFor === user.email ? (
                                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <Sparkles className="mr-2 h-4 w-4" />
                                                    )}
                                                    Generate Plan
                                                </Button>
                                            )}
                                            {user.dietPlan && (
                                                 <Button onClick={() => handleApprovePlan(user.email)} disabled={approvingFor === user.email} className="mt-4 w-full">
                                                    {approvingFor === user.email ? (
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
