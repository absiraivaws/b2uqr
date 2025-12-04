import { redirect } from 'next/navigation';

export default async function CompanySlugIndex({ params }: { params: Promise<{ companySlug: string }> }) {
  const { companySlug } = await params;
  redirect(`/${companySlug}/branches`);
}
