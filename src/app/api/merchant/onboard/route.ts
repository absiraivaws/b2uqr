import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/getCurrentUser';
import { onboardCompanyMerchant, onboardIndividualMerchant } from '@/lib/organizations';
import nodemailer from 'nodemailer';
import { generateSignupSuccessEmail } from '@/lib/emailTemplates';

async function sendSignupSuccessEmailIfPossible(email: string, name: string | null | undefined, accountType: 'individual' | 'company') {
  const SMTP_HOST = process.env.SMTP_HOST;
  const SMTP_PORT = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined;
  const SMTP_USER = process.env.SMTP_USER;
  const SMTP_PASS = process.env.SMTP_PASS;
  const SMTP_SECURE = process.env.SMTP_SECURE === 'true';
  const FROM_EMAIL = process.env.FROM_EMAIL || SMTP_USER || 'no-reply@lankaqr.local';
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    console.warn('SMTP not configured — skipping signup success email');
    return;
  }

  const marketingOriginRaw = (process.env.MARKETING_SITE_ORIGIN || 'https://b2u.app').trim();
  let marketingSigninUrl: string | null = null;
  if (marketingOriginRaw) {
    try {
      const origin = new URL(marketingOriginRaw).origin;
      const normalized = origin.replace(/\/$/, '');
      marketingSigninUrl = `${normalized}/?view=merchant-qr`;
    } catch (err) {
      console.warn('Invalid MARKETING_SITE_ORIGIN, falling back to app origin', err);
    }
  }

  const fallbackOrigin = (process.env.NEXT_PUBLIC_APP_ORIGIN || 'https://qr.b2u.app').replace(/\/$/, '');
  const signinUrl = marketingSigninUrl || `${fallbackOrigin}/signin`;

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT || 587,
    secure: SMTP_SECURE || SMTP_PORT === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  const { subject, text, html } = generateSignupSuccessEmail({ name, accountType, signinUrl, appName: 'LankaQR' });
  const info = await transporter.sendMail({ from: FROM_EMAIL, to: email, subject, text, html });
  console.log('Signup success email sent:', info && (info.messageId || info.response));
}

function parseNumber(value: any) {
  if (value === null || value === undefined) return null;
  const num = typeof value === 'number' ? value : parseFloat(value);
  return Number.isFinite(num) ? num : null;
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser(req);
    if (!user?.uid) {
      return NextResponse.json({ ok: false, message: 'Not authenticated' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const accountType = (body?.accountType || '').toString();
    if (accountType !== 'individual' && accountType !== 'company') {
      return NextResponse.json({ ok: false, message: 'Invalid account type' }, { status: 400 });
    }

    const kyc = body?.kyc || {};
    const contactRaw = body?.contact || {};
    const whatsappNumber = (contactRaw?.whatsappNumber ?? '').toString().trim();
    const contactEmail = (contactRaw?.email ?? '').toString().trim().toLowerCase();
    const normalizedContact = {
      email: contactEmail || null,
      whatsappNumber: whatsappNumber || null,
    };
    const baseProfile = {
      displayName: (kyc.displayName || '').toString().trim(),
      nic: (kyc.nic || '').toString().trim(),
      businessRegistrationNumber: (kyc.businessReg || '').toString().trim(),
      address: (kyc.address || '').toString().trim(),
      lat: parseNumber(kyc.lat),
      lng: parseNumber(kyc.lng),
    };

    if (!baseProfile.displayName || !baseProfile.nic || !baseProfile.businessRegistrationNumber || !baseProfile.address) {
      return NextResponse.json({ ok: false, message: 'Missing required profile fields' }, { status: 400 });
    }

    if (accountType === 'individual') {
      await onboardIndividualMerchant({
        uid: user.uid,
        profile: baseProfile,
        contact: normalizedContact,
      });
      if (normalizedContact.email) {
        try {
          await sendSignupSuccessEmailIfPossible(normalizedContact.email, baseProfile.displayName || null, 'individual');
        } catch (emailErr) {
          console.warn('Failed to send signup success email (individual)', emailErr);
        }
      }
      return NextResponse.json({ ok: true, accountType: 'individual' });
    }

    const companyName = (kyc.companyName || '').toString().trim();
    if (!companyName) {
      return NextResponse.json({ ok: false, message: 'Company name is required' }, { status: 400 });
    }

    const result = await onboardCompanyMerchant({
      uid: user.uid,
      owner: baseProfile,
      contact: normalizedContact,
      company: {
        name: companyName,
        registrationNumber: baseProfile.businessRegistrationNumber || '',
        address: baseProfile.address,
        lat: baseProfile.lat,
        lng: baseProfile.lng,
      },
    });

    if (normalizedContact.email) {
      try {
        await sendSignupSuccessEmailIfPossible(normalizedContact.email, baseProfile.displayName || companyName, 'company');
      } catch (emailErr) {
        console.warn('Failed to send signup success email (company)', emailErr);
      }
    }

    return NextResponse.json({ ok: true, accountType: 'company', companyId: result.companyId, companySlug: result.companySlug });
  } catch (err: any) {
    console.error('onboard error', err);
    return NextResponse.json({ ok: false, message: err?.message || 'Server error' }, { status: 500 });
  }
}
