import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/getCurrentUser';
import admin, { adminDb } from '@/lib/firebaseAdmin';

const FieldValue = admin.firestore.FieldValue;
const STRING_KEYS = ['merchantId', 'bankCode', 'currencyCode', 'countryCode', 'merchantCategoryCode', 'merchantCity', 'merchantName', 'terminalId'] as const;

type MerchantConfigPayload = Partial<Record<(typeof STRING_KEYS)[number] | 'detailsLocked', any>>;

function normalizeString(value: any) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
  }
  if (typeof value === 'number') {
    return value.toString();
  }
  return null;
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser(req);
    const role = user?.claims?.role;
    if (!user?.uid || role !== 'company-owner') {
      return NextResponse.json({ ok: false, message: 'Not authorized' }, { status: 403 });
    }

    const companyIdFromClaims = user.claims?.companyId as string | undefined;
    if (!companyIdFromClaims) {
      return NextResponse.json({ ok: false, message: 'Missing company context' }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const requestedCompanyId = typeof body?.companyId === 'string' ? body.companyId : undefined;
    if (requestedCompanyId && requestedCompanyId !== companyIdFromClaims) {
      return NextResponse.json({ ok: false, message: 'Company mismatch' }, { status: 403 });
    }

    const config: MerchantConfigPayload | undefined = typeof body?.config === 'object' && body.config ? body.config : undefined;
    if (!config) {
      return NextResponse.json({ ok: false, message: 'Missing config payload' }, { status: 400 });
    }

    const sanitized: Record<string, any> = {};
    for (const key of STRING_KEYS) {
      const normalized = normalizeString((config as any)[key]);
      if (normalized) {
        sanitized[key] = normalized;
      }
    }

    if (!Object.keys(sanitized).length) {
      return NextResponse.json({ ok: false, message: 'No merchant fields provided' }, { status: 400 });
    }

    const detailsLocked = typeof config.detailsLocked === 'boolean' ? config.detailsLocked : true;
    sanitized.detailsLocked = detailsLocked;

    await adminDb.collection('companies').doc(companyIdFromClaims).set({
      merchantSettings: {
        ...sanitized,
        updated_at: FieldValue.serverTimestamp(),
      },
      updated_at: FieldValue.serverTimestamp(),
    }, { merge: true });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('update merchant config error', err);
    return NextResponse.json({ ok: false, message: err?.message || 'Server error' }, { status: 500 });
  }
}
