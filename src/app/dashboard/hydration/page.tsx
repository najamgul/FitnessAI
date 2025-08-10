
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Sparkles, Bot, Clock, Droplets, CheckCircle2 } from 'lucide-react';
import { generateHydrationSchedule } from '@/ai/flows/generate-hydration-schedule';
import { getHydrationAdvice } from '@/ai/flows/get-hydration-advice';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';

type ScheduleEntry = {
    time: string;
    amount: number;
    completed?: boolean;
};

export default function HydrationPage() {
    const { toast } = useToast();
    const [goal, setGoal] = useState('2.5');
    const [wakeUp, setWakeUp] = useState('07:00');
    const [bedTime, setBedTime] = useState('23:00');
    const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
    const [explanation, setExplanation] = useState('');
    const [isLoadingSchedule, setIsLoadingSchedule] = useState(false);
    
    // State for the catch-up dialog
    const [catchUpDialogOpen, setCatchUpDialogOpen] = useState(false);
    const [isLoadingAdvice, setIsLoadingAdvice] = useState(false);
    const [catchUpAdvice, setCatchUpAdvice] = useState('');

    const handleGenerateSchedule = async () => {
        setIsLoadingSchedule(true);
        setSchedule([]);
        setExplanation('');
        try {
            const totalIntakeLiters = parseFloat(goal);
            if (isNaN(totalIntakeLiters) || totalIntakeLiters <= 0) {
                toast({ title: 'Invalid Goal', description: 'Please enter a valid number for your daily intake goal.', variant: 'destructive' });
                setIsLoadingSchedule(false);
                return;
            }
            const response = await generateHydrationSchedule({
                totalIntakeLiters,
                wakeUpTime: wakeUp,
                bedTime: bedTime,
            });
            setSchedule(response.schedule.map(item => ({...item, completed: false})));
            setExplanation(response.explanation);
            toast({ title: 'Schedule Generated!', description: 'Your personalized hydration plan is ready.' });
        } catch (error) {
            toast({ title: 'Error', description: 'Could not generate hydration schedule.', variant: 'destructive' });
        } finally {
            setIsLoadingSchedule(false);
        }
    };
    
    const handleCheckboxChange = (index: number) => {
        setSchedule(prevSchedule => {
            const newSchedule = [...prevSchedule];
            newSchedule[index].completed = !newSchedule[index].completed;
            return newSchedule;
        });
    };
    
    const handleGetCatchUpAdvice = async () => {
        setIsLoadingAdvice(true);
        setCatchUpAdvice('');
        try {
            const targetIntake = parseFloat(goal);
            const completedAmount = schedule.reduce((acc, entry) => acc + (entry.completed ? entry.amount : 0), 0) / 1000;
            
            const result = await getHydrationAdvice({ targetIntake: targetIntake, actualIntake: completedAmount });
            setCatchUpAdvice(result.advice);
        } catch (error) {
            toast({ title: 'Error', description: 'Could not get hydration advice.', variant: 'destructive'});
        } finally {
            setIsLoadingAdvice(false);
        }
    };
    
    const totalCompleted = schedule.reduce((sum, entry) => sum + (entry.completed ? entry.amount : 0), 0);
    const totalScheduled = schedule.reduce((sum, entry) => sum + entry.amount, 0);
    const progressPercentage = totalScheduled > 0 ? (totalCompleted / totalScheduled) * 100 : 0;


    return (
        <div className="space-y-8">
             <Dialog open={catchUpDialogOpen} onOpenChange={setCatchUpDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 font-headline"><Bot /> Hydration Helper</DialogTitle>
                        <DialogDescription>
                           Let's figure out a plan to get you back on track with your water intake for the rest of the day.
                        </DialogDescription>
                    </DialogHeader>
                     {isLoadingAdvice && (
                         <div className="flex items-center justify-center p-8">
                            <Loader2 className="h-8 w-8 animate-spin" />
                         </div>
                    )}
                    {catchUpAdvice && (
                        <Alert>
                            <Sparkles className="h-4 w-4" />
                            <AlertTitle>Your Catch-up Plan</AlertTitle>
                            <AlertDescription>
                                {catchUpAdvice}
                            </AlertDescription>
                        </Alert>
                    )}
                    <DialogFooter>
                         <Button onClick={handleGetCatchUpAdvice} disabled={isLoadingAdvice}>
                            {isLoadingAdvice ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Sparkles className="mr-2 h-4 w-4" />}
                            Get My Plan
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Create Your Schedule</CardTitle>
                            <CardDescription>Set your daily goal to generate a personalized hydration plan.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="goal">Daily Intake Goal (Liters)</Label>
                                <Input id="goal" type="number" value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="e.g., 2.5" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                               <div className="space-y-2">
                                    <Label htmlFor="wakeUp">Wake-up Time</Label>
                                    <Input id="wakeUp" type="time" value={wakeUp} onChange={(e) => setWakeUp(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="bedTime">Bedtime</Label>
                                    <Input id="bedTime" type="time" value={bedTime} onChange={(e) => setBedTime(e.target.value)} />
                                </div>
                            </div>
                            <Button onClick={handleGenerateSchedule} disabled={isLoadingSchedule} className="w-full">
                                {isLoadingSchedule ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Droplets className="mr-2 h-4 w-4" />}
                                Generate Schedule
                            </Button>
                        </CardContent>
                    </Card>
                    {schedule.length > 0 && (
                         <Card>
                            <CardHeader>
                                <CardTitle className="font-headline">Daily Progress</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4 text-center">
                                <div className="text-4xl font-bold text-primary">{totalCompleted.toLocaleString()} ml</div>
                                <div className="text-sm text-muted-foreground">of {totalScheduled.toLocaleString()} ml goal completed</div>
                                <div className="w-full bg-muted rounded-full h-2.5">
                                    <div className="bg-primary h-2.5 rounded-full" style={{ width: `${progressPercentage}%` }}></div>
                                </div>
                                 <Button variant="outline" onClick={() => setCatchUpDialogOpen(true)}>
                                    <Bot className="mr-2 h-4 w-4"/>
                                    Help Me Catch Up
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
                            {isLoadingSchedule && (
                                <div className="flex flex-col items-center justify-center text-center p-12">
                                    <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                                    <p className="font-semibold">Generating your plan...</p>
                                    <p className="text-sm text-muted-foreground">The AI is creating a personalized schedule just for you.</p>
                                </div>
                            )}
                            {!isLoadingSchedule && schedule.length === 0 && (
                                <div className="flex flex-col items-center justify-center text-center p-12 border-2 border-dashed rounded-lg">
                                    <Droplets className="h-12 w-12 text-muted-foreground mb-4" />
                                    <h3 className="font-semibold">Your Schedule Awaits</h3>
                                    <p className="text-muted-foreground text-sm">Fill in your details and click "Generate Schedule" to start.</p>
                                </div>
                            )}
                            {schedule.length > 0 && (
                                <ul className="space-y-3">
                                    {schedule.map((entry, index) => (
                                        <li key={index} className={`flex items-center justify-between p-4 rounded-lg transition-colors ${entry.completed ? 'bg-primary/10' : 'bg-muted'}`}>
                                            <div className="flex items-center">
                                                <Checkbox 
                                                    id={`item-${index}`}
                                                    checked={entry.completed}
                                                    onCheckedChange={() => handleCheckboxChange(index)}
                                                    className="mr-4 h-5 w-5"
                                                />
                                                <Label htmlFor={`item-${index}`} className={`cursor-pointer ${entry.completed ? 'line-through text-muted-foreground' : ''}`}>
                                                    <div className="font-bold text-lg">{entry.time}</div>
                                                    <div className="text-sm">{entry.amount} ml of water</div>
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
