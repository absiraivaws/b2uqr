import { getCompanyBySlug } from '@/lib/companyData';
import CompanySummaryView from '@/components/company/CompanySummaryView';
import { notFound } from 'next/navigation';
import { getServerUser } from '@/lib/serverUser';

export default async function CompanySummaryPage({ params }: { params: Promise<{ companySlug: string }> }) {
  const { companySlug } = await params;
  const company = await getCompanyBySlug(companySlug);

  if (!company) {
    notFound();
  }

  const session = await getServerUser();
  const role = session?.claims?.role as string | undefined;
  const showBranchSelect = !(role === 'branch-manager' || role === 'cashier' || !role || role === 'user');
  const showCashierSelect = role !== 'cashier';

  return (
    <main className="p-4 sm:p-6 lg:p-8">
      <CompanySummaryView
        companyId={company.id}
        showBranchSelect={showBranchSelect}
        showCashierSelect={showCashierSelect} />
    </main>
  );
}
