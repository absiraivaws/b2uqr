'use client'

import RoleSidebarLayout, { SidebarSectionConfig } from './RoleSidebarLayout';
import { Building2, Users2, LogOutIcon, User, Settings as SettingsIcon } from 'lucide-react';
import { useMemo } from 'react';

interface CompanySidebarShellProps {
  permissions?: string[] | null;
  companyName?: string | null;
  companySlug: string;
  children: React.ReactNode;
}

export default function CompanySidebarShell({ permissions, companyName, companySlug, children }: CompanySidebarShellProps) {
  const base = `/${companySlug}`;
  const sections = useMemo<SidebarSectionConfig[]>(() => [
    {
      label: 'Company',
      links: [
        { href: `${base}/branches`, label: 'Branches', icon: Users2, permission: 'company:branches' },
      ],
    },
    {
      label: 'Account',
      links: [
        { href: `${base}/profile`, label: 'Profile', icon: User, permission: 'profile' },
        { href: `${base}/settings`, label: 'Settings', icon: SettingsIcon, permission: 'settings' },
        { href: `${base}/signout`, label: 'Sign Out', icon: LogOutIcon, action: 'signout' },
      ],
    },
  ], [base]);

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
