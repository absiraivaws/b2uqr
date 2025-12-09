import { getCompanyBySlug } from '@/lib/companyData';
import CompanyTransactionsView from '@/components/company/CompanyTransactionsView';
import { notFound } from 'next/navigation';
import { getServerUser } from '@/lib/serverUser';

export default async function CompanyTransactionsPage({ params }: { params: Promise<{ companySlug: string }> }) {
  const { companySlug } = await params;
  const company = await getCompanyBySlug(companySlug);

  if (!company) {
    notFound();
  }

  const session = await getServerUser();
  const role = session?.claims?.role as string | undefined;
  // hide branch select for branch-manager, cashier, and individual users (no role)
  const showBranchSelect = !(role === 'branch-manager' || role === 'cashier' || !role || role === 'user');
  // hide cashier select for cashiers
  const showCashierSelect = role !== 'cashier';

  return <CompanyTransactionsView companyId={company.id} showBranchSelect={showBranchSelect} showCashierSelect={showCashierSelect} />;
}
