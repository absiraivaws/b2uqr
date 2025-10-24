'use client'
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
import { QrCode, History, BarChart, User, Settings as SettingsIcon } from 'lucide-react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  
  const menuItems = [
    { href: '/generate-qr', label: 'Generate QR', icon: QrCode },
    { href: '/transactions', label: 'Transactions', icon: History },
    { href: '/summary', label: 'Summary', icon: BarChart },
  ]

  const accountItems = [
      { href: '/profile', label: 'Profile', icon: User },
      { href: '/settings', label: 'Settings', icon: SettingsIcon },
  ]

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
                                <Link href={item.href}>
                                    <item.icon />
                                    <span>{item.label}</span>
                                </Link>
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
