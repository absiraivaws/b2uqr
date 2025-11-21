import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { ROLE_CONFIG, isValidRole, type RoleKey } from './roleConfig';
import { generateSetPasswordEmail } from '@/lib/emailTemplates';
import nodemailer from 'nodemailer';

import { hashPin, verifyPin } from '@/lib/pinHash';

async function sendEmailIfConfigured(email: string, name: string | undefined, link: string) {
  const SMTP_HOST = process.env.SMTP_HOST;
  const SMTP_PORT = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined;
  const SMTP_USER = process.env.SMTP_USER;
  const SMTP_PASS = process.env.SMTP_PASS;
  const SMTP_SECURE = process.env.SMTP_SECURE === 'true';
  const FROM_EMAIL = process.env.FROM_EMAIL || SMTP_USER || 'no-reply@lankaqr.local';

  if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
    try {
      const transporter = nodemailer.createTransport({ host: SMTP_HOST, port: SMTP_PORT || 587, secure: SMTP_SECURE || (SMTP_PORT === 465), auth: { user: SMTP_USER, pass: SMTP_PASS } });
      const { subject, text, html } = generateSetPasswordEmail({ name: name || '', email, link, appName: 'LankaQR' });
      const info = await transporter.sendMail({ from: FROM_EMAIL, to: email, subject, text, html });
      console.log('Invite email sent:', info && (info.messageId || info.response));
      return { ok: true };
    } catch (err: any) {
      console.error('Failed to send invite email via SMTP:', err);
      return { ok: false, error: String(err) };
    }
  }
  // fallback: log link
  console.warn('SMTP not configured — falling back to server log for invite link');
  console.log(`Invite link for ${email}: ${link}`);
  return { ok: true };
}

async function createTokenAndStore(invitesCollection: string, email: string, name: string | undefined) {
  const crypto = await import('crypto');
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const id = `invite_${encodeURIComponent(email)}_${Date.now()}`;
  const expiresAtMs = Date.now() + 24 * 60 * 60 * 1000;

  await adminDb.collection(invitesCollection).doc(id).set({
    email,
    name: name || '',
    tokenHash,
    created_at: new Date(),
    expires_at_ms: expiresAtMs,
    used: false,
  });

  return { token, tokenHash, expiresAtMs };
}

export async function handleInvite(req: Request, role: string) {
  try {
    if (!isValidRole(role)) return NextResponse.json({ ok: false, message: 'Unknown role' }, { status: 400 });
    const cfg = ROLE_CONFIG[role as RoleKey];
    const body = await req.json();
    const email = (body?.email || '').toString().trim().toLowerCase();
    const name = (body?.name || '').toString().trim() || '';
    if (!email || !/\S+@\S+\.\S+/.test(email)) return NextResponse.json({ ok: false, message: 'Invalid email' }, { status: 400 });

    // cleanup old invites for this email
    try {
      const existing = await adminDb.collection(cfg.invitesCollection).where('email', '==', email).get();
      const deletes: Promise<any>[] = [];
      const now = Date.now();
      existing.forEach((d) => {
        const data = d.data() as any;
        if (data?.used === true || (data?.expires_at_ms || 0) < now) deletes.push(d.ref.delete());
      });
      if (deletes.length) await Promise.all(deletes);
    } catch (e) { console.warn('failed to cleanup previous invites', e); }

    const { token } = await createTokenAndStore(cfg.invitesCollection, email, name);
    const origin = process.env.NEXT_PUBLIC_APP_ORIGIN || `http://localhost:${process.env.PORT || 3000}`;
    const link = `${origin}${cfg.setPasswordPath}?token=${encodeURIComponent(token)}`;
    const send = await sendEmailIfConfigured(email, name, link);
    if (!send.ok) return NextResponse.json({ ok: false, message: 'Failed to send invite email', error: send.error }, { status: 500 });

    return NextResponse.json({ ok: true, message: 'Invite created' });
  } catch (err: any) {
    console.error('invite error', err);
    return NextResponse.json({ ok: false, message: err?.message || 'Server error' }, { status: 500 });
  }
}

