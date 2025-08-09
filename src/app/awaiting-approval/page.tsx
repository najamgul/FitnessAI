
import { AuthLayout } from '@/components/auth-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { MailCheck } from 'lucide-react';

export default function AwaitingApprovalPage() {
    return (
        <AuthLayout>
            <Card className="text-center">
                <CardHeader>
                    <div className="mx-auto bg-primary text-primary-foreground rounded-full h-16 w-16 flex items-center justify-center">
                        <MailCheck className="h-8 w-8" />
                    </div>
                    <CardTitle className="mt-4 text-2xl font-headline">Submission Received!</CardTitle>
                    <CardDescription>
                        Thank you for your payment. Our team is currently reviewing your submission.
                        You will be notified via email once your account is activated. This usually takes a few hours.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                   <p className="text-sm text-muted-foreground">
                        If you have any questions, please contact our support team at <span className="font-semibold">+91 60065 24788</span>.
                   </p>
                </CardContent>
            </Card>
        </AuthLayout>
    );
}
