import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import AddAdminForm from '@/components/admin/AddAdminForm';
import SignOutButton from '@/components/admin/SignOutButton';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getAdminByCookieHeader } from '@/lib/adminSession';

export default async function AdminPage() {
  // Server-side: verify admin_session cookie and redirect to signin if invalid
  const header = await headers();
  const cookieHeader = header.get('cookie');
  const admin = await getAdminByCookieHeader(cookieHeader);
  if (!admin) {
    redirect('/admin/signin');
  }

  return (
    <main className="p-4 sm:p-6 lg:p-8">
      <Card>
        <CardHeader className="flex items-center justify-between">
          <div>
            <CardTitle>Admin</CardTitle>
            <CardDescription>Only admins are allowed here.</CardDescription>
          </div>
          <SignOutButton />
        </CardHeader>
        <CardContent className="space-y-6">
          <AddAdminForm />
        </CardContent>
      </Card>
    </main>
  );
}
