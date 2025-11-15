"use client"

import React, { useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import PersonalDetailsSection, { PersonalDetailsHandle } from '@/components/profile/PersonalDetailsSection';
import MerchantDetailsSection, { MerchantDetailsHandle } from '@/components/profile/MerchantDetailsSection';


export default function ProfilePage() {
	const [saving, setSaving] = useState(false);
	const { toast } = useToast();
	const merchantRef = useRef<MerchantDetailsHandle>(null);
	const personalRef = useRef<PersonalDetailsHandle>(null);

	// MerchantDetailsSection now owns its load/save/lock logic.

	const handleSave = async () => {
		setSaving(true);
		try {
			await personalRef.current?.save();
			await merchantRef.current?.save();
			toast({ title: 'Saved', description: 'Merchant details saved.' });
		} catch (e) {
			console.error('Failed to save merchant details', e);
			// Child handles toasts on error; keep this minimal
		} finally {
			setSaving(false);
		}
	};

	return (
		<main className="p-4 sm:p-6 lg:p-8">
			<Card>
				<CardHeader>
					<CardTitle>Profile</CardTitle>
					<CardDescription>Manage your personal and merchant information.</CardDescription>
				</CardHeader>
				<CardContent className="space-y-6">
					<h3 className="text-lg font-medium">Personal Details</h3>
					<PersonalDetailsSection ref={personalRef} />

					<hr className="my-6" />

					<h3 className="text-lg font-medium">Merchant Details</h3>
					<MerchantDetailsSection ref={merchantRef} />

					<Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</Button>
				</CardContent>
			</Card>
		</main>
	);
}
