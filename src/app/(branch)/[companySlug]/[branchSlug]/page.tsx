import { getCompanyBySlug, getBranchBySlug } from '@/lib/companyData';
import CashierTotalsChart from '@/components/branch/CashierTotalsChart';
import BranchTodayTotal from '@/components/branch/BranchTodayTotal';
import BranchCashierviseTotal from '@/components/branch/BranchCashierviseTotal';

export default async function BranchDashboardPage({ params }: { params: { companySlug: string; branchSlug: string } | Promise<{ companySlug: string; branchSlug: string }> }) {
  const { companySlug, branchSlug } = await params;
  const company = await getCompanyBySlug(companySlug);
  const branch = company?.id ? await getBranchBySlug(company.id, branchSlug) : null;

  return (
    <main className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Branch Dashboard</h1>
        <p className="text-muted-foreground">{company?.name || companySlug} / {branch?.name || branchSlug}</p>
      </div>

      {company?.id && branch?.id ? (
        <div className="grid gap-4">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-4 h-full flex flex-col">
              <div className="flex-1">
                <BranchTodayTotal companyId={company.id} branchId={branch.id} />
              </div>
              <div className="flex-1">
                <BranchCashierviseTotal companyId={company.id} branchId={branch.id} />
              </div>
            </div>
            <div className='md:col-span-2 h-full'>
              <CashierTotalsChart companyId={company.id} branchId={branch.id} />
            </div>
          </div>
        </div>
      ) : (
        <div className="text-sm text-muted-foreground">Branch or company not found.</div>
      )}
    </main>
  );
}
