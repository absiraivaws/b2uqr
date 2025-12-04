import { redirect } from 'next/navigation';

export default async function CashierIndex({ params }: { params: Promise<{ companySlug: string; branchSlug: string; cashierSlug: string }> }) {
  const { companySlug, branchSlug, cashierSlug } = await params;
  redirect(`/${companySlug}/${branchSlug}/${cashierSlug}/generate-qr`);
}
