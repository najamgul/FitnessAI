
import { AuthLayout } from '@/components/auth-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { MailCheck } from 'lucide-react';

export default function AwaitingApprovalPage() {
    return (
        <AuthLayout>
            <Card className="w-full max-w-md text-center shadow-lg">
                <CardHeader className="items-center space-y-4 pt-8">
                    <div className="mx-auto bg-primary text-primary-foreground rounded-full h-20 w-20 flex items-center justify-center">
                        <MailCheck className="h-10 w-10" />
                    </div>
                    <CardTitle className="text-3xl font-headline">Submission Received!</CardTitle>
                    <CardDescription className="text-base px-4">
                        Thank you for your payment. Our team is currently reviewing your submission.
                        You will be notified via email once your account is activated. This usually takes a few hours.
                    </CardDescription>
                </CardHeader>
                <CardContent className="pb-8">
                   <p className="text-sm text-muted-foreground">
                        If you have any questions, you can contact our support team at <span className="font-semibold text-foreground">+91 60065 24788</span>.
                   </p>
                </CardContent>
            </Card>
        </AuthLayout>
    );
}
