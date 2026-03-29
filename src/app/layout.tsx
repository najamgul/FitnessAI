import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { ErrorBoundary } from '@/components/error-boundary';

export const metadata: Metadata = {
  title: 'AZIAF — AI-Powered Personalized Nutrition',
  description: 'Transform your health with AI-crafted meal plans, expert-verified nutrition, and real-time tracking. Powered by Azai Intelligence.',
  keywords: ['nutrition', 'diet plan', 'AI', 'health', 'meal planning', 'fitness'],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
        <Toaster />
      </body>
    </html>
  );
}
