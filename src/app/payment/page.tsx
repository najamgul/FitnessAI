
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload, IndianRupee, CheckCircle2, FileCheck } from 'lucide-react';
import { AuthLayout } from '@/components/auth-layout';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp, updateDoc } from 'firebase/firestore';

const WhatsAppIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
);

function blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

export default function PaymentPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [paymentAmount, setPaymentAmount] = useState(0);
    const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                setCurrentUser(user);
                const storedOnboardingData = localStorage.getItem('onboardingData');
                if (storedOnboardingData) {
                    const data = JSON.parse(storedOnboardingData);
                    const duration = parseInt(data.planDuration, 10);
                    if (!isNaN(duration)) {
                        if (duration >= 7 && duration <= 30) setPaymentAmount(1500);
                        else if (duration >= 31 && duration <= 60) setPaymentAmount(2800);
                        else if (duration >= 61 && duration <= 90) setPaymentAmount(4000);
                    }
                } else {
                    router.push('/onboarding');
                }
            } else {
                router.push('/login');
            }
        });
        return () => unsubscribe();
    }, [router]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            if (!file.type.startsWith('image/')) {
                toast({ title: 'Invalid File Type', description: 'Please upload an image file.', variant: 'destructive' });
                return;
            }
            if (file.size > 5 * 1024 * 1024) { // 5MB limit
                 toast({ title: 'File Too Large', description: 'Please upload an image smaller than 5MB.', variant: 'destructive' });
                return;
            }
            setSelectedFile(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedFile || !currentUser) {
            toast({
                title: 'Error',
                description: 'Missing required information. Please ensure you are logged in and have selected a file.',
                variant: 'destructive',
            });
            return;
        }

        setIsLoading(true);

        try {
            const screenshotUrl = await blobToBase64(selectedFile);
            
            const paymentDocRef = doc(db, 'payments', currentUser.uid);
            await setDoc(paymentDocRef, {
                userId: currentUser.uid,
                email: currentUser.email,
                screenshotUrl, // In a real app, upload to Firebase Storage and store the URL
                status: 'pending_verification',
                submittedAt: serverTimestamp(),
                amount: paymentAmount,
            });

            // Update user status
            const userDocRef = doc(db, 'users', currentUser.uid);
            await updateDoc(userDocRef, {
                paymentStatus: 'pending'
            });

            // Remove onboarding data from localStorage after successful submission
            localStorage.removeItem('onboardingData'); 

            toast({
                title: 'Screenshot Submitted!',
                description: "Your payment is being verified. We'll notify you once access is granted.",
            });
            router.push('/awaiting-approval');

        } catch (error) {
            console.error("Payment submission error:", error);
            toast({ title: 'Submission Error', description: 'Could not submit your payment. Please try again.', variant: 'destructive'});
            setIsLoading(false);
        }
    };

    if (!currentUser) {
         return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>
    }

    return (
        <AuthLayout>
            <Card className="w-full">
                <CardHeader>
                    <CardTitle className="text-2xl font-headline">Complete Your Payment</CardTitle>
                    <CardDescription>
                        Follow the steps below to activate your personalized diet plan.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {paymentAmount > 0 && (
                         <div className="p-4 bg-primary rounded-lg text-center text-primary-foreground">
                            <p className="text-sm">Total Amount Due</p>
                            <p className="text-3xl font-bold flex items-center justify-center gap-1"><IndianRupee size={24}/> {paymentAmount}</p>
                        </div>
                    )}
                    
                    <div className="space-y-4">
                        <div className="flex items-start gap-4">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold flex-shrink-0">1</div>
                            <div className="space-y-2">
                                <h3 className="font-semibold">Pay & Share Screenshot</h3>
                                <p className="text-sm text-muted-foreground">Scan the QR code to pay. For faster approval, WhatsApp us the screenshot.</p>
                                <div className="flex flex-col sm:flex-row items-center gap-4 pt-2">
                                    <div className="p-2 border rounded-lg bg-white">
                                        <Image
                                            src="/qr-code.png"
                                            alt="Payment QR Code"
                                            width={150}
                                            height={150}
                                        />
                                    </div>
                                    <Button asChild variant="outline" className="w-full sm:w-auto">
                                        <a href="https://wa.me/916006524788?text=Here%20is%20my%20payment%20screenshot%20for%20the%20Aziaf%20diet%20plan." target="_blank" rel="noopener noreferrer">
                                            <WhatsAppIcon className="text-green-500" />
                                            WhatsApp Screenshot
                                        </a>
                                    </Button>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-start gap-4">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold flex-shrink-0">2</div>
                             <div className="space-y-2 w-full">
                                <h3 className="font-semibold">Upload & Submit for Approval</h3>
                                 <p className="text-sm text-muted-foreground">Upload the same screenshot here to link it to your account.</p>
                                <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                                     <div>
                                        <Label htmlFor="screenshot" className={`flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/50 p-6 text-center transition-colors hover:border-primary ${selectedFile ? 'border-green-500 bg-green-500/10' : ''}`}>
                                            {selectedFile ? <FileCheck className="text-green-500" /> : <Upload />}
                                            <span className={selectedFile ? 'text-green-600 font-semibold' : 'text-muted-foreground'}>
                                                {selectedFile ? selectedFile.name : 'Click to upload screenshot'}
                                            </span>
                                        </Label>
                                        <Input
                                            id="screenshot"
                                            type="file"
                                            accept="image/*"
                                            onChange={handleFileChange}
                                            className="hidden"
                                            disabled={isLoading}
                                        />
                                    </div>
                                    <Button type="submit" className="w-full" disabled={isLoading || !selectedFile}>
                                        {isLoading ? <Loader2 className="animate-spin" /> : <CheckCircle2 />}
                                        Submit for Approval
                                    </Button>
                                </form>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </AuthLayout>
    );
}
