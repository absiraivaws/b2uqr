import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/getCurrentUser';
import admin, { adminDb } from '@/lib/firebaseAdmin';
import nodemailer from 'nodemailer';
import { generateReferralConfirmedEmail } from '@/lib/emailTemplates';

const FieldValue = admin.firestore.FieldValue;

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser(req);
    if (!user?.uid) return NextResponse.json({ ok: false, message: 'Not authenticated' }, { status: 401 });

    const uid = user.uid;
    // run transaction: if user has pendingReferralFrom and not already referred, award the referrer
    await adminDb.runTransaction(async (tx) => {
      const userRef = adminDb.collection('users').doc(uid);
      const userSnap = await tx.get(userRef);
      if (!userSnap.exists) return;
      const userData = userSnap.data() as any;
      const pending = userData?.pendingReferralFrom || null;
      const alreadyReferred = userData?.referredBy || null;
      if (!pending || alreadyReferred) return;
      const refUid = String(pending);

      // increment referrer points and mark referral doc as confirmed
      const refRef = adminDb.collection('users').doc(refUid);
      tx.set(refRef, { referralPoints: FieldValue.increment(1), referralCount: FieldValue.increment(1) }, { merge: true });

      const referralDocRef = refRef.collection('referrals').doc(uid);
      tx.set(referralDocRef, { referredUid: uid, confirmed_at: FieldValue.serverTimestamp(), status: 'confirmed' }, { merge: true });

      // mark referredBy and clear pendingReferralFrom on user
      tx.set(userRef, { referredBy: refUid, pendingReferralFrom: FieldValue.delete(), referredConfirmedAt: FieldValue.serverTimestamp() }, { merge: true });
    });

    // After transaction, try to notify the referrer by email (best-effort)
    try {
      // fetch referrer doc to get email and displayName
      const userSnap = await adminDb.collection('users').doc(user.uid).get();
      const userData = userSnap.exists ? (userSnap.data() as any) : {};
      const refUid = userData?.referredBy || null;
      if (refUid) {
        const refSnap = await adminDb.collection('users').doc(refUid).get();
        const refData = refSnap.exists ? (refSnap.data() as any) : {};
        const refEmail = refData?.email || null;
        const refName = refData?.displayName || null;
        const referredName = userData?.displayName || null;
        if (refEmail) {
          const SMTP_HOST = process.env.SMTP_HOST;
          const SMTP_PORT = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined;
          const SMTP_USER = process.env.SMTP_USER;
          const SMTP_PASS = process.env.SMTP_PASS;
          const SMTP_SECURE = process.env.SMTP_SECURE === 'true';
          const FROM_EMAIL = process.env.FROM_EMAIL || SMTP_USER || 'no-reply@lankaqr.local';
          if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
            try {
              const transporter = nodemailer.createTransport({ host: SMTP_HOST, port: SMTP_PORT || 587, secure: SMTP_SECURE || (SMTP_PORT === 465), auth: { user: SMTP_USER, pass: SMTP_PASS } });
              const { subject, text, html } = generateReferralConfirmedEmail({ referrerName: refName, referredName });
              await transporter.sendMail({ from: FROM_EMAIL, to: refEmail, subject, text, html });
            } catch (mailErr: any) {
              console.warn('Failed to send referral confirmation email:', mailErr);
            }
          }
        }
      }
    } catch (notifyErr) {
      console.warn('Referral notify error (non-fatal):', notifyErr);
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('confirm-kyc error', err);
    return NextResponse.json({ ok: false, message: err?.message || 'Server error' }, { status: 500 });
  }
}
