import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/getCurrentUser';
import { onboardCompanyMerchant, onboardIndividualMerchant } from '@/lib/organizations';

function parseNumber(value: any) {
  if (value === null || value === undefined) return null;
  const num = typeof value === 'number' ? value : parseFloat(value);
  return Number.isFinite(num) ? num : null;
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser(req);
    if (!user?.uid) {
      return NextResponse.json({ ok: false, message: 'Not authenticated' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const accountType = (body?.accountType || '').toString();
    if (accountType !== 'individual' && accountType !== 'company') {
      return NextResponse.json({ ok: false, message: 'Invalid account type' }, { status: 400 });
    }

    const kyc = body?.kyc || {};
    const contact = body?.contact || {};
    const whatsappNumber = (contact?.whatsappNumber ?? '').toString().trim();
    const baseProfile = {
      displayName: (kyc.displayName || '').toString().trim(),
      nic: (kyc.nic || '').toString().trim(),
      businessRegistrationNumber: (kyc.businessReg || '').toString().trim(),
      address: (kyc.address || '').toString().trim(),
      lat: parseNumber(kyc.lat),
      lng: parseNumber(kyc.lng),
    };

    if (!baseProfile.displayName || !baseProfile.nic || !baseProfile.businessRegistrationNumber || !baseProfile.address) {
      return NextResponse.json({ ok: false, message: 'Missing required profile fields' }, { status: 400 });
    }

    if (accountType === 'individual') {
      await onboardIndividualMerchant({
        uid: user.uid,
        profile: baseProfile,
        contact: {
          email: contact.email || null,
          whatsappNumber: whatsappNumber || null,
        },
      });
      return NextResponse.json({ ok: true, accountType: 'individual' });
    }

    const companyName = (kyc.companyName || '').toString().trim();
    if (!companyName) {
      return NextResponse.json({ ok: false, message: 'Company name is required' }, { status: 400 });
    }

    const result = await onboardCompanyMerchant({
      uid: user.uid,
      owner: baseProfile,
      contact: {
        email: contact.email || null,
        whatsappNumber: whatsappNumber || null,
      },
      company: {
        name: companyName,
        registrationNumber: baseProfile.businessRegistrationNumber || '',
        address: baseProfile.address,
        lat: baseProfile.lat,
        lng: baseProfile.lng,
      },
    });

    return NextResponse.json({ ok: true, accountType: 'company', companyId: result.companyId, companySlug: result.companySlug });
  } catch (err: any) {
    console.error('onboard error', err);
    return NextResponse.json({ ok: false, message: err?.message || 'Server error' }, { status: 500 });
  }
}
