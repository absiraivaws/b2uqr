"use client"
import RoleSidebar from '@/components/ui/RoleSidebar';
import { Settings as SettingsIcon, LogOutIcon, User } from 'lucide-react'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const menuItems = [
    { href: '/admin/admin-settings', label: 'Settings', icon: SettingsIcon },
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
