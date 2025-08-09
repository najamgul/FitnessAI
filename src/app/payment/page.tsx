
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload } from 'lucide-react';
import { AuthLayout } from '@/components/auth-layout';

export default function PaymentPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

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
                    <CardDescription>Scan the QR code to pay, then upload the screenshot to get your plan.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex justify-center p-4 border rounded-lg bg-white">
                        <Image
                            src="/qr-code.png"
                            alt="Payment QR Code"
                            width={250}
                            height={250}
                        />
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
