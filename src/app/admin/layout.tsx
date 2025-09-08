
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

const adminNavItems = [
  { href: '/admin/users', label: 'User Management', icon: Users },
  { href: '/admin/reviews', label: 'Plan Reviews', icon: ClipboardCheck },
  { href: '/admin/clients', label: 'Client Plans', icon: FileHeart },
  { href: '/admin/team', label: 'Team Members', icon: UserPlus },
  { href: '/admin/knowledge-base', label: 'Knowledge Base', icon: BookText },
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
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
        if (currentUser) {
            setUser(currentUser);
            try {
                // Force refresh the token to get the latest custom claims. This is critical.
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
                    } else {
                        // User is an admin, stop loading and render the page
                        setIsLoading(false);
                    }
                } else {
                    // User doc doesn't exist, something is wrong
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
            // No user logged in
            setUser(null);
            router.push('/login');
        }
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

  if (isLoading) {
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
            <Link href={'/admin/users'}>
                <Image src="/logo.png" alt="AZIAF Logo" width={80} height={80} />
            </Link>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {adminNavItems.map((item) => {
              const isActive = pathname.startsWith(item.href);
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
                <Link href="/dashboard">
                  <SidebarMenuButton tooltip="Switch to User View">
                    <LayoutDashboard />
                    <span>User Dashboard</span>
                  </SidebarMenuButton>
                </Link>
             </SidebarMenuItem>
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
                 <DropdownMenuItem onClick={() => router.push('/dashboard')}>
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    <span>User Dashboard</span>
                </DropdownMenuItem>
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
