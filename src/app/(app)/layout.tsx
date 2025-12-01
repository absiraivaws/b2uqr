'use client'
import { useEffect, useMemo, useState } from 'react';
import { QrCode, History, BarChart, User, Settings as SettingsIcon, LogOutIcon } from 'lucide-react';
import RoleSidebarLayout, { SidebarSectionConfig } from '@/components/navigation/RoleSidebarLayout';
import RequireAuth from '@/components/RequireAuth';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [permissions, setPermissions] = useState<string[] | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const res = await fetch('/api/session/verify', { cache: 'no-store', credentials: 'include' });
        if (!mounted) return;
        if (res.ok) {
          const data = await res.json().catch(() => ({}));
          setPermissions(Array.isArray(data?.permissions) ? data.permissions : []);
        } else {
          setPermissions([]);
        }
      } catch {
        if (mounted) setPermissions([]);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const sections = useMemo<SidebarSectionConfig[]>(() => [
    {
      label: 'Payments',
      links: [
        { href: '/generate-qr', label: 'Generate QR', icon: QrCode, permission: 'generate-qr' },
        { href: '/transactions', label: 'Transactions', icon: History, permission: 'transactions' },
        { href: '/summary', label: 'Summary', icon: BarChart, permission: 'summary' },
      ],
    },
    {
      label: 'Account',
      links: [
        { href: '/profile', label: 'Profile', icon: User, permission: 'profile' },
        //{ href: '/settings', label: 'Settings', icon: SettingsIcon, permission: 'settings' },
        { href: '/signout', label: 'Sign Out', icon: LogOutIcon, action: 'signout' },
      ],
    },
  ], []);

  return (
    <RoleSidebarLayout
      title="QR Bridge"
      sections={sections}
      permissions={permissions}
    >
      <RequireAuth>{children}</RequireAuth>
    </RoleSidebarLayout>
  );
}
