'use client'

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarInset,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import type { LucideIcon } from 'lucide-react';
import { Loader2, QrCode } from 'lucide-react';
import { clientSignOut } from '@/lib/clientAuth';
import { getMarketingOrigin } from '@/lib/marketingOrigin';

export interface SidebarLinkConfig {
  href: string;
  label: string;
  icon: LucideIcon;
  permission?: string;
  action?: 'signout';
}

export interface SidebarSectionConfig {
  label?: string;
  links: SidebarLinkConfig[];
}

interface RoleSidebarLayoutProps {
  title?: string;
  subtitle?: string;
  logoIcon?: LucideIcon;
  permissions?: string[] | null;
  sections: SidebarSectionConfig[];
  children: React.ReactNode;
}

function LayoutSidebarBrand({
  title,
  subtitle,
  LogoIcon,
  onNavigate,
}: {
  title: string;
  subtitle?: string;
  LogoIcon: LucideIcon;
  onNavigate?: () => void;
}) {
  const { state } = useSidebar();
  const isCollapsed = state === 'collapsed';
  const clickable = Boolean(onNavigate);

  return (
    <div className="flex items-center justify-between px-3 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:py-2">
      <div
        className={`group/logo relative flex flex-1 items-center justify-start group-data-[collapsible=icon]:justify-center gap-2 transition-all duration-200 ${
          clickable ? 'cursor-pointer' : 'cursor-default'
        }`}
        onClick={() => {
          if (!isCollapsed) {
            onNavigate?.();
          }
        }}
      >
        <LogoIcon className="h-6 w-6 text-primary transition-opacity duration-150 group-data-[collapsible=icon]:group-hover/logo:opacity-0" />
        <div className="flex flex-col gap-0.5 transition-all duration-200 group-data-[collapsible=icon]:hidden text-center">
          <h1 className="text-lg font-bold">{title}</h1>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        <SidebarTrigger
          className="absolute inset-0 hidden items-center justify-center rounded-md opacity-0 pointer-events-none transition-opacity duration-150 group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:group-hover/logo:opacity-100 group-data-[collapsible=icon]:group-hover/logo:pointer-events-auto"
        />
      </div>
      <div className="shrink-0 group-data-[collapsible=icon]:hidden">
        <SidebarTrigger />
      </div>
    </div>
  );
}

export default function RoleSidebarLayout({
  title = 'B2U QR',
  subtitle,
  logoIcon: LogoIcon = QrCode,
  permissions,
  sections,
  children,
}: RoleSidebarLayoutProps) {
  const marketingOrigin = getMarketingOrigin();
  const router = useRouter();
  const pathname = usePathname();
  const [signingOut, setSigningOut] = useState(false);
  const allowed = permissions ?? [];

  const filteredSections = useMemo(() => {
    return sections
      .map((section) => {
        const visibleLinks = section.links.filter((link) => {
          if (link.action === 'signout') return true;
          if (!link.permission) return true;
          return allowed.includes(link.permission);
        });
        return { ...section, links: visibleLinks };
      })
      .filter((section) => section.links.length > 0);
  }, [sections, allowed]);

  const handleSignOut = async (e?: React.MouseEvent) => {
    e?.preventDefault();
    if (signingOut) return;
    setSigningOut(true);
    try {
      await clientSignOut();
      const destination = marketingOrigin || '/signin';
      window.location.href = destination;
    } catch (err) {
      console.error('Sign out failed', err);
      setSigningOut(false);
    }
  };

  return (
    <SidebarProvider>
      <header className="fixed inset-x-0 top-0 z-50 flex items-center justify-center p-3 md:hidden bg-background">
        <div className="absolute left-3">
          <SidebarTrigger />
        </div>
        <div className="flex items-center gap-2">
          <LogoIcon className="h-6 w-6 text-primary" />
          <div className="flex flex-col">
            <h1 className="text-lg font-bold leading-tight">{title}</h1>
            {subtitle && <span className="text-xs text-muted-foreground leading-tight">{subtitle}</span>}
          </div>
        </div>
      </header>

      <Sidebar collapsible="icon">
        <SidebarHeader>
          <LayoutSidebarBrand title={title} subtitle={subtitle} LogoIcon={LogoIcon} />
        </SidebarHeader>
        <SidebarContent>
          {filteredSections.map((section, idx) => (
            <SidebarGroup key={idx}>
              {section.label && <SidebarGroupLabel>{section.label}</SidebarGroupLabel>}
              <SidebarMenu>
                {section.links.map((link) => (
                  <SidebarMenuItem key={`${section.label ?? 'section'}-${link.label}`}>
                    <SidebarMenuButton
                      asChild
                      isActive={link.href === pathname}
                      tooltip={link.label}
                    >
                      {link.action === 'signout' ? (
                        <button
                          onClick={handleSignOut}
                          className="flex w-full items-center gap-2 text-left"
                          disabled={signingOut}
                        >
                          {signingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <link.icon />}
                          <span className="group-data-[collapsible=icon]:hidden">{signingOut ? 'Signing out...' : link.label}</span>
                        </button>
                      ) : (
                        <Link href={link.href} className="flex items-center gap-2">
                          <link.icon />
                          <span className="group-data-[collapsible=icon]:hidden">{link.label}</span>
                        </Link>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroup>
          ))}
        </SidebarContent>
      </Sidebar>

      <SidebarInset className="pt-14 md:pt-0">
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
