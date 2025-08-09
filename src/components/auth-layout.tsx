import type React from 'react';
import { Leaf } from 'lucide-react';
import Link from 'next/link';

export function AuthLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
            <div className="w-full max-w-md">
                <div className="mb-8 flex justify-center">
                    <Link href="/dashboard" className="flex items-center gap-2 text-3xl font-bold font-headline text-primary">
                        <Leaf className="h-8 w-8" />
                        Aziaf
                    </Link>
                </div>
                {children}
            </div>
        </div>
    );
}
