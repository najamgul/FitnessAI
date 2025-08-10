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
  Leaf,
  Users,
  BookText,
  Droplets,
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

const allNavItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, admin: false },
  { href: '/dashboard/plan', label: 'Diet Plan', icon: UtensilsCrossed, admin: false },
  { href: '/dashboard/hydration', label: 'Hydration', icon: Droplets, admin: false },
  { href: '/dashboard/progress', label: 'Track Progress', icon: LineChart, admin: false },
  { href: '/dashboard/ask', label: 'Chat with Aziaf', icon: MessageSquare, admin: false },
  { href: '/admin/users', label: 'User Management', icon: Users, admin: true },
  { href: '/admin/knowledge-base', label: 'Knowledge Base', icon: BookText, admin: true },
];

const adminEmail = 'care@aziaf.com';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mockUser, setMockUser] = useState({ name: '', email: '' });
  const [isAdmin, setIsAdmin] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const loggedInEmail = localStorage.getItem('loggedInEmail') || '';
    
    // Check for user approval and expiry
    const approvedUsersString = localStorage.getItem('approvedUsers');
    const approvedUsers = approvedUsersString ? JSON.parse(approvedUsersString) : {};
    const userApproval = approvedUsers[loggedInEmail];

    if (!loggedInEmail || !userApproval || new Date(userApproval.expiry) < new Date()) {
        if (!loggedInEmail) {
            router.push('/login');
        } else {
            const userSubmissionsString = localStorage.getItem('userSubmissions');
            const userSubmissions = userSubmissionsString ? JSON.parse(userSubmissionsString) : [];
            const userHasPendingSubmission = userSubmissions.some((sub: any) => sub.email === loggedInEmail && sub.status === 'Pending');

            if(userHasPendingSubmission) {
                router.push('/awaiting-approval');
            } else {
                 router.push('/payment');
            }
        }
        return;
    }

    const userIsAdmin = loggedInEmail.toLowerCase() === adminEmail;
    setIsAdmin(userIsAdmin);
    
    if (userIsAdmin) {
        setMockUser({ name: 'Admin', email: adminEmail });
    } else {
        const onboardingDataString = localStorage.getItem('onboardingData');
        const username = onboardingDataString ? JSON.parse(onboardingDataString).name : loggedInEmail.split('@')[0];
        const capitalizedUsername = username.charAt(0).toUpperCase() + username.slice(1);
        setMockUser({ name: capitalizedUsername, email: loggedInEmail });
    }
  }, [router]);
  
  const navItems = allNavItems.filter(item => !item.admin || (item.admin && isAdmin));

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
        localStorage.removeItem('loggedInEmail');
        localStorage.removeItem('onboardingData');
        localStorage.removeItem('progressHistory');
        sessionStorage.removeItem('chatHistory');
    }
    router.push('/login');
  }

  const getCurrentPageTitle = () => {
    const matchingItem = navItems
      .slice()
      .reverse()
      .find(item => pathname.startsWith(item.href));
    return matchingItem ? matchingItem.label : 'Dashboard';
  };

  if (!isClient) {
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
            <Link href="/dashboard">
                <Image src="/logo.png" alt="Aziaf Logo" width={80} height={80} />
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
              <AvatarImage src={`https://i.pravatar.cc/150?u=${mockUser.email}`} alt="User" />
              <AvatarFallback>{mockUser.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col group-data-[collapsible=icon]:hidden">
              <span className="text-sm font-semibold">{mockUser.name}</span>
              <span className="text-xs text-muted-foreground">{mockUser.email}</span>
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
                    <AvatarImage src={`https://i.pravatar.cc/150?u=${mockUser.email}`} alt="User" />
                    <AvatarFallback>{mockUser.name.charAt(0)}</AvatarFallback>
                </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuLabel>{mockUser.name}</DropdownMenuLabel>
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
