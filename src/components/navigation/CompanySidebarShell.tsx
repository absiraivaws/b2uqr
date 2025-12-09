'use client'

import RoleSidebarLayout, { SidebarSectionConfig } from './RoleSidebarLayout';
import { Building2, Users2, LogOutIcon, User, Settings as SettingsIcon, FileText, PieChart } from 'lucide-react';
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
        { href: `${base}/transactions`, label: 'Transactions', icon: FileText, permission: 'transactions' },
        { href: `${base}/summary`, label: 'Summary', icon: PieChart, permission: 'summary' },
      ],
    },
    {
      label: 'Account',
      links: [
        { href: `${base}/profile`, label: 'Profile', icon: User, permission: 'profile' },
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
