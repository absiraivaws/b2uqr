import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getStaffByCookieHeader } from '@/lib/staffSession';

export default async function StaffPage() {
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
        <CardHeader className="flex items-center justify-between">
          <div>
            <CardTitle>Staff</CardTitle>
            <CardDescription>Only staff are allowed here.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          Staff main page
        </CardContent>
      </Card>
    </main>
  );
}
