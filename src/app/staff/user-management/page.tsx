"use client"

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import UserDetailsManager from '@/components/user-management/UserDetailsManager';

export default function UserManagementPage() {
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
