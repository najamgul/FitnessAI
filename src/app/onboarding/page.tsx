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

const onboardingSteps = [
    { id: 1, title: 'Basic Demographics' },
    { id: 2, title: 'Metabolic & Health Status' },
    { id: 3, title: 'Lifestyle & Activity' },
    { id: 4, title: 'Kashmiri & Cultural Considerations' },
    { id: 5, title: 'Goals & Preferences' },
];

export default function OnboardingPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [step, setStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    
    // A single state object to hold all form data
    const [formData, setFormData] = useState({
        // Step 1: Basic Demographics
        age: '',
        gender: '',
        weight: '',
        height: '',
        waist: '',
        hip: '',
        targetWeight: '',
        weightHistory: '',

        // Step 2: Health
        healthConditions: '',
        medications: '',
        allergies: '',
        digestiveIssues: '',
        familyHistory: '',
        isPregnant: '',
        menstrualCycle: '',

        // Step 3: Lifestyle
        activityLevel: 'sedentary',
        occupation: '',
        sleepHours: '',
        stressLevel: '',
        alcohol: 'no',
        smoking: 'no',
        
        // Step 4: Kashmiri Context
        includeTraditional: [],
        religiousRestrictions: 'none',
        handleWinters: '',
        
        // Step 5: Preferences
        primaryGoal: '',
        favoriteFoods: '',
        hatedFoods: '',
        spiceTolerance: 'medium',
    });

    const handleNext = () => setStep((prev) => Math.min(prev + 1, onboardingSteps.length));
    const handlePrev = () => setStep((prev) => Math.max(prev - 1, 1));
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { id, value } = e.target;
        setFormData(prev => ({ ...prev, [id]: value }));
    };

    const handleSelectChange = (id: string, value: string) => {
        setFormData(prev => ({ ...prev, [id]: value }));
    };

    const handleCheckboxChange = (id: string, value: string) => {
        setFormData(prev => {
            const list = (prev[id as keyof typeof prev] as string[]) || [];
            if (list.includes(value)) {
                return { ...prev, [id]: list.filter((item) => item !== value) };
            }
            return { ...prev, [id]: [...list, value] };
        });
    };
    
    const handleSubmit = async () => {
        setIsLoading(true);
        try {
            // Consolidate all form data into a comprehensive prompt for the AI
            const healthInformation = `
                Age: ${formData.age}, Gender: ${formData.gender}, Weight: ${formData.weight}kg, Height: ${formData.height}cm, Waist: ${formData.waist}cm, Hip: ${formData.hip}cm.
                Target Weight: ${formData.targetWeight || 'Not specified'}. Weight History: ${formData.weightHistory || 'Not specified'}.
                Health Conditions: ${formData.healthConditions || 'None'}. Medications: ${formData.medications || 'None'}. Allergies: ${formData.allergies || 'None'}.
                Digestive Issues: ${formData.digestiveIssues || 'None'}. Family History: ${formData.familyHistory || 'None'}.
                Pregnant/Breastfeeding: ${formData.isPregnant || 'N/A'}. Menstrual Cycle: ${formData.menstrualCycle || 'N/A'}.
                Activity Level: ${formData.activityLevel}. Occupation: ${formData.occupation || 'Not specified'}.
                Sleep: ${formData.sleepHours} hours. Stress: ${formData.stressLevel}. Alcohol: ${formData.alcohol}. Smoking: ${formData.smoking}.
                How they handle winters: ${formData.handleWinters || 'Not specified'}.
            `;

            const dietaryPreferences = `
                Religious Restrictions: ${formData.religiousRestrictions}.
                Traditional Kashmiri foods to include: ${formData.includeTraditional.join(', ') || 'None'}.
                Spice Tolerance: ${formData.spiceTolerance}.
                Favorite Foods: ${formData.favoriteFoods || 'None'}. Hated Foods: ${formData.hatedFoods || 'None'}.
            `;

            const dietPlanInput = {
                dietaryPreferences: dietaryPreferences,
                healthInformation: healthInformation,
                goals: formData.primaryGoal || 'General well-being',
                geographicLocation: 'Kashmir', // Hardcoded as per the context
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

    const progress = (step / onboardingSteps.length) * 100;
    const currentStepInfo = onboardingSteps.find(s => s.id === step);

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
            <div className="w-full max-w-2xl">
                 <div className="mb-8 flex flex-col items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Leaf className="h-8 w-8 text-primary" />
                        <h1 className="text-3xl font-bold font-headline text-primary">Welcome to Aziaf</h1>
                    </div>
                    <p className="text-muted-foreground">Let's get some details to personalize your experience.</p>
                    <Progress value={progress} className="w-full" />
                    <p className="text-sm font-semibold mt-2">{`Step ${step} of ${onboardingSteps.length}: ${currentStepInfo?.title}`}</p>
                </div>
                
                <Card>
                    {step === 1 && (
                        <>
                            <CardHeader><CardTitle className="font-headline">Basic Demographics</CardTitle></CardHeader>
                            <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="age">Age</Label>
                                    <Input id="age" type="number" placeholder="e.g., 28" value={formData.age} onChange={handleChange} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Gender</Label>
                                    <Select value={formData.gender} onValueChange={(v) => handleSelectChange('gender', v)}>
                                        <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="male">Male</SelectItem>
                                            <SelectItem value="female">Female</SelectItem>
                                            <SelectItem value="other">Other</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="height">Height (cm)</Label>
                                    <Input id="height" type="number" placeholder="e.g., 175" value={formData.height} onChange={handleChange} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="weight">Weight (kg)</Label>
                                    <Input id="weight" type="number" placeholder="e.g., 70" value={formData.weight} onChange={handleChange} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="waist">Waist (cm)</Label>
                                    <Input id="waist" type="number" placeholder="e.g., 80" value={formData.waist} onChange={handleChange} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="hip">Hip (cm)</Label>
                                    <Input id="hip" type="number" placeholder="e.g., 95" value={formData.hip} onChange={handleChange} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="targetWeight">Target Weight (kg)</Label>
                                    <Input id="targetWeight" type="number" placeholder="Optional" value={formData.targetWeight} onChange={handleChange} />
                                </div>
                                 <div className="space-y-2">
                                    <Label htmlFor="weightHistory">Weight History</Label>
                                    <Input id="weightHistory" placeholder="e.g., Stable, fluctuating" value={formData.weightHistory} onChange={handleChange} />
                                </div>
                            </CardContent>
                        </>
                    )}
                    {step === 2 && (
                         <>
                            <CardHeader><CardTitle className="font-headline">Metabolic & Health Status</CardTitle></CardHeader>
                            <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div className="space-y-2 md:col-span-2">
                                    <Label htmlFor="healthConditions">Existing health conditions?</Label>
                                    <Input id="healthConditions" placeholder="e.g., Diabetes, hypertension, thyroid" value={formData.healthConditions} onChange={handleChange} />
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <Label htmlFor="medications">Current medications or supplements?</Label>
                                    <Input id="medications" placeholder="e.g., Metformin, Vitamin D" value={formData.medications} onChange={handleChange} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="allergies">Food allergies or intolerances?</Label>
                                    <Input id="allergies" placeholder="e.g., Peanuts, lactose" value={formData.allergies} onChange={handleChange} />
                                </div>
                                 <div className="space-y-2">
                                    <Label htmlFor="digestiveIssues">Digestive issues?</Label>
                                    <Input id="digestiveIssues" placeholder="e.g., Acid reflux, constipation" value={formData.digestiveIssues} onChange={handleChange} />
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <Label htmlFor="familyHistory">Family medical history of chronic diseases?</Label>
                                    <Input id="familyHistory" placeholder="e.g., Heart disease in parents" value={formData.familyHistory} onChange={handleChange} />
                                </div>
                                 <div className="space-y-2">
                                    <Label>Pregnancy or breastfeeding?</Label>
                                    <Select value={formData.isPregnant} onValueChange={(v) => handleSelectChange('isPregnant', v)}>
                                        <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="not_applicable">Not Applicable</SelectItem>
                                            <SelectItem value="pregnant">Pregnant</SelectItem>
                                            <SelectItem value="breastfeeding">Breastfeeding</SelectItem>
                                            <SelectItem value="none">None</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="menstrualCycle">Menstrual cycle regularity?</Label>
                                    <Input id="menstrualCycle" placeholder="e.g., Regular, irregular" value={formData.menstrualCycle} onChange={handleChange} />
                                </div>
                            </CardContent>
                        </>
                    )}
                    {step === 3 && (
                        <>
                            <CardHeader><CardTitle className="font-headline">Lifestyle & Activity</CardTitle></CardHeader>
                            <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div className="space-y-2 md:col-span-2">
                                    <Label>Activity Level</Label>
                                    <Select value={formData.activityLevel} onValueChange={(v) => handleSelectChange('activityLevel', v)}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="sedentary">Sedentary (little to no exercise)</SelectItem>
                                            <SelectItem value="light">Lightly Active (light exercise 1-3 days/week)</SelectItem>
                                            <SelectItem value="moderate">Moderately Active (moderate exercise 3-5 days/week)</SelectItem>
                                            <SelectItem value="very">Very Active (hard exercise 6-7 days a week)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="occupation">Occupation Type</Label>
                                    <Input id="occupation" placeholder="e.g., Desk job, physical work" value={formData.occupation} onChange={handleChange} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="sleepHours">Average Sleep (hours)</Label>
                                    <Input id="sleepHours" type="number" placeholder="e.g., 7" value={formData.sleepHours} onChange={handleChange} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Stress Levels</Label>
                                    <Select value={formData.stressLevel} onValueChange={(v) => handleSelectChange('stressLevel', v)}>
                                        <SelectTrigger><SelectValue placeholder="Select stress level" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="low">Low</SelectItem>
                                            <SelectItem value="medium">Medium</SelectItem>
                                            <SelectItem value="high">High</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Alcohol Consumption</Label>
                                    <Select value={formData.alcohol} onValueChange={(v) => handleSelectChange('alcohol', v)}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="no">No</SelectItem>
                                            <SelectItem value="rarely">Rarely</SelectItem>
                                            <SelectItem value="socially">Socially</SelectItem>
                                            <SelectItem value="regularly">Regularly</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Smoking Status</Label>
                                    <Select value={formData.smoking} onValueChange={(v) => handleSelectChange('smoking', v)}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="no">No</SelectItem>
                                            <SelectItem value="yes">Yes</SelectItem>
                                            <SelectItem value="trying_to_quit">Trying to quit</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </CardContent>
                        </>
                    )}
                    {step === 4 && (
                        <>
                            <CardHeader><CardTitle className="font-headline">Kashmiri & Cultural Considerations</CardTitle></CardHeader>
                            <CardContent className="space-y-6">
                                <div>
                                    <Label className="font-semibold">Traditional Kashmiri foods to include?</Label>
                                    <div className="grid grid-cols-2 gap-2 mt-2">
                                        {['Rogan Josh', 'Yakhni', 'Haak', 'Nadru'].map(food => (
                                            <div key={food} className="flex items-center space-x-2">
                                                <Checkbox id={`food-${food}`} onCheckedChange={() => handleCheckboxChange('includeTraditional', food)} checked={formData.includeTraditional.includes(food)} />
                                                <Label htmlFor={`food-${food}`} className="font-normal">{food}</Label>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Religious dietary restrictions?</Label>
                                    <Select value={formData.religiousRestrictions} onValueChange={(v) => handleSelectChange('religiousRestrictions', v)}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">None</SelectItem>
                                            <SelectItem value="halal">Halal</SelectItem>
                                            <SelectItem value="other">Other (please specify below)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="handleWinters">How do you handle winters nutritionally?</Label>
                                    <Textarea id="handleWinters" placeholder="e.g., More hot beverages, warming foods" value={formData.handleWinters} onChange={handleChange} />
                                </div>
                            </CardContent>
                        </>
                    )}
                    {step === 5 && (
                         <>
                            <CardHeader><CardTitle className="font-headline">Goals & Preferences</CardTitle></CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="primaryGoal">Primary health/fitness goal?</Label>
                                    <Input id="primaryGoal" placeholder="e.g., Weight loss, better energy" value={formData.primaryGoal} onChange={handleChange} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="favoriteFoods">Foods you absolutely love?</Label>
                                    <Textarea id="favoriteFoods" placeholder="e.g., Apples, chicken, naan" value={formData.favoriteFoods} onChange={handleChange} />
                                </div>
                                 <div className="space-y-2">
                                    <Label htmlFor="hatedFoods">Foods you hate?</Label>
                                    <Textarea id="hatedFoods" placeholder="e.g., Bitter gourd, okra" value={formData.hatedFoods} onChange={handleChange} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Spice Tolerance</Label>
                                    <Select value={formData.spiceTolerance} onValueChange={(v) => handleSelectChange('spiceTolerance', v)}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="low">Low</SelectItem>
                                            <SelectItem value="medium">Medium</SelectItem>
                                            <SelectItem value="high">High</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </CardContent>
                        </>
                    )}
                    <CardFooter className="justify-between mt-6">
                        <Button variant="outline" onClick={handlePrev} disabled={step === 1}>
                            <ChevronLeft className="mr-2 h-4 w-4" /> Previous
                        </Button>
                        {step < onboardingSteps.length ? (
                             <Button onClick={handleNext}>Next <ChevronRight className="ml-2 h-4 w-4" /></Button>
                        ) : (
                            <Button onClick={handleSubmit} disabled={isLoading}>
                                {isLoading ? <Loader2 className="animate-spin mr-2" /> : null}
                                {isLoading ? "Generating Plan..." : "Complete & Start Journey"}
                            </Button>
                        )}
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}
