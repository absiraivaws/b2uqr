import { redirect } from 'next/navigation';
import { adminDb } from '@/lib/firebaseAdmin';
import { getServerUser } from '@/lib/serverUser';
import { getCompanyBySlug } from '@/lib/companyData';
import CompanyBranchesClient from '@/components/company/CompanyBranchesClient';

async function getBranchesWithCashiers(companyId: string) {
  const companyRef = adminDb.collection('companies').doc(companyId);
  const branchesSnap = await companyRef.collection('branches').orderBy('created_at', 'desc').get();
  const branches = await Promise.all(branchesSnap.docs.map(async (branchDoc) => {
    const data = branchDoc.data() as Record<string, any>;
    const cashiersSnap = await branchDoc.ref.collection('cashiers').orderBy('created_at', 'desc').get();
    const cashiers = cashiersSnap.docs.map((cashier) => {
      const cashierData = cashier.data() as Record<string, any>;
      return {
        id: cashier.id,
        username: cashierData.username,
        displayName: cashierData.displayName,
        status: cashierData.status || 'active',
      };
    });
    return {
      id: branchDoc.id,
      name: data.name,
      username: data.username,
      branchNumber: data.branchNumber || null,
      managerName: data.managerName || null,
      managerContact: data.managerContact || null,
      managerUid: data.managerUid || null,
      cashiers,
    };
  }));
  return branches;
}

export default async function CompanyBranchesPage({ params }: { params: Promise<{ companySlug: string }> }) {
  const { companySlug } = await params;
  const session = await getServerUser();
  if (!session || session.claims?.role !== 'company-owner') {
    redirect('/signin');
  }

  const company = await getCompanyBySlug(companySlug);
  if (!company) {
    redirect('/signin');
  }
  if (session.uid !== company.ownerUid) {
    redirect('/signin');
  }

  const branches = await getBranchesWithCashiers(company.id);

  return (
    <main className="p-4 sm:p-6 lg:p-8">
      <CompanyBranchesClient
        companyName={company?.name || 'Company'}
        initialBranches={branches}
      />
    </main>
  );
}
