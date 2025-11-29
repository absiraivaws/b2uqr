"use client"

import React, { useRef, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import PersonalDetailsSection, { PersonalDetailsHandle } from '@/components/profile/PersonalDetailsSection';
import MerchantDetailsSection, { MerchantDetailsHandle } from '@/components/profile/MerchantDetailsSection';
import { QrUploadSection } from '@/components/profile/QrUploadSection';


export default function ProfilePage() {
	const [saving, setSaving] = useState(false);
	const [isLocked, setIsLocked] = useState(false);
	const [merchantLoaded, setMerchantLoaded] = useState(false);
	const { toast } = useToast();
	const merchantRef = useRef<MerchantDetailsHandle>(null);
	const personalRef = useRef<PersonalDetailsHandle>(null);

	const [profileImageURL, setProfileImageURL] = useState<string | null>(null);

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

	// Load profile image URL from Firestore (users collection)
	useEffect(() => {
		const unsubscribe = onAuthStateChanged(auth, async (user) => {
			if (!user) {
				setProfileImageURL(null);
				return;
			}
			try {
				const ref = doc(db, 'users', user.uid);
				const snap = await getDoc(ref);
				if (snap.exists()) {
					const data = snap.data() as any;
					if (data.profileImageURL) setProfileImageURL(data.profileImageURL);
				}
			} catch (e) {
				console.error('Failed to load profile image URL', e);
			}
		});
		return () => unsubscribe();
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
				<Card className="relative">
				<CardHeader>
					<CardTitle>Profile</CardTitle>
					<CardDescription>Manage your personal and merchant information.</CardDescription>
				</CardHeader>
					{/* Top-right profile picture in a circular frame */}
					<div className="absolute top-2 right-2">
						<Avatar className="h-28 w-28 border-8 border-gray-200 shadow-sm">
							{profileImageURL ? (
								<AvatarImage src={profileImageURL} alt="Profile" />
							) : (
								<AvatarFallback>U</AvatarFallback>
							)}
						</Avatar>
					</div>
				<CardContent className="space-y-6">
					<h3 className="text-lg font-medium">Personal Details</h3>
					<PersonalDetailsSection ref={personalRef} />

					<hr className="my-6" />

					<div className='flex flex-row justify-between'>
						<h3 className="text-lg font-medium">Merchant Details</h3>
						{merchantLoaded && !isLocked && <QrUploadSection merchantRef={merchantRef} />}
					</div>

						<MerchantDetailsSection ref={merchantRef} onLoaded={setMerchantLoaded} />

					<Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</Button>
					
				</CardContent>
			</Card>
		</main>
	);
}