export async function handleCheckExists(req: Request, role: string) {
  try {
    if (!isValidRole(role)) return NextResponse.json({ ok: false, message: 'Unknown role' }, { status: 400 });
    const cfg = ROLE_CONFIG[role as RoleKey];
    const body = await req.json();
    const email = (body?.email || '').toString().trim().toLowerCase();
    if (!email || !/\S+@\S+\.\S+/.test(email)) return NextResponse.json({ ok: false, message: 'Invalid email' }, { status: 400 });

    const snap = await adminDb.collection(cfg.usersCollection).where('email', '==', email).limit(1).get();
    return NextResponse.json({ ok: true, exists: !snap.empty });
  } catch (err: any) {
    console.error('check-exists error', err);
    return NextResponse.json({ ok: false, message: err?.message || 'Server error' }, { status: 500 });
  }
}

export async function handleSetPassword(req: Request, role: string) {
  try {
    if (!isValidRole(role)) return NextResponse.json({ ok: false, message: 'Unknown role' }, { status: 400 });
    const cfg = ROLE_CONFIG[role as RoleKey];
    const body = await req.json();
    const token = (body?.token || '').toString();
    const password = (body?.password || '').toString();
    if (!token || token.length < 8) return NextResponse.json({ ok: false, message: 'Missing token' }, { status: 400 });
    if (!password || password.length < 8) return NextResponse.json({ ok: false, message: 'Password must be at least 8 characters' }, { status: 400 });

    const crypto = await import('crypto');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const invitesSnap = await adminDb.collection(cfg.invitesCollection).where('tokenHash', '==', tokenHash).limit(1).get();
    if (invitesSnap.empty) return NextResponse.json({ ok: false, message: 'Invalid or expired token' }, { status: 404 });
    const inviteDoc = invitesSnap.docs[0];
    const invite = inviteDoc.data();
    const now = Date.now();
    if ((invite?.used) === true) return NextResponse.json({ ok: false, message: 'Token already used' }, { status: 400 });
    if ((invite?.expires_at_ms || 0) < now) {
      try { await inviteDoc.ref.delete(); } catch (e) { console.warn('Failed to delete expired invite', e); }
      return NextResponse.json({ ok: false, message: 'Token expired' }, { status: 400 });
    }

    const email = (invite.email || '').toString().trim().toLowerCase();
    if (!email) return NextResponse.json({ ok: false, message: 'Invite missing email' }, { status: 500 });

    const userSnap = await adminDb.collection(cfg.usersCollection).where('email', '==', email).limit(1).get();
    if (userSnap.empty) return NextResponse.json({ ok: false, message: `${role} account not found` }, { status: 404 });
    const userRef = userSnap.docs[0].ref;

    const passwordHash = await hashPin(password);

    await userRef.update({
      passwordHash,
      passwordHashAlgo: 'argon2',
      passwordSetAt: new Date(),
    });

    await inviteDoc.ref.update({ used: true, used_at: new Date() });

    return NextResponse.json({ ok: true, message: 'Password set' });
  } catch (err: any) {
    console.error('set-password error', err);
    return NextResponse.json({ ok: false, message: err?.message || 'Server error' }, { status: 500 });
  }
}

export async function handleSignin(req: Request, role: string) {
  try {
    if (!isValidRole(role)) return NextResponse.json({ ok: false, message: 'Unknown role' }, { status: 400 });
    const cfg = ROLE_CONFIG[role as RoleKey];
    const body = await req.json();
    const email = (body?.email || '').toString().trim().toLowerCase();
    const password = (body?.password || '').toString();
    if (!email || !password) return NextResponse.json({ ok: false, message: 'Missing credentials' }, { status: 400 });

    const userSnap = await adminDb.collection(cfg.usersCollection).where('email', '==', email).limit(1).get();
    if (userSnap.empty) return NextResponse.json({ ok: false, message: 'Invalid email or password' }, { status: 401 });
    const userDoc = userSnap.docs[0];
    const user = userDoc.data();

    const stored = (user?.passwordHash || '').toString();
    if (!stored) return NextResponse.json({ ok: false, message: 'No password set for this account' }, { status: 401 });

    const ok = await verifyPin(password, stored);
    if (!ok) return NextResponse.json({ ok: false, message: 'Invalid email or password' }, { status: 401 });

    // remove any existing sessions for this user to keep a single active session
    try {
      const existing = await adminDb.collection(cfg.sessionsCollection).where(role === 'admin' ? 'adminId' : 'staffId', '==', userDoc.id).get();
      const deletes: Promise<any>[] = [];
      existing.forEach((d) => deletes.push(d.ref.delete()));
      if (deletes.length) await Promise.all(deletes);
    } catch (e) { console.warn('failed to cleanup existing sessions', e); }

    const crypto = await import('crypto');
    const sessionId = crypto.randomBytes(32).toString('hex');
    const expiresInMs = 8 * 60 * 60 * 1000; // 8 hours

    const sessionDoc: any = {};
    if (role === 'admin') sessionDoc.adminId = userDoc.id;
    else sessionDoc.staffId = userDoc.id;
    sessionDoc.created_at = new Date();
    sessionDoc.expires_at_ms = Date.now() + expiresInMs;

    await adminDb.collection(cfg.sessionsCollection).doc(sessionId).set(sessionDoc);

    const cookieOptions = [`${cfg.sessionCookieName}=${sessionId}`, `Max-Age=${Math.floor(expiresInMs / 1000)}`, `HttpOnly`, `Path=/`, `SameSite=Lax`];
    if (process.env.NODE_ENV === 'production') cookieOptions.push('Secure');

    return NextResponse.json({ ok: true }, { headers: { 'Set-Cookie': cookieOptions.join('; ') } });
  } catch (err: any) {
    console.error('signin error', err);
    return NextResponse.json({ ok: false, message: err?.message || 'Server error' }, { status: 500 });
  }
}

