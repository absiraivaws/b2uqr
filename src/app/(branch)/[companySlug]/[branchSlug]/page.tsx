import { redirect } from 'next/navigation';
import { adminDb } from '@/lib/firebaseAdmin';
import { getServerUser } from '@/lib/serverUser';
import { getCompanyBySlug, getBranchBySlug } from '@/lib/companyData';
import BranchManagerClient from '@/components/company/BranchManagerClient';

export default async function BranchDashboardPage({ params }: { params: { companySlug: string; branchSlug: string } }) {
  const { companySlug, branchSlug } = await params;
  const session = await getServerUser();
  if (!session || session.claims?.role !== 'branch-manager') {
    redirect('/signin');
  }

  const company = await getCompanyBySlug(companySlug);
  if (!company) {
    redirect('/signin');
  }
  const branch = await getBranchBySlug(company.id, branchSlug);
  if (!branch) {
    redirect('/signin');
  }
  if (branch.id !== session.claims?.branchId) {
    redirect('/signin');
  }

  const branchRef = adminDb.collection('companies').doc(company.id).collection('branches').doc(branch.id);
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
        id: branch.id,
        name: branch?.name || 'Branch',
        username: branch?.username || '',
        cashiers,
      }}
    />
  );
}
