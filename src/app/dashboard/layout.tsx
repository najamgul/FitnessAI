
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
  Loader2,
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

const userNavItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/plan', label: 'Diet Plan', icon: UtensilsCrossed },
  { href: '/dashboard/hydration', label: 'Hydration', icon: Droplets },
  { href: '/dashboard/progress', label: 'Track Progress', icon: LineChart },
  { href: '/dashboard/ask', label: 'Chat with Azai', icon: MessageSquare },
];

const adminNavItems = [
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

                    // Redirect admin users to the admin section immediately
                    if (userIsAdmin) {
                        if (!pathname.startsWith('/admin')) {
                           router.push('/admin/users');
                        }
                        // For admin, we don't need to do payment checks
                        setIsLoading(false);
                        return;
                    }

                    // For regular users, perform payment and onboarding checks
                    const paymentStatus = userData.paymentStatus;
                    if (paymentStatus === 'pending' && pathname !== '/awaiting-approval') {
                        router.push('/awaiting-approval');
                    } else if (paymentStatus !== 'approved' && paymentStatus !== 'pending' && pathname !== '/payment' && pathname !== '/onboarding') {
                         router.push('/onboarding'); // Start with onboarding if unpaid
                    }
                } else {
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
    const allNavItems = [...userNavItems, ...adminNavItems];
    const matchingItem = allNavItems
      .slice()
      .reverse()
      .find(item => pathname.startsWith(item.href));
    return matchingItem ? matchingItem.label : 'Dashboard';
  };

  // If user is admin, this layout will redirect. We can show a loader or nothing.
  if (isLoading || isAdmin) {
    return (
        <div className="flex min-h-screen items-center justify-center">
            <Loader2 className="h-12 w-12 animate-spin" />
        </div>
    );
  }

  if (!isClient) {
     return (
        <div className="flex min-h-screen items-center justify-center">
            <Loader2 className="h-12 w-12 animate-spin" />
        </div>
    );
  }


  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2 p-2 justify-center">
            <Link href={'/dashboard'}>
                <Image src="/logo.png" alt="AZIAF Logo" width={80} height={80} />
            </Link>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {userNavItems.map((item) => {
              const isActive = (item.href === '/dashboard' && pathname === item.href) || (item.href !== '/dashboard' && pathname.startsWith(item.href));
              return (
              <SidebarMenuItem key={item.href}>
                <Link href={item.href}>
                  <SidebarMenuButton asChild isActive={isActive} tooltip={item.label}>
                    <div>
                      <item.icon />
                      <span>{item.label}</span>
                    </div>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            )})}
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
