import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/getCurrentUser';
import admin, { adminAuth, adminDb } from '@/lib/firebaseAdmin';
import { createCashier } from '@/lib/organizations';

interface RouteParams {
  params: Promise<{ branchId: string }>;
}

export async function POST(req: Request, context: RouteParams) {
  try {
    const { branchId } = await context.params;
    const user = await getCurrentUser(req);
    const role = user?.claims?.role;
    if (!user?.uid || (role !== 'company-owner' && role !== 'branch-manager')) {
      return NextResponse.json({ ok: false, message: 'Not authorized' }, { status: 403 });
    }
    const companyId = user.claims?.companyId as string | undefined;
    if (!companyId) {
      return NextResponse.json({ ok: false, message: 'Missing company context' }, { status: 400 });
    }
    if (!branchId) {
      return NextResponse.json({ ok: false, message: 'branchId missing' }, { status: 400 });
    }
    const body = await req.json().catch(() => ({}));
    const displayName = (body?.displayName || '').toString().trim();
    const pin = (body?.pin || '').toString().trim();
    const inviteEmail = (body?.email || '').toString().trim().toLowerCase() || null;
    if (!displayName) {
      return NextResponse.json({ ok: false, message: 'Display name is required' }, { status: 400 });
    }

    const branchSnap = await adminDb.collection('companies').doc(companyId).collection('branches').doc(branchId).get();
    if (!branchSnap.exists) {
      return NextResponse.json({ ok: false, message: 'Branch not found' }, { status: 404 });
    }
    const branchData = branchSnap.data() as any;
    const branchUsername = branchData?.username as string | undefined;
    if (!branchUsername) {
      return NextResponse.json({ ok: false, message: 'Branch username missing' }, { status: 500 });
    }

    // If a PIN was provided, create cashier immediately
    if (pin) {
      const result = await createCashier({
        companyId,
        branchId,
        branchUsername,
        displayName,
        pin,
        actorRole: role,
        actorCompanyId: companyId,
        actorBranchId: user.claims?.branchId || null,
      });
      return NextResponse.json({ ok: true, cashierId: result.cashierId, username: result.username });
    }

    // No PIN: invite flow — require an email to send invite
    if (!inviteEmail || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(inviteEmail)) {
      return NextResponse.json({ ok: false, message: 'Email is required to send cashier invite' }, { status: 400 });
    }

    // Create cashier doc, user doc (pending), and invite token
    const branchRef = adminDb.collection('companies').doc(companyId).collection('branches').doc(branchId);
    const cashierRef = branchRef.collection('cashiers').doc();

    const crypto = await import('crypto');
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const id = `invite_cashier_${encodeURIComponent(inviteEmail)}_${Date.now()}`;
    const expiresAtMs = Date.now() + 24 * 60 * 60 * 1000;

    // run transaction to allocate cashier number and create docs
    let username: string = '';
    let cashierSlugSegment: string | null = null;
    await adminDb.runTransaction(async (tx) => {
      const branchSnap = await tx.get(branchRef);
      if (!branchSnap.exists) throw new Error('Branch not found');
      const branchData = branchSnap.data() || {};
      const branchSlug = typeof branchData.slug === 'string' ? branchData.slug : null;
      const companySlug = typeof branchData.companySlug === 'string' ? branchData.companySlug : null;
      let cashierNumber = Number(branchData.nextCashierNumber) || 1;
      cashierSlugSegment = `cashier${cashierNumber}`;
      username = `${branchUsername}-${cashierNumber}`;

      tx.update(branchRef, {
        nextCashierNumber: cashierNumber + 1,
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      });

      tx.set(cashierRef, {
        id: cashierRef.id,
        uid: cashierRef.id,
        username,
        displayName,
        status: 'pending',
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      });

      tx.set(adminDb.collection('users').doc(cashierRef.id), {
        uid: cashierRef.id,
        role: 'cashier',
        accountType: 'company',
        companyId,
        companySlug: companySlug || null,
        branchId,
        branchSlug: branchSlug || null,
        cashierNumber,
        cashierSlug: cashierSlugSegment,
        username,
        email: inviteEmail,
        displayName,
        pinHash: null,
        status: 'pending',
        permissions: ['generate-qr', 'transactions', 'summary'],
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      });

      tx.set(adminDb.collection('cashier_invites').doc(id), {
        email: inviteEmail,
        name: displayName || '',
        tokenHash,
        cashierUid: cashierRef.id,
        companyId,
        branchId,
        created_at: new Date(),
        expires_at_ms: expiresAtMs,
        used: false,
      });
    });

    // create disabled auth user and set custom claims (best-effort)
    try {
      await adminAuth.createUser({ uid: cashierRef.id, email: inviteEmail, displayName, disabled: true }).catch(() => null);
      await adminAuth.setCustomUserClaims(cashierRef.id, {
        role: 'cashier',
        accountType: 'company',
        companyId,
        branchId,
        cashierSlug: cashierSlugSegment,
        permissions: ['generate-qr', 'transactions', 'summary'],
      }).catch(() => null);
    } catch (e) {
      // ignore errors creating auth user
      console.warn('failed to create disabled auth user for cashier invite', e);
    }

    const origin = process.env.NEXT_PUBLIC_APP_ORIGIN || `http://localhost:${process.env.PORT || 3000}`;
    const safeCompany = encodeURIComponent((await adminDb.collection('companies').doc(companyId).get()).data()?.slug || '');
    const safeBranch = encodeURIComponent((await adminDb.collection('companies').doc(companyId).collection('branches').doc(branchId).get()).data()?.slug || '');
    const safeCashierSlug = encodeURIComponent(cashierSlugSegment || '');
    const link = `${origin}/${safeCompany}/${safeBranch}/${safeCashierSlug}/set-pin?token=${encodeURIComponent(token)}`;

    // send email (best-effort)
    try {
      const nodemailer = await import('nodemailer');
      const { generateSetPasswordEmail } = await import('@/lib/emailTemplates');
      const SMTP_HOST = process.env.SMTP_HOST;
      const SMTP_PORT = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined;
      const SMTP_USER = process.env.SMTP_USER;
      const SMTP_PASS = process.env.SMTP_PASS;
      const SMTP_SECURE = process.env.SMTP_SECURE === 'true';
      const FROM_EMAIL = process.env.FROM_EMAIL || SMTP_USER || 'no-reply@lankaqr.local';
      if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
        const transporter = nodemailer.createTransport({ host: SMTP_HOST, port: SMTP_PORT || 587, secure: SMTP_SECURE || (SMTP_PORT === 465), auth: { user: SMTP_USER, pass: SMTP_PASS } });
        const { subject, text, html } = generateSetPasswordEmail({ name: displayName || inviteEmail, email: inviteEmail, link, appName: 'LankaQR' });
        await transporter.sendMail({ from: FROM_EMAIL, to: inviteEmail, subject, text, html });
      } else {
        console.warn('SMTP not configured — invite link: ', link);
        console.log(`Invite link for ${inviteEmail}: ${link}`);
      }
    } catch (err: any) {
      console.warn('Failed to send cashier invite email', err);
      console.log(`Invite link for ${inviteEmail}: ${link}`);
    }

    return NextResponse.json({ ok: true, cashierId: cashierRef.id, username, inviteLink: link });
  } catch (err: any) {
    console.error('create cashier error', err);
    return NextResponse.json({ ok: false, message: err?.message || 'Server error' }, { status: 500 });
  }
}

