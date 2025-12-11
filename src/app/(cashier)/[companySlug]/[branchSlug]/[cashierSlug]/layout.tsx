import { ReactNode } from 'react';
import { redirect, notFound } from 'next/navigation';
import { getServerUser } from '@/lib/serverUser';
import { getCompanyBySlug, getBranchBySlug } from '@/lib/companyData';
import PaymentsSidebarShell from '@/components/navigation/PaymentsSidebarShell';
import RequireAuth from '@/components/RequireAuth';

interface CashierLayoutProps {
  children: ReactNode;
  params: { companySlug: string; branchSlug: string; cashierSlug: string };
}

export default async function CashierLayout({ children, params }: CashierLayoutProps) {
  const resolvedParams = await params;
  const requestedCompanySlug = resolvedParams.companySlug;
  const requestedBranchSlug = resolvedParams.branchSlug;
  const requestedCashierSlug = resolvedParams.cashierSlug;
  const session = await getServerUser();
  if (!session || session.claims?.role !== 'cashier') {
    redirect('/signin');
  }

  const claimedCompanySlug = session.claims?.companySlug as string | undefined;
  const claimedBranchSlug = session.claims?.branchSlug as string | undefined;
  const claimedCashierSlug = session.claims?.cashierSlug as string | undefined;
  if (!claimedCompanySlug || !claimedBranchSlug || !claimedCashierSlug) {
    redirect('/qr-registration');
  }
  if (
    claimedCompanySlug !== requestedCompanySlug ||
    claimedBranchSlug !== requestedBranchSlug ||
    claimedCashierSlug !== requestedCashierSlug
  ) {
    redirect(`/${claimedCompanySlug}/${claimedBranchSlug}/${claimedCashierSlug}/qr-registration`);
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

  const basePath = `/${requestedCompanySlug}/${requestedBranchSlug}/${requestedCashierSlug}`;

  return (
    <PaymentsSidebarShell
      basePath={basePath}
      title={company.name}
      subtitle={`${branch.name} • ${requestedCashierSlug}`}
    >
      <RequireAuth>{children}</RequireAuth>
    </PaymentsSidebarShell>
  );
}
