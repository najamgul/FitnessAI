
'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';
import { Leaf, ChevronRight, ChevronLeft, Loader2, Sparkles, User, TrendingUp, Target, Clock } from 'lucide-react';
import { generateDietPlan } from '@/ai/flows/generate-diet-plan';
import { generateBodyImage } from '@/ai/flows/generate-body-image';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';

const onboardingSteps = [
    { id: 1, title: 'About You' },
    { id: 2, title: 'Your Lifestyle' },
    { id: 3, title: 'Health Profile' },
    { id: 4, title: 'Your Goals' },
];

const healthConditions = [
  { id: 'pcod_pcos', label: 'PCOD / PCOS' },
  { id: 'diabetes', label: 'Diabetes / Blood Sugar Management' },
  { id: 'hypertension', label: 'High Blood Pressure' },
  { id: 'cholesterol', label: 'High Cholesterol' },
  { id: 'thyroid', label: 'Thyroid Imbalance' },
];


export default function OnboardingPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [step, setStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    
    const [formData, setFormData] = useState({
        // Step 1
        age: '',
        gender: '',
        weight: '',
        heightFt: '',
        heightIn: '',
        waist: '',
        hip: '',
        isPregnant: 'not_applicable',
        menstrualCycle: '',

        // Step 2
        activityLevel: 'sedentary',
        occupation: '',
        sleepHours: '',
        stressLevel: 'low',
        
        // Step 4
        goalAction: 'maintain', // 'lose', 'gain', 'maintain'
        goalWeightKg: '',
        otherGoal: '',
        healthGoals: [] as string[],
    });

    const [healthProfile, setHealthProfile] = useState({
        bmi: 0,
        bmiCategory: '',
        whr: 0,
        whrCategory: '',
        bodyImageUrl: '',
        idealWeightMin: 0,
        idealWeightMax: 0,
        suggestedDuration: '4-6 weeks'
    });

    const calculateHealthProfile = () => {
        const weightKg = parseFloat(formData.weight) || 0;
        const feet = parseInt(formData.heightFt) || 0;
        const inches = parseInt(formData.heightIn) || 0;
        const totalInches = (feet * 12) + inches;
        const heightM = totalInches * 0.0254;
        const waistIn = parseFloat(formData.waist) || 0;
        const hipIn = parseFloat(formData.hip) || 0;

        let bmi = 0;
        if (weightKg > 0 && heightM > 0) {
            bmi = weightKg / (heightM * heightM);
        }

        let bmiCategory = 'N/A';
        if (bmi < 18.5) bmiCategory = 'Underweight';
        else if (bmi < 24.9) bmiCategory = 'Normal weight';
        else if (bmi < 29.9) bmiCategory = 'Overweight';
        else if (bmi >= 30) bmiCategory = 'Obesity';

        let whr = 0;
        if (waistIn > 0 && hipIn > 0) {
            whr = waistIn / hipIn;
        }

        let whrCategory = 'N/A';
        if (formData.gender === 'male') {
            if (whr > 0.9) whrCategory = 'High Health Risk'; else whrCategory = 'Low Health Risk';
        } else if (formData.gender === 'female') {
            if (whr > 0.85) whrCategory = 'High Health Risk'; else whrCategory = 'Low Health Risk';
        }

        const idealWeightMin = 18.5 * (heightM * heightM);
        const idealWeightMax = 24.9 * (heightM * heightM);

        setHealthProfile(prev => ({
            ...prev,
            bmi: parseFloat(bmi.toFixed(2)),
            bmiCategory,
            whr: parseFloat(whr.toFixed(2)),
            whrCategory,
            idealWeightMin: parseFloat(idealWeightMin.toFixed(1)),
            idealWeightMax: parseFloat(idealWeightMax.toFixed(1)),
        }));
    }

    const handleNext = async () => {
        if (step === 2) {
            setIsLoading(true);
            calculateHealthProfile();
            try {
                const weightKg = parseFloat(formData.weight) || 0;
                const feet = parseInt(formData.heightFt) || 0;
                const inches = parseInt(formData.heightIn) || 0;
                const heightM = (feet * 12 + inches) * 0.0254;
                const bmi = weightKg > 0 && heightM > 0 ? weightKg / (heightM * heightM) : 0;
                
                const response = await generateBodyImage({
                    gender: formData.gender,
                    bmi: parseFloat(bmi.toFixed(2))
                });

                setHealthProfile(prev => ({...prev, bodyImageUrl: response.imageUrl}));

            } catch (error) {
                toast({
                    title: 'Could not generate body image',
                    description: 'Using a default placeholder.',
                    variant: 'destructive',
                });
                setHealthProfile(prev => ({...prev, bodyImageUrl: `https://placehold.co/400x600.png`}));
            }
            setIsLoading(false);
        }
        setStep((prev) => Math.min(prev + 1, onboardingSteps.length));
    };
    const handlePrev = () => setStep((prev) => Math.max(prev - 1, 1));
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { id, value } = e.target;
        setFormData(prev => ({ ...prev, [id]: value }));
    };

    const handleSelectChange = (id: string, value: string) => {
        setFormData(prev => ({ ...prev, [id]: value }));
    };

    const handleRadioChange = (value: string) => {
        setFormData(prev => ({ ...prev, goalAction: value }));
    };

    const handleCheckboxChange = (id: string, checked: boolean) => {
      setFormData(prev => {
        const newHealthGoals = checked 
          ? [...prev.healthGoals, id]
          : prev.healthGoals.filter(goalId => goalId !== id);
        return { ...prev, healthGoals: newHealthGoals };
      });
    };
    
    const handleSubmit = async () => {
        setIsLoading(true);
        try {
            const heightInCm = Math.round(((parseInt(formData.heightFt) || 0) * 12 + (parseInt(formData.heightIn) || 0)) * 2.54);

            let goalDescription = `Primary goal: ${formData.goalAction} weight.`;
            if (formData.goalAction === 'lose' || formData.goalAction === 'gain') {
                goalDescription += ` Target weight: ${formData.goalWeightKg} kg.`;
            }

            if (formData.healthGoals.length > 0) {
              const selectedGoals = healthConditions
                .filter(condition => formData.healthGoals.includes(condition.id))
                .map(condition => condition.label);
                goalDescription += ` Secondary goals: Manage ${selectedGoals.join(', ')}.`;
            }
            
            if (formData.goalAction === 'other') {
                goalDescription = formData.otherGoal;
            }

            const healthInformation = `
                Age: ${formData.age}, Gender: ${formData.gender}, Weight: ${formData.weight}kg, Height: ${heightInCm}cm.
                Health Profile: BMI of ${healthProfile.bmi} (${healthProfile.bmiCategory}), Waist-to-Hip Ratio of ${healthProfile.whr} (${healthProfile.whrCategory}).
                Activity Level: ${formData.activityLevel}. Occupation: ${formData.occupation || 'Not specified'}.
                Sleep: ${formData.sleepHours} hours/night. Stress: ${formData.stressLevel}.
                ${formData.gender === 'female' ? `Pregnancy/Breastfeeding: ${formData.isPregnant}.` : ''}
                ${formData.gender === 'female' ? `Menstrual Cycle: ${formData.menstrualCycle || 'Not specified'}.` : ''}
            `;

            const dietaryPreferences = `
                Spice Tolerance: medium.
                Favorite Foods: None. Hated Foods: None.
            `;

            const dietPlanInput = {
                dietaryPreferences: dietaryPreferences,
                healthInformation: healthInformation,
                goals: goalDescription,
                geographicLocation: 'Kashmir',
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

    const isNextDisabled = useMemo(() => {
        if (step === 1) {
            return !formData.age || !formData.gender || !formData.weight || !formData.heightFt || !formData.heightIn || !formData.waist || !formData.hip;
        }
        if (step === 2) {
            return !formData.activityLevel || !formData.sleepHours;
        }
        return false;
    }, [formData, step]);

    const isSubmitDisabled = useMemo(() => {
        if (isLoading) return true;
        if (formData.goalAction === 'maintain') return false;
        if (formData.goalAction === 'lose' || formData.goalAction === 'gain') {
            return !formData.goalWeightKg || parseFloat(formData.goalWeightKg) <= 0;
        }
        if (formData.goalAction === 'other') {
            return !formData.otherGoal.trim();
        }
        return false;
    }, [isLoading, formData.goalAction, formData.goalWeightKg, formData.otherGoal]);


    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
            <div className="w-full max-w-2xl">
                 <div className="mb-8 flex flex-col items-center gap-4">
                    <Link href="/" className="flex items-center gap-2 text-3xl font-bold font-headline text-primary">
                        <Leaf className="h-8 w-8" />
                    </Link>
                    <p className="text-muted-foreground">Let's get some details to personalize your experience.</p>
                    <Progress value={progress} className="w-full" />
                    <p className="text-sm font-semibold mt-2">{`Step ${step} of ${onboardingSteps.length}: ${currentStepInfo?.title}`}</p>
                </div>
                
                <Card>
                    {step === 1 && (
                        <>
                            <CardHeader><CardTitle className="font-headline">About You</CardTitle><CardDescription>This helps us calculate your basic health metrics.</CardDescription></CardHeader>
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
                                    <Label>Height</Label>
                                    <div className="flex gap-2">
                                        <Input id="heightFt" type="number" placeholder="Feet" value={formData.heightFt} onChange={handleChange} />
                                        <Input id="heightIn" type="number" placeholder="Inches" value={formData.heightIn} onChange={handleChange} />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="weight">Weight (kg)</Label>
                                    <Input id="weight" type="number" placeholder="e.g., 70" value={formData.weight} onChange={handleChange} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="waist">Waist (in)</Label>
                                    <Input id="waist" type="number" placeholder="e.g., 32" value={formData.waist} onChange={handleChange} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="hip">Hip (in)</Label>
                                    <Input id="hip" type="number" placeholder="e.g., 38" value={formData.hip} onChange={handleChange} />
                                </div>

                                {formData.gender === 'female' && (
                                    <>
                                        <div className="space-y-2 md:col-span-2">
                                            <Label>Pregnancy or breastfeeding?</Label>
                                            <Select value={formData.isPregnant} onValueChange={(v) => handleSelectChange('isPregnant', v)}>
                                                <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="not_applicable">Not Applicable</SelectItem>
                                                    <SelectItem value="pregnant">Pregnant</SelectItem>
                                                    <SelectItem value="breastfeeding">Breastfeeding</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2 md:col-span-2">
                                            <Label htmlFor="menstrualCycle">Menstrual cycle regularity?</Label>
                                            <Input id="menstrualCycle" placeholder="e.g., Regular, irregular" value={formData.menstrualCycle} onChange={handleChange} />
                                        </div>
                                    </>
                                )}
                            </CardContent>
                        </>
                    )}
                    {step === 2 && (
                         <>
                            <CardHeader><CardTitle className="font-headline">Your Lifestyle</CardTitle><CardDescription>Your daily habits affect your nutritional needs.</CardDescription></CardHeader>
                            <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div className="space-y-2 md:col-span-2">
                                    <Label>Typical Activity Level</Label>
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
                                    <Label htmlFor="occupation">Occupation</Label>
                                    <Input id="occupation" placeholder="e.g., Desk job, physical labor" value={formData.occupation} onChange={handleChange} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="sleepHours">Average Sleep (hours per night)</Label>
                                    <Input id="sleepHours" type="number" placeholder="e.g., 7" value={formData.sleepHours} onChange={handleChange} />
                                </div>
                                <div className="space-y-2 md:col-span-2">
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
                            </CardContent>
                        </>
                    )}
                    {step === 3 && (
                        <>
                            <CardHeader>
                                <CardTitle className="font-headline">Your Health Profile</CardTitle>
                                <CardDescription>Here's a summary based on your info, and your ideal health targets.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                { isLoading ? (
                                    <div className="flex flex-col items-center justify-center gap-4 p-8">
                                        <Loader2 className="h-12 w-12 animate-spin text-primary" />
                                        <p className="text-muted-foreground">Analyzing your profile and generating your avatar...</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                                        <div className="flex justify-center">
                                            {healthProfile.bodyImageUrl ? (
                                                <Image src={healthProfile.bodyImageUrl} alt="AI generated body representation" width={200} height={300} className="rounded-lg shadow-md" unoptimized/>
                                            ) : (
                                                <div className="w-[200px] h-[300px] bg-muted rounded-lg flex items-center justify-center">
                                                    <User className="w-16 h-16 text-muted-foreground" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="space-y-4">
                                            <div className="flex items-start gap-4">
                                                <div className="flex-shrink-0 bg-accent rounded-full h-10 w-10 flex items-center justify-center">
                                                    <User className="h-6 w-6 text-accent-foreground" />
                                                </div>
                                                <div>
                                                    <h4 className="font-semibold">Your Body Mass Index (BMI)</h4>
                                                    <p className="text-2xl font-bold text-primary">{healthProfile.bmi}</p>
                                                    <p className="text-sm text-muted-foreground">{healthProfile.bmiCategory}</p>
                                                </div>
                                            </div>
                                             <div className="flex items-start gap-4">
                                                <div className="flex-shrink-0 bg-accent rounded-full h-10 w-10 flex items-center justify-center">
                                                    <TrendingUp className="h-6 w-6 text-accent-foreground" />
                                                </div>
                                                <div>
                                                    <h4 className="font-semibold">Your Waist-to-Hip Ratio (WHR)</h4>
                                                    <p className="text-2xl font-bold text-primary">{healthProfile.whr}</p>
                                                    <p className="text-sm text-muted-foreground">{healthProfile.whrCategory}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-start gap-4">
                                                <div className="flex-shrink-0 bg-primary rounded-full h-10 w-10 flex items-center justify-center">
                                                    <Target className="h-6 w-6 text-primary-foreground" />
                                                </div>
                                                <div>
                                                    <h4 className="font-semibold">Your Ideal Metrics</h4>
                                                    <p className="text-sm">Ideal Weight: <span className="font-bold">{healthProfile.idealWeightMin} - {healthProfile.idealWeightMax} kg</span></p>
                                                    <p className="text-sm">Healthy BMI Range: <span className="font-bold">18.5 - 24.9</span></p>
                                                    <p className="text-sm">Target WHR: <span className="font-bold">{formData.gender === 'male' ? '< 0.90' : '< 0.85'}</span></p>
                                                </div>
                                            </div>
                                             <div className="flex items-start gap-4">
                                                <div className="flex-shrink-0 bg-secondary rounded-full h-10 w-10 flex items-center justify-center text-secondary-foreground">
                                                    <Clock className="h-6 w-6" />
                                                </div>
                                                <div>
                                                    <h4 className="font-semibold">Suggested Plan Duration</h4>
                                                     <p className="text-lg font-bold">{healthProfile.suggestedDuration}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </>
                    )}
                    {step === 4 && (
                         <>
                            <CardHeader>
                                <CardTitle className="font-headline">What are your goals?</CardTitle>
                                <CardDescription>Select your primary goal and any other health conditions you'd like to manage.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div>
                                    <Label className="font-semibold">Primary Goal: Weight Management</Label>
                                    <RadioGroup value={formData.goalAction} onValueChange={handleRadioChange} className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="lose" id="lose" />
                                            <Label htmlFor="lose" className="cursor-pointer">Lose Weight</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="gain" id="gain" />
                                            <Label htmlFor="gain" className="cursor-pointer">Gain Weight</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="maintain" id="maintain" />
                                            <Label htmlFor="maintain" className="cursor-pointer">Maintain Weight</Label>
                                        </div>
                                    </RadioGroup>
                                </div>

                                {(formData.goalAction === 'lose' || formData.goalAction === 'gain') && (
                                    <div className="space-y-2 animate-in fade-in-50">
                                        <Label htmlFor="goalWeightKg">What is your target weight (kg)?</Label>
                                        <Input 
                                            id="goalWeightKg" 
                                            type="number" 
                                            placeholder="e.g., 65" 
                                            value={formData.goalWeightKg}
                                            onChange={handleChange} 
                                        />
                                    </div>
                                )}

                                <div className="space-y-4">
                                  <Label className="font-semibold">Other Health Goals (Optional)</Label>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {healthConditions.map((item) => (
                                      <div key={item.id} className="flex items-center space-x-2">
                                        <Checkbox
                                          id={item.id}
                                          checked={formData.healthGoals.includes(item.id)}
                                          onCheckedChange={(checked) => handleCheckboxChange(item.id, !!checked)}
                                        />
                                        <Label htmlFor={item.id} className="font-normal cursor-pointer">
                                          {item.label}
                                        </Label>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                                 <div className="space-y-2">
                                    <Label htmlFor="otherGoal">Any other specific goals or notes?</Label>
                                    <Textarea
                                        id="otherGoal"
                                        placeholder="e.g., Improve energy levels, build muscle, prepare for a marathon..."
                                        value={formData.otherGoal}
                                        onChange={handleChange}
                                    />
                                </div>
                            </CardContent>
                        </>
                    )}
                    <CardFooter className="justify-between mt-6">
                        <Button variant="outline" onClick={handlePrev} disabled={step === 1}>
                            <ChevronLeft className="mr-2 h-4 w-4" /> Previous
                        </Button>
                        {step < onboardingSteps.length ? (
                             <Button onClick={handleNext} disabled={isNextDisabled || isLoading}>
                                {isLoading && step === 2 ? (<><Loader2 className="animate-spin mr-2" /> Analyzing...</>) : (<>Next <ChevronRight className="ml-2 h-4 w-4" /></>)}
                            </Button>
                        ) : (
                            <Button onClick={handleSubmit} disabled={isSubmitDisabled}>
                                {isLoading ? <Loader2 className="animate-spin mr-2" /> : <Sparkles className="mr-2 h-4 w-4" />}
                                {isLoading ? "Generating Plan..." : "Complete & Start Journey"}
                            </Button>
                        )}
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}

    

    

    
