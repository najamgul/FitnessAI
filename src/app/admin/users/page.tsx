
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
import { collection, doc, updateDoc, addDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { Loader2, Eye } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';

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

    const fetchUsers = useCallback(async () => {
        setIsLoading(true);
        try {
            const idToken = await auth.currentUser?.getIdToken();
            if (!idToken) {
                throw new Error("Authentication token not found.");
            }

            const response = await fetch('/api/admin/users', {
                headers: {
                    'Authorization': `Bearer ${idToken}`
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to fetch users');
            }
            
            const fetchedUsers = await response.json();
            setUsers(fetchedUsers);

        } catch (error: any) {
            console.error("Error fetching users:", error);
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        const authUnsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                try {
                    // Fetch Team Members
                    const teamResponse = await fetch('/api/admin/team');
                    if(teamResponse.ok) {
                        const teamData = await teamResponse.json();
                        setTeamMembers(teamData);
                    } else {
                        toast({ title: "Error", description: "Could not fetch team members.", variant: "destructive" });
                    }
                    
                    // Fetch Users
                    await fetchUsers();

                } catch (error) {
                    console.error("Error during initial data fetch:", error);
                }
            } else {
                setIsLoading(false);
            }
        });

        return () => authUnsubscribe();
    }, [fetchUsers, toast]);

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
             const idToken = await auth.currentUser?.getIdToken();
            if (!idToken) throw new Error("Not authenticated");

            const response = await fetch('/api/admin/approve-user', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`,
                },
                body: JSON.stringify({
                    userId,
                    userEmail,
                    userName,
                    days,
                    assignedTo: {
                        name: assignedToMember.name,
                        id: assignedToMember.id,
                    },
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Failed to approve user.");
            }

            toast({
                title: 'User Approved & Assigned',
                description: `${userEmail} assigned to ${assignedToMember.name} for ${days} days.`
            });
            
            // Refresh the user list
            fetchUsers();

        } catch (error: any) {
            console.error("Approval Error: ", error);
             toast({
                title: 'Approval Failed',
                description: error.message || 'Could not update user status.',
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
