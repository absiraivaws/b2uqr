import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = (body?.email || '').toString().trim().toLowerCase();
    if (!email || !/\S+@\S+\.\S+/.test(email)) return NextResponse.json({ ok: false, message: 'Invalid email' }, { status: 400 });

    const snap = await adminDb.collection('admins').where('email', '==', email).limit(1).get();
    return NextResponse.json({ ok: true, exists: !snap.empty });
  } catch (err: any) {
    console.error('admin check-exists error', err);
    return NextResponse.json({ ok: false, message: err?.message || 'Server error' }, { status: 500 });
  }
}
