
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarTrigger,
  SidebarInset,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  LayoutDashboard,
  LogOut,
  Users,
  BookText,
  ClipboardCheck,
  UserPlus,
  FileHeart,
  Loader2,
  Shield,
  Sparkles,
} from 'lucide-react';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

const adminNavItems = [
  { href: '/admin/users', label: 'User Management', icon: Users, emoji: '👥' },
  { href: '/admin/reviews', label: 'Plan Reviews', icon: ClipboardCheck, emoji: '📋' },
  { href: '/admin/clients', label: 'Client Plans', icon: FileHeart, emoji: '💚' },
  { href: '/admin/team', label: 'Team Members', icon: UserPlus, emoji: '🤝' },
  { href: '/admin/knowledge-base', label: 'Knowledge Base', icon: BookText, emoji: '📚' },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [userDetails, setUserDetails] = useState({ name: '', email: '' });
  const [isVerifying, setIsVerifying] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
        if (currentUser) {
            setUser(currentUser);
            try {
                await currentUser.getIdToken(true);
                const userDocRef = doc(db, 'users', currentUser.uid);
                const userDoc = await getDoc(userDocRef);
                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    const capitalizedUsername = (userData.name || currentUser.email?.split('@')[0] || 'User').replace(/^\w/, (c: string) => c.toUpperCase());
                    setUserDetails({ name: capitalizedUsername, email: currentUser.email || '' });
                    if (userData.role !== 'admin') {
                        toast({ title: 'Access Denied', description: 'You do not have permission to access this area.', variant: 'destructive'});
                        router.push('/dashboard');
                    }
                } else {
                    toast({ title: "Error", description: "User record not found. Logging out.", variant: "destructive" });
                    await signOut(auth);
                    router.push('/login');
                }
            } catch (error) {
                console.error("Auth check error:", error);
                toast({ title: "Error", description: "Could not verify your access. Please log in again.", variant: "destructive" });
                await signOut(auth);
                router.push('/login');
            }
        } else {
            setUser(null);
            router.push('/login');
        }
        setIsVerifying(false);
    });
    return () => unsubscribe();
  }, [router, toast]);
  
  const handleLogout = async () => {
    try {
        await signOut(auth);
        sessionStorage.clear();
        localStorage.clear();
        router.push('/login');
    } catch (error) {
        toast({ title: 'Logout Failed', description: 'Could not log you out. Please try again.', variant: 'destructive' });
    }
  }

  const getCurrentPageTitle = () => {
    const matchingItem = adminNavItems
      .slice()
      .reverse()
      .find(item => pathname.startsWith(item.href));
    return matchingItem ? matchingItem.label : 'Admin Dashboard';
  };

  if (isVerifying) {
    return (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-amber-50">
            <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
                </div>
                <p className="text-sm text-gray-500 font-medium">Verifying admin access...</p>
            </div>
        </div>
    );
  }

  return (
    <SidebarProvider>
      <Sidebar className="border-r-0">
        {/* Sidebar Header — Admin branding */}
        <SidebarHeader className="border-b border-emerald-100/50">
          <div className="flex items-center gap-3 p-3">
            <Link href="/admin/users" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-md shadow-emerald-200">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div className="group-data-[collapsible=icon]:hidden">
                <div className="text-sm font-bold text-gray-900 tracking-tight">AZIAF Admin</div>
                <div className="text-[10px] text-emerald-600 font-medium -mt-0.5">Control Center</div>
              </div>
            </Link>
          </div>
        </SidebarHeader>

        {/* Navigation */}
        <SidebarContent className="pt-2">
          <SidebarMenu>
            {adminNavItems.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
              <SidebarMenuItem key={item.href}>
                <Link href={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive}
                    tooltip={item.label}
                    className={isActive
                      ? 'bg-emerald-50 text-emerald-700 border-r-2 border-emerald-500 font-semibold'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base group-data-[collapsible=icon]:text-lg">{item.emoji}</span>
                      <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                    </div>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            )})}
          </SidebarMenu>
        </SidebarContent>

        {/* Sidebar Footer — User + Logout */}
        <SidebarFooter className="border-t border-gray-100">
          <div className="flex items-center gap-3 p-3 group-data-[collapsible=icon]:justify-center">
            <Avatar className="h-8 w-8 ring-2 ring-emerald-100">
              <AvatarImage src={`https://i.pravatar.cc/150?u=${userDetails.email}`} alt="Admin" />
              <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xs font-bold">{userDetails.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col group-data-[collapsible=icon]:hidden min-w-0">
              <span className="text-sm font-semibold text-gray-900 truncate">{userDetails.name}</span>
              <span className="text-[10px] text-gray-400 truncate">{userDetails.email}</span>
            </div>
          </div>
          <SidebarMenu>
             <SidebarMenuItem>
                <Link href="/dashboard">
                  <SidebarMenuButton tooltip="Switch to User View" className="text-gray-500 hover:text-emerald-700 hover:bg-emerald-50">
                    <LayoutDashboard className="w-4 h-4" />
                    <span>User Dashboard</span>
                  </SidebarMenuButton>
                </Link>
             </SidebarMenuItem>
            <SidebarMenuItem>
                <SidebarMenuButton onClick={handleLogout} className="text-gray-500 hover:text-red-600 hover:bg-red-50">
                    <LogOut className="w-4 h-4" />
                    <span>Logout</span>
                </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        {/* Mobile Top Bar */}
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-gray-100 bg-white/80 backdrop-blur-xl px-4 lg:hidden">
          <SidebarTrigger className="lg:hidden" />
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-600" />
            <h2 className="text-base font-bold text-gray-900">{getCurrentPageTitle()}</h2>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Avatar className="h-8 w-8 cursor-pointer ring-2 ring-emerald-100">
                    <AvatarImage src={`https://i.pravatar.cc/150?u=${userDetails.email}`} alt="Admin" />
                    <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xs font-bold">{userDetails.name.charAt(0)}</AvatarFallback>
                </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel className="font-semibold">{userDetails.name}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                 <DropdownMenuItem onClick={() => router.push('/dashboard')}>
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    <span>User Dashboard</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600 focus:bg-red-50">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Logout</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {/* Page content with subtle gradient bg */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 bg-gradient-to-br from-gray-50/50 via-white to-emerald-50/30 min-h-screen">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
