
'use client';

import { useState, useEffect } from 'react';
import { useRouter }from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { AuthLayout } from '@/components/auth-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, MailCheck } from 'lucide-react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

export default function AwaitingApprovalPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
            } else {
                router.push('/login');
            }
            setIsLoading(false);
        });

        return () => unsubscribeAuth();
    }, [router]);

    useEffect(() => {
        if (!user) return;

        const userDocRef = doc(db, 'users', user.uid);
        const unsubscribeSnapshot = onSnapshot(userDocRef, (doc) => {
            if (doc.exists()) {
                const userData = doc.data();
                if (userData.planStatus === 'ready') {
                    toast({
                        title: 'Plan Approved!',
                        description: 'Your personalized diet plan is now ready. Redirecting...',
                    });
                    router.push('/dashboard/plan');
                }
            }
        }, (error) => {
            console.error("Error listening to user document:", error);
            toast({
                title: "Error",
                description: "Could not check for plan updates. Please refresh.",
                variant: "destructive"
            });
        });

        return () => unsubscribeSnapshot();

    }, [user, router, toast]);

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin" />
            </div>
        )
    }

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
                        You will be notified via email once your account is activated. This page will redirect automatically when your plan is ready.
                    </CardDescription>
                </CardHeader>
                <CardContent className="pb-8 pt-4">
                    <div className="flex items-center justify-center text-muted-foreground">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        <span>Listening for approval...</span>
                    </div>
                   <p className="text-sm text-muted-foreground pt-4 mt-4 border-t">
                        If you have any questions, you can contact our support team at <span className="font-semibold text-foreground">+91 95961 22125</span>.
                   </p>
                </CardContent>
            </Card>
        </AuthLayout>
    );
}
