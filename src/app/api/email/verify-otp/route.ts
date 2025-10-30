import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';

// Verify email OTP: expects { email, code }
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = (body?.email || '').toString().trim().toLowerCase();
    const code = (body?.code || '').toString().trim();
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return NextResponse.json({ ok: false, message: 'Invalid email' }, { status: 400 });
    }
    if (!/^[0-9]{4,6}$/.test(code)) {
      return NextResponse.json({ ok: false, message: 'Invalid code' }, { status: 400 });
    }

    const crypto = await import('crypto');
    const hash = crypto.createHash('sha256').update(code).digest('hex');

    // find matching, unexpired OTP for this email
    const col = collection(db, 'email_otps');
    const q = query(col, where('email', '==', email));
    const snap = await getDocs(q);
    const now = Date.now();
    let matchedDocId: string | null = null;
    snap.forEach(d => {
      const data: any = d.data();
      if (!data) return;
      const expires = Number(data.expires_at_ms || 0);
      if (expires < now) return;
      if (data.codeHash === hash) {
        matchedDocId = d.id;
      }
    });

    if (!matchedDocId) {
      return NextResponse.json({ ok: false, message: 'OTP not found or expired' }, { status: 400 });
    }

    // consume the OTP
    await deleteDoc(doc(db, 'email_otps', matchedDocId));

    return NextResponse.json({ ok: true, message: 'OTP verified' });
  } catch (err: any) {
    console.error('verify-otp error', err);
    return NextResponse.json({ ok: false, message: err?.message || 'Server error' }, { status: 500 });
  }
}
