
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, User, Edit3, Save, X, Copy, Image as ImageIcon, Trash2, CheckCircle } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import type { GenerateDietPlanOutput } from '@/ai/flows/generate-diet-plan';
import { Badge } from '@/components/ui/badge';
import { collection, query, where, onSnapshot, doc, getDocs, updateDoc, setDoc, getDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import NextImage from 'next/image';

type Client = {
    id: string; // user ID
    name: string;
    email: string;
    planStatus: string;
    dietPlan?: DietPlanDay[];
};

type Meal = {
    meal: string;
    hint: string;
    calories: number;
    description: string;
    imageUrl?: string;
};

type DietPlanDay = {
    day: number;
    meals: { [key: string]: Meal };
};

export default function AdminClientsPage() {
    const { toast } = useToast();
    const [clients, setClients] = useState<Client[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [savingFor, setSavingFor] = useState<string | null>(null);
    const [editablePlans, setEditablePlans] = useState<{ [clientId: string]: DietPlanDay[] }>({});
    const [editingCell, setEditingCell] = useState<{ clientId: string; dayIndex: number; mealTime: string; field: keyof Meal | 'imageUrl' } | null>(null);
    const [tempValue, setTempValue] = useState<string | number>('');

    const fetchClients = useCallback(() => {
        setIsLoading(true);
        const q = query(collection(db, 'users'), where('planStatus', '==', 'ready'));
        
        const unsubscribe = onSnapshot(q, async (snapshot) => {
            const clientList: Client[] = [];
            for (const userDoc of snapshot.docs) {
                const userData = userDoc.data();
                clientList.push({
                    id: userDoc.id,
                    name: userData.name,
                    email: userData.email,
                    planStatus: userData.planStatus,
                });
            }
            setClients(clientList);
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching clients: ", error);
             if (error.code !== 'permission-denied') {
                toast({ title: "Error", description: "Could not fetch client list.", variant: "destructive" });
             }
            setIsLoading(false);
        });

        return unsubscribe;
    }, [toast]);

    const fetchPlanForClient = useCallback(async (clientId: string) => {
        if (editablePlans[clientId]) return; // Don't re-fetch if already loaded

        const planDocRef = doc(db, 'users', clientId, 'dietPlan', 'current');
        const planDoc = await getDoc(planDocRef);

        if (planDoc.exists()) {
            const planData = planDoc.data() as GenerateDietPlanOutput;
            setEditablePlans(prev => ({
                ...prev,
                [clientId]: planData.dietPlan
            }));
        }
    }, [editablePlans]);


    useEffect(() => {
        let unsubscribe: (() => void) | undefined;
    
        const authUnsubscribe = onAuthStateChanged(auth, user => {
            if (user) {
                const userDocRef = doc(db, 'users', user.uid);
                getDoc(userDocRef).then(userDoc => {
                    if(userDoc.exists() && userDoc.data().role === 'admin') {
                        // Only fetch data if the user is an admin
                        unsubscribe = fetchClients();
                    } else {
                        // Not an admin or user doc doesn't exist
                        setIsLoading(false);
                        setClients([]); // Clear clients if not admin
                    }
                })
            } else {
                 // No user logged in
                 setIsLoading(false);
                 setClients([]);
            }
        });
    
        return () => {
            authUnsubscribe();
            unsubscribe && unsubscribe();
        };
    }, [fetchClients]);

    const handleDuplicateDay = (clientId: string, dayIndex: number) => {
        setEditablePlans(prev => {
            const currentPlan = prev[clientId];
            if (!currentPlan) return prev;
            const dayToDuplicate = JSON.parse(JSON.stringify(currentPlan[dayIndex]));
            const newPlan = [...currentPlan.slice(0, dayIndex + 1), dayToDuplicate, ...currentPlan.slice(dayIndex + 1)];
            const renumberedPlan = newPlan.map((day, index) => ({ ...day, day: index + 1 }));
            return { ...prev, [clientId]: renumberedPlan };
        });
    };

    const handleDeleteDay = (clientId: string, dayIndex: number) => {
        setEditablePlans(prev => {
            const currentPlan = prev[clientId];
            if (!currentPlan || currentPlan.length <= 1) {
                toast({ title: "Cannot Delete", description: "Plan must have at least one day.", variant: "destructive"});
                return prev;
            };
            const newPlan = currentPlan.filter((_, index) => index !== dayIndex);
            const renumberedPlan = newPlan.map((day, index) => ({ ...day, day: index + 1 }));
            return { ...prev, [clientId]: renumberedPlan };
        });
    }

    const handleCellEdit = (clientId: string, dayIndex: number, mealTime: string, field: keyof Meal | 'imageUrl', currentValue: string | number | undefined) => {
        setEditingCell({ clientId, dayIndex, mealTime, field });
        setTempValue(currentValue || '');
    };
    
    const handleCellSave = () => {
        if (!editingCell) return;
        const { clientId, dayIndex, mealTime, field } = editingCell;

        setEditablePlans(prev => {
            const newPlans = { ...prev };
            const newDayPlan = [...newPlans[clientId]];
            const valueToSave = field === 'calories' ? Number(tempValue) : tempValue;
            (newDayPlan[dayIndex].meals[mealTime] as any)[field] = valueToSave;
            newPlans[clientId] = newDayPlan;
            return newPlans;
        });

        setEditingCell(null);
        setTempValue('');
    };


    const handleCellCancel = () => {
        setEditingCell(null);
        setTempValue('');
    };

    const handleSaveChanges = async (client: Client) => {
        setSavingFor(client.id);
        try {
            const finalPlanData = editablePlans[client.id];
            if (!finalPlanData || finalPlanData.length === 0) {
                toast({ title: 'Error', description: 'No plan content to save.', variant: 'destructive' });
                setSavingFor(null);
                return;
            }

            const finalPlan: GenerateDietPlanOutput = { dietPlan: finalPlanData };

            const dietPlanDocRef = doc(db, 'users', client.id, 'dietPlan', 'current');
            await setDoc(dietPlanDocRef, { ...finalPlan }, { merge: true });
            
            toast({ title: 'Plan Updated!', description: `Changes for ${client.email} have been saved.`});

        } catch (error: any) {
            toast({ title: 'Update Failed', description: error.message || 'A database error occurred.', variant: 'destructive' });
        } finally {
            setSavingFor(null);
        }
    };

    const renderEditableCell = (clientId: string, dayIndex: number, mealTime: string, field: keyof Meal | 'imageUrl', value: string | number | undefined) => {
        const isEditing = editingCell?.clientId === clientId && editingCell?.dayIndex === dayIndex && editingCell?.mealTime === mealTime && editingCell?.field === field;
        const isTextArea = field === 'description';
        const isNumber = field === 'calories';
        const isImage = field === 'imageUrl';

        if (isEditing) {
            return (
                <div className="flex flex-col gap-2 p-1">
                     {isTextArea ? (
                        <textarea
                            value={tempValue as string}
                            onChange={(e) => setTempValue(e.target.value)}
                            className="min-h-[80px] text-sm form-textarea"
                            autoFocus
                        />
                    ) : (
                        <Input
                            type={isNumber ? 'number' : 'text'}
                            value={tempValue}
                            onChange={(e) => setTempValue(e.target.value)}
                            className="text-sm h-8"
                            autoFocus
                        />
                    )}
                    <div className="flex gap-2 justify-end">
                        <Button size="icon" onClick={handleCellSave} className="h-6 w-6">
                            <Save className="h-3 w-3" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={handleCellCancel} className="h-6 w-6">
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            );
        }

        if (isImage) {
            return (
                 <div
                    className="group cursor-pointer hover:bg-muted/50 p-2 rounded min-h-[40px] flex items-center justify-between gap-2"
                    onClick={() => handleCellEdit(clientId, dayIndex, mealTime, field, value || '')}
                 >
                    <div className="flex-1 flex items-center gap-2">
                        {value ? (
                             <NextImage src={value as string} alt="Meal" width={40} height={40} className="rounded object-cover" unoptimized/>
                        ) : (
                            <div className="w-10 h-10 bg-muted rounded flex items-center justify-center"><ImageIcon className="w-4 h-4 text-muted-foreground"/></div>
                        )}
                        <span className="text-xs text-muted-foreground truncate w-24">{typeof value === 'string' && value.startsWith('http') ? new URL(value).pathname.split('/').pop() : 'N/A'}</span>
                    </div>
                    <Edit3 className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                </div>
            )
        }

        return (
            <div
                className="group cursor-pointer hover:bg-muted/50 p-2 rounded min-h-[40px] flex items-start justify-between gap-2"
                onClick={() => handleCellEdit(clientId, dayIndex, mealTime, field, value || '')}
            >
                <span className="text-sm flex-1 whitespace-pre-wrap">{value || <span className="text-muted-foreground">N/A</span>}</span>
                <Edit3 className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
            </div>
        );
    };
    
    if (isLoading) {
        return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-3xl font-bold font-headline">Client Diet Plans</CardTitle>
                <CardDescription>View and manage all active, approved diet plans for your clients.</CardDescription>
            </CardHeader>
            <CardContent>
                {clients.length > 0 ? (
                    <Accordion type="single" collapsible className="w-full" onValueChange={(value) => value && fetchPlanForClient(value)}>
                        {clients.map(client => (
                            <AccordionItem key={client.id} value={client.id}>
                                <AccordionTrigger>
                                    <div className="flex justify-between items-center w-full pr-4">
                                        <div className="flex items-center gap-3">
                                            <User />
                                            <div>
                                                <div className="font-bold">{client.name}</div>
                                                <div className="text-sm text-muted-foreground">{client.email}</div>
                                            </div>
                                        </div>
                                        <Badge variant="default">
                                            Plan is Active
                                        </Badge>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="p-4 bg-muted/50 rounded-b-lg">
                                    {editablePlans[client.id] ? (
                                        <div className="space-y-4 mt-6">
                                            <h4 className="font-semibold">Edit Plan</h4>
                                            <ScrollArea className="w-full border rounded-lg bg-background">
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead className="w-16 sticky left-0 bg-muted z-10">Day</TableHead>
                                                            <TableHead>Meal Time</TableHead>
                                                            <TableHead>Meal</TableHead>
                                                            <TableHead>Calories</TableHead>
                                                            <TableHead>Description</TableHead>
                                                            <TableHead>Image</TableHead>
                                                            <TableHead className="w-28 text-center">Actions</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {(editablePlans[client.id] || []).map((dayPlan, dayIndex) => (
                                                            Object.entries(dayPlan.meals).map(([mealTime, mealDetails], mealIndex) => (
                                                                <TableRow key={`${dayPlan.day}-${mealTime}`}>
                                                                    {mealIndex === 0 && (
                                                                        <TableCell rowSpan={Object.keys(dayPlan.meals).length} className="font-medium align-top sticky left-0 bg-background z-10">
                                                                            Day {dayPlan.day}
                                                                        </TableCell>
                                                                    )}
                                                                    <TableCell className="font-semibold min-w-[150px]">{mealTime}</TableCell>
                                                                    <TableCell className="min-w-[200px]">
                                                                        {renderEditableCell(client.id, dayIndex, mealTime, 'meal', mealDetails.meal)}
                                                                    </TableCell>
                                                                    <TableCell className="min-w-[120px]">
                                                                        {renderEditableCell(client.id, dayIndex, mealTime, 'calories', mealDetails.calories)}
                                                                    </TableCell>
                                                                    <TableCell className="min-w-[300px]">
                                                                        {renderEditableCell(client.id, dayIndex, mealTime, 'description', mealDetails.description)}
                                                                    </TableCell>
                                                                    <TableCell className="min-w-[250px]">
                                                                        {renderEditableCell(client.id, dayIndex, mealTime, 'imageUrl', mealDetails.imageUrl)}
                                                                    </TableCell>
                                                                    {mealIndex === 0 && (
                                                                        <TableCell rowSpan={Object.keys(dayPlan.meals).length} className="align-middle">
                                                                            <div className="flex flex-col gap-2 items-center">
                                                                                <Button variant="outline" size="icon" onClick={() => handleDuplicateDay(client.id, dayIndex)} title={`Duplicate Day ${dayPlan.day}`}>
                                                                                    <Copy className="h-4 w-4" />
                                                                                </Button>
                                                                                <Button variant="destructive" size="icon" onClick={() => handleDeleteDay(client.id, dayIndex)} title={`Delete Day ${dayPlan.day}`}>
                                                                                    <Trash2 className="h-4 w-4" />
                                                                                </Button>
                                                                            </div>
                                                                        </TableCell>
                                                                    )}
                                                                </TableRow>
                                                            ))
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                                <ScrollBar orientation="horizontal" />
                                            </ScrollArea>
                                            
                                            <Button onClick={() => handleSaveChanges(client)} disabled={savingFor === client.id} className="w-full">
                                                {savingFor === client.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                                Save Changes for {client.name}
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="flex justify-center items-center h-40">
                                            <Loader2 className="h-6 w-6 animate-spin" />
                                            <p className="ml-2">Loading plan...</p>
                                        </div>
                                    )}
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                ) : (
                    <div className="text-center py-12">
                        <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
                        <h3 className="mt-2 text-lg font-medium">No Active Clients</h3>
                        <p className="mt-1 text-sm text-muted-foreground">There are no users with an approved diet plan yet.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

