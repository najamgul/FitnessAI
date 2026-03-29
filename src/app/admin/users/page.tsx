
'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { Loader2, Eye, Users, CheckCircle2, Clock, XCircle, Search, Phone, Mail, Calendar } from 'lucide-react';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { collection, query, where, getDocs, doc, onSnapshot, writeBatch, serverTimestamp, updateDoc, getDoc } from 'firebase/firestore';
import { ScrollArea } from '@/components/ui/scroll-area';

type User = {
    id: string;
    name: string;
    email: string;
    phone?: string;
    screenshotUrl?: string;
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
    id: string;
    name: string;
    email: string;
};

const container = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } };

const STATUS_STYLES: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
    approved: { bg: 'bg-emerald-50', text: 'text-emerald-700', icon: <CheckCircle2 className="w-3 h-3" /> },
    pending:  { bg: 'bg-amber-50', text: 'text-amber-700', icon: <Clock className="w-3 h-3" /> },
    unpaid:   { bg: 'bg-red-50', text: 'text-red-600', icon: <XCircle className="w-3 h-3" /> },
};

export default function AdminUsersPage() {
    const { toast } = useToast();
    const [users, setUsers] = useState<User[]>([]);
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
    const [accessDays, setAccessDays] = useState<{ [key: string]: string }>({});
    const [assignments, setAssignments] = useState<{ [key: string]: string }>({});
    const [isLoading, setIsLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) setCurrentUser(user);
            else setIsLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const fetchUsersAndTeam = useCallback(() => {
        if (!currentUser) return;
        setIsLoading(true);

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
                    if (paymentDoc.exists()) user.screenshotUrl = paymentDoc.data().screenshotUrl;
                    
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
            if (error.code !== 'permission-denied') {
                toast({ title: "Error", description: "Could not fetch users.", variant: "destructive" });
            }
            setIsLoading(false);
        });

        return () => { teamUnsubscribe(); usersUnsubscribe(); };
    }, [toast, currentUser]);

    useEffect(() => {
        let unsubscribe: (() => void) | undefined;
        if (currentUser) {
            const userDocRef = doc(db, 'users', currentUser.uid);
            getDoc(userDocRef).then(userDoc => {
                if(userDoc.exists() && userDoc.data().role === 'admin') {
                    unsubscribe = fetchUsersAndTeam();
                } else { setIsLoading(false); setUsers([]); }
            })
        } else { setIsLoading(false); setUsers([]); }
        return () => { unsubscribe && unsubscribe(); };
    }, [currentUser, fetchUsersAndTeam]);

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
            const userDocRef = doc(db, 'users', userId);
            batch.update(userDocRef, { paymentStatus: 'approved', planStatus: 'pending_review', assignedTo: assignedToMember.name, paymentExpiryDate: expiryDate.toISOString() });
            const reviewDocRef = doc(collection(db, 'reviews'));
            batch.set(reviewDocRef, { userId, userName, userEmail, assignedTo: assignedToMember.name, assignedToId: assignedToMember.id, status: 'pending_generation', createdAt: serverTimestamp() });
            const paymentDocRef = doc(db, 'payments', userId);
            batch.update(paymentDocRef, { status: 'verified' });
            await batch.commit();
            toast({ title: '✅ User Approved & Assigned', description: `${userEmail} assigned to ${assignedToMember.name} for ${days} days.` });
        } catch (error: any) {
            toast({ title: 'Approval Failed', description: error.message || 'Could not update user status.', variant: 'destructive' });
        }
    };

    const filteredUsers = users.filter(u => {
        const matchesSearch = !searchQuery || u.name.toLowerCase().includes(searchQuery.toLowerCase()) || u.email.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === 'all' || u.paymentStatus === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const pendingCount = users.filter(u => u.paymentStatus === 'pending').length;
    const approvedCount = users.filter(u => u.paymentStatus === 'approved').length;

    if (isLoading) {
        return <div className="flex items-center justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-emerald-600" /></div>;
    }

    return (
        <motion.div className="space-y-6" variants={container} initial="hidden" animate="show">
            {/* Page Header */}
            <motion.div variants={item}>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">👥 User Management</h1>
                <p className="text-sm text-gray-500 mt-1">Review payment submissions, assign team members, and manage user access.</p>
            </motion.div>

            {/* Stats Row */}
            <motion.div variants={item} className="grid grid-cols-3 gap-3">
                <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                    <div className="text-2xl font-bold text-gray-900">{users.length}</div>
                    <div className="text-xs text-gray-400 font-medium">Total Users</div>
                </div>
                <div className="rounded-xl border border-amber-100 bg-amber-50 p-4 shadow-sm">
                    <div className="text-2xl font-bold text-amber-700">{pendingCount}</div>
                    <div className="text-xs text-amber-500 font-medium">Pending</div>
                </div>
                <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4 shadow-sm">
                    <div className="text-2xl font-bold text-emerald-700">{approvedCount}</div>
                    <div className="text-xs text-emerald-500 font-medium">Approved</div>
                </div>
            </motion.div>

            {/* Search + Filter */}
            <motion.div variants={item} className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input placeholder="Search by name or email..." className="pl-9 bg-white" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-44 bg-white"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="unpaid">Unpaid</SelectItem>
                    </SelectContent>
                </Select>
            </motion.div>

            {/* User Cards */}
            <motion.div variants={item} className="space-y-3">
                <AnimatePresence>
                    {filteredUsers.length > 0 ? filteredUsers.map(user => {
                        const status = STATUS_STYLES[user.paymentStatus] || STATUS_STYLES.unpaid;
                        return (
                            <motion.div
                                key={user.id}
                                layout
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm hover:shadow-md transition-shadow"
                            >
                                <div className="flex items-start justify-between gap-3 flex-wrap">
                                    {/* User Info */}
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-100 to-emerald-200 flex items-center justify-center text-emerald-700 font-bold text-sm flex-shrink-0">
                                            {user.name?.charAt(0)?.toUpperCase() || '?'}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="font-semibold text-gray-900 truncate">{user.name}</div>
                                            <div className="flex items-center gap-2 text-xs text-gray-400">
                                                <Mail className="w-3 h-3" /><span className="truncate">{user.email}</span>
                                            </div>
                                            {user.phone && (
                                                <a
                                                    href={`https://wa.me/${user.phone.replace(/\D/g, '')}?text=${encodeURIComponent("Asalamulaykum this is Aziaf, Thank you for giving us your detail. How are you doing today?")}`}
                                                    target="_blank" rel="noopener noreferrer"
                                                    className="flex items-center gap-1 text-xs text-emerald-600 hover:underline mt-0.5"
                                                >
                                                    <Phone className="w-3 h-3" />{user.phone}
                                                </a>
                                            )}
                                        </div>
                                    </div>

                                    {/* Status Badge */}
                                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${status.bg} ${status.text}`}>
                                        {status.icon}
                                        {user.paymentStatus.charAt(0).toUpperCase() + user.paymentStatus.slice(1)}
                                    </div>
                                </div>

                                {/* Assigned info */}
                                {user.assignedTo && (
                                    <div className="mt-2 text-xs text-gray-400">Assigned to: <span className="font-medium text-gray-600">{user.assignedTo}</span></div>
                                )}

                                {/* Pending Actions */}
                                {user.paymentStatus === 'pending' && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        className="mt-4 pt-4 border-t border-gray-100 space-y-3"
                                    >
                                        {/* Screenshot Preview */}
                                        <div className="flex items-start gap-4">
                                            {user.screenshotUrl && (
                                                <a href={user.screenshotUrl} target="_blank" rel="noopener noreferrer" className="flex-shrink-0">
                                                    <Image src={user.screenshotUrl} alt="Payment" width={60} height={100} className="rounded-lg object-cover border border-gray-200 hover:scale-105 transition-transform"/>
                                                </a>
                                            )}
                                            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                <div>
                                                    <label className="text-[10px] text-gray-400 font-medium uppercase">Days</label>
                                                    <Input
                                                        type="number" placeholder="e.g., 30" className="h-8 text-sm mt-0.5"
                                                        value={accessDays[user.id] || ''}
                                                        onChange={(e) => setAccessDays(prev => ({ ...prev, [user.id]: e.target.value }))}
                                                    />
                                                    {user.planDuration && <p className="text-[10px] text-amber-600 mt-0.5">Requested: {user.planDuration} days</p>}
                                                </div>
                                                <div>
                                                    <label className="text-[10px] text-gray-400 font-medium uppercase">Assign To</label>
                                                    <Select onValueChange={(value) => setAssignments(prev => ({ ...prev, [user.id]: value }))}>
                                                        <SelectTrigger className="h-8 text-sm mt-0.5"><SelectValue placeholder="Team member..." /></SelectTrigger>
                                                        <SelectContent>
                                                            {teamMembers.map(member => (
                                                                <SelectItem key={member.id} value={member.name}>{member.name}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="flex gap-2">
                                            {user.onboardingData && (
                                                <Dialog>
                                                    <DialogTrigger asChild>
                                                        <Button variant="outline" size="sm" className="text-xs"><Eye className="mr-1.5 h-3 w-3"/>View Details</Button>
                                                    </DialogTrigger>
                                                    <DialogContent className="sm:max-w-2xl">
                                                        <DialogHeader>
                                                            <DialogTitle>Onboarding Details — {user.name}</DialogTitle>
                                                            <DialogDescription>Full submitted user profile data.</DialogDescription>
                                                        </DialogHeader>
                                                        <ScrollArea className="max-h-[60vh] mt-4">
                                                            <pre className="p-4 bg-gray-50 rounded-lg text-xs whitespace-pre-wrap font-mono">
                                                                {JSON.stringify(user.onboardingData, null, 2)}
                                                            </pre>
                                                        </ScrollArea>
                                                    </DialogContent>
                                                </Dialog>
                                            )}
                                            <Button size="sm" className="text-xs bg-emerald-600 hover:bg-emerald-700 ml-auto" onClick={() => handleApprove(user.id, user.email, user.name)}>
                                                <CheckCircle2 className="mr-1.5 h-3 w-3"/>Approve & Assign
                                            </Button>
                                        </div>
                                    </motion.div>
                                )}
                            </motion.div>
                        );
                    }) : (
                        <div className="text-center py-12 text-gray-400">
                            <Users className="mx-auto h-10 w-10 mb-2 text-gray-300" />
                            <p className="font-medium">No users found</p>
                            <p className="text-xs">Try adjusting your search or filter.</p>
                        </div>
                    )}
                </AnimatePresence>
            </motion.div>
        </motion.div>
    );
}
