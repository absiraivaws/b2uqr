"use client"

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import AddAdminForm from '@/components/admin-settings/AddAdminForm';

export default function AdminPage() {
  return (
    <main className="p-4 sm:p-6 lg:p-8">
      <Card>
        <CardHeader>
          <CardTitle>Admin</CardTitle>
          <CardDescription>Only admins are allowed here.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <AddAdminForm />
        </CardContent>
      </Card>
    </main>
  );
}
