'use client'

import RoleSidebarLayout, { SidebarSectionConfig } from './RoleSidebarLayout';
import { Store, Users, User, LogOutIcon, FileText, PieChart, Home } from 'lucide-react';
import { useMemo } from 'react';

interface BranchSidebarShellProps {
  permissions?: string[] | null;
  branchName?: string | null;
  companySlug: string;
  branchSlug: string;
  children: React.ReactNode;
}

export default function BranchSidebarShell({ permissions, branchName, companySlug, branchSlug, children }: BranchSidebarShellProps) {
  const base = `/${companySlug}/${branchSlug}`;
  const sections = useMemo<SidebarSectionConfig[]>(() => [
    {
      label: 'Branch',
      links: [
        { href: `${base}`, label: 'Dashboard', icon: Home, permission: 'branch:dashboard' },
        { href: `${base}/cashiers`, label: 'Cashiers', icon: Users, permission: 'company:cashiers' },
      ],
    },
    {
      label: 'Payments',
      links: [
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
      title={branchName || 'Branch Console'}
      subtitle="Manager"
      logoIcon={Store}
      permissions={permissions}
      sections={sections}
    >
      {children}
    </RoleSidebarLayout>
  );
}
