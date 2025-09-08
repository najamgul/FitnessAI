
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

export default function AdminKnowledgeBasePage() {
    const { toast } = useToast();
    const router = useRouter();

    const [kashmirKb, setKashmirKb] = useState('');
    const [nonKashmirKb, setNonKashmirKb] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [activeTab, setActiveTab] = useState('kashmir');
    const [user, setUser] = useState<User | null>(null);

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

            if (kashmirDoc.exists()) {
                setKashmirKb(kashmirDoc.data().content);
            }
            if (nonKashmirDoc.exists()) {
                setNonKashmirKb(nonKashmirDoc.data().content);
            }

        } catch (error) {
            toast({
                title: 'Error',
                description: 'Could not load knowledge bases. Please try again.',
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    };


    const handleSave = async () => {
        setIsSaving(true);
        try {
            const docId = activeTab === 'kashmir' ? 'kashmir' : 'non-kashmir';
            const contentToSave = activeTab === 'kashmir' ? kashmirKb : nonKashmirKb;

            await setDoc(doc(db, 'knowledge-base', docId), { content: contentToSave });

            toast({
                title: 'Success',
                description: `The ${activeTab} knowledge base has been updated.`,
            });
        } catch (error: any) {
            toast({
                title: 'Save Failed',
                description: error.message,
                variant: 'destructive',
            });
        } finally {
            setIsSaving(false);
        }
    };
    
    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-3xl font-bold font-headline">Manage Knowledge Base</CardTitle>
                <CardDescription>Edit the content used by Azai to answer user questions.</CardDescription>
            </CardHeader>
            <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="kashmir">Kashmir</TabsTrigger>
                        <TabsTrigger value="non-kashmir">Non-Kashmir</TabsTrigger>
                    </TabsList>
                    <TabsContent value="kashmir" className="mt-4">
                        <Textarea
                            placeholder="Enter knowledge base content for Kashmir..."
                            className="min-h-[400px] text-sm font-mono"
                            value={kashmirKb}
                            onChange={(e) => setKashmirKb(e.target.value)}
                        />
                    </TabsContent>
                    <TabsContent value="non-kashmir" className="mt-4">
                        <Textarea
                            placeholder="Enter general knowledge base content..."
                            className="min-h-[400px] text-sm font-mono"
                            value={nonKashmirKb}
                            onChange={(e) => setNonKashmirKb(e.target.value)}
                        />
                    </TabsContent>
                </Tabs>

                <div className="mt-6 flex justify-end">
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Save className="mr-2 h-4 w-4" />
                        )}
                        Save {activeTab === 'kashmir' ? 'Kashmir' : 'Non-Kashmir'} Content
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

    