import React from 'react';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getAdminByCookieHeader } from '@/lib/adminSession';
import AdminTransactionsClient from '../../../components/admin/TransactionsClient';

export default async function AdminPage() {
  // Server-side: verify admin_session cookie and redirect to signin if invalid
  const header = await headers();
  const cookieHeader = header.get('cookie');
  const admin = await getAdminByCookieHeader(cookieHeader);
  if (!admin) {
    redirect('/admin/signin');
  }

  return (
    <main>
        <AdminTransactionsClient />
    </main>
  );
}
