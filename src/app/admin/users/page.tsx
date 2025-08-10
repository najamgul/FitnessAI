'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type User = {
    id: number;
    name: string;
    email: string;
    screenshotUrl: string;
    status: 'Pending' | 'Approved';
    days?: number;
    assignedTo?: string;
};

type TeamMember = {
    id: string;
    name: string;
    email: string;
};

export default function AdminUsersPage() {
    const { toast } = useToast();
    const [users, setUsers] = useState<User[]>([]);
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
    const [accessDays, setAccessDays] = useState<{ [key: number]: string }>({});
    const [assignments, setAssignments] = useState<{ [key: number]: string }>({});

    useEffect(() => {
        const storedUsersString = localStorage.getItem('userSubmissions');
        const storedUsers = storedUsersString ? JSON.parse(storedUsersString) : [];
        setUsers(storedUsers);

        const storedTeamMembersString = localStorage.getItem('teamMembers');
        const storedTeamMembers = storedTeamMembersString ? JSON.parse(storedTeamMembersString) : [];
        setTeamMembers(storedTeamMembers);
    }, []);

    const handleApprove = (userId: number, userEmail: string) => {
        const days = parseInt(accessDays[userId] || '30', 10);
        const assignedTo = assignments[userId];

        if (isNaN(days) || days <= 0) {
            toast({ title: 'Invalid Input', description: 'Please enter a valid number of days.', variant: 'destructive' });
            return;
        }
        if (!assignedTo) {
            toast({ title: 'Assignment Required', description: 'Please assign a team member.', variant: 'destructive' });
            return;
        }

        const updatedUsers = users.map(user =>
            user.id === userId ? { ...user, status: 'Approved', days, assignedTo } : user
        );
        setUsers(updatedUsers);
        
        try {
            // Update master list of submissions
            localStorage.setItem('userSubmissions', JSON.stringify(updatedUsers));

            // Add to approved list for login access
            const approvedUsersString = localStorage.getItem('approvedUsers');
            const approvedUsers = approvedUsersString ? JSON.parse(approvedUsersString) : {};
            
            const expiryDate = new Date();
            expiryDate.setDate(expiryDate.getDate() + days);

            approvedUsers[userEmail] = { 
                approved: true, 
                expiry: expiryDate.toISOString(),
                planStatus: 'pending_review',
                assignedTo,
                dietPlan: null
            };
            
            localStorage.setItem('approvedUsers', JSON.stringify(approvedUsers));

            toast({
                title: 'User Approved & Assigned',
                description: `${userEmail} assigned to ${assignedTo} for ${days} days.`
            });
        } catch (error) {
             toast({
                title: 'Failed to update storage',
                description: 'Could not save approval status locally.',
                variant: 'destructive'
            });
        }
    };

    const handleDaysChange = (userId: number, value: string) => {
        setAccessDays(prev => ({ ...prev, [userId]: value }));
    };

    const handleAssignmentChange = (userId: number, value: string) => {
        setAssignments(prev => ({ ...prev, [userId]: value }));
    };

    return (
        <div className="container mx-auto py-8">
            <Card>
                <CardHeader>
                    <CardTitle className="text-3xl font-bold font-headline">User Management</CardTitle>
                    <CardDescription>Review payment submissions, assign to team members, and grant access.</CardDescription>
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
                                                <a href={user.screenshotUrl} target="_blank" rel="noopener noreferrer">
                                                    <Image src={user.screenshotUrl} alt="Payment Screenshot" width={75} height={150} className="rounded-md object-cover"/>
                                                </a>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={user.status === 'Approved' ? 'default' : 'secondary'}>
                                                    {user.status === 'Approved' ? `Approved (${user.days} days)` : user.status}
                                                </Badge>
                                                {user.assignedTo && <div className="text-xs text-muted-foreground mt-1">Assigned: {user.assignedTo}</div>}
                                            </TableCell>
                                            <TableCell>
                                                {user.status === 'Pending' ? (
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <Input
                                                            type="number"
                                                            placeholder="Days (e.g., 30)"
                                                            className="w-32"
                                                            value={accessDays[user.id] || ''}
                                                            onChange={(e) => handleDaysChange(user.id, e.target.value)}
                                                        />
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
                                                        <Button size="sm" onClick={() => handleApprove(user.id, user.email)}>Approve & Assign</Button>
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
