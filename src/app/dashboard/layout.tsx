
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
} from 'lucide-react';
import Image from 'next/image';
import { useState, useEffect } from 'react';

const allNavItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, admin: false },
  { href: '/dashboard/plan', label: 'Diet Plan', icon: UtensilsCrossed, admin: false },
  { href: '/dashboard/progress', label: 'Track Progress', icon: LineChart, admin: false },
  { href: '/dashboard/ask', label: 'Chat with Azai', icon: MessageSquare, admin: false },
  { href: '/admin/users', label: 'User Management', icon: Users, admin: true },
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
    const userIsAdmin = loggedInEmail === adminEmail;
    
    setIsAdmin(userIsAdmin);
    
    if (userIsAdmin) {
        setMockUser({ name: 'Admin User', email: adminEmail });
    } else if (loggedInEmail) {
        setMockUser({ name: 'John Doe', email: loggedInEmail });
    } else {
        setMockUser({ name: 'John Doe', email: 'john.doe@example.com' });
    }
  }, []);
  
  const navItems = allNavItems.filter(item => !item.admin || (item.admin && isAdmin));

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
        localStorage.removeItem('loggedInEmail');
    }
    router.push('/login');
  }

  if (!isClient) {
    // Render a skeleton or loading state on the server to avoid hydration mismatch
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
            <Link href="/dashboard" className="flex items-center gap-2 text-2xl font-bold font-headline text-primary">
                <Leaf />
                <span className="group-data-[collapsible=icon]:hidden">Aziaf</span>
            </Link>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {navItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <Link href={item.href}>
                  <SidebarMenuButton asChild isActive={pathname === item.href} tooltip={item.label}>
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
              <AvatarImage src="https://placehold.co/100x100.png" alt="User" data-ai-hint="person avatar"/>
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
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b bg-background/80 p-4 backdrop-blur-sm lg:justify-end">
          <SidebarTrigger className="lg:hidden" />
          <h2 className="text-xl font-semibold font-headline lg:hidden">
            {navItems.find(item => pathname.startsWith(item.href))?.label || 'Dashboard'}
          </h2>
          <div></div>
        </header>
        <main className="flex-1 p-4 md:p-6 lg:p-8">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
