import { getCompanyBySlug, getBranchBySlug } from '@/lib/companyData';
import BranchTransactionsView from '@/components/branch/BranchTransactionsView';
import { notFound } from 'next/navigation';

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

  return <BranchTransactionsView companyId={company.id} branchId={branch.id} />;
}
