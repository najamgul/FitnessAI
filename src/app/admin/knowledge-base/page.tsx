
'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, BookOpen, Globe, Mountain, FileText, CheckCircle2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

const container = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } };

export default function AdminKnowledgeBasePage() {
    const { toast } = useToast();
    const router = useRouter();

    const [kashmirKb, setKashmirKb] = useState('');
    const [nonKashmirKb, setNonKashmirKb] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<'kashmir' | 'non-kashmir'>('kashmir');
    const [user, setUser] = useState<User | null>(null);
    const [lastSaved, setLastSaved] = useState<string | null>(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                const userDocRef = doc(db, 'users', currentUser.uid);
                const userDoc = await getDoc(userDocRef);
                if (userDoc.exists() && userDoc.data().role === 'admin') {
                    fetchKnowledgeBases();
                } else {
                    toast({ title: 'Access Denied', description: 'You do not have permission to view this page.', variant: 'destructive' });
                    router.push('/dashboard');
                }
            } else {
                router.push('/login');
            }
        });
        return () => unsubscribe();
    }, [router, toast]);

    const fetchKnowledgeBases = async () => {
        setIsLoading(true);
        try {
            const kashmirDoc = await getDoc(doc(db, 'knowledge-base', 'kashmir'));
            const nonKashmirDoc = await getDoc(doc(db, 'knowledge-base', 'non-kashmir'));
            if (kashmirDoc.exists()) setKashmirKb(kashmirDoc.data().content);
            if (nonKashmirDoc.exists()) setNonKashmirKb(nonKashmirDoc.data().content);
        } catch (error) {
            toast({ title: 'Error', description: 'Could not load knowledge bases.', variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const docId = activeTab;
            const contentToSave = activeTab === 'kashmir' ? kashmirKb : nonKashmirKb;
            await setDoc(doc(db, 'knowledge-base', docId), { content: contentToSave });
            setLastSaved(new Date().toLocaleTimeString());
            toast({ title: '✅ Saved', description: `${activeTab === 'kashmir' ? 'Kashmir' : 'General'} knowledge base updated.` });
        } catch (error: any) {
            toast({ title: 'Save Failed', description: error.message, variant: 'destructive' });
        } finally {
            setIsSaving(false);
        }
    };

    const currentContent = activeTab === 'kashmir' ? kashmirKb : nonKashmirKb;
    const wordCount = currentContent.split(/\s+/).filter(Boolean).length;
    
    if (isLoading) {
        return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-emerald-600" /></div>;
    }

    return (
        <motion.div className="space-y-6" variants={container} initial="hidden" animate="show">
            {/* Page Header */}
            <motion.div variants={item}>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">📚 Knowledge Base</h1>
                <p className="text-sm text-gray-500 mt-1">Edit the context Azai uses to generate personalized diet plans.</p>
            </motion.div>

            {/* Tab Selector */}
            <motion.div variants={item} className="flex gap-2">
                <button
                    onClick={() => setActiveTab('kashmir')}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                        activeTab === 'kashmir'
                            ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200'
                            : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                >
                    <Mountain className="w-4 h-4" />Kashmir
                </button>
                <button
                    onClick={() => setActiveTab('non-kashmir')}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                        activeTab === 'non-kashmir'
                            ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200'
                            : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                >
                    <Globe className="w-4 h-4" />General
                </button>
            </motion.div>

            {/* Editor Card */}
            <motion.div variants={item} className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
                {/* Editor Header */}
                <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                        <FileText className="w-4 h-4 text-gray-400" />
                        <span className="font-medium">{activeTab === 'kashmir' ? 'Kashmir Region' : 'General'}</span>
                        <span className="text-xs text-gray-300">•</span>
                        <span className="text-xs text-gray-400">{wordCount} words</span>
                    </div>
                    {lastSaved && (
                        <div className="flex items-center gap-1 text-xs text-emerald-600">
                            <CheckCircle2 className="w-3 h-3" /> Saved at {lastSaved}
                        </div>
                    )}
                </div>

                {/* Editor Body */}
                <div className="p-4">
                    <Textarea
                        placeholder={`Enter ${activeTab === 'kashmir' ? 'Kashmir-specific' : 'general'} nutrition knowledge...`}
                        className="min-h-[450px] text-sm font-mono bg-gray-50/50 border-dashed focus:bg-white transition-colors resize-y"
                        value={activeTab === 'kashmir' ? kashmirKb : nonKashmirKb}
                        onChange={(e) => activeTab === 'kashmir' ? setKashmirKb(e.target.value) : setNonKashmirKb(e.target.value)}
                    />
                </div>

                {/* Editor Footer */}
                <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3 bg-gray-50/50">
                    <div className="text-xs text-gray-400">
                        This content is injected into the AI prompt when generating plans.
                    </div>
                    <Button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="bg-emerald-600 hover:bg-emerald-700 text-sm"
                    >
                        {isSaving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
                        Save {activeTab === 'kashmir' ? 'Kashmir' : 'General'}
                    </Button>
                </div>
            </motion.div>
        </motion.div>
    );
}