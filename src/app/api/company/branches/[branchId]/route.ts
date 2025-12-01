import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/getCurrentUser';
import { deleteBranch } from '@/lib/organizations';

interface RouteParams {
  params: Promise<{ branchId: string }>;
}

export async function DELETE(req: Request, context: RouteParams) {
  try {
    const { branchId } = await context.params;
    const user = await getCurrentUser(req);
    if (!user?.uid || user.claims?.role !== 'company-owner') {
      return NextResponse.json({ ok: false, message: 'Not authorized' }, { status: 403 });
    }
    const companyId = user.claims?.companyId as string | undefined;
    if (!companyId) {
      return NextResponse.json({ ok: false, message: 'Missing company context' }, { status: 400 });
    }
    if (!branchId) {
      return NextResponse.json({ ok: false, message: 'branchId missing' }, { status: 400 });
    }

    await deleteBranch({ companyId, branchId, actorUid: user.uid });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('delete branch error', err);
    return NextResponse.json({ ok: false, message: err?.message || 'Server error' }, { status: 500 });
  }
}
