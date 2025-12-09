import { getCompanyBySlug, getBranchBySlug } from '@/lib/companyData';
import BranchTransactionsView from '@/components/branch/BranchTransactionsView';
import { notFound } from 'next/navigation';
import { getServerUser } from '@/lib/serverUser';

export default async function BranchTransactionsPage({ params }: { params: Promise<{ companySlug: string; branchSlug: string }> }) {
  const { companySlug, branchSlug } = await params;
  const company = await getCompanyBySlug(companySlug);

  if (!company) {
    notFound();
  }

  const branch = await getBranchBySlug(company.id, branchSlug);
  if (!branch) {
    notFound();
  }

  const session = await getServerUser();
  const signedBranchId = session?.claims?.branchId as string | undefined;
  const role = session?.claims?.role as string | undefined;

  // On branch pages we don't show branch select (contextual), and we hide cashier select for cashiers
  const showBranchSelect = false;
  const showCashierSelect = role !== 'cashier';

  return <BranchTransactionsView companyId={company.id} branchId={branch.id} selectedBranchId={signedBranchId} showBranchSelect={showBranchSelect} showCashierSelect={showCashierSelect} />;
}
