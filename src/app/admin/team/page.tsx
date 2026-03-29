
'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { UserPlus, Trash2, Users, Loader2, Mail, Phone, Briefcase, Sparkles } from 'lucide-react';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { collection, addDoc, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { useRouter } from 'next/navigation';

const teamMemberSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  email: z.string().email({ message: 'Please enter a valid email address.' }),
  phone: z.string().min(10, { message: 'Please enter a valid phone number.' }),
  expertise: z.string().min(3, { message: 'Expertise must be at least 3 characters.' }),
});

type TeamMember = z.infer<typeof teamMemberSchema> & { id: string };

const container = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } };

const AVATAR_COLORS = [
    'from-emerald-400 to-teal-500',
    'from-amber-400 to-orange-500',
    'from-blue-400 to-indigo-500',
    'from-pink-400 to-rose-500',
    'from-purple-400 to-violet-500',
    'from-cyan-400 to-sky-500',
];

export default function AdminTeamPage() {
    const { toast } = useToast();
    const router = useRouter();
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDeleting, setIsDeleting] = useState<string | null>(null);

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
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
                router.push('/login');
            }
        });
        return () => unsubscribeAuth();
    }, [toast, router]);

    const form = useForm<z.infer<typeof teamMemberSchema>>({
        resolver: zodResolver(teamMemberSchema),
        defaultValues: { name: '', email: '', phone: '', expertise: '' },
    });

    async function onSubmit(values: z.infer<typeof teamMemberSchema>) {
        setIsSubmitting(true);
        try {
            await addDoc(collection(db, 'team'), { ...values, role: 'Nutritionist' });
            toast({ title: '✅ Team Member Added', description: `${values.name} has been added to the team.` });
            form.reset();
        } catch (error) {
            toast({ title: 'Error', description: 'Could not add team member.', variant: 'destructive'});
        } finally {
            setIsSubmitting(false);
        }
    }
    
    async function removeMember(id: string) {
        if (window.confirm("Are you sure you want to remove this team member?")) {
            setIsDeleting(id);
            try {
                await deleteDoc(doc(db, 'team', id));
                toast({ title: 'Team Member Removed', variant: 'destructive'});
            } catch (error: any) {
                toast({ title: 'Error', description: error.message || 'Could not remove team member.', variant: 'destructive'});
            } finally {
                setIsDeleting(null);
            }
        }
    }

    return (
        <motion.div className="space-y-6" variants={container} initial="hidden" animate="show">
            {/* Page Header */}
            <motion.div variants={item}>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">🤝 Team Members</h1>
                <p className="text-sm text-gray-500 mt-1">Manage your nutrition experts and dietitians.</p>
            </motion.div>

            <div className="grid gap-6 lg:grid-cols-3">
                {/* Add Form */}
                <motion.div variants={item} className="lg:col-span-1">
                    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sticky top-20">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                                <UserPlus className="w-4 h-4 text-emerald-700" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-gray-900">Add Member</h3>
                                <p className="text-[10px] text-gray-400">New expert or dietitian</p>
                            </div>
                        </div>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
                                <FormField control={form.control} name="name" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs">Full Name</FormLabel>
                                        <FormControl><Input placeholder="e.g., Jane Doe" className="h-9 text-sm" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={form.control} name="email" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs">Email</FormLabel>
                                        <FormControl><Input placeholder="expert@aziaf.com" className="h-9 text-sm" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={form.control} name="phone" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs">Phone</FormLabel>
                                        <FormControl><Input placeholder="+91 95961 22125" className="h-9 text-sm" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={form.control} name="expertise" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs">Expertise</FormLabel>
                                        <FormControl><Input placeholder="e.g., PCOD Specialist" className="h-9 text-sm" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-sm" disabled={isSubmitting}>
                                    {isSubmitting ? <Loader2 className="animate-spin mr-1.5 h-4 w-4" /> : <Sparkles className="mr-1.5 h-4 w-4" />}
                                    Add to Team
                                </Button>
                            </form>
                        </Form>
                    </div>
                </motion.div>

                {/* Team Grid */}
                <motion.div variants={item} className="lg:col-span-2 space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                            <Users className="w-4 h-4" /> Current Team ({teamMembers.length})
                        </h3>
                    </div>

                    {isLoading ? (
                        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-emerald-600" /></div>
                    ) : teamMembers.length > 0 ? (
                        <div className="grid gap-3 sm:grid-cols-2">
                            <AnimatePresence>
                                {teamMembers.map((member, i) => (
                                    <motion.div
                                        key={member.id}
                                        layout
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm hover:shadow-md transition-all group"
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${AVATAR_COLORS[i % AVATAR_COLORS.length]} flex items-center justify-center text-white font-bold text-sm shadow-sm`}>
                                                    {member.name?.charAt(0)?.toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-gray-900 text-sm">{member.name}</div>
                                                    <div className="flex items-center gap-1 text-[11px] text-gray-400">
                                                        <Briefcase className="w-3 h-3" />{member.expertise}
                                                    </div>
                                                </div>
                                            </div>
                                            <Button
                                                variant="ghost" size="icon"
                                                className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500 hover:bg-red-50"
                                                onClick={() => removeMember(member.id)}
                                                disabled={isDeleting === member.id}
                                            >
                                                {isDeleting === member.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                                            </Button>
                                        </div>
                                        <div className="mt-3 pt-3 border-t border-gray-50 space-y-1">
                                            <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                                <Mail className="w-3 h-3 text-gray-400" />{member.email}
                                            </div>
                                            <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                                <Phone className="w-3 h-3 text-gray-400" />{member.phone}
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    ) : (
                        <div className="text-center py-12 text-gray-400 rounded-xl border border-dashed border-gray-200 bg-white">
                            <Users className="mx-auto h-10 w-10 mb-2 text-gray-300" />
                            <p className="font-medium text-sm">No team members yet</p>
                            <p className="text-xs">Add your first nutrition expert using the form.</p>
                        </div>
                    )}
                </motion.div>
            </div>
        </motion.div>
    );
}