export async function GET(req: Request, context: RouteParams) {
  try {
    const { branchId } = await context.params;
    const user = await getCurrentUser(req);
    const role = user?.claims?.role;
    if (!user?.uid || (role !== 'company-owner' && role !== 'branch-manager')) {
      return NextResponse.json({ ok: false, message: 'Not authorized' }, { status: 403 });
    }
    const companyId = user.claims?.companyId as string | undefined;
    if (!companyId) {
      return NextResponse.json({ ok: false, message: 'Missing company context' }, { status: 400 });
    }
    if (!branchId) {
      return NextResponse.json({ ok: false, message: 'branchId missing' }, { status: 400 });
    }

    const branchSnap = await adminDb.collection('companies').doc(companyId).collection('branches').doc(branchId).get();
    if (!branchSnap.exists) {
      return NextResponse.json({ ok: false, message: 'Branch not found' }, { status: 404 });
    }

    const cashiersSnap = await adminDb.collection('companies').doc(companyId).collection('branches').doc(branchId).collection('cashiers').orderBy('created_at', 'desc').get();
    const cashiers = cashiersSnap.docs.map((doc) => {
      const data = doc.data() as any;
      return {
        id: doc.id,
        username: data.username,
        displayName: data.displayName,
        status: data.status || 'active',
      };
    });

    return NextResponse.json({ ok: true, cashiers });
  } catch (err: any) {
    console.error('list cashiers error', err);
    return NextResponse.json({ ok: false, message: err?.message || 'Server error' }, { status: 500 });
  }
}
