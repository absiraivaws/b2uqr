import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { getAdminByCookieHeader } from '@/lib/adminSession';

export default async function AdminProfilePage() {

		const header = await headers();
    const cookieHeader = header.get('cookie');
		const admin = await getAdminByCookieHeader(cookieHeader);
		if (!admin) redirect('/admin/signin');

		return (
			<main className="p-4 sm:p-6 lg:p-8">
				<Card>
					<CardHeader>
						<CardTitle>Profile</CardTitle>
						<CardDescription>Manage your personal and merchant information.</CardDescription>
					</CardHeader>
					<CardContent className="space-y-6">
						<h3 className="text-lg font-medium">Admin Personal Details</h3>

						<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
							<div>
								<div className="text-muted-foreground">Name</div>
								<div className="font-medium">{admin?.name ?? admin?.displayName ?? '-'}</div>
							</div>
							<div>
								<div className="text-muted-foreground">Email</div>
								<div className="font-medium">{admin?.email ?? '-'}</div>
							</div>
							<div>
								<div className="text-muted-foreground">NIC</div>
								<div className="font-medium">{admin?.nic ?? '-'}</div>
							</div>
							<div>
								<div className="text-muted-foreground">Phone</div>
								<div className="font-medium">{admin?.phone ?? '-'}</div>
							</div>
							<div>
								<div className="text-muted-foreground">Position</div>
								<div className="font-medium">{admin?.position ?? '-'}</div>
							</div>
						</div>
					</CardContent>
				</Card>
			</main>
		);
	}
