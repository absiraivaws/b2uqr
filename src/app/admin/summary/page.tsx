import React from 'react';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getAdminByCookieHeader } from '@/lib/adminSession';
import AdminSummaryClient from '@/components/admin/AdminSummaryClient';

export default async function AdminSummaryPage() {
  const header = await headers();
  const cookieHeader = header.get('cookie');
  const admin = await getAdminByCookieHeader(cookieHeader);
  if (!admin) {
    redirect('/admin/signin');
  }

  return (
    <main>
      <AdminSummaryClient />
    </main>
  );
}
