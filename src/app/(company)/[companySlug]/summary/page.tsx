import { getCompanyBySlug } from '@/lib/companyData';
import CompanySummaryView from '@/components/company/CompanySummaryView';
import { notFound } from 'next/navigation';

export default async function CompanySummaryPage({ params }: { params: Promise<{ companySlug: string }> }) {
  const { companySlug } = await params;
  const company = await getCompanyBySlug(companySlug);

  if (!company) {
    notFound();
  }

  return <CompanySummaryView companyId={company.id} />;
}
