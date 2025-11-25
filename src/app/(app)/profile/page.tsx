"use client"

import React, { useRef, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import PersonalDetailsSection, { PersonalDetailsHandle } from '@/components/profile/PersonalDetailsSection';
import MerchantDetailsSection, { MerchantDetailsHandle } from '@/components/profile/MerchantDetailsSection';
import { QrUploadSection } from '@/components/profile/QrUploadSection';


export default function ProfilePage() {
	const [saving, setSaving] = useState(false);
	const [isLocked, setIsLocked] = useState(false);
	const { toast } = useToast();
	const merchantRef = useRef<MerchantDetailsHandle>(null);
	const personalRef = useRef<PersonalDetailsHandle>(null);

	// Check if merchant details are locked
	useEffect(() => {
		const checkLockStatus = () => {
			if (merchantRef.current) {
				setIsLocked(merchantRef.current.isLocked());
			}
		};
		
		// Check initially and after any potential changes
		const timer = setInterval(checkLockStatus, 500);
		checkLockStatus();
		
		return () => clearInterval(timer);
	}, []);

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

					<div className='flex flex-row justify-between'>
						<h3 className="text-lg font-medium">Merchant Details</h3>
						{!isLocked && <QrUploadSection merchantRef={merchantRef} />}
					</div>

					<MerchantDetailsSection ref={merchantRef} />

					<Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</Button>
					
				</CardContent>
			</Card>
		</main>
	);
}
