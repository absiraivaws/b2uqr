import { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getServerUser } from '@/lib/serverUser';
import { getCompanyById } from '@/lib/companyData';

export default async function CompanyLayout({ children }: { children: ReactNode }) {
  const session = await getServerUser();
  if (!session?.claims?.role || session.claims.role !== 'company-owner') {
    redirect('/signin');
  }
  let slug = session.claims?.companySlug as string | undefined;
  if (!slug) {
    const companyId = session.claims?.companyId as string | undefined;
    if (companyId) {
      const company = await getCompanyById(companyId);
      slug = company?.slug;
    }
  }
  if (!slug) {
    redirect('/generate-qr');
  }
  redirect(`/${slug}/branches`);
  return children;
}
