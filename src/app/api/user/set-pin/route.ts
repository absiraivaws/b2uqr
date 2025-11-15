import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/getCurrentUser';
import { adminDb, adminAuth } from '@/lib/firebaseAdmin';
import { hashPin } from '@/lib/pinHash';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const pin = (body?.pin || '').toString().trim();
    if (!/^[0-9]{4,6}$/.test(pin)) {
      return NextResponse.json({ ok: false, message: 'Invalid PIN format' }, { status: 400 });
    }

    // verify session cookie and get uid
    const user = await getCurrentUser(req);
    if (!user || !user.uid) return NextResponse.json({ ok: false, message: 'Not authenticated' }, { status: 401 });

    const uid = user.uid;

    // Hash the PIN with Argon2 + server pepper
    const pinHash = await hashPin(pin);

    // Fetch additional user info from Firebase Auth (displayName, email, phone)
    let displayName: string | null = user.name ?? null;
    let email: string | null = user.email ?? null;
    let phone: string | null = null;
    try {
      const authUser = await adminAuth.getUser(uid);
      displayName = authUser.displayName ?? displayName;
      email = authUser.email ?? email;
      phone = (authUser.phoneNumber as string) ?? null;
    } catch (err) {
      // If fetching auth user fails, continue with whatever we have from the session
      console.warn('Failed to fetch auth user for set-pin:', err);
    }

    // Upsert the users doc with the hashed PIN and metadata.
    // Preserve created_at when present, set updated_at otherwise.
    const userRef = adminDb.collection('users').doc(uid);
    const existing = await userRef.get();
    const payload: any = {
      uid,
      pinHash,
      pinHashAlgo: 'argon2',
      pinHashUpdatedAt: new Date(),
      updated_at: new Date(),
      displayName: displayName ?? null,
      email: email ?? null,
      phone: phone ?? null,
    };
    if (!existing.exists) payload.created_at = new Date();

    await userRef.set(payload, { merge: true });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('set-pin error', err);
    return NextResponse.json({ ok: false, message: err?.message || 'Server error' }, { status: 500 });
  }
}
