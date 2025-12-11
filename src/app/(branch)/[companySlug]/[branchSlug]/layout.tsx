import { ReactNode } from 'react';
import { redirect, notFound } from 'next/navigation';
import { getServerUser } from '@/lib/serverUser';
import { getCompanyBySlug, getBranchBySlug } from '@/lib/companyData';
import BranchSidebarShell from '@/components/navigation/BranchSidebarShell';
import RequireAuth from '@/components/RequireAuth';
import { PERMISSIONS } from '@/lib/organizations';

interface BranchLayoutProps {
  children: ReactNode;
  params: { companySlug: string; branchSlug: string };
}

export default async function BranchSlugLayout({ children, params }: BranchLayoutProps) {
  const resolvedParams = await params;
  const requestedCompanySlug = resolvedParams.companySlug;
  const requestedBranchSlug = resolvedParams.branchSlug;
  const session = await getServerUser();
  if (!session || session.claims?.role !== 'branch-manager') {
    redirect('/signin');
  }

  const claimedCompanySlug = session.claims?.companySlug as string | undefined;
  const claimedBranchSlug = session.claims?.branchSlug as string | undefined;
  if (!claimedCompanySlug || !claimedBranchSlug) {
    redirect('/qr-registration');
  }
  if (claimedCompanySlug !== requestedCompanySlug || claimedBranchSlug !== requestedBranchSlug) {
    redirect(`/${claimedCompanySlug}/${claimedBranchSlug}`);
  }

  const company = await getCompanyBySlug(requestedCompanySlug);
  if (!company) {
    notFound();
  }
  const branch = await getBranchBySlug(company.id, requestedBranchSlug);
  if (!branch) {
    notFound();
  }
  if (branch.id !== session.claims?.branchId) {
    redirect('/signin');
  }

  const permissions = Array.isArray(session.claims?.permissions)
    ? Array.from(new Set([...session.claims.permissions, ...PERMISSIONS.branchManager]))
    : [...PERMISSIONS.branchManager];

  return (
    <BranchSidebarShell
      permissions={permissions}
      branchName={branch.name}
      companySlug={requestedCompanySlug}
      branchSlug={requestedBranchSlug}
    >
      <RequireAuth>{children}</RequireAuth>
    </BranchSidebarShell>
  );
}
