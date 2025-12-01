import { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getServerUser } from '@/lib/serverUser';

export default async function BranchLayout({ children }: { children: ReactNode }) {
  const session = await getServerUser();
  if (!session?.claims?.role || session.claims.role !== 'branch-manager') {
    redirect('/signin');
  }
  const companySlug = session.claims?.companySlug as string | undefined;
  const branchSlug = session.claims?.branchSlug as string | undefined;
  if (!companySlug || !branchSlug) {
    redirect('/generate-qr');
  }
  redirect(`/${companySlug}/${branchSlug}`);
  return children;
}
