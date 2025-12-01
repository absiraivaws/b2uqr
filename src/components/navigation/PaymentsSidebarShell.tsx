'use client'

import { useEffect, useMemo, useState } from 'react';
import { QrCode, History, BarChart, User, Settings as SettingsIcon, LogOutIcon } from 'lucide-react';
import RoleSidebarLayout, { SidebarSectionConfig } from './RoleSidebarLayout';

interface PaymentsSidebarShellProps {
  children: React.ReactNode;
  basePath?: string;
  title?: string;
  subtitle?: string;
}

function joinPath(basePath: string, routePath: string) {
  const sanitizedBase = basePath?.endsWith('/') && basePath !== '/' ? basePath.slice(0, -1) : basePath;
  if (!sanitizedBase || sanitizedBase === '/') return routePath;
  return `${sanitizedBase}${routePath}`;
}

export default function PaymentsSidebarShell({ children, basePath = '', title = 'QR Bridge', subtitle }: PaymentsSidebarShellProps) {
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
    return () => { mounted = false; };
  }, []);

  const sections = useMemo<SidebarSectionConfig[]>(() => [
    {
      label: 'Payments',
      links: [
        { href: joinPath(basePath || '', '/generate-qr'), label: 'Generate QR', icon: QrCode, permission: 'generate-qr' },
        { href: joinPath(basePath || '', '/transactions'), label: 'Transactions', icon: History, permission: 'transactions' },
        { href: joinPath(basePath || '', '/summary'), label: 'Summary', icon: BarChart, permission: 'summary' },
      ],
    },
    {
      label: 'Account',
      links: [
        { href: joinPath(basePath || '', '/profile'), label: 'Profile', icon: User, permission: 'profile' },
        { href: joinPath(basePath || '', '/settings'), label: 'Settings', icon: SettingsIcon, permission: 'settings' },
        { href: joinPath(basePath || '', '/signout'), label: 'Sign Out', icon: LogOutIcon, action: 'signout' },
      ],
    },
  ], [basePath]);

  return (
    <RoleSidebarLayout
      title={title}
      subtitle={subtitle}
      sections={sections}
      permissions={permissions}
    >
      {children}
    </RoleSidebarLayout>
  );
}
