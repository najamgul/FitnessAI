
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload, IndianRupee } from 'lucide-react';
import { AuthLayout } from '@/components/auth-layout';
import Link from 'next/link';

export default function PaymentPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [paymentAmount, setPaymentAmount] = useState(0);

    useEffect(() => {
        const onboardingDataString = localStorage.getItem('onboardingData');
        if (onboardingDataString) {
            const onboardingData = JSON.parse(onboardingDataString);
            const duration = parseInt(onboardingData.planDuration, 10);
            if (!isNaN(duration)) {
                if (duration >= 7 && duration <= 30) setPaymentAmount(1500);
                else if (duration >= 31 && duration <= 60) setPaymentAmount(2800);
                else if (duration >= 61 && duration <= 90) setPaymentAmount(4000);
            }
        } else {
            // fallback or redirect if no data
            router.push('/onboarding');
        }
    }, [router]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setSelectedFile(e.target.files[0]);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedFile) {
            toast({
                title: 'No file selected',
                description: 'Please upload your payment screenshot.',
                variant: 'destructive',
            });
            return;
        }

        setIsLoading(true);

        // Simulate upload and admin notification
        setTimeout(() => {
            // Clean up local storage
            localStorage.removeItem('onboardingData');
            
            toast({
                title: 'Screenshot Submitted!',
                description: "Your payment is being verified. We'll notify you once access is granted.",
            });
            router.push('/awaiting-approval');
        }, 2000);
    };

    return (
        <AuthLayout>
            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl font-headline">Complete Your Payment</CardTitle>
                    <CardDescription>
                        Please pay the amount below by scanning the QR code, then upload the screenshot to get your plan.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {paymentAmount > 0 && (
                         <div className="p-4 bg-primary rounded-md text-center text-primary-foreground">
                            <p className="text-sm">Total Amount Due</p>
                            <p className="text-3xl font-bold flex items-center justify-center gap-1"><IndianRupee size={24}/> {paymentAmount}</p>
                        </div>
                    )}
                    <div className="flex justify-center p-4 border rounded-lg bg-white">
                        <Image
                            src="/qr-code.png"
                            alt="Payment QR Code"
                            width={250}
                            height={250}
                        />
                    </div>

                    <div className="text-center text-sm text-muted-foreground">
                        Or WhatsApp your screenshot to <a href="https://wa.me/916006524788?text=Here%20is%20my%20payment%20screenshot%20for%20the%20Aziaf%20diet%20plan." target="_blank" rel="noopener noreferrer" className="font-semibold text-primary underline"> +91 60065 24788</a>.
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="screenshot">Upload Payment Screenshot</Label>
                            <div className="flex items-center gap-4">
                                <Input
                                    id="screenshot"
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileChange}
                                    className="flex-grow"
                                    disabled={isLoading}
                                />
                            </div>
                            {selectedFile && <p className="text-sm text-muted-foreground">Selected: {selectedFile.name}</p>}
                        </div>
                        <Button type="submit" className="w-full" disabled={isLoading || !selectedFile}>
                            {isLoading ? <Loader2 className="animate-spin" /> : <Upload className="mr-2" />}
                            Submit for Approval
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </AuthLayout>
    );
}
