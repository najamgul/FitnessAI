
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';

const mockUsers = [
    { id: 1, name: 'John Doe', email: 'john.doe@example.com', screenshotUrl: 'https://placehold.co/150x300.png', status: 'Pending' },
    { id: 2, name: 'Jane Smith', email: 'jane.smith@example.com', screenshotUrl: 'https://placehold.co/150x300.png', status: 'Approved', days: 30 },
    { id: 3, name: 'Sam Wilson', email: 'sam.wilson@example.com', screenshotUrl: 'https://placehold.co/150x300.png', status: 'Pending' },
];

export default function AdminUsersPage() {
    const { toast } = useToast();
    const [users, setUsers] = useState(mockUsers);
    const [accessDays, setAccessDays] = useState<{ [key: number]: string }>({});

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

        // In a real app, this would be a database call. Here we use localStorage.
        try {
            const approvedUsersString = localStorage.getItem('approvedUsers');
            const approvedUsers = approvedUsersString ? JSON.parse(approvedUsersString) : {};
            approvedUsers[userEmail] = { approved: true, days };
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
                            {users.map(user => (
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
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
