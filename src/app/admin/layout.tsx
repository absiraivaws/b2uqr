"use client"
import RoleSidebar from '@/components/ui/RoleSidebar';
import { Settings as SettingsIcon, LogOutIcon, User, History, BarChart, Home, LayoutDashboard } from 'lucide-react'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const menuItems = [
    { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/transactions', label: 'Transactions', icon: History },
    { href: '/admin/summary', label: 'Summary', icon: BarChart },
    { href: '/admin/settings', label: 'Settings', icon: SettingsIcon },
  ];

  const accountItems = [
    { href: '/admin/profile', label: 'Profile', icon: User },
    { href: '/admin/signout', label: 'Sign Out', icon: LogOutIcon },
  ];

  return (
    <RoleSidebar title="Admin" role="admin" menuItems={menuItems} accountItems={accountItems}>
      {children}
    </RoleSidebar>
  );
}
