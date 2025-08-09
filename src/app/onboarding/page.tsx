'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';
import { Leaf, ChevronRight, ChevronLeft, Loader2 } from 'lucide-react';
import { generateDietPlan } from '@/ai/flows/generate-diet-plan';

const goals = [
  { id: 'weight_loss', label: 'Weight Loss' },
  { id: 'muscle_gain', label: 'Muscle Gain' },
  { id: 'maintenance', label: 'Weight Maintenance' },
  { id: 'general_health', label: 'Improve General Health' },
];

const preferences = [
  { id: 'vegetarian', label: 'Vegetarian' },
  { id: 'vegan', label: 'Vegan' },
  { id: 'keto', label: 'Keto' },
  { id: 'paleo', label: 'Paleo' },
  { id: 'gluten_free', label: 'Gluten-Free' },
  { id: 'dairy_free', label: 'Dairy-Free' },
];

export default function OnboardingPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [step, setStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    
    const [formData, setFormData] = useState({
        gender: '',
        age: '',
        height: '',
        weight: '',
        activityLevel: '',
        selectedGoals: [] as string[],
        selectedPreferences: [] as string[],
        allergies: '',
        location: '',
    });

    const handleNext = () => setStep((prev) => prev + 1);
    const handlePrev = () => setStep((prev) => prev - 1);

    const handleCheckboxChange = (group: 'selectedGoals' | 'selectedPreferences', id: string) => {
        setFormData((prev) => {
            const list = prev[group] as string[];
            if (list.includes(id)) {
                return { ...prev, [group]: list.filter((item) => item !== id) };
            }
            return { ...prev, [group]: [...list, id] };
        });
    };
    
    const handleSubmit = async () => {
        setIsLoading(true);
        try {
            const dietPlanInput = {
                dietaryPreferences: formData.selectedPreferences.join(', ') || 'None',
                healthInformation: `Gender: ${formData.gender}, Age: ${formData.age}, Height: ${formData.height}cm, Weight: ${formData.weight}kg. Activity: ${formData.activityLevel}. Allergies: ${formData.allergies || 'None'}`,
                goals: formData.selectedGoals.join(', ') || 'Improve general health',
                geographicLocation: formData.location || 'Not specified',
            };
            
            await generateDietPlan(dietPlanInput);
            
            toast({
                title: 'Onboarding Complete!',
                description: "We're now generating your personalized diet plan.",
            });
            router.push('/dashboard');

        } catch (error) {
             toast({
                title: 'Error',
                description: 'Could not complete onboarding. Please try again.',
                variant: 'destructive',
            });
            setIsLoading(false);
        }
    };

    const progress = (step / 3) * 100;

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
            <div className="w-full max-w-2xl">
                <div className="mb-8 flex flex-col items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Leaf className="h-8 w-8 text-primary" />
                        <h1 className="text-3xl font-bold font-headline text-primary">Welcome to NutriGenius AI</h1>
                    </div>
                    <p className="text-muted-foreground">Let's get some details to personalize your experience.</p>
                    <Progress value={progress} className="w-full" />
                </div>
                
                <Card>
                    {step === 1 && (
                        <>
                            <CardHeader>
                                <CardTitle className="font-headline">Basic Information</CardTitle>
                                <CardDescription>This helps us calculate your basic needs.</CardDescription>
                            </CardHeader>
                            <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label>Gender</Label>
                                    <Select value={formData.gender} onValueChange={(v) => setFormData({...formData, gender: v})}>
                                        <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="male">Male</SelectItem>
                                            <SelectItem value="female">Female</SelectItem>
                                            <SelectItem value="other">Other</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="age">Age</Label>
                                    <Input id="age" type="number" placeholder="e.g., 28" value={formData.age} onChange={(e) => setFormData({...formData, age: e.target.value})} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="height">Height (cm)</Label>
                                    <Input id="height" type="number" placeholder="e.g., 175" value={formData.height} onChange={(e) => setFormData({...formData, height: e.target.value})} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="weight">Weight (kg)</Label>
                                    <Input id="weight" type="number" placeholder="e.g., 70" value={formData.weight} onChange={(e) => setFormData({...formData, weight: e.target.value})} />
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <Label>Activity Level</Label>
                                    <Select value={formData.activityLevel} onValueChange={(v) => setFormData({...formData, activityLevel: v})}>
                                        <SelectTrigger><SelectValue placeholder="Select activity level" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="sedentary">Sedentary (little to no exercise)</SelectItem>
                                            <SelectItem value="light">Lightly Active (light exercise/sports 1-3 days/week)</SelectItem>
                                            <SelectItem value="moderate">Moderately Active (moderate exercise/sports 3-5 days/week)</SelectItem>
                                            <SelectItem value="very">Very Active (hard exercise/sports 6-7 days a week)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </CardContent>
                            <CardFooter className="justify-end">
                                <Button onClick={handleNext}>Next <ChevronRight className="ml-2 h-4 w-4" /></Button>
                            </CardFooter>
                        </>
                    )}
                    {step === 2 && (
                         <>
                            <CardHeader>
                                <CardTitle className="font-headline">Goals & Preferences</CardTitle>
                                <CardDescription>What do you want to achieve?</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div>
                                    <Label className="text-base font-semibold">Your Goals</Label>
                                    <div className="grid grid-cols-2 gap-4 mt-2">
                                        {goals.map(goal => (
                                            <div key={goal.id} className="flex items-center space-x-2">
                                                <Checkbox id={goal.id} onCheckedChange={() => handleCheckboxChange('selectedGoals', goal.id)} checked={formData.selectedGoals.includes(goal.id)} />
                                                <Label htmlFor={goal.id} className="font-normal">{goal.label}</Label>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <Label className="text-base font-semibold">Dietary Preferences</Label>
                                    <div className="grid grid-cols-2 gap-4 mt-2">
                                        {preferences.map(pref => (
                                            <div key={pref.id} className="flex items-center space-x-2">
                                                <Checkbox id={pref.id} onCheckedChange={() => handleCheckboxChange('selectedPreferences', pref.id)} checked={formData.selectedPreferences.includes(pref.id)} />
                                                <Label htmlFor={pref.id} className="font-normal">{pref.label}</Label>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter className="justify-between">
                                <Button variant="outline" onClick={handlePrev}><ChevronLeft className="mr-2 h-4 w-4" /> Previous</Button>
                                <Button onClick={handleNext}>Next <ChevronRight className="ml-2 h-4 w-4" /></Button>
                            </CardFooter>
                        </>
                    )}
                    {step === 3 && (
                        <>
                            <CardHeader>
                                <CardTitle className="font-headline">Final Details</CardTitle>
                                <CardDescription>Any allergies or specific location to consider?</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="allergies">Allergies or Dislikes</Label>
                                    <Textarea id="allergies" placeholder="e.g., Peanuts, shellfish, cilantro" value={formData.allergies} onChange={(e) => setFormData({...formData, allergies: e.target.value})} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="location">Your Location (City, Country)</Label>
                                    <Input id="location" placeholder="e.g., London, UK" value={formData.location} onChange={(e) => setFormData({...formData, location: e.target.value})} />
                                    <p className="text-xs text-muted-foreground">This helps us suggest locally available ingredients.</p>
                                </div>
                            </CardContent>
                            <CardFooter className="justify-between">
                                <Button variant="outline" onClick={handlePrev}><ChevronLeft className="mr-2 h-4 w-4" /> Previous</Button>
                                <Button onClick={handleSubmit} disabled={isLoading}>
                                    {isLoading ? <Loader2 className="animate-spin mr-2" /> : null}
                                    {isLoading ? "Generating Plan..." : "Complete & Start Journey"}
                                </Button>
                            </CardFooter>
                        </>
                    )}
                </Card>
            </div>
        </div>
    )
}
