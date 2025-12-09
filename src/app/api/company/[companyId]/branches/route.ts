import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/getCurrentUser';
import { adminDb } from '@/lib/firebaseAdmin';

interface RouteParams {
  params: Promise<{ companyId: string }>;
}

export async function GET(req: Request, context: RouteParams) {
  try {
    const { companyId } = await context.params;
    const user = await getCurrentUser(req);
    const role = user?.claims?.role;
    if (!user?.uid || (role !== 'company-owner' && role !== 'branch-manager')) {
      return NextResponse.json({ ok: false, message: 'Not authorized' }, { status: 403 });
    }
    const claimedCompanyId = user.claims?.companyId as string | undefined;
    if (!claimedCompanyId || claimedCompanyId !== companyId) {
      return NextResponse.json({ ok: false, message: 'Missing or invalid company context' }, { status: 400 });
    }

    const branchesSnap = await adminDb.collection('companies').doc(companyId).collection('branches').orderBy('created_at', 'desc').get();
    const branches = branchesSnap.docs.map((doc) => {
      const data = doc.data() as any;
      return { id: doc.id, slug: data.slug, name: data.name };
    });

    return NextResponse.json({ ok: true, branches });
  } catch (err: any) {
    console.error('list branches error', err);
    return NextResponse.json({ ok: false, message: err?.message || 'Server error' }, { status: 500 });
  }
}
