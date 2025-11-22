"use client"
import RoleSidebar from '@/components/ui/RoleSidebar';
import { Settings as SettingsIcon, LogOutIcon, User } from 'lucide-react'

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  const menuItems = [
    { href: '/staff/user-management', label: 'User Management', icon: SettingsIcon },
  ];

  const accountItems = [
    { href: '/staff/profile', label: 'Profile', icon: User },
    { href: '/staff/signout', label: 'Sign Out', icon: LogOutIcon },
  ];

  return (
    <RoleSidebar title="Staff" role="staff" menuItems={menuItems} accountItems={accountItems}>
      {children}
    </RoleSidebar>
  );
}
