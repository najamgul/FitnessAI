
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
  UtensilsCrossed,
  LineChart,
  MessageSquare,
  LogOut,
  Users,
  BookText,
  Droplets,
  ClipboardCheck,
  UserPlus,
  FileHeart,
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

const allNavItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, admin: false },
  { href: '/dashboard/plan', label: 'Diet Plan', icon: UtensilsCrossed, admin: false },
  { href: '/dashboard/hydration', label: 'Hydration', icon: Droplets, admin: false },
  { href: '/dashboard/progress', label: 'Track Progress', icon: LineChart, admin: false },
  { href: '/dashboard/ask', label: 'Chat with Azai', icon: MessageSquare, admin: false },
  { href: '/admin/users', label: 'User Management', icon: Users, admin: true },
  { href: '/admin/reviews', label: 'Plan Reviews', icon: ClipboardCheck, admin: true },
  { href: '/admin/clients', label: 'Client Plans', icon: FileHeart, admin: true },
  { href: '/admin/team', label: 'Team Members', icon: UserPlus, admin: true },
  { href: '/admin/knowledge-base', label: 'Knowledge Base', icon: BookText, admin: true },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [userDetails, setUserDetails] = useState({ name: '', email: '' });
  const [isAdmin, setIsAdmin] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsClient(true);
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
        if (currentUser) {
            setUser(currentUser);
            try {
                const userDocRef = doc(db, 'users', currentUser.uid);
                const userDoc = await getDoc(userDocRef);
                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    const capitalizedUsername = (userData.name || currentUser.email?.split('@')[0] || 'User').replace(/^\w/, (c: string) => c.toUpperCase());
                    setUserDetails({ name: capitalizedUsername, email: currentUser.email || '' });
                    
                    const userIsAdmin = userData.role === 'admin';
                    setIsAdmin(userIsAdmin);

                    if (!userIsAdmin) {
                        const paymentStatus = userData.paymentStatus;
                        if (paymentStatus === 'pending') {
                            router.push('/awaiting-approval');
                        } else if (paymentStatus !== 'approved') {
                            router.push('/payment');
                        }
                    }

                } else {
                     // Handle case where user exists in Auth but not Firestore
                    router.push('/login');
                }
            } catch (error) {
                toast({ title: "Error", description: "Could not fetch user details.", variant: "destructive" });
                router.push('/login');
            }
        } else {
            setUser(null);
            router.push('/login');
        }
        setIsLoading(false);
    });

    return () => unsubscribe();
  }, [router, toast, pathname]);
  
  const navItems = allNavItems.filter(item => item.admin === isAdmin);

  const handleLogout = async () => {
    try {
        await signOut(auth);
        // Clear sensitive session data if any
        sessionStorage.removeItem('chatHistory');
        router.push('/login');
    } catch (error) {
        toast({ title: 'Logout Failed', description: 'Could not log you out. Please try again.', variant: 'destructive' });
    }
  }

  const getCurrentPageTitle = () => {
    const matchingItem = navItems
      .slice()
      .reverse()
      .find(item => pathname.startsWith(item.href));
    return matchingItem ? matchingItem.label : isAdmin ? 'Admin' : 'Dashboard';
  };

  if (isLoading || !isClient) {
    return (
        <div className="flex min-h-screen">
            <div className="w-16 md:w-64 bg-muted/40 animate-pulse"></div>
            <div className="flex-1 p-8 animate-pulse">
                <div className="h-10 w-1/3 bg-muted/40 rounded"></div>
            </div>
        </div>
    );
  }

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2 p-2 justify-center">
            <Link href={isAdmin ? '/admin/users' : '/dashboard'}>
                <Image src="/logo.png" alt="AZIAF Logo" width={80} height={80} />
            </Link>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {navItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <Link href={item.href}>
                  <SidebarMenuButton asChild isActive={pathname === item.href || (pathname.startsWith(item.href) && item.href !== '/dashboard' && item.href !== '/')} tooltip={item.label}>
                    <div>
                      <item.icon />
                      <span>{item.label}</span>
                    </div>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
          <div className="flex items-center gap-3 p-2 group-data-[collapsible=icon]:justify-center">
            <Avatar className="h-9 w-9">
              <AvatarImage src={`https://i.pravatar.cc/150?u=${userDetails.email}`} alt="User" />
              <AvatarFallback>{userDetails.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col group-data-[collapsible=icon]:hidden">
              <span className="text-sm font-semibold">{userDetails.name}</span>
              <span className="text-xs text-muted-foreground">{userDetails.email}</span>
            </div>
          </div>
          <SidebarMenu>
            <SidebarMenuItem>
                <SidebarMenuButton onClick={handleLogout}>
                    <LogOut />
                    <span>Logout</span>
                </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b bg-background/80 p-4 backdrop-blur-sm lg:hidden">
          <SidebarTrigger className="lg:hidden" />
          <h2 className="text-xl font-semibold font-headline lg:hidden">
            {getCurrentPageTitle()}
          </h2>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Avatar className="h-9 w-9 cursor-pointer">
                    <AvatarImage src={`https://i.pravatar.cc/150?u=${userDetails.email}`} alt="User" />
                    <AvatarFallback>{userDetails.name.charAt(0)}</AvatarFallback>
                </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuLabel>{userDetails.name}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Logout</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <main className="flex-1 p-4 md:p-6 lg:p-8">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
