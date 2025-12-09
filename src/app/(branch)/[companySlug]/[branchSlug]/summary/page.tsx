import { getCompanyBySlug, getBranchBySlug } from '@/lib/companyData';
import BranchSummaryView from '@/components/branch/BranchSummaryView';
import { notFound } from 'next/navigation';

export default async function BranchSummaryPage({ params }: { params: Promise<{ companySlug: string; branchSlug: string }> }) {
  const { companySlug, branchSlug } = await params;
  const company = await getCompanyBySlug(companySlug);

  if (!company) {
    notFound();
  }

  const branch = await getBranchBySlug(company.id, branchSlug);
  if (!branch) {
    notFound();
  }

  return <BranchSummaryView companyId={company.id} branchId={branch.id} />;
}
