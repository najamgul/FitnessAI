
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { AuthLayout } from '@/components/auth-layout';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { motion } from 'framer-motion';
import { Loader2, Mail, Lock, ArrowRight, Sparkles } from 'lucide-react';

export default function LoginPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isResetting, setIsResetting] = useState(false);
    const [focusedField, setFocusedField] = useState<string | null>(null);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        if (!email || !password) {
            toast({ title: 'Login Failed', description: 'Please enter both email and password.', variant: 'destructive' });
            setIsLoading(false);
            return;
        }

        try {
            await signInWithEmailAndPassword(auth, email, password);
            toast({ title: '🎉 Welcome Back!', description: 'Loading your dashboard...' });
            router.push('/dashboard');
        } catch (error: any) {
            let errorMessage = 'An unexpected error occurred.';
            switch (error.code) {
                case 'auth/user-not-found':
                case 'auth/wrong-password':
                case 'auth/invalid-credential':
                    errorMessage = 'Invalid email or password.';
                    break;
                case 'auth/invalid-email':
                    errorMessage = 'Please enter a valid email address.';
                    break;
                default:
                    console.error('Login Error:', error);
            }
            toast({ title: 'Login Failed', description: errorMessage, variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleForgotPassword = async () => {
        if (!email) {
            toast({ title: 'Email Required', description: 'Enter your email first to reset your password.', variant: 'destructive' });
            return;
        }
        setIsResetting(true);
        try {
            await sendPasswordResetEmail(auth, email);
            toast({ title: '📧 Reset Email Sent', description: 'Check your inbox for a password reset link.' });
        } catch (error: any) {
            toast({ title: 'Error', description: error.message || 'Could not send reset email.', variant: 'destructive' });
        } finally {
            setIsResetting(false);
        }
    };

    const inputBase = "w-full pl-11 pr-4 py-3.5 rounded-2xl border-2 outline-none transition-all duration-300 bg-white/60 backdrop-blur-sm text-gray-900 placeholder:text-gray-400 text-sm";
    const inputFocused = "border-emerald-400 ring-4 ring-emerald-100 bg-white shadow-sm";
    const inputDefault = "border-gray-200 hover:border-emerald-200";

    return (
        <AuthLayout>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="bg-white/70 backdrop-blur-xl border border-emerald-100 rounded-[2rem] p-8 shadow-xl shadow-emerald-900/5"
            >
                {/* Header */}
                <div className="text-center mb-8">
                    <motion.div
                        initial={{ scale: 0 }} animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 200, delay: 0.4 }}
                        className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-50 mb-4"
                    >
                        <Sparkles className="w-7 h-7 text-emerald-600" />
                    </motion.div>
                    <h1 className="text-2xl font-bold text-gray-900">Welcome Back!</h1>
                    <p className="text-gray-400 text-sm mt-1">Continue your nutrition journey</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-5">
                    {/* Email */}
                    <motion.div className="relative" whileTap={{ scale: 0.995 }}>
                        <Mail className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-300 ${focusedField === 'email' ? 'text-emerald-500' : 'text-gray-400'}`} />
                        <input
                            id="login-email" type="email" placeholder="your@email.com" required
                            value={email} onChange={(e) => setEmail(e.target.value)}
                            onFocus={() => setFocusedField('email')} onBlur={() => setFocusedField(null)}
                            disabled={isLoading || isResetting}
                            className={`${inputBase} ${focusedField === 'email' ? inputFocused : inputDefault}`}
                        />
                    </motion.div>

                    {/* Password */}
                    <motion.div className="relative" whileTap={{ scale: 0.995 }}>
                        <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-300 ${focusedField === 'password' ? 'text-emerald-500' : 'text-gray-400'}`} />
                        <input
                            id="login-password" type="password" placeholder="••••••••" required
                            value={password} onChange={(e) => setPassword(e.target.value)}
                            onFocus={() => setFocusedField('password')} onBlur={() => setFocusedField(null)}
                            disabled={isLoading || isResetting}
                            className={`${inputBase} ${focusedField === 'password' ? inputFocused : inputDefault}`}
                        />
                    </motion.div>

                    {/* Forgot */}
                    <div className="flex justify-end">
                        <button type="button" onClick={handleForgotPassword} disabled={isResetting || isLoading}
                            className="text-xs text-emerald-600 hover:text-emerald-700 font-medium transition-colors disabled:opacity-50">
                            {isResetting ? 'Sending...' : 'Forgot password?'}
                        </button>
                    </div>

                    {/* Submit */}
                    <motion.button
                        type="submit" disabled={isLoading || isResetting}
                        className="w-full py-3.5 bg-emerald-700 text-white text-sm font-semibold rounded-2xl shadow-lg shadow-emerald-700/25 hover:bg-emerald-800 transition-all duration-300 disabled:opacity-60 flex items-center justify-center gap-2"
                        whileHover={{ scale: 1.02, y: -1 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><span>Log In</span><ArrowRight className="w-4 h-4" /></>}
                    </motion.button>
                </form>

                {/* Divider */}
                <div className="mt-6 mb-4 flex items-center gap-3">
                    <div className="flex-1 h-px bg-gray-200" />
                    <span className="text-xs text-gray-400">New here?</span>
                    <div className="flex-1 h-px bg-gray-200" />
                </div>

                {/* Sign Up Link */}
                <Link href="/signup">
                    <motion.div
                        className="w-full py-3 border-2 border-emerald-200 text-emerald-700 text-sm font-semibold rounded-2xl text-center hover:bg-emerald-50 transition-all duration-300"
                        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    >
                        Create an Account
                    </motion.div>
                </Link>
            </motion.div>
        </AuthLayout>
    );
}
