import { ReactNode } from 'react';
import { redirect, notFound } from 'next/navigation';
import { getServerUser } from '@/lib/serverUser';
import { getCompanyById, getCompanyBySlug } from '@/lib/companyData';
import CompanySidebarShell from '@/components/navigation/CompanySidebarShell';
import RequireAuth from '@/components/RequireAuth';
import { PERMISSIONS } from '@/lib/organizations';

interface CompanyLayoutProps {
  children: ReactNode;
  params: { companySlug: string };
}

export default async function CompanySlugLayout({ children, params }: CompanyLayoutProps) {
  const resolvedParams = await params;
  const requestedSlug = resolvedParams.companySlug;
  const session = await getServerUser();
  if (!session || session.claims?.role !== 'company-owner') {
    redirect('/signin');
  }

  const companyId = session.claims?.companyId as string | undefined;
  let company = null;
  if (companyId) {
    company = await getCompanyById(companyId);
  }
  if (!company) {
    company = await getCompanyBySlug(requestedSlug);
  }
  if (!company) {
    notFound();
  }
  if (company.ownerUid !== session.uid) {
    redirect('/signin');
  }

  const canonicalSlug = company.slug;
  if (!canonicalSlug) {
    redirect('/generate-qr');
  }
  if (requestedSlug !== canonicalSlug) {
    redirect(`/${canonicalSlug}/branches`);
  }

  const permissions = Array.isArray(session.claims?.permissions)
    ? Array.from(new Set([...session.claims.permissions, ...PERMISSIONS.companyOwner]))
    : [...PERMISSIONS.companyOwner];

  return (
    <CompanySidebarShell
      permissions={permissions}
      companyName={company.name}
      companySlug={canonicalSlug}
    >
      <RequireAuth>{children}</RequireAuth>
    </CompanySidebarShell>
  );
}
