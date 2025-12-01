'use client'

import RoleSidebarLayout, { SidebarSectionConfig } from './RoleSidebarLayout';
import { Building2, Users2, LogOutIcon, User, Settings as SettingsIcon } from 'lucide-react';
import { useMemo } from 'react';

interface CompanySidebarShellProps {
  permissions?: string[] | null;
  companyName?: string | null;
  children: React.ReactNode;
}

export default function CompanySidebarShell({ permissions, companyName, children }: CompanySidebarShellProps) {
  const sections = useMemo<SidebarSectionConfig[]>(() => [
    {
      label: 'Company',
      links: [
        { href: '/company/branches', label: 'Branches', icon: Users2, permission: 'company:branches' },
      ],
    },
    {
      label: 'Account',
      links: [
        { href: '/profile', label: 'Profile', icon: User, permission: 'profile' },
        { href: '/settings', label: 'Settings', icon: SettingsIcon, permission: 'settings' },
        { href: '/signout', label: 'Sign Out', icon: LogOutIcon, action: 'signout' },
      ],
    },
  ], []);

  return (
    <RoleSidebarLayout
      title={companyName || 'Company Console'}
      subtitle="Owner"
      logoIcon={Building2}
      permissions={permissions}
      sections={sections}
    >
      {children}
    </RoleSidebarLayout>
  );
}
