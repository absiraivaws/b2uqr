
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
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2">
            <SidebarTrigger />
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
            <SidebarGroup className="mt-auto">
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
      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
  )
}

