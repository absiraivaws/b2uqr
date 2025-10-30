'use client'
import { useState, useEffect } from 'react';
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
} from '@/components/ui/sidebar'
import { QrCode, History, BarChart, User, Settings as SettingsIcon, LogOutIcon, Loader2 } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { clientSignOut } from '@/lib/clientAuth';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [signingOut, setSigningOut] = useState(false)
  
  const menuItems = [
    { href: '/generate-qr', label: 'Generate QR', icon: QrCode },
    { href: '/transactions', label: 'Transactions', icon: History },
    { href: '/summary', label: 'Summary', icon: BarChart },
  ]

  const accountItems = [
      { href: '/profile', label: 'Profile', icon: User },
      { href: '/settings', label: 'Settings', icon: SettingsIcon },
      { href: '/signout', label: 'Sign Out', icon: LogOutIcon },
  ]

  const handleSignOut = async (e?: React.MouseEvent) => {
    e?.preventDefault();
    if (signingOut) return;
    setSigningOut(true);
    try {
      await clientSignOut();
      // Replace history entry so back-button won't return to a protected page
      router.replace('/signin');
    } catch (err) {
      console.error('Sign out failed', err);
      setSigningOut(false);
    }
  };

  // On mount, verify server session for this layout. If the server session
  // is invalid or absent, redirect to /signin. This prevents the browser
  // back-button from showing protected content that appears cached.
  useEffect(() => {
    let cancelled = false;
    const verify = async () => {
      try {
        const res = await fetch('/api/session/verify', { credentials: 'include' });
        if (!cancelled && (!res.ok)) {
          router.replace('/signin');
        }
      } catch (err) {
        if (!cancelled) router.replace('/signin');
      }
    };
    verify();
    return () => { cancelled = true };
  // only run on first mount for this layout
  }, [router]);

  return (
    <SidebarProvider>
      {/* Mobile fixed header: place open button above all on small screens */}
      <header className="fixed inset-x-0 top-0 z-50 flex items-center justify-center p-3 md:hidden">
        {/* left: trigger */}
        <div className="absolute left-3">
          <SidebarTrigger />
        </div>
        {/* center: logo + title (visible on mobile header) */}
        <div className="flex items-center gap-2">
          <QrCode className="h-6 w-6 text-primary" />
          <h1 className="text-lg font-bold">QR Bridge</h1>
        </div>
      </header>

      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2">
            <div className="hidden md:block">
              <SidebarTrigger />
            </div>
            <div className="flex items-center gap-2 group-data-[collapsible=icon]:-ml-1 group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:opacity-0 transition-all duration-200">
                <QrCode className="h-6 w-6 text-primary" />
                <h1 className="text-lg font-bold">QR Bridge</h1>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent>
            <SidebarMenu>
                {menuItems.map((item) => (
                    <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton
                        asChild
                        isActive={pathname === item.href}
                        tooltip={item.label}
                        >
                            <Link href={item.href}>
                                <item.icon />
                                <span>{item.label}</span>
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
                            <SidebarMenuButton
                            asChild
                            isActive={pathname === item.href}
                            tooltip={item.label}
                            >
                                {item.href === '/signout' ? (
                                  <button
                                    onClick={handleSignOut}
                                    className="flex items-center gap-2"
                                    disabled={signingOut}
                                  >
                                    {signingOut ? <Loader2 className="animate-spin h-4 w-4" /> : <item.icon />}
                                    <span>{item.label}</span>
                                  </button>
                                ) : (
                                  <Link href={item.href}>
                                    <item.icon />
                                    <span>{item.label}</span>
                                  </Link>
                                )}
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    ))}
                </SidebarMenu>
            </SidebarGroup>
        </SidebarContent>
      </Sidebar>
      {/* Add mobile top padding so content is not covered by the fixed header */}
      <SidebarInset className="pt-14 md:pt-0">{children}</SidebarInset>
    </SidebarProvider>
  )
}
