import { getCompanyBySlug } from '@/lib/companyData';
import BranchTotalsChart from '@/components/company/BranchTotalsChart';

export default async function CompanySlugIndex({ params }: { params: Promise<{ companySlug: string }> }) {
  const { companySlug } = await params;
  const company = await getCompanyBySlug(companySlug);

  return (
    <main className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Company Dashboard</h1>
        <p className="text-muted-foreground">Overview and realtime metrics for {company?.name || companySlug}</p>
      </div>

      {company?.id ? (
        <BranchTotalsChart companyId={company.id} />
      ) : (
        <div className="text-sm text-muted-foreground">Company not found.</div>
      )}
    </main>
  );
}
