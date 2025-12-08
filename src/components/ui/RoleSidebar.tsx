"use client"

import React from 'react';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
  SidebarGroup,
  SidebarGroupLabel,
  useSidebar,
} from '@/components/ui/sidebar';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, QrCode } from 'lucide-react';
import { getMarketingOrigin } from '@/lib/marketingOrigin';

type MenuItem = { href: string; label: string; icon: React.ComponentType<any> };

function RoleSidebarBrand({ title, onNavigate }: { title: string; onNavigate: () => void }) {
  const { state } = useSidebar();
  const isCollapsed = state === 'collapsed';

  return (
    <div className="flex items-center justify-between px-3 group-data-[collapsible=icon]:px-0">
      <div
        className="group/logo relative flex flex-1 items-center justify-center gap-2 transition-all duration-200 cursor-pointer group-data-[collapsible=icon]:cursor-default"
        onClick={() => {
          if (!isCollapsed) {
            onNavigate();
          }
        }}
      >
        <QrCode className="h-6 w-6 transition-opacity duration-150 group-data-[collapsible=icon]:group-hover/logo:opacity-0" />
        <span className="text-lg font-bold group-data-[collapsible=icon]:hidden">{title}</span>
        <SidebarTrigger
          className="absolute inset-0 hidden items-center justify-center rounded-md opacity-0 pointer-events-none transition-opacity duration-150 group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:group-hover/logo:opacity-100 group-data-[collapsible=icon]:group-hover/logo:pointer-events-auto"
        />
      </div>
      <div className="shrink-0 group-data-[collapsible=icon]:hidden">
        <SidebarTrigger />
      </div>
    </div>
  );
}

export default function RoleSidebar({
  title,
  role,
  menuItems = [],
  accountItems = [],
  children,
}: {
  title: string;
  role: 'admin' | 'staff';
  menuItems?: MenuItem[];
  accountItems?: MenuItem[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [signingOut, setSigningOut] = React.useState(false);
  const marketingOrigin = getMarketingOrigin();

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await fetch(`/api/${role}/signout`, { method: 'POST', credentials: 'same-origin' });
    } catch (err) {
      console.error('signout failed', err);
    } finally {
      const destination = marketingOrigin || `/${role}/signin`;
      window.location.href = destination;
    }
  };

  return (
    <SidebarProvider>
      {/* Mobile fixed header */}
      <header className="fixed inset-x-0 top-0 z-50 flex items-center justify-center p-3 md:hidden">
        <div className="absolute left-3">
          <SidebarTrigger />
        </div>
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push(`/${role}`)}>
          
          <span className="text-primary font-bold">{title}</span>
        </div>
      </header>

      <Sidebar collapsible="icon">
        <SidebarHeader>
          <RoleSidebarBrand title={title} onNavigate={() => router.push(`/${role}`)} />
        </SidebarHeader>

        <SidebarContent className='px-3'>
          <SidebarMenu>
            {menuItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton asChild isActive={pathname === item.href} tooltip={item.label}>
                  <Link href={item.href}>
                    <item.icon />
                      <span className="group-data-[collapsible=icon]:hidden">{signingOut ? 'Signing out...' : item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>

          <SidebarGroup>
            <SidebarGroupLabel>Account</SidebarGroupLabel>
            <SidebarMenu>
              {accountItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={pathname === item.href} tooltip={item.label}>
                    {item.href.endsWith('/signout') ? (
                      <button onClick={handleSignOut} className="flex items-center gap-2" disabled={signingOut}>
                        {signingOut ? <Loader2 className="animate-spin h-4 w-4" /> : <item.icon />}
                        <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                      </button>
                    ) : (
                      <Link href={item.href}>
                        <item.icon />
                        <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                      </Link>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>

      <SidebarInset className="pt-14 md:pt-0">{children}</SidebarInset>
    </SidebarProvider>
  );
}
