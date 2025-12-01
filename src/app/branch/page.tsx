import { redirect } from 'next/navigation';
import { adminDb } from '@/lib/firebaseAdmin';
import { getServerUser } from '@/lib/serverUser';
import BranchManagerClient from '@/components/company/BranchManagerClient';

export default async function BranchDashboardPage() {
  const session = await getServerUser();
  if (!session?.claims?.role || session.claims.role !== 'branch-manager') {
    redirect('/signin');
  }
  const companyId = session.claims.companyId as string | undefined;
  const branchId = session.claims.branchId as string | undefined;
  if (!companyId || !branchId) {
    redirect('/signin');
  }

  const branchRef = adminDb.collection('companies').doc(companyId).collection('branches').doc(branchId);
  const branchSnap = await branchRef.get();
  if (!branchSnap.exists) {
    redirect('/signin');
  }
  const branchData = branchSnap.data() as Record<string, any>;
  const cashiersSnap = await branchRef.collection('cashiers').orderBy('created_at', 'desc').get();
  const cashiers = cashiersSnap.docs.map((doc) => {
    const data = doc.data() as Record<string, any>;
    return {
      id: doc.id,
      username: data.username,
      displayName: data.displayName,
      status: data.status || 'active',
    };
  });

  return (
    <BranchManagerClient
      branch={{
        id: branchId,
        name: branchData?.name || 'Branch',
        username: branchData?.username || '',
        cashiers,
      }}
    />
  );
}
