
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { UserPlus, Trash2, Users } from 'lucide-react';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { collection, addDoc, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader2 } from 'lucide-react';

const teamMemberSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  email: z.string().email({ message: 'Please enter a valid email address.' }),
});

type TeamMember = z.infer<typeof teamMemberSchema> & { id: string };

export default function AdminTeamPage() {
    const { toast } = useToast();
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, 'team'), (snapshot) => {
            const members: TeamMember[] = [];
            snapshot.forEach((doc) => {
                members.push({ id: doc.id, ...doc.data() } as TeamMember);
            });
            setTeamMembers(members);
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching team members: ", error);
            toast({ title: 'Error', description: 'Could not fetch team members.', variant: 'destructive'});
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [toast]);

    const form = useForm<z.infer<typeof teamMemberSchema>>({
        resolver: zodResolver(teamMemberSchema),
        defaultValues: {
            name: '',
            email: '',
        },
    });

    async function onSubmit(values: z.infer<typeof teamMemberSchema>) {
        try {
            await addDoc(collection(db, 'team'), {
                ...values,
                role: 'Nutritionist' // Default role
            });
            toast({ title: 'Team Member Added', description: `${values.name} has been added to the team.` });
            form.reset();
        } catch (error) {
            console.error("Error adding team member: ", error);
            toast({ title: 'Error', description: 'Could not add team member.', variant: 'destructive'});
        }
    }
    
    async function removeMember(id: string) {
        if (window.confirm("Are you sure you want to remove this team member?")) {
            try {
                await deleteDoc(doc(db, 'team', id));
                toast({ title: 'Team Member Removed', variant: 'destructive'});
            } catch (error) {
                console.error("Error removing team member: ", error);
                toast({ title: 'Error', description: 'Could not remove team member.', variant: 'destructive'});
            }
        }
    }

    return (
        <div className="grid gap-8 md:grid-cols-3">
            <div className="md:col-span-1">
                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 font-headline"><UserPlus/> Add New Team Member</CardTitle>
                        <CardDescription>Add a new dietitian or expert to the team.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                                <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Full Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g., Jane Doe" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )}
                                />
                                 <FormField
                                control={form.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Email Address</FormLabel>
                                    <FormControl>
                                        <Input placeholder="expert@aziaf.com" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )}
                                />
                                <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                                    {form.formState.isSubmitting ? <Loader2 className="animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                                    Add Member
                                </Button>
                            </form>
                        </Form>
                    </CardContent>
                </Card>
            </div>
            <div className="md:col-span-2">
                <Card>
                     <CardHeader>
                        <CardTitle className="flex items-center gap-2 font-headline"><Users /> Current Team</CardTitle>
                        <CardDescription>List of all active team members.</CardDescription>
                    </CardHeader>
                    <CardContent>
                       {isLoading ? <div className="flex justify-center"><Loader2 className="h-6 w-6 animate-spin"/></div> : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Action</TableHead>
                                </TableRow>
                            </TableHeader>
                             <TableBody>
                                {teamMembers.length > 0 ? (
                                    teamMembers.map(member => (
                                        <TableRow key={member.id}>
                                            <TableCell className="font-medium">{member.name}</TableCell>
                                            <TableCell>{member.email}</TableCell>
                                            <TableCell>
                                                <Button variant="ghost" size="icon" onClick={() => removeMember(member.id)}>
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={3} className="h-24 text-center">
                                            No team members added yet.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                       )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