export async function handleResetPassword(req: Request, role: string) {
  try {
    if (!isValidRole(role)) return NextResponse.json({ ok: false, message: 'Unknown role' }, { status: 400 });
    const cfg = ROLE_CONFIG[role as RoleKey];
    const body = await req.json();
    const email = (body?.email || '').toString().trim().toLowerCase();
    if (!email || !/\S+@\S+\.\S+/.test(email)) return NextResponse.json({ ok: false, message: 'Invalid email' }, { status: 400 });

    // Verify user exists
    const userSnap = await adminDb.collection(cfg.usersCollection).where('email', '==', email).limit(1).get();
    if (userSnap.empty) return NextResponse.json({ ok: false, message: 'No such account' }, { status: 404 });

    // cleanup previous invites
    try {
      const exists = await adminDb.collection(cfg.invitesCollection).where('email', '==', email).get();
      const deletes: Promise<any>[] = [];
      const now = Date.now();
      exists.forEach((d) => {
        const data = d.data() as any;
        if (data?.used === true || (data?.expires_at_ms || 0) < now) deletes.push(d.ref.delete());
      });
      if (deletes.length) await Promise.all(deletes);
    } catch (e) { console.warn('failed to cleanup invites', e); }

    const { token } = await createTokenAndStore(cfg.invitesCollection, email, '');
    const origin = process.env.NEXT_PUBLIC_APP_ORIGIN || `http://localhost:${process.env.PORT || 3000}`;
    const link = `${origin}${cfg.setPasswordPath}?token=${encodeURIComponent(token)}`;

    const send = await sendEmailIfConfigured(email, '', link);
    if (!send.ok) return NextResponse.json({ ok: false, message: 'Failed to send reset email', error: send.error }, { status: 500 });

    return NextResponse.json({ ok: true, message: 'Reset sent' });
  } catch (err: any) {
    console.error('reset-password error', err);
    return NextResponse.json({ ok: false, message: err?.message || 'Server error' }, { status: 500 });
  }
}

export async function handleSignout(req: Request, role: string) {
  try {
    if (!isValidRole(role)) return NextResponse.json({ ok: false, message: 'Unknown role' }, { status: 400 });
    const cfg = ROLE_CONFIG[role as RoleKey];
    // parse cookies and delete session doc
    const cookieHeader = req.headers.get('cookie');
    const parts = (cookieHeader || '').split(';');
    const cookies: Record<string,string> = {};
    for (const p of parts) {
      const [k, ...rest] = p.split('=');
      if (!k) continue;
      cookies[k.trim()] = decodeURIComponent((rest || []).join('=').trim());
    }
    const sessionId = cookies[cfg.sessionCookieName];
    if (sessionId) {
      try { await adminDb.collection(cfg.sessionsCollection).doc(sessionId).delete(); } catch (e) { console.warn('failed to delete session doc', e); }
    }

    const cookieOptions = [`${cfg.sessionCookieName}=`, `Max-Age=0`, `HttpOnly`, `Path=/`, `SameSite=Lax`];
    if (process.env.NODE_ENV === 'production') cookieOptions.push('Secure');

    return NextResponse.json({ ok: true }, { headers: { 'Set-Cookie': cookieOptions.join('; ') } });
  } catch (err: any) {
    console.error('signout error', err);
    return NextResponse.json({ ok: false, message: err?.message || 'Server error' }, { status: 500 });
  }
}
