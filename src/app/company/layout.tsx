import { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getServerUser } from '@/lib/serverUser';
import { adminDb } from '@/lib/firebaseAdmin';
import CompanySidebarShell from '@/components/navigation/CompanySidebarShell';

export default async function CompanyLayout({ children }: { children: ReactNode }) {
  const session = await getServerUser();
  if (!session?.claims?.role || session.claims.role !== 'company-owner') {
    redirect('/signin');
  }
  const permissions = Array.isArray(session.claims?.permissions) ? session.claims.permissions : [];
  let companyName: string | null = null;
  const companyId = session.claims.companyId as string | undefined;
  if (companyId) {
    const companySnap = await adminDb.collection('companies').doc(companyId).get();
    if (companySnap.exists) {
      companyName = (companySnap.data() as Record<string, any>)?.name ?? null;
    }
  }

  return (
    <CompanySidebarShell permissions={permissions} companyName={companyName}>
      {children}
    </CompanySidebarShell>
  );
}
