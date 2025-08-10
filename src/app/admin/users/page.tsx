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

type User = {
    id: number;
    name: string;
    email: string;
    screenshotUrl: string;
    status: 'Pending' | 'Approved';
    days?: number;
};

export default function AdminUsersPage() {
    const { toast } = useToast();
    const [users, setUsers] = useState<User[]>([]);
    const [accessDays, setAccessDays] = useState<{ [key: number]: string }>({});

    useEffect(() => {
        // In a real app, this would be an API call.
        const storedUsersString = localStorage.getItem('userSubmissions');
        const storedUsers = storedUsersString ? JSON.parse(storedUsersString) : [];
        setUsers(storedUsers);
    }, []);

    const handleApprove = (userId: number, userEmail: string) => {
        const days = parseInt(accessDays[userId] || '30', 10);
        if (isNaN(days) || days <= 0) {
            toast({
                title: 'Invalid Input',
                description: 'Please enter a valid number of days.',
                variant: 'destructive'
            });
            return;
        }

        setUsers(prevUsers => prevUsers.map(user =>
            user.id === userId ? { ...user, status: 'Approved', days } : user
        ));

        try {
            const approvedUsersString = localStorage.getItem('approvedUsers');
            const approvedUsers = approvedUsersString ? JSON.parse(approvedUsersString) : {};
            
            const expiryDate = new Date();
            expiryDate.setDate(expiryDate.getDate() + days);

            approvedUsers[userEmail] = { 
                approved: true, 
                expiry: expiryDate.toISOString() 
            };
            
            localStorage.setItem('approvedUsers', JSON.stringify(approvedUsers));

            toast({
                title: 'User Approved',
                description: `Access granted to ${userEmail} for ${days} days.`
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

    return (
        <div className="container mx-auto py-8">
            <Card>
                <CardHeader>
                    <CardTitle className="text-3xl font-bold font-headline">User Management</CardTitle>
                    <CardDescription>Review payment submissions and grant access to users.</CardDescription>
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
                                            </TableCell>
                                            <TableCell>
                                                {user.status === 'Pending' && (
                                                    <div className="flex items-center gap-2">
                                                        <Input
                                                            type="number"
                                                            placeholder="Days (e.g., 30)"
                                                            className="w-32"
                                                            value={accessDays[user.id] || ''}
                                                            onChange={(e) => handleDaysChange(user.id, e.target.value)}
                                                        />
                                                        <Button size="sm" onClick={() => handleApprove(user.id, user.email)}>Approve</Button>
                                                    </div>
                                                )}
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