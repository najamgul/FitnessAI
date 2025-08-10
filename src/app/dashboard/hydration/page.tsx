
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Sparkles, Bot, Droplets, CheckCircle2, Info, RefreshCw } from 'lucide-react';
import { generateHydrationSchedule } from '@/ai/flows/generate-hydration-schedule';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';

type ScheduleEntry = {
    time: string;
    amount: number;
    completed?: boolean;
};

const calculateRecommendedIntake = (weight: number, activityLevel: string): number => {
    let baseIntake = weight * 35; // 35 ml per kg

    switch (activityLevel) {
        case 'light':
            baseIntake += 250;
            break;
        case 'moderate':
            baseIntake += 500;
            break;
        case 'very':
            baseIntake += 750;
            break;
    }
    
    // Return in Liters, rounded to one decimal place
    return Math.round(baseIntake / 100) / 10;
};


export default function HydrationPage() {
    const { toast } = useToast();
    const [goal, setGoal] = useState('2.5'); // Default goal
    const [wakeUp, setWakeUp] = useState('7:00 AM'); // Default wake-up
    const [bedTime, setBedTime] = useState('11:00 PM'); // Default bedtime
    const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
    const [explanation, setExplanation] = useState('');
    const [isLoadingSchedule, setIsLoadingSchedule] = useState(true);
    const [isRecalculating, setIsRecalculating] = useState(false);
    

    useEffect(() => {
        try {
            const onboardingDataString = localStorage.getItem('onboardingData');
            if (onboardingDataString) {
                const data = JSON.parse(onboardingDataString);
                if(data.weight && data.activityLevel) {
                    const recommendedGoal = calculateRecommendedIntake(parseFloat(data.weight), data.activityLevel);
                    setGoal(recommendedGoal.toString());
                }
            }
        } catch(e) {
            console.error("Could not set hydration goal from onboarding data.", e);
        }
    }, []);
    
    const fetchSchedule = async (intakeGoal: number, startTime: string, isRecalc = false) => {
        if (intakeGoal <= 0) {
             if (isRecalc) {
                toast({ title: "Goal Achieved!", description: "You've already met your hydration goal for today. Great job!" });
             }
             return;
        }
        
        if(!isRecalc) {
            setIsLoadingSchedule(true);
            setSchedule([]);
            setExplanation('');
        }

        try {
            const response = await generateHydrationSchedule({
                totalIntakeLiters: intakeGoal,
                wakeUpTime: startTime,
                bedTime: bedTime,
            });

            const newSchedule = response.schedule.map(item => ({ ...item, completed: false }));
            setSchedule(newSchedule);
            setExplanation(response.explanation);

            if (isRecalc) {
                 toast({ title: 'Schedule Updated!', description: 'Your plan for the rest of the day is ready.' });
            }

        } catch (error) {
            toast({ title: 'Error', description: 'Could not generate hydration schedule.', variant: 'destructive' });
        } finally {
            setIsLoadingSchedule(false);
            setIsRecalculating(false);
        }
    };


    useEffect(() => {
        if (goal) {
            fetchSchedule(parseFloat(goal), wakeUp);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [goal]);
    
    const handleCheckboxChange = (index: number) => {
        setSchedule(prevSchedule => {
            const newSchedule = [...prevSchedule];
            newSchedule[index].completed = !newSchedule[index].completed;
            return newSchedule;
        });
    };
    
    const handleRecalculate = async () => {
        setIsRecalculating(true);
        
        const totalGoalMl = parseFloat(goal) * 1000;
        const completedAmountMl = schedule.reduce((acc, entry) => acc + (entry.completed ? entry.amount : 0), 0);
        const remainingIntakeMl = totalGoalMl - completedAmountMl;
        
        const now = new Date();
        const currentTime = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

        await fetchSchedule(remainingIntakeMl / 1000, currentTime, true);
    }
    
    const totalCompleted = schedule.reduce((sum, entry) => sum + (entry.completed ? entry.amount : 0), 0);
    const totalGoalMl = parseFloat(goal) * 1000;
    const progressPercentage = totalGoalMl > 0 ? (totalCompleted / totalGoalMl) * 100 : 0;


    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Your Daily Goal</CardTitle>
                            <CardDescription>This is automatically calculated based on your profile.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="goal">Recommended Daily Intake</Label>
                                 <div className="flex items-center gap-2">
                                    <Input id="goal" type="number" value={goal} readOnly className="font-bold text-lg bg-muted" />
                                    <span className="font-semibold text-lg">Liters</span>
                                </div>
                               <Alert variant="default" className="mt-2 text-xs">
                                    <Info className="h-4 w-4" />
                                    <AlertDescription>
                                        This goal is based on your weight and activity level from your onboarding profile.
                                    </AlertDescription>
                                </Alert>
                            </div>
                        </CardContent>
                    </Card>
                    {!isLoadingSchedule && schedule.length > 0 && (
                         <Card>
                            <CardHeader>
                                <CardTitle className="font-headline">Daily Progress</CardTitle>
                                <CardDescription>Fallen behind? Recalculate your plan for the rest of the day.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4 text-center">
                                <div className="text-4xl font-bold text-primary">{totalCompleted.toLocaleString()} ml</div>
                                <div className="text-sm text-muted-foreground">of {totalGoalMl.toLocaleString()} ml goal completed</div>
                                <div className="w-full bg-muted rounded-full h-2.5">
                                    <div className="bg-primary h-2.5 rounded-full" style={{ width: `${progressPercentage}%` }}></div>
                                </div>
                                 <Button variant="outline" onClick={handleRecalculate} disabled={isRecalculating}>
                                    {isRecalculating ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <RefreshCw className="mr-2 h-4 w-4"/>}
                                    Recalculate Schedule
                                 </Button>
                            </CardContent>
                        </Card>
                    )}
                </div>

                <div className="lg:col-span-2">
                    <Card className="min-h-full">
                        <CardHeader>
                            <CardTitle className="font-headline">Your Hydration Plan</CardTitle>
                            {explanation && <CardDescription>{explanation}</CardDescription>}
                        </CardHeader>
                        <CardContent>
                            {isLoadingSchedule && !isRecalculating && (
                                <div className="flex flex-col items-center justify-center text-center p-12">
                                    <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                                    <p className="font-semibold">Generating your plan...</p>
                                    <p className="text-sm text-muted-foreground">The AI is creating a schedule just for you.</p>
                                </div>
                            )}
                            {!isLoadingSchedule && schedule.length === 0 && (
                                <div className="flex flex-col items-center justify-center text-center p-12 border-2 border-dashed rounded-lg">
                                    <Droplets className="h-12 w-12 text-muted-foreground mb-4" />
                                    <h3 className="font-semibold">Hydration Plan Not Found</h3>
                                    <p className="text-muted-foreground text-sm">We couldn't generate a schedule. Ensure your onboarding profile is complete.</p>
                                </div>
                            )}
                            {schedule.length > 0 && (
                                <ul className="space-y-3">
                                    {schedule.map((entry, index) => (
                                        <li key={index} className={`flex items-center justify-between p-4 rounded-lg transition-colors ${entry.completed ? 'bg-primary/10' : 'bg-muted'}`}>
                                            <div className="flex items-center space-x-4">
                                                <Checkbox 
                                                    id={`item-${index}`}
                                                    checked={entry.completed}
                                                    onCheckedChange={() => handleCheckboxChange(index)}
                                                    className="h-5 w-5"
                                                />
                                                <Label htmlFor={`item-${index}`} className={`flex-grow cursor-pointer ${entry.completed ? 'line-through text-muted-foreground' : ''}`}>
                                                    <span className="font-bold text-lg">{entry.time}</span>
                                                    <p className="text-sm">{entry.amount} ml of water</p>
                                                </Label>
                                            </div>
                                            {entry.completed && <CheckCircle2 className="h-6 w-6 text-primary" />}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
