'use client'

import RoleSidebarLayout, { SidebarSectionConfig } from './RoleSidebarLayout';
import { Store, Users, User, LogOutIcon } from 'lucide-react';
import { useMemo } from 'react';

interface BranchSidebarShellProps {
  permissions?: string[] | null;
  branchName?: string | null;
  children: React.ReactNode;
}

export default function BranchSidebarShell({ permissions, branchName, children }: BranchSidebarShellProps) {
  const sections = useMemo<SidebarSectionConfig[]>(() => [
    {
      label: 'Branch',
      links: [
        { href: '/branch', label: 'Manage Cashiers', icon: Users, permission: 'company:cashiers' },
      ],
    },
    {
      label: 'Account',
      links: [
        { href: '/profile', label: 'Profile', icon: User, permission: 'profile' },
        { href: '/signout', label: 'Sign Out', icon: LogOutIcon, action: 'signout' },
      ],
    },
  ], []);

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
