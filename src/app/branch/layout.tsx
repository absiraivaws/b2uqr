import { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getServerUser } from '@/lib/serverUser';

export default async function BranchLayout({ children }: { children: ReactNode }) {
  const session = await getServerUser();
  if (!session?.claims?.role || session.claims.role !== 'branch-manager') {
    redirect('/signin');
  }
  return (
    <div className="min-h-screen bg-muted/30 py-10">
      <div className="mx-auto w-full max-w-4xl px-4 sm:px-6 lg:px-8">
        {children}
      </div>
    </div>
  );
}
