import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/getCurrentUser';
import { deleteCashier } from '@/lib/organizations';

interface RouteParams {
  params: Promise<{ branchId: string; cashierId: string }>;
}

export async function DELETE(req: Request, context: RouteParams) {
  try {
    const { branchId, cashierId } = await context.params;
    const user = await getCurrentUser(req);
    const role = user?.claims?.role;
    if (!user?.uid || (role !== 'company-owner' && role !== 'branch-manager')) {
      return NextResponse.json({ ok: false, message: 'Not authorized' }, { status: 403 });
    }
    const companyId = user.claims?.companyId as string | undefined;
    if (!companyId) {
      return NextResponse.json({ ok: false, message: 'Missing company context' }, { status: 400 });
    }
    if (!branchId || !cashierId) {
      return NextResponse.json({ ok: false, message: 'branchId and cashierId are required' }, { status: 400 });
    }
    if (role === 'branch-manager') {
      const branchClaim = user.claims?.branchId as string | undefined;
      if (!branchClaim || branchClaim !== branchId) {
        return NextResponse.json({ ok: false, message: 'Not authorized for this branch' }, { status: 403 });
      }
    }

    await deleteCashier({ companyId, branchId, cashierId });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('delete cashier error', err);
    return NextResponse.json({ ok: false, message: err?.message || 'Server error' }, { status: 500 });
  }
}
