
import type React from 'react';
import Image from 'next/image';
import Link from 'next/link';

export function AuthLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
            <div className="w-full max-w-md">
                <div className="mb-8 flex justify-center">
                    <Link href="/dashboard">
                        <Image src="/logo.png" alt="Aziaf Logo" width={256} height={256} />
                    </Link>
                </div>
                {children}
            </div>
        </div>
    );
}
