import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getAdminByCookieHeader } from '@/lib/adminSession';
import { adminDb } from '@/lib/firebaseAdmin';
import TodayAmountChart from '@/components/admin/TodayAmountChart';

export default async function AdminPage() {
  // Server-side: verify admin_session cookie and redirect to signin if invalid
  const header = await headers();
  const cookieHeader = header.get('cookie');
  const admin = await getAdminByCookieHeader(cookieHeader);
  if (!admin) {
    redirect('/admin/signin');
  }
  // Gather admin dashboard stats (server-side)
  const now = Date.now();
  const onlineThresholdMs = 15 * 60 * 1000; // consider users active within last 15 minutes
  const since = new Date(now - onlineThresholdMs);

  let totalUsers = 0;
  let onlineUsers = 0;
  let activeAdminSessions = 0;
  let activeStaffSessions = 0;
  let totalTransactions = 0;
  let pendingTransactions = 0;

  try {
    const [usersSnap, recentUsersSnap, adminSessionsSnap, staffSessionsSnap, txSnap, pendingTxSnap] = await Promise.all([
      adminDb.collection('users').get(),
      adminDb.collection('users').where('updated_at', '>', since).get(),
      adminDb.collection('admin_sessions').where('expires_at_ms', '>', now).get(),
      adminDb.collection('staff_sessions').where('expires_at_ms', '>', now).get(),
      adminDb.collection('transactions').get(),
      adminDb.collection('transactions').where('status', '==', 'PENDING').get(),
    ]);

    totalUsers = usersSnap.size;
    onlineUsers = recentUsersSnap.size;
    activeAdminSessions = adminSessionsSnap.size;
    activeStaffSessions = staffSessionsSnap.size;
    totalTransactions = txSnap.size;
    pendingTransactions = pendingTxSnap.size;
  } catch (err) {
    console.error('Failed to fetch admin stats', err);
    // keep zeros on error
  }

  return (
    <main className="p-4 sm:p-6 lg:p-8">
      <Card>
        <CardHeader className="flex justify-between">
          <div>
            <CardTitle>Admin Dashboard</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <TodayAmountChart />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="border rounded p-4">
              <div className="text-sm text-muted-foreground">Total users</div>
              <div className="text-2xl font-semibold">{totalUsers}</div>
            </div>
            <div className="border rounded p-4">
              <div className="text-sm text-muted-foreground">Online (last 15m)</div>
              <div className="text-2xl font-semibold">{onlineUsers}</div>
            </div>
            <div className="border rounded p-4">
              <div className="text-sm text-muted-foreground">Active admin sessions</div>
              <div className="text-2xl font-semibold">{activeAdminSessions}</div>
            </div>
            <div className="border rounded p-4">
              <div className="text-sm text-muted-foreground">Active staff sessions</div>
              <div className="text-2xl font-semibold">{activeStaffSessions}</div>
            </div>
            <div className="border rounded p-4">
              <div className="text-sm text-muted-foreground">Total transactions</div>
              <div className="text-2xl font-semibold">{totalTransactions}</div>
            </div>
            <div className="border rounded p-4">
              <div className="text-sm text-muted-foreground">Pending transactions</div>
              <div className="text-2xl font-semibold">{pendingTransactions}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
