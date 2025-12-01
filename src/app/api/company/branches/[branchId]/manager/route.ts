import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/getCurrentUser';
import { adminDb } from '@/lib/firebaseAdmin';
import { disableBranchManager, upsertBranchManager } from '@/lib/organizations';

interface RouteParams {
  params: { branchId: string };
}

function parseContact(body: any) {
  return {
    email: body?.email ? body.email.toString().trim() : null,
    phone: body?.phone ? body.phone.toString().trim() : null,
  };
}

export async function POST(req: Request, { params }: RouteParams) {
  try {
    const user = await getCurrentUser(req);
    if (!user?.uid || user.claims?.role !== 'company-owner') {
      return NextResponse.json({ ok: false, message: 'Not authorized' }, { status: 403 });
    }
    const companyId = user.claims?.companyId as string | undefined;
    if (!companyId) {
      return NextResponse.json({ ok: false, message: 'Missing company context' }, { status: 400 });
    }
    const branchId = params?.branchId;
    if (!branchId) {
      return NextResponse.json({ ok: false, message: 'branchId missing' }, { status: 400 });
    }
    const body = await req.json().catch(() => ({}));
    const displayName = (body?.displayName || '').toString().trim();
    const pin = (body?.pin || '').toString().trim();
    if (!displayName || !pin) {
      return NextResponse.json({ ok: false, message: 'Display name and PIN are required' }, { status: 400 });
    }
    const branchSnap = await adminDb.collection('companies').doc(companyId).collection('branches').doc(branchId).get();
    if (!branchSnap.exists) {
      return NextResponse.json({ ok: false, message: 'Branch not found' }, { status: 404 });
    }
    const branchData = branchSnap.data() as any;
    const branchUsername = branchData?.username as string | undefined;
    if (!branchUsername) {
      return NextResponse.json({ ok: false, message: 'Branch username missing' }, { status: 500 });
    }

    const result = await upsertBranchManager({
      companyId,
      branchId,
      branchUsername,
      pin,
      displayName,
      contact: parseContact(body),
    });

    return NextResponse.json({ ok: true, managerUid: result.managerUid, username: result.username });
  } catch (err: any) {
    console.error('assign manager error', err);
    return NextResponse.json({ ok: false, message: err?.message || 'Server error' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: RouteParams) {
  try {
    const user = await getCurrentUser(req);
    if (!user?.uid || user.claims?.role !== 'company-owner') {
      return NextResponse.json({ ok: false, message: 'Not authorized' }, { status: 403 });
    }
    const companyId = user.claims?.companyId as string | undefined;
    if (!companyId) {
      return NextResponse.json({ ok: false, message: 'Missing company context' }, { status: 400 });
    }
    const branchId = params?.branchId;
    if (!branchId) {
      return NextResponse.json({ ok: false, message: 'branchId missing' }, { status: 400 });
    }

    await disableBranchManager(companyId, branchId);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('remove manager error', err);
    return NextResponse.json({ ok: false, message: err?.message || 'Server error' }, { status: 500 });
  }
}
