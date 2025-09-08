
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { AuthLayout } from '@/components/auth-layout';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

export default function SignupPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        if (!name || !email || !password || !phone) {
            toast({
                title: 'Signup Failed',
                description: 'Please fill in all required fields.',
                variant: 'destructive',
            });
            setIsLoading(false);
            return;
        }

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            const isAdmin = email.toLowerCase() === 'care@aziaf.com';

            // Set the user document in Firestore
            await setDoc(doc(db, 'users', user.uid), {
                name,
                email,
                phone,
                createdAt: serverTimestamp(),
                role: isAdmin ? 'admin' : 'user',
                paymentStatus: 'unpaid',
                planStatus: 'not_started',
            });

            // If the user is an admin, call the API to set the custom claim
            if (isAdmin) {
                try {
                    const token = await user.getIdToken();
                    const response = await fetch('/api/set-admin-claim', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ uid: user.uid }),
                    });
                    if (!response.ok) {
                       throw new Error('Failed to set admin claim');
                    }
                    // Force refresh the token on the client to get the new claim immediately
                    await user.getIdToken(true);
                } catch (claimError) {
                    console.error("Failed to set admin claim:", claimError);
                    toast({
                        title: 'Admin Setup Incomplete',
                        description: 'Could not set admin privileges. Please contact support.',
                        variant: 'destructive'
                    });
                }
            }
            
            toast({
                title: 'Account Created',
                description: "Welcome! Let's get you set up.",
            });
            
            // Redirect based on role
            if (isAdmin) {
                router.push('/admin/users'); 
            } else {
                router.push('/onboarding');
            }

        } catch (error: any) {
            let errorMessage = 'An unexpected error occurred.';
            switch (error.code) {
                case 'auth/email-already-in-use':
                    errorMessage = 'This email address is already in use.';
                    break;
                case 'auth/invalid-email':
                    errorMessage = 'Please enter a valid email address.';
                    break;
                case 'auth/weak-password':
                    errorMessage = 'The password is too weak. Please use at least 6 characters.';
                    break;
                default:
                    console.error('Signup Error:', error);
            }
            toast({
                title: 'Signup Failed',
                description: errorMessage,
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AuthLayout>
            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl font-headline">Create an Account</CardTitle>
                    <CardDescription>Start your journey to a healthier you.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSignup} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Full Name</Label>
                            <Input
                                id="name"
                                type="text"
                                placeholder="John Doe"
                                required
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                disabled={isLoading}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="your@email.com"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={isLoading}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="phone">Phone Number</Label>
                            <Input
                                id="phone"
                                type="tel"
                                placeholder="+91 12345 67890"
                                required
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                disabled={isLoading}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="••••••••"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={isLoading}
                            />
                        </div>
                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? <Loader2 className="animate-spin" /> : 'Create Account'}
                        </Button>
                    </form>
                    <div className="mt-4 text-center text-sm">
                        Already have an account?{' '}
                        <Link href="/login" className="underline text-primary">
                            Log In
                        </Link>
                    </div>
                </CardContent>
            </Card>
        </AuthLayout>
    );
}
