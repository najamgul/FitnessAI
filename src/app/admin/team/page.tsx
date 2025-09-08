
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
import { UserPlus, Trash2, Users, Loader2 } from 'lucide-react';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { collection, addDoc, onSnapshot } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

const teamMemberSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  email: z.string().email({ message: 'Please enter a valid email address.' }),
  phone: z.string().min(10, { message: 'Please enter a valid phone number.' }),
  expertise: z.string().min(3, { message: 'Expertise must be at least 3 characters.' }),
});

type TeamMember = z.infer<typeof teamMemberSchema> & { id: string };

export default function AdminTeamPage() {
    const { toast } = useToast();
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDeleting, setIsDeleting] = useState<string | null>(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                const teamCollectionRef = collection(db, 'team');
                const unsubscribeTeam = onSnapshot(teamCollectionRef, (snapshot) => {
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
                return () => unsubscribeTeam();
            } else {
                setIsLoading(false);
            }
        });
        return () => unsubscribe();
    }, [toast]);

    const form = useForm<z.infer<typeof teamMemberSchema>>({
        resolver: zodResolver(teamMemberSchema),
        defaultValues: {
            name: '',
            email: '',
            phone: '',
            expertise: '',
        },
    });

    async function onSubmit(values: z.infer<typeof teamMemberSchema>) {
        setIsSubmitting(true);
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
        } finally {
            setIsSubmitting(false);
        }
    }
    
    async function removeMember(id: string) {
        if (window.confirm("Are you sure you want to remove this team member?")) {
            setIsDeleting(id);
            try {
                const idToken = await auth.currentUser?.getIdToken();
                if (!idToken) throw new Error("Authentication required.");

                const response = await fetch('/api/admin/delete-team-member', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${idToken}`,
                    },
                    body: JSON.stringify({ id }),
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || "Failed to delete member.");
                }

                toast({ title: 'Team Member Removed', variant: 'destructive'});
            } catch (error: any) {
                console.error("Error removing team member: ", error);
                toast({ title: 'Error', description: error.message || 'Could not remove team member.', variant: 'destructive'});
            } finally {
                setIsDeleting(null);
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
                                <FormField
                                control={form.control}
                                name="phone"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Phone Number</FormLabel>
                                    <FormControl>
                                        <Input placeholder="+91 95961 22125" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )}
                                />
                                <FormField
                                control={form.control}
                                name="expertise"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Expertise</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g., PCOD/PCOS Specialist" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )}
                                />
                                <Button type="submit" className="w-full" disabled={isSubmitting}>
                                    {isSubmitting ? <Loader2 className="animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
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
                                    <TableHead>Phone</TableHead>
                                    <TableHead>Expertise</TableHead>
                                    <TableHead>Action</TableHead>
                                </TableRow>
                            </TableHeader>
                             <TableBody>
                                {teamMembers.length > 0 ? (
                                    teamMembers.map(member => (
                                        <TableRow key={member.id}>
                                            <TableCell className="font-medium">{member.name}</TableCell>
                                            <TableCell>{member.email}</TableCell>
                                            <TableCell>{member.phone}</TableCell>
                                            <TableCell>{member.expertise}</TableCell>
                                            <TableCell>
                                                <Button variant="ghost" size="icon" onClick={() => removeMember(member.id)} disabled={isDeleting === member.id}>
                                                    {isDeleting === member.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 text-destructive" />}
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center">
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
