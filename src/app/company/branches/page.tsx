import { redirect } from 'next/navigation';
import { adminDb } from '@/lib/firebaseAdmin';
import { getServerUser } from '@/lib/serverUser';
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
      managerName: data.managerName || null,
      managerContact: data.managerContact || null,
      managerUid: data.managerUid || null,
      cashiers,
    };
  }));
  return branches;
}

export default async function CompanyBranchesPage() {
  const session = await getServerUser();
  if (!session?.claims?.role || session.claims.role !== 'company-owner') {
    redirect('/signin');
  }
  const companyId = session.claims.companyId as string | undefined;
  if (!companyId) {
    redirect('/signin');
  }

  const companySnap = await adminDb.collection('companies').doc(companyId).get();
  if (!companySnap.exists) {
    redirect('/signin');
  }
  const companyData = companySnap.data() as Record<string, any>;
  const branches = await getBranchesWithCashiers(companyId);

  return (
    <CompanyBranchesClient
      companyName={companyData?.name || 'Company'}
      initialBranches={branches}
    />
  );
}
