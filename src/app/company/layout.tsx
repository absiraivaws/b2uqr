import { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getServerUser } from '@/lib/serverUser';

export default async function CompanyLayout({ children }: { children: ReactNode }) {
  const session = await getServerUser();
  if (!session?.claims?.role || session.claims.role !== 'company-owner') {
    redirect('/signin');
  }

  return (
    <div className="min-h-screen bg-muted/20 py-10">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        {children}
      </div>
    </div>
  );
}
