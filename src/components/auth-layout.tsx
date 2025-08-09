import type React from 'react';
import Image from 'next/image';

export function AuthLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
            <div className="w-full max-w-md">
                <div className="mb-8 flex justify-center">
                    <div className="flex items-center gap-2">
                        <Image src="/logo.png" alt="Aziaf Logo" width={320} height={320} className="h-80 w-80" />
                    </div>
                </div>
                {children}
            </div>
        </div>
    );
}
