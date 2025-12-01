import { NextResponse } from 'next/server';
import { verifySessionCookieFromRequest } from '@/lib/sessionAdmin';
import { getCompanyById } from '@/lib/companyData';

export async function GET(req: Request) {
  try {
    const decoded: any = await verifySessionCookieFromRequest(req);
    if (!decoded) return NextResponse.json({ ok: false, message: 'No valid session' }, { status: 401 });
    let companySlug = decoded.companySlug || null;
    if (!companySlug && decoded?.role === 'company-owner' && decoded?.companyId) {
      const company = await getCompanyById(decoded.companyId).catch(() => null);
      if (company?.slug) {
        companySlug = company.slug;
      }
    }
    return NextResponse.json({
      ok: true,
      uid: decoded.uid,
      email: decoded.email,
      name: decoded.name,
      role: decoded.role || null,
      accountType: decoded.accountType || null,
      companyId: decoded.companyId || null,
       companySlug,
      branchId: decoded.branchId || null,
       branchSlug: decoded.branchSlug || null,
       cashierSlug: decoded.cashierSlug || null,
      permissions: decoded.permissions || [],
    });
  } catch (err: any) {
    console.error('session verify error', err);
    return NextResponse.json({ ok: false, message: err?.message || 'Server error' }, { status: 500 });
  }
}
