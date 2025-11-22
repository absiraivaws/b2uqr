import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import UserDetailsManager from '@/components/user-management/UserDetailsManager';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getStaffByCookieHeader } from '@/lib/staffSession';

export default async function UserManagementPage() {

  // Server-side: verify staff_session cookie and redirect to staff signin if invalid
  const header = await headers();
  const cookieHeader = header.get('cookie');
  const staff = await getStaffByCookieHeader(cookieHeader);
  if (!staff) {
    redirect('/staff/signin');
  }

  return (
    <main className="p-4 sm:p-6 lg:p-8">
      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
          <CardDescription>Search a user by email and toggle their detailsLocked field.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <UserDetailsManager />
        </CardContent>
      </Card>
    </main>
  );
}
