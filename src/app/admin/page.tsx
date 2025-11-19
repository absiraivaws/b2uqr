import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
            <CardTitle>Admin Settings</CardTitle>
            <CardDescription>Only admins are allowed here.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          Admin main page
        </CardContent>
      </Card>
    </main>
  );
}
