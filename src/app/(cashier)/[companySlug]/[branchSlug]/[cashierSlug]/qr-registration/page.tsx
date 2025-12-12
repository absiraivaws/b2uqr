import { redirect } from 'next/navigation';
import { getServerUser } from '@/lib/serverUser';
import GenerateQRClient from '@/app/(app)/qr-registration/GenerateQRClient';

interface CashierParams {
	companySlug: string;
	branchSlug: string;
	cashierSlug: string;
}

export default async function CashierGenerateQRPage({
	params,
}: {
	params: Promise<CashierParams>;
}) {
	const { companySlug, branchSlug, cashierSlug } = await params;
	const session = await getServerUser();

	if (!session || session.claims?.role !== 'cashier') {
		redirect('/signin');
	}

	const claimedCompanySlug = session.claims?.companySlug as string | undefined;
	const claimedBranchSlug = session.claims?.branchSlug as string | undefined;
	const claimedCashierSlug = session.claims?.cashierSlug as string | undefined;

	if (!claimedCompanySlug || !claimedBranchSlug || !claimedCashierSlug) {
		redirect('/qr-registration');
	}

	if (
		claimedCompanySlug !== companySlug ||
		claimedBranchSlug !== branchSlug ||
		claimedCashierSlug !== cashierSlug
	) {
		redirect(`/${claimedCompanySlug}/${claimedBranchSlug}/${claimedCashierSlug}/qr-registration`);
	}

	return <GenerateQRClient />;
}
