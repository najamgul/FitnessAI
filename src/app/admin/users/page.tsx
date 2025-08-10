
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { collection, doc, getDocs, onSnapshot, query, updateDoc, where, getDoc, setDoc, addDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { Loader2 } from 'lucide-react';

type User = {
    id: string; // Firestore document ID
    name: string;
    email: string;
    screenshotUrl?: string; // from payments collection
    paymentStatus: string;
    planStatus: string;
    days?: number;
    assignedTo?: string;
    paymentId?: string;
    role: 'user' | 'admin';
    planDuration?: string;
};

type TeamMember = {
    id: string; // Firestore document ID
    name: string;
    email: string;
};

export default function AdminUsersPage() {
    const { toast } = useToast();
    const [users, setUsers] = useState<User[]>([]);
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
    const [accessDays, setAccessDays] = useState<{ [key: string]: string }>({});
    const [assignments, setAssignments] = useState<{ [key: string]: string }>({});
    const [isLoading, setIsLoading] = useState(true);

    const fetchUsersAndPayments = useCallback(() => {
        setIsLoading(true);
        const usersQuery = query(collection(db, 'users'));
        const paymentsCollection = collection(db, 'payments');

        const unsubscribe = onSnapshot(usersQuery, async (usersSnapshot) => {
            try {
                const userList: User[] = [];

                for (const userDoc of usersSnapshot.docs) {
                    const userData = userDoc.data();
                    let user: User = {
                        id: userDoc.id,
                        name: userData.name,
                        email: userData.email,
                        paymentStatus: userData.paymentStatus || 'unpaid',
                        planStatus: userData.planStatus || 'not_started',
                        assignedTo: userData.assignedTo || '',
                        role: userData.role || 'user',
                    };

                    if (user.paymentStatus === 'pending') {
                        const paymentDocRef = doc(paymentsCollection, user.id);
                        const paymentDoc = await getDoc(paymentDocRef);
                        if (paymentDoc.exists()) {
                            user.screenshotUrl = paymentDoc.data().screenshotUrl;
                        }
                    }
                    
                    // Fetch onboarding data to get plan duration
                    const onboardingDocRef = doc(db, 'users', user.id, 'onboarding', 'profile');
                    const onboardingDoc = await getDoc(onboardingDocRef);
                    if (onboardingDoc.exists()) {
                        user.planDuration = onboardingDoc.data().planDuration;
                    }
                    
                    userList.push(user);
                }

                setUsers(userList);
            } catch (error: any) {
                 console.error("Error processing user data:", error);
                 if (error.code !== 'permission-denied') {
                    toast({ title: "Error", description: "Could not process user data.", variant: "destructive" });
                 }
            } finally {
                setIsLoading(false);
            }
        }, (error) => {
            console.error("Error fetching users snapshot:", error);
            if (error.code !== 'permission-denied') {
                toast({ title: "Error", description: "Could not fetch user data.", variant: "destructive" });
            }
            setIsLoading(false);
        });
        
        return unsubscribe;
    }, [toast]);


    useEffect(() => {
        let teamUnsubscribe: (() => void) | undefined;
        let usersUnsubscribe: (() => void) | undefined;

        const authUnsubscribe = onAuthStateChanged(auth, user => {
            if (user) {
                const userDocRef = doc(db, 'users', user.uid);
                getDoc(userDocRef).then(userDoc => {
                    if(userDoc.exists() && userDoc.data().role === 'admin') {
                        teamUnsubscribe = onSnapshot(collection(db, 'team'), (snapshot) => {
                            setTeamMembers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TeamMember)));
                        });
                        usersUnsubscribe = fetchUsersAndPayments();
                    } else {
                        setIsLoading(false);
                        setUsers([]);
                        setTeamMembers([]);
                    }
                })
            } else {
                 setIsLoading(false);
                 setUsers([]);
                 setTeamMembers([]);
            }
        });

        return () => {
            authUnsubscribe();
            teamUnsubscribe && teamUnsubscribe();
            usersUnsubscribe && usersUnsubscribe();
        };
    }, [fetchUsersAndPayments]);

    const handleApprove = async (userId: string, userEmail: string, userName: string) => {
        const days = parseInt(accessDays[userId] || '30', 10);
        const assignedToName = assignments[userId];
        const assignedToMember = teamMembers.find(m => m.name === assignedToName);

        if (isNaN(days) || days <= 0) {
            toast({ title: 'Invalid Input', description: 'Please enter a valid number of days.', variant: 'destructive' });
            return;
        }
        if (!assignedToMember) {
            toast({ title: 'Assignment Required', description: 'Please assign a team member.', variant: 'destructive' });
            return;
        }

        try {
            const expiryDate = new Date();
            expiryDate.setDate(expiryDate.getDate() + days);

            const userDocRef = doc(db, 'users', userId);
            await updateDoc(userDocRef, {
                paymentStatus: 'approved',
                planStatus: 'pending_review',
                assignedTo: assignedToMember.name,
                paymentExpiryDate: expiryDate.toISOString(),
            });

            await addDoc(collection(db, 'reviews'), {
                userId: userId,
                userName: userName,
                userEmail: userEmail,
                assignedTo: assignedToMember.name,
                assignedToId: assignedToMember.id,
                status: 'pending_generation',
                createdAt: new Date().toISOString(),
            });

            const paymentDocRef = doc(db, 'payments', userId);
            await updateDoc(paymentDocRef, {
                status: 'verified',
            });

            toast({
                title: 'User Approved & Assigned',
                description: `${userEmail} assigned to ${assignedToMember.name} for ${days} days.`
            });
            // The onSnapshot listener will refresh the list automatically
        } catch (error) {
            console.error("Approval Error: ", error);
             toast({
                title: 'Approval Failed',
                description: 'Could not update user status in the database.',
                variant: 'destructive'
            });
        }
    };

    const handleDaysChange = (userId: string, value: string) => {
        setAccessDays(prev => ({ ...prev, [userId]: value }));
    };

    const handleAssignmentChange = (userId: string, value: string) => {
        setAssignments(prev => ({ ...prev, [userId]: value }));
    };

    if (isLoading) {
        return <div className="flex items-center justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
    }

    return (
        <div className="container mx-auto py-8">
            <Card>
                <CardHeader>
                    <CardTitle className="text-3xl font-bold font-headline">User Management</CardTitle>
                    <CardDescription>Review payment submissions, assign team members, and manage user roles.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="w-full whitespace-nowrap">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>User</TableHead>
                                    <TableHead>Screenshot</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {users.length > 0 ? (
                                    users.map(user => (
                                        <TableRow key={user.id}>
                                            <TableCell>
                                                <div className="font-medium">{user.name}</div>
                                                <div className="text-sm text-muted-foreground">{user.email}</div>
                                            </TableCell>
                                            <TableCell>
                                                {user.screenshotUrl ? (
                                                    <a href={user.screenshotUrl} target="_blank" rel="noopener noreferrer">
                                                        <Image src={user.screenshotUrl} alt="Payment Screenshot" width={75} height={150} className="rounded-md object-cover"/>
                                                    </a>
                                                ) : <span className="text-xs text-muted-foreground">N/A</span>}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={user.paymentStatus === 'approved' ? 'default' : 'secondary'}>
                                                    {user.paymentStatus.charAt(0).toUpperCase() + user.paymentStatus.slice(1)}
                                                </Badge>
                                                {user.assignedTo && <div className="text-xs text-muted-foreground mt-1">Assigned: {user.assignedTo}</div>}
                                            </TableCell>
                                            <TableCell>
                                                {user.paymentStatus === 'pending' ? (
                                                    <div className="flex items-start gap-4 flex-wrap">
                                                        <div className="space-y-1">
                                                             <Input
                                                                type="number"
                                                                placeholder="Days (e.g., 30)"
                                                                className="w-40"
                                                                value={accessDays[user.id] || ''}
                                                                onChange={(e) => handleDaysChange(user.id, e.target.value)}
                                                            />
                                                            {user.planDuration && (
                                                                <p className="text-xs text-muted-foreground">Requested: {user.planDuration} days</p>
                                                            )}
                                                        </div>
                                                        <Select onValueChange={(value) => handleAssignmentChange(user.id, value)}>
                                                            <SelectTrigger className="w-[180px]">
                                                                <SelectValue placeholder="Assign to..." />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {teamMembers.map(member => (
                                                                    <SelectItem key={member.id} value={member.name}>{member.name}</SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                        <Button size="sm" onClick={() => handleApprove(user.id, user.email, user.name)}>Approve & Assign</Button>
                                                    </div>
                                                ) : <span className="text-sm text-muted-foreground">No pending actions.</span>}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center h-24">No user submissions yet.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                         <ScrollBar orientation="horizontal" />
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>
    );
}
