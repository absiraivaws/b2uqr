import { NextResponse } from 'next/server';
import { verifySessionCookieFromRequest } from '@/lib/sessionAdmin';
import { getCompanyById } from '@/lib/companyData';
import { PERMISSIONS } from '@/lib/organizations';
import { adminAuth } from '@/lib/firebaseAdmin';

const ROLE_PERMISSION_KEY: Record<string, keyof typeof PERMISSIONS> = {
  individual: 'individual',
  'company-owner': 'companyOwner',
  'branch-manager': 'branchManager',
  cashier: 'cashier',
};

function withRoleDefaults(role: string | null | undefined, permissions: any): string[] {
  const current = Array.isArray(permissions) ? permissions.slice() : [];
  const roleKey = role ? ROLE_PERMISSION_KEY[role] : undefined;
  if (!roleKey) return current;
  const needed = PERMISSIONS[roleKey] || [];
  const merged = new Set(current);
  needed.forEach((perm) => merged.add(perm));
  return Array.from(merged);
}

function arraysEqual(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((value, idx) => value === sortedB[idx]);
}

const CLAIM_KEYS = ['role', 'accountType', 'companyId', 'companySlug', 'branchId', 'branchSlug', 'cashierSlug'] as const;
type ClaimKey = (typeof CLAIM_KEYS)[number];

async function ensureClaimsPermissions(decoded: any, mergedPerms: string[]) {
  const existingPerms = Array.isArray(decoded?.permissions) ? decoded.permissions : [];
  if (arraysEqual(existingPerms, mergedPerms)) return;

  const claimPayload: Record<string, any> = {};
  CLAIM_KEYS.forEach((key: ClaimKey) => {
    if (decoded?.[key] !== undefined && decoded?.[key] !== null) {
      claimPayload[key] = decoded[key];
    }
  });
  claimPayload.permissions = mergedPerms;
  await adminAuth.setCustomUserClaims(decoded.uid, claimPayload).catch((err) => {
    console.warn('failed to upgrade permissions claims', err);
  });
}

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
    const permissions = withRoleDefaults(decoded.role, decoded.permissions);
    await ensureClaimsPermissions(decoded, permissions);
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
      permissions,
    });
  } catch (err: any) {
    console.error('session verify error', err);
    return NextResponse.json({ ok: false, message: err?.message || 'Server error' }, { status: 500 });
  }
}
