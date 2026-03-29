
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { AuthLayout } from '@/components/auth-layout';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, User, Mail, Phone, Lock, ArrowRight, Leaf, Check } from 'lucide-react';

export default function SignupPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [focusedField, setFocusedField] = useState<string | null>(null);

    // Password strength
    const strength = password.length === 0 ? 0 : password.length < 6 ? 1 : password.length < 10 ? 2 : 3;
    const strengthLabel = ['', 'Weak', 'Good', 'Strong'][strength];
    const strengthColor = ['', 'bg-red-400', 'bg-amber-400', 'bg-emerald-500'][strength];

    // Progress tracker — gamified
    const fields = [name, email, phone, password];
    const filledCount = fields.filter(f => f.length > 0).length;

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        if (!name || !email || !password || !phone) {
            toast({ title: 'Missing Fields', description: 'Please fill in all fields.', variant: 'destructive' });
            setIsLoading(false);
            return;
        }

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            const isAdmin = email.toLowerCase() === 'care@aziaf.com';

            await setDoc(doc(db, 'users', user.uid), {
                name, email, phone,
                createdAt: serverTimestamp(),
                role: isAdmin ? 'admin' : 'user',
                paymentStatus: 'unpaid',
                planStatus: 'not_started',
            });

            if (isAdmin) {
                try {
                    const token = await user.getIdToken();
                    const response = await fetch('/api/set-admin-claim', {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                        body: JSON.stringify({ uid: user.uid }),
                    });
                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.error || 'Failed to set admin claim');
                    }
                    await user.getIdToken(true);
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    await user.getIdToken(true);
                } catch (claimError) {
                    console.error("Failed to set admin claim:", claimError);
                    toast({ title: 'Admin Setup Incomplete', description: 'Could not set admin privileges.', variant: 'destructive' });
                }
            }

            toast({ title: '🎉 Account Created!', description: isAdmin ? "Setting up admin privileges..." : "Let's personalize your plan!" });

            if (isAdmin) {
                setTimeout(() => router.push('/admin/users'), 1500);
            } else {
                router.push('/onboarding');
            }
        } catch (error: any) {
            let errorMessage = 'An unexpected error occurred.';
            switch (error.code) {
                case 'auth/email-already-in-use': errorMessage = 'This email is already in use.'; break;
                case 'auth/invalid-email': errorMessage = 'Please enter a valid email.'; break;
                case 'auth/weak-password': errorMessage = 'Password too weak — use at least 6 characters.'; break;
                default: console.error('Signup Error:', error);
            }
            toast({ title: 'Signup Failed', description: errorMessage, variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    };

    const inputBase = "w-full pl-11 pr-4 py-3.5 rounded-2xl border-2 outline-none transition-all duration-300 bg-white/60 backdrop-blur-sm text-gray-900 placeholder:text-gray-400 text-sm";
    const inputFocused = "border-emerald-400 ring-4 ring-emerald-100 bg-white shadow-sm";
    const inputDefault = "border-gray-200 hover:border-emerald-200";

    const inputFields = [
        { key: 'name', icon: User, label: 'Full Name', type: 'text', placeholder: 'John Doe', value: name, setter: setName },
        { key: 'email', icon: Mail, label: 'Email', type: 'email', placeholder: 'your@email.com', value: email, setter: setEmail },
        { key: 'phone', icon: Phone, label: 'Phone', type: 'tel', placeholder: '+91 12345 67890', value: phone, setter: setPhone },
        { key: 'password', icon: Lock, label: 'Password', type: 'password', placeholder: '••••••••', value: password, setter: setPassword },
    ];

    return (
        <AuthLayout>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="bg-white/70 backdrop-blur-xl border border-emerald-100 rounded-[2rem] p-8 shadow-xl shadow-emerald-900/5"
            >
                {/* Header */}
                <div className="text-center mb-6">
                    <motion.div
                        initial={{ scale: 0 }} animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 200, delay: 0.4 }}
                        className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-50 mb-4"
                    >
                        <Leaf className="w-7 h-7 text-emerald-600" />
                    </motion.div>
                    <h1 className="text-2xl font-bold text-gray-900">Start Your Journey</h1>
                    <p className="text-gray-400 text-sm mt-1">Create your free account in seconds</p>
                </div>

                {/* Progress Bar — Gamified */}
                <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-gray-400">Profile Progress</span>
                        <span className="text-xs font-bold text-emerald-600">{Math.round((filledCount / 4) * 100)}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <motion.div
                            className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full"
                            animate={{ width: `${(filledCount / 4) * 100}%` }}
                            transition={{ duration: 0.4, ease: 'easeOut' }}
                        />
                    </div>
                    <div className="flex justify-between mt-2">
                        {['Name', 'Email', 'Phone', 'Password'].map((label, i) => (
                            <motion.div key={label} className="flex items-center gap-1"
                                animate={{ opacity: fields[i].length > 0 ? 1 : 0.4 }}>
                                <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] ${fields[i].length > 0 ? 'bg-emerald-500 text-white' : 'bg-gray-200'}`}>
                                    {fields[i].length > 0 && <Check className="w-2.5 h-2.5" />}
                                </div>
                                <span className="text-[10px] text-gray-400 hidden sm:inline">{label}</span>
                            </motion.div>
                        ))}
                    </div>
                </div>

                <form onSubmit={handleSignup} className="space-y-4">
                    {inputFields.map((field, index) => (
                        <motion.div key={field.key} className="relative"
                            initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.4, delay: 0.4 + index * 0.08 }}
                            whileTap={{ scale: 0.995 }}>
                            <field.icon className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-300 ${focusedField === field.key ? 'text-emerald-500' : 'text-gray-400'}`} />
                            <input
                                id={`signup-${field.key}`}
                                type={field.type}
                                placeholder={field.placeholder}
                                required
                                value={field.value}
                                onChange={(e) => field.setter(e.target.value)}
                                onFocus={() => setFocusedField(field.key)}
                                onBlur={() => setFocusedField(null)}
                                disabled={isLoading}
                                className={`${inputBase} ${focusedField === field.key ? inputFocused : inputDefault}`}
                            />
                            {/* Filled checkmark */}
                            <AnimatePresence>
                                {field.value.length > 0 && focusedField !== field.key && (
                                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center">
                                        <Check className="w-3 h-3 text-emerald-600" />
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    ))}

                    {/* Password Strength */}
                    <AnimatePresence>
                        {password.length > 0 && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                                className="flex items-center gap-2">
                                <div className="flex gap-1 flex-1">
                                    {[1, 2, 3].map(level => (
                                        <div key={level} className={`h-1 flex-1 rounded-full transition-all duration-300 ${strength >= level ? strengthColor : 'bg-gray-200'}`} />
                                    ))}
                                </div>
                                <span className={`text-xs font-medium ${strength === 3 ? 'text-emerald-600' : strength === 2 ? 'text-amber-600' : 'text-red-500'}`}>
                                    {strengthLabel}
                                </span>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Submit */}
                    <motion.button
                        type="submit" disabled={isLoading || filledCount < 4}
                        className="w-full py-3.5 bg-emerald-700 text-white text-sm font-semibold rounded-2xl shadow-lg shadow-emerald-700/25 hover:bg-emerald-800 transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
                        whileHover={filledCount === 4 ? { scale: 1.02, y: -1 } : {}}
                        whileTap={filledCount === 4 ? { scale: 0.98 } : {}}
                    >
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><span>Create Account</span><ArrowRight className="w-4 h-4" /></>}
                    </motion.button>
                </form>

                {/* Divider */}
                <div className="mt-6 mb-4 flex items-center gap-3">
                    <div className="flex-1 h-px bg-gray-200" />
                    <span className="text-xs text-gray-400">Already a member?</span>
                    <div className="flex-1 h-px bg-gray-200" />
                </div>

                {/* Login Link */}
                <Link href="/login">
                    <motion.div
                        className="w-full py-3 border-2 border-emerald-200 text-emerald-700 text-sm font-semibold rounded-2xl text-center hover:bg-emerald-50 transition-all duration-300"
                        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    >
                        Log In Instead
                    </motion.div>
                </Link>
            </motion.div>
        </AuthLayout>
    );
}
