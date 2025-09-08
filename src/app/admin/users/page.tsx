
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
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { Loader2, Eye, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { collection, query, where, getDocs, doc, onSnapshot, writeBatch, serverTimestamp, updateDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';


type User = {
    id: string; // Firestore document ID
    name: string;
    email: string;
    phone?: string;
    screenshotUrl?: string; // from payments collection
    paymentStatus: string;
    planStatus: string;
    days?: number;
    assignedTo?: string;
    paymentId?: string;
    role: 'user' | 'admin';
    planDuration?: string;
    onboardingData?: any;
    createdAt: any;
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
    const [isDeleting, setIsDeleting] = useState<string | null>(null);

    const fetchUsersAndTeam = useCallback(() => {
        setIsLoading(true);

        // Nested listener for team members
        const teamUnsubscribe = onSnapshot(collection(db, 'team'), (teamSnapshot) => {
            const fetchedTeam: TeamMember[] = [];
            teamSnapshot.forEach((doc) => {
                fetchedTeam.push({ id: doc.id, ...doc.data() } as TeamMember);
            });
            setTeamMembers(fetchedTeam);
        }, (error) => {
            console.error("Error fetching team members: ", error);
            toast({ title: "Error", description: "Could not fetch team members.", variant: "destructive" });
        });

        // Main listener for users
        const usersUnsubscribe = onSnapshot(query(collection(db, 'users'), where('role', '!=', 'admin')), async (usersSnapshot) => {
            const usersList: User[] = [];
            for (const userDoc of usersSnapshot.docs) {
                const userData = userDoc.data();
                const user: User = {
                    id: userDoc.id,
                    name: userData.name,
                    email: userData.email,
                    phone: userData.phone,
                    paymentStatus: userData.paymentStatus || 'unpaid',
                    planStatus: userData.planStatus || 'not_started',
                    assignedTo: userData.assignedTo || '',
                    role: userData.role || 'user',
                    createdAt: userData.createdAt,
                    onboardingData: null,
                    planDuration: 'N/A'
                };

                if (user.paymentStatus === 'pending') {
                    const paymentDocRef = doc(db, 'payments', user.id);
                    const paymentDoc = await getDoc(paymentDocRef);
                    if (paymentDoc.exists()) {
                        user.screenshotUrl = paymentDoc.data().screenshotUrl;
                    }
                    
                    const onboardingDocRef = doc(db, 'users', user.id, 'onboarding', 'profile');
                    const onboardingDoc = await getDoc(onboardingDocRef);
                    if (onboardingDoc.exists()) {
                        const onboardingData = onboardingDoc.data();
                        user.onboardingData = onboardingData;
                        user.planDuration = onboardingData?.planDuration;
                    }
                }

                usersList.push(user);
            }
            setUsers(usersList.sort((a,b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0)));
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching users: ", error);
             if (error.code !== 'permission-denied') {
                toast({ title: "Error", description: "Could not fetch users.", variant: "destructive" });
             }
            setIsLoading(false);
        });


        return () => {
            teamUnsubscribe();
            usersUnsubscribe();
        };

    }, [toast]);

    useEffect(() => {
        let unsubscribe: (() => void) | undefined;
    
        const authUnsubscribe = onAuthStateChanged(auth, user => {
            if (user) {
                // Check if user is admin before fetching data
                const userDocRef = doc(db, 'users', user.uid);
                getDoc(userDocRef).then(userDoc => {
                    if(userDoc.exists() && userDoc.data().role === 'admin') {
                        unsubscribe = fetchUsersAndTeam();
                    } else {
                        // Not an admin or user doc doesn't exist
                        setIsLoading(false);
                        setUsers([]); // Clear users if not admin
                    }
                })
            } else {
                 // No user logged in
                 setIsLoading(false);
                 setUsers([]);
            }
        });
    
        return () => {
            authUnsubscribe();
            unsubscribe && unsubscribe();
        };
    }, [fetchUsersAndTeam]);

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

            const batch = writeBatch(db);

            // Update the user document
            const userDocRef = doc(db, 'users', userId);
            batch.update(userDocRef, {
                paymentStatus: 'approved',
                planStatus: 'pending_review',
                assignedTo: assignedToMember.name,
                paymentExpiryDate: expiryDate.toISOString(),
            });

            // Create a new review document
            const reviewDocRef = doc(collection(db, 'reviews'));
            batch.set(reviewDocRef, {
                userId: userId,
                userName: userName,
                userEmail: userEmail,
                assignedTo: assignedToMember.name,
                assignedToId: assignedToMember.id,
                status: 'pending_generation',
                createdAt: serverTimestamp(),
            });

            // Update the payment document (if it exists)
            const paymentDocRef = doc(db, 'payments', userId);
            batch.update(paymentDocRef, {
                status: 'verified',
            });
            
            await batch.commit();

            toast({
                title: 'User Approved & Assigned',
                description: `${userEmail} assigned to ${assignedToMember.name} for ${days} days.`
            });

        } catch (error: any) {
            console.error("Approval Error: ", error);
             toast({
                title: 'Approval Failed',
                description: error.message || 'Could not update user status.',
                variant: 'destructive'
            });
        }
    };
    
    const handleDeleteUser = async (userId: string) => {
        setIsDeleting(userId);
        try {
            const functions = getFunctions();
            // Ensure you use the correct function name deployed in your Firebase project
            const deleteUserCallable = httpsCallable(functions, 'deleteUser');
            
            await deleteUserCallable({ userId });

            toast({
                title: 'User Deleted',
                description: 'The user and all their data have been successfully deleted.',
            });
            
        } catch (error: any) {
            console.error("Delete user error:", error);
            toast({
                title: 'Deletion Failed',
                description: error.message || 'An unexpected error occurred.',
                variant: 'destructive'
            });
        } finally {
            setIsDeleting(null);
        }
    }


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
                                    <TableHead>Phone Number</TableHead>
                                    <TableHead>Screenshot</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Actions</TableHead>
                                    <TableHead className="text-right">Delete</TableHead>
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
                                                {user.phone ? (
                                                    <a
                                                        href={`https://wa.me/${user.phone.replace(/\D/g, '')}?text=${encodeURIComponent("Asalamulaykum this is Aziaf, Thank you for giving us your detail. How are you doing today?")}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-sm text-primary hover:underline"
                                                    >
                                                        {user.phone}
                                                    </a>
                                                ) : (
                                                    <span className="text-sm text-muted-foreground">N/A</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {user.screenshotUrl ? (
                                                    <a href={user.screenshotUrl} target="_blank" rel="noopener noreferrer">
                                                        <Image src={user.screenshotUrl} alt="Payment Screenshot" width={75} height={150} className="rounded-md object-cover"/>
                                                    </a>
                                                ) : <span className="text-xs text-muted-foreground">N/A</span>}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={user.paymentStatus === 'approved' ? 'default' : user.paymentStatus === 'pending' ? 'secondary' : 'destructive'}>
                                                    {user.paymentStatus.charAt(0).toUpperCase() + user.paymentStatus.slice(1)}
                                                </Badge>
                                                {user.assignedTo && <div className="text-xs text-muted-foreground mt-1">Assigned: {user.assignedTo}</div>}
                                            </TableCell>
                                            <TableCell>
                                                {user.paymentStatus === 'pending' ? (
                                                    <div className="flex flex-wrap items-center gap-2">
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
                                                        
                                                        {user.onboardingData && (
                                                            <Dialog>
                                                                <DialogTrigger asChild>
                                                                    <Button variant="outline" size="sm"><Eye className="mr-2 h-4 w-4"/>View Details</Button>
                                                                </DialogTrigger>
                                                                <DialogContent className="sm:max-w-2xl">
                                                                    <DialogHeader>
                                                                        <DialogTitle>Onboarding Details for {user.name}</DialogTitle>
                                                                        <DialogDescription>
                                                                            Full details submitted by the user during the onboarding process.
                                                                        </DialogDescription>
                                                                    </DialogHeader>
                                                                    <ScrollArea className="max-h-[60vh] mt-4">
                                                                        <pre className="p-4 bg-muted rounded-md text-xs whitespace-pre-wrap">
                                                                            {JSON.stringify(user.onboardingData, null, 2)}
                                                                        </pre>
                                                                    </ScrollArea>
                                                                </DialogContent>
                                                            </Dialog>
                                                        )}

                                                        <Button size="sm" onClick={() => handleApprove(user.id, user.email, user.name)}>Approve & Assign</Button>
                                                    </div>
                                                ) : <span className="text-sm text-muted-foreground">No pending actions.</span>}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Dialog>
                                                    <DialogTrigger asChild>
                                                        <Button variant="destructive" size="icon" disabled={isDeleting === user.id}>
                                                            {isDeleting === user.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <Trash2 className="h-4 w-4"/>}
                                                        </Button>
                                                    </DialogTrigger>
                                                    <DialogContent>
                                                        <DialogHeader>
                                                            <DialogTitle>Are you absolutely sure?</DialogTitle>
                                                            <DialogDescription>
                                                                This action cannot be undone. This will permanently delete the user's account,
                                                                authentication record, and all associated data.
                                                            </DialogDescription>
                                                        </DialogHeader>
                                                        <DialogFooter>
                                                            <DialogClose asChild>
                                                                <Button variant="outline">Cancel</Button>
                                                            </DialogClose>
                                                            <DialogClose asChild>
                                                                <Button variant="destructive" onClick={() => handleDeleteUser(user.id)}>
                                                                    Yes, delete user
                                                                </Button>
                                                            </DialogClose>
                                                        </DialogFooter>
                                                    </DialogContent>
                                                </Dialog>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center h-24">No user submissions yet.</TableCell>
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
