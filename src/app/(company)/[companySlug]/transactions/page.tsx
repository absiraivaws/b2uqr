import { getCompanyBySlug } from '@/lib/companyData';
import CompanyTransactionsView from '@/components/company/CompanyTransactionsView';
import { notFound } from 'next/navigation';

export default async function CompanyTransactionsPage({ params }: { params: Promise<{ companySlug: string }> }) {
  const { companySlug } = await params;
  const company = await getCompanyBySlug(companySlug);

  if (!company) {
    notFound();
  }

  return <CompanyTransactionsView companyId={company.id} />;
}
