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
  MessageSquareQuestion,
  LogOut,
  Leaf,
} from 'lucide-react';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/plan', label: 'Diet Plan', icon: UtensilsCrossed },
  { href: '/dashboard/progress', label: 'Track Progress', icon: LineChart },
  { href: '/dashboard/ask', label: 'Ask an Expert', icon: MessageSquareQuestion },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2 p-2">
            <Button variant="ghost" size="icon" className="group-data-[collapsible=icon]:hidden">
              <Leaf className="h-6 w-6 text-primary" />
            </Button>
            <h1 className="font-headline text-2xl font-bold text-primary group-data-[collapsible=icon]:hidden">
              Aziaf
            </h1>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {navItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <Link href={item.href} legacyBehavior passHref>
                  <SidebarMenuButton isActive={pathname === item.href} tooltip={item.label}>
                    <item.icon />
                    <span>{item.label}</span>
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
              <AvatarFallback>U</AvatarFallback>
            </Avatar>
            <div className="flex flex-col group-data-[collapsible=icon]:hidden">
              <span className="text-sm font-semibold">User Name</span>
              <span className="text-xs text-muted-foreground">user@email.com</span>
            </div>
          </div>
          <SidebarMenu>
            <SidebarMenuItem>
                <SidebarMenuButton onClick={() => router.push('/login')}>
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
