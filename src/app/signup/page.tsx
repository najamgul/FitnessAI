
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Camera, FileCheck } from 'lucide-react';
import { AuthLayout } from '@/components/auth-layout';

export default function SignupPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [photo, setPhoto] = useState<File | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            if (!file.type.startsWith('image/')) {
                toast({ title: 'Invalid File Type', description: 'Please upload an image.', variant: 'destructive' });
                return;
            }
            if (file.size > 5 * 1024 * 1024) { // 5MB limit
                 toast({ title: 'File Too Large', description: 'Please upload an image smaller than 5MB.', variant: 'destructive' });
                return;
            }
            setPhoto(file);
        }
    };

    const handleSignup = (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        // In a real app, you would upload the photo to a storage service
        // and handle the rest of the user data.

        setTimeout(() => {
            if (name && email && password && phone) {
                toast({
                    title: 'Account Created',
                    description: "We've created your account for you.",
                });
                router.push('/onboarding');
            } else {
                toast({
                    title: 'Signup Failed',
                    description: 'Please fill in all required fields.',
                    variant: 'destructive',
                });
                setIsLoading(false);
            }
        }, 1500);
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
                        <div className="space-y-2">
                            <Label htmlFor="photo">Full Body Photo (Optional)</Label>
                            <p className="text-xs text-muted-foreground -mt-1">
                                This helps us track progress visually. You can wear a mask for privacy.
                            </p>
                            <Label htmlFor="photo-upload" className={`flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/50 p-6 text-center transition-colors hover:border-primary ${photo ? 'border-green-500 bg-green-500/10' : ''}`}>
                                {photo ? <FileCheck className="text-green-500" /> : <Camera />}
                                <span className={photo ? 'text-green-600 font-semibold' : 'text-muted-foreground'}>
                                    {photo ? photo.name : 'Click to upload photo'}
                                </span>
                            </Label>
                            <Input
                                id="photo-upload"
                                type="file"
                                accept="image/*"
                                onChange={handleFileChange}
                                className="hidden"
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
