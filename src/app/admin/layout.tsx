"use client"
import { useState } from 'react';
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
import { Settings as SettingsIcon, LogOutIcon, Loader2, QrCode, User } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [signingOut] = useState(false)

  const menuItems = [
    { href: '/admin/admin-settings', label: 'Settings', icon: SettingsIcon },
  ]

  const accountItems = [
    { href: '/admin/profile', label: 'Profile', icon: User },
    { href: '/admin/signout', label: 'Sign Out', icon: LogOutIcon },
  ]

  const handleSignOut = async () => {
    try {
      await fetch('/api/admin/signout', { method: 'POST', credentials: 'same-origin' });
    } catch (err) {
      console.error('signout failed', err);
    } finally {
      // always redirect to signin
      window.location.href = '/admin/signin';
    }
  }

  // admin routes are intentionally not wrapped with client RequireAuth

  return (
    <SidebarProvider>
      {/* Mobile fixed header: place open button above all on small screens */}
      <header className="fixed inset-x-0 top-0 z-50 flex items-center justify-center p-3 md:hidden">
        {/* left: trigger */}
        <div className="absolute left-3">
          <SidebarTrigger />
        </div>
        {/* center: logo + title (visible on mobile header) */}
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push('/admin')}>
          <QrCode className="h-6 w-6 text-primary" />
          <h1 className="text-lg font-bold">Admin</h1>
        </div>
      </header>

      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center justify-between">
            <div
              className="flex items-center gap-2 group-data-[collapsible=icon]:-ml-1 group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:opacity-0 transition-all duration-200 cursor-pointer"
              onClick={() => router.push('/admin')}
            >
              <QrCode className="h-6 w-6 text-primary" />
              <h1 className="text-lg font-bold">Admin</h1>
            </div>
            <div className="md:hidden">
              <SidebarTrigger />
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {menuItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton asChild isActive={pathname === item.href} tooltip={item.label}>
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
                  <SidebarMenuButton asChild isActive={pathname === item.href} tooltip={item.label}>
                    {item.href === '/admin/signout' ? (
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

      <SidebarInset className="pt-14 md:pt-0">
        {/* Admin area uses server-side admin_session checks; do not apply client RequireAuth here */}
        {children}
      </SidebarInset>
    </SidebarProvider>
  )
}
