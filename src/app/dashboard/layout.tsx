
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
  MessageSquareQuote,
  LogOut,
  Leaf,
  Users,
} from 'lucide-react';
import Image from 'next/image';

const allNavItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, admin: false },
  { href: '/dashboard/plan', label: 'Diet Plan', icon: UtensilsCrossed, admin: false },
  { href: '/dashboard/progress', label: 'Track Progress', icon: LineChart, admin: false },
  { href: '/dashboard/ask', label: 'Ask an Expert', icon: MessageSquareQuote, admin: false },
  { href: '/admin/users', label: 'User Management', icon: Users, admin: true },
];

// In a real app, this would come from an authentication provider and be stored in a global state/context.
// For now, we simulate it based on a hardcoded email.
const adminEmail = 'care@aziaf.com';

// We'll use localStorage to persist the logged-in user's email for this simulation.
const getLoggedInUser = () => {
    if (typeof window !== 'undefined') {
        const loggedInEmail = localStorage.getItem('loggedInEmail') || '';
        if (loggedInEmail === adminEmail) {
            return { name: 'Admin User', email: adminEmail };
        }
        return { name: 'John Doe', email: 'john.doe@example.com' };
    }
    // Default for server-side rendering
    return { name: 'John Doe', email: 'john.doe@example.com' };
};


export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const mockUser = getLoggedInUser();
  const isAdmin = mockUser.email === adminEmail;
  
  const navItems = allNavItems.filter(item => !item.admin || (item.admin && isAdmin));

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
        localStorage.removeItem('loggedInEmail');
    }
    router.push('/login');
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
