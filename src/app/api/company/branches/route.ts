import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/getCurrentUser';
import { createBranch } from '@/lib/organizations';
import { adminDb } from '@/lib/firebaseAdmin';

function parseNumber(value: any) {
  if (value === null || value === undefined) return null;
  const num = typeof value === 'number' ? value : parseFloat(value);
  return Number.isFinite(num) ? num : null;
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser(req);
    const role = user?.claims?.role;
    if (!user?.uid || role !== 'company-owner') {
      return NextResponse.json({ ok: false, message: 'Not authorized' }, { status: 403 });
    }
    const companyId = user.claims?.companyId as string | undefined;
    if (!companyId) {
      return NextResponse.json({ ok: false, message: 'Missing company context' }, { status: 400 });
    }
    const body = await req.json().catch(() => ({}));
    const name = (body?.name || '').toString().trim();
    if (!name) {
      return NextResponse.json({ ok: false, message: 'Branch name is required' }, { status: 400 });
    }
    const address = (body?.address || '').toString().trim() || null;
    const lat = parseNumber(body?.lat);
    const lng = parseNumber(body?.lng);

    const companySnap = await adminDb.collection('companies').doc(companyId).get();
    if (!companySnap.exists) {
      return NextResponse.json({ ok: false, message: 'Company not found' }, { status: 404 });
    }
    const companyData = companySnap.data() as any;

    const result = await createBranch({
      companyId,
      companyName: companyData?.name || 'Company',
      companySlug: companyData?.slug || 'company',
      branchName: name,
      address,
      lat,
      lng,
      actorUid: user.uid,
    });

    return NextResponse.json({ ok: true, branchId: result.branchId, username: result.username });
  } catch (err: any) {
    console.error('create branch error', err);
    return NextResponse.json({ ok: false, message: err?.message || 'Server error' }, { status: 500 });
  }
}

