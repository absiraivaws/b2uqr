import { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getServerUser } from '@/lib/serverUser';
import { adminDb } from '@/lib/firebaseAdmin';
import BranchSidebarShell from '@/components/navigation/BranchSidebarShell';

export default async function BranchLayout({ children }: { children: ReactNode }) {
  const session = await getServerUser();
  if (!session?.claims?.role || session.claims.role !== 'branch-manager') {
    redirect('/signin');
  }
  const permissions = Array.isArray(session.claims?.permissions) ? session.claims.permissions : [];
  const companyId = session.claims.companyId as string | undefined;
  const branchId = session.claims.branchId as string | undefined;
  let branchName: string | null = null;
  if (companyId && branchId) {
    const branchSnap = await adminDb.collection('companies').doc(companyId).collection('branches').doc(branchId).get();
    if (branchSnap.exists) {
      branchName = (branchSnap.data() as Record<string, any>)?.name ?? null;
    }
  }

  return (
    <BranchSidebarShell permissions={permissions} branchName={branchName}>
      {children}
    </BranchSidebarShell>
  );
}
