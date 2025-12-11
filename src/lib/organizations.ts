import admin, { adminAuth, adminDb } from './firebaseAdmin';
import { hashPin } from './pinHash';
import nodemailer from 'nodemailer';
import { generateSetPasswordEmail } from './emailTemplates';

const FieldValue = admin.firestore.FieldValue;
const GeoPoint = admin.firestore.GeoPoint;

const VIRTUAL_LOGIN_DOMAIN = process.env.VIRTUAL_LOGIN_DOMAIN || 'lqr.internal';

export const PERMISSIONS = {
  individual: ['qr-registration', 'transactions', 'summary', 'profile'],
  companyOwner: ['company:dashboard', 'company:branches', 'company:cashiers', 'profile', 'transactions', 'summary'],
  branchManager: ['company:branches', 'company:cashiers', 'profile', 'transactions', 'summary', 'branch:dashboard'],
  cashier: ['qr-registration', 'transactions', 'summary'],
} as const;

export type MerchantRole = 'individual' | 'company-owner' | 'branch-manager' | 'cashier';

export interface BaseProfileInput {
  displayName: string;
  nic?: string | null;
  businessRegistrationNumber?: string | null;
  address?: string | null;
  lat?: number | null;
  lng?: number | null;
}

export interface ContactInput {
  email?: string | null;
  phone?: string | null;
  whatsappNumber?: string | null;
}

export interface OnboardIndividualInput {
  uid: string;
  profile: BaseProfileInput;
  contact: ContactInput;
}

export interface OnboardCompanyInput {
  uid: string;
  owner: BaseProfileInput;
  contact: ContactInput;
  company: {
    name: string;
    registrationNumber: string;
    address: string;
    lat?: number | null;
    lng?: number | null;
  };
}

export interface CreateBranchInput {
  companyId: string;
  companyName: string;
  companySlug: string;
  branchName: string;
  address?: string | null;
  lat?: number | null;
  lng?: number | null;
  actorUid: string;
}

export interface DeleteBranchInput {
  companyId: string;
  branchId: string;
  actorUid: string;
}

export interface UpsertBranchManagerInput {
  companyId: string;
  branchId: string;
  branchUsername: string;
  // pin is optional; if omitted an invite email will be sent so the manager can set a password
  pin?: string | null;
  displayName: string;
  contact: ContactInput;
}

export interface CreateCashierInput {
  companyId: string;
  branchId: string;
  branchUsername: string;
  displayName: string;
  pin: string;
  actorRole: MerchantRole;
  actorCompanyId: string;
  actorBranchId?: string | null;
}

export interface DeleteCashierInput {
  companyId: string;
  branchId: string;
  cashierId: string;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

function buildVirtualEmail(username: string) {
  return `${username}@${VIRTUAL_LOGIN_DOMAIN}`;
}

function toGeoPoint(lat?: number | null, lng?: number | null) {
  if (typeof lat === 'number' && typeof lng === 'number' && !Number.isNaN(lat) && !Number.isNaN(lng)) {
    return new GeoPoint(lat, lng);
  }
  return undefined;
}

async function ensureAuthUser(uid: string, email: string | null, displayName?: string | null, options?: { disabled?: boolean }) {
  const updatePayload: admin.auth.UpdateRequest = {};
  if (email) updatePayload.email = email;
  if (displayName) updatePayload.displayName = displayName;
  if (typeof options?.disabled === 'boolean') updatePayload.disabled = options.disabled;
  try {
    if (Object.keys(updatePayload).length) {
      await adminAuth.updateUser(uid, updatePayload);
    } else {
      await adminAuth.getUser(uid);
    }
  } catch (err: any) {
    if (err?.errorInfo?.code === 'auth/user-not-found') {
      await adminAuth.createUser({
        uid,
        email: email || undefined,
        displayName: displayName || undefined,
        disabled: typeof options?.disabled === 'boolean' ? options.disabled : undefined,
      });
    } else {
      throw err;
    }
  }
}

export async function onboardIndividualMerchant(input: OnboardIndividualInput) {
  const { uid, profile, contact } = input;
  const userRef = adminDb.collection('users').doc(uid);
  await adminDb.runTransaction(async (tx) => {
    const existing = await tx.get(userRef);
    const timestamps: Record<string, any> = {
      updated_at: FieldValue.serverTimestamp(),
    };
    if (!existing.exists) {
      timestamps.created_at = FieldValue.serverTimestamp();
    }
    tx.set(userRef, {
      uid,
      role: 'individual',
      accountType: 'individual',
      permissions: PERMISSIONS.individual,
      displayName: profile.displayName || null,
      nic: profile.nic || null,
      businessRegistrationNumber: profile.businessRegistrationNumber || null,
      address: profile.address || null,
      location: toGeoPoint(profile.lat, profile.lng) || null,
      email: contact.email || null,
      whatsappNumber: contact.whatsappNumber || null,
      ...timestamps,
    }, { merge: true });
  });

  await ensureAuthUser(uid, contact.email ?? null, profile.displayName ?? null, { disabled: false });
  await adminAuth.setCustomUserClaims(uid, {
    role: 'individual',
    accountType: 'individual',
    permissions: PERMISSIONS.individual,
  });
}

export async function onboardCompanyMerchant(input: OnboardCompanyInput) {
  const { uid, owner, company, contact } = input;
  const userRef = adminDb.collection('users').doc(uid);
  const companyRef = adminDb.collection('companies').doc();
  const baseSlug = slugify(company.name) || 'company';
  let slug = baseSlug;
  let suffix = 1;
  while (true) {
    const existingSlug = await adminDb.collection('companies').where('slug', '==', slug).limit(1).get();
    if (existingSlug.empty) break;
    slug = `${baseSlug}-${suffix++}`;
  }

  await adminDb.runTransaction(async (tx) => {
    const userSnap = await tx.get(userRef);
    if (userSnap.exists && userSnap.data()?.companyId) {
      throw new Error('User already linked to a company');
    }

    tx.set(companyRef, {
      id: companyRef.id,
      name: company.name,
      slug,
      registrationNumber: company.registrationNumber,
      address: company.address,
      location: toGeoPoint(company.lat, company.lng) || null,
      ownerUid: uid,
      created_at: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp(),
      branchCount: 0,
      cashierCount: 0,
      nextBranchNumber: 1,
    });

    const timestamps: Record<string, any> = {
      updated_at: FieldValue.serverTimestamp(),
    };
    if (!userSnap.exists) {
      timestamps.created_at = FieldValue.serverTimestamp();
    }

    tx.set(userRef, {
      uid,
      role: 'company-owner',
      accountType: 'company',
      companyId: companyRef.id,
      companyName: company.name,
      companySlug: slug,
      permissions: PERMISSIONS.companyOwner,
      displayName: owner.displayName || null,
      nic: owner.nic || null,
      businessRegistrationNumber: company.registrationNumber || owner.businessRegistrationNumber || null,
      address: owner.address || company.address,
      location: toGeoPoint(owner.lat, owner.lng) || toGeoPoint(company.lat, company.lng) || null,
      email: contact.email || null,
      whatsappNumber: contact.whatsappNumber || null,
      ...timestamps,
    }, { merge: true });
  });

  await ensureAuthUser(uid, contact.email ?? null, owner.displayName ?? company.name, { disabled: false });
  await adminAuth.setCustomUserClaims(uid, {
    role: 'company-owner',
    accountType: 'company',
    companyId: companyRef.id,
    companySlug: slug,
    permissions: PERMISSIONS.companyOwner,
  });

  return { companyId: companyRef.id, companySlug: slug };
}

export async function createBranch(input: CreateBranchInput) {
  const { companyId, companyName, companySlug, branchName, address, lat, lng, actorUid } = input;
  const companyRef = adminDb.collection('companies').doc(companyId);
  const branchRef = companyRef.collection('branches').doc();
  const slug = slugify(branchName) || `branch-${branchRef.id.slice(0, 5)}`;
  let username = `${companySlug}-${slug}`;
  let assignedBranchNumber: number | null = null;
  const allBranches = await companyRef.collection('branches').where('username', '==', username).limit(1).get();
  if (!allBranches.empty) {
    username = `${username}-${branchRef.id.slice(-3)}`;
  }
  await adminDb.runTransaction(async (tx) => {
    const companySnap = await tx.get(companyRef);
    if (!companySnap.exists) throw new Error('Company not found');
    const companyData = companySnap.data() || {};
    if (companyData.ownerUid !== actorUid) {
      throw new Error('Not authorized to add branches');
    }
    let branchNumber = Number(companyData.nextBranchNumber);
    if (!Number.isFinite(branchNumber) || branchNumber < 1) {
      branchNumber = Number(companyData.branchCount || 0) + 1;
    }

    assignedBranchNumber = branchNumber;

    tx.set(branchRef, {
      id: branchRef.id,
      companyId,
      companyName,
      companySlug,
      name: branchName,
      slug,
      username,
      branchNumber,
      address: address || null,
      location: toGeoPoint(lat, lng) || null,
      created_at: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp(),
      managerUid: null,
      managerName: null,
      managerContact: null,
      managerAccountUid: `${branchRef.id}-manager`,
      nextCashierNumber: 1,
    });

    tx.update(companyRef, {
      branchCount: FieldValue.increment(1),
      nextBranchNumber: branchNumber + 1,
      updated_at: FieldValue.serverTimestamp(),
    });
  });

  return { branchId: branchRef.id, username, branchNumber: assignedBranchNumber };
}

export async function deleteBranch(input: DeleteBranchInput) {
  const { companyId, branchId, actorUid } = input;
  const companyRef = adminDb.collection('companies').doc(companyId);
  const companySnap = await companyRef.get();
  if (!companySnap.exists) throw new Error('Company not found');
  if (companySnap.data()?.ownerUid !== actorUid) {
    throw new Error('Not authorized to remove branches');
  }
  const branchRef = adminDb.collection('companies').doc(companyId).collection('branches').doc(branchId);
  const branchSnap = await branchRef.get();
  if (!branchSnap.exists) throw new Error('Branch not found');
  const data = branchSnap.data() as any;
  const managerUid = data?.managerUid as string | null;

  const cashiersSnap = await branchRef.collection('cashiers').get();
  const batch = adminDb.batch();
  batch.delete(branchRef);
  cashiersSnap.docs.forEach(doc => batch.delete(doc.ref));
  await batch.commit();

  await adminDb.collection('companies').doc(companyId).update({
    branchCount: FieldValue.increment(-1),
    cashierCount: FieldValue.increment(-1 * cashiersSnap.size),
    updated_at: FieldValue.serverTimestamp(),
  });

  const deletions: Promise<any>[] = [];
  if (managerUid) {
    deletions.push(adminDb.collection('users').doc(managerUid).delete().catch(() => null));
    deletions.push(adminAuth.deleteUser(managerUid).catch(() => null));
  }
  cashiersSnap.docs.forEach(doc => {
    const cashierUid = doc.data()?.uid as string | undefined;
    if (cashierUid) {
      deletions.push(adminDb.collection('users').doc(cashierUid).delete().catch(() => null));
      deletions.push(adminAuth.deleteUser(cashierUid).catch(() => null));
    }
  });
  await Promise.all(deletions);
}

export async function upsertBranchManager(input: UpsertBranchManagerInput) {
  const { companyId, branchId, branchUsername, pin, displayName, contact } = input;
  const hasPin = typeof pin === 'string' && pin !== null && pin !== undefined && String(pin).trim() !== '';
  if (hasPin && !/^[0-9]{4,6}$/.test(String(pin))) {
    throw new Error('PIN must be 4 to 6 digits');
  }
  const branchRef = adminDb.collection('companies').doc(companyId).collection('branches').doc(branchId);
  const branchSnap = await branchRef.get();
  if (!branchSnap.exists) throw new Error('Branch not found');
  const branchData = branchSnap.data() as any;
  const branchSlug = branchData.slug as string;
  const companySlug = branchData.companySlug as string;
  const managerUid = branchData.managerAccountUid as string;

  // If a PIN was provided, keep the existing behavior: create active account with virtual email
  if (hasPin) {
    const pinHash = await hashPin(String(pin));
    const email = buildVirtualEmail(branchUsername);

    await adminDb.runTransaction(async (tx) => {
      tx.set(adminDb.collection('users').doc(managerUid), {
        uid: managerUid,
        role: 'branch-manager',
        accountType: 'company',
        companyId,
        companySlug,
        branchId,
        branchSlug,
        username: branchUsername,
        email,
        phone: contact.phone || null,
        displayName,
        pinHash,
        status: 'active',
        permissions: PERMISSIONS.branchManager,
        updated_at: FieldValue.serverTimestamp(),
        created_at: FieldValue.serverTimestamp(),
      }, { merge: true });

      tx.update(branchRef, {
        managerUid,
        managerName: displayName,
        managerContact: contact,
        updated_at: FieldValue.serverTimestamp(),
      });
    });

    await ensureAuthUser(managerUid, buildVirtualEmail(branchUsername), displayName, { disabled: false });
    await adminAuth.setCustomUserClaims(managerUid, {
      role: 'branch-manager',
      accountType: 'company',
      companyId,
      branchId,
      companySlug,
      branchSlug,
      permissions: PERMISSIONS.branchManager,
    });

    return { managerUid, username: branchUsername, email: buildVirtualEmail(branchUsername) };
  }

  // No PIN provided: create disabled/pending account and send set-password email to contact.email
  const inviteEmail = contact.email || null;
  if (!inviteEmail || !/\S+@\S+\.\S+/.test(inviteEmail)) {
    throw new Error('Email is required to send set-password email');
  }

  await adminDb.runTransaction(async (tx) => {
    tx.set(adminDb.collection('users').doc(managerUid), {
      uid: managerUid,
      role: 'branch-manager',
      accountType: 'company',
      companyId,
      companySlug,
      branchId,
      branchSlug,
      username: branchUsername,
      email: inviteEmail,
      phone: contact.phone || null,
      displayName,
      pinHash: null,
      status: 'pending',
      permissions: PERMISSIONS.branchManager,
      updated_at: FieldValue.serverTimestamp(),
      created_at: FieldValue.serverTimestamp(),
    }, { merge: true });

    tx.update(branchRef, {
      managerUid,
      managerName: displayName,
      managerContact: contact,
      updated_at: FieldValue.serverTimestamp(),
    });
  });

  // create invite token
  const crypto = await import('crypto');
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const id = `invite_${encodeURIComponent(inviteEmail)}_${Date.now()}`;
  const expiresAtMs = Date.now() + 24 * 60 * 60 * 1000;

  await adminDb.collection('branch_manager_invites').doc(id).set({
    email: inviteEmail,
    name: displayName || '',
    tokenHash,
    created_at: new Date(),
    expires_at_ms: expiresAtMs,
    used: false,
  });

  const origin = process.env.NEXT_PUBLIC_APP_ORIGIN || `http://localhost:${process.env.PORT || 3000}`;
  // Invite link points to a branch-specific set-pin page: /[companySlug]/[branchSlug]/set-pin
  const safeCompany = encodeURIComponent(companySlug || '');
  const safeBranch = encodeURIComponent(branchSlug || '');
  const link = `${origin}/${safeCompany}/${safeBranch}/set-pin?token=${encodeURIComponent(token)}`;

  const SMTP_HOST = process.env.SMTP_HOST;
  const SMTP_PORT = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined;
  const SMTP_USER = process.env.SMTP_USER;
  const SMTP_PASS = process.env.SMTP_PASS;
  const SMTP_SECURE = process.env.SMTP_SECURE === 'true';
  const FROM_EMAIL = process.env.FROM_EMAIL || SMTP_USER || 'no-reply@lankaqr.local';

  if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
    try {
      const transporter = nodemailer.createTransport({ host: SMTP_HOST, port: SMTP_PORT || 587, secure: SMTP_SECURE || (SMTP_PORT === 465), auth: { user: SMTP_USER, pass: SMTP_PASS } });
      const { subject, text, html } = generateSetPasswordEmail({ name: displayName || inviteEmail, email: inviteEmail, link, appName: 'LankaQR' });
      const info = await transporter.sendMail({ from: FROM_EMAIL, to: inviteEmail, subject, text, html });
      console.log('Invite email sent:', info && (info.messageId || info.response));
    } catch (err: any) {
      console.error('Failed to send invite email via SMTP:', err);
      console.log(`Invite link for ${inviteEmail}: ${link}`);
    }
  } else {
    console.warn('SMTP not configured — falling back to server log for invite link');
    console.log(`Invite link for ${inviteEmail}: ${link}`);
  }

  await ensureAuthUser(managerUid, inviteEmail, displayName, { disabled: true });
  await adminAuth.setCustomUserClaims(managerUid, {
    role: 'branch-manager',
    accountType: 'company',
    companyId,
    branchId,
    companySlug,
    branchSlug,
    permissions: PERMISSIONS.branchManager,
  });

  return { managerUid, username: branchUsername, email: inviteEmail };
}

export async function disableBranchManager(companyId: string, branchId: string) {
  const branchRef = adminDb.collection('companies').doc(companyId).collection('branches').doc(branchId);
  const branchSnap = await branchRef.get();
  if (!branchSnap.exists) throw new Error('Branch not found');
  const branchData = branchSnap.data() as any;
  if (!branchData.managerUid) return;
  const managerUid = branchData.managerUid as string;

  // Remove manager refs from branch and delete user records
  const ops: Promise<any>[] = [];

  // Clear manager fields on branch (including managerAccountUid)
  ops.push(branchRef.update({
    managerUid: null,
    managerName: null,
    managerContact: null,
    updated_at: FieldValue.serverTimestamp(),
  }));

  // Delete users doc and auth user (best-effort)
  ops.push(adminDb.collection('users').doc(managerUid).delete().catch(() => null));
  ops.push(adminAuth.deleteUser(managerUid).catch(() => null));

  await Promise.all(ops);
}

export async function createCashier(input: CreateCashierInput) {
  const { companyId, branchId, branchUsername, displayName, pin, actorRole, actorCompanyId, actorBranchId } = input;
  if (!/^[0-9]{4,6}$/.test(pin)) throw new Error('PIN must be 4 to 6 digits');
  if (actorRole === 'branch-manager' && actorBranchId !== branchId) {
    throw new Error('Not authorized to manage this branch');
  }
  if ((actorRole === 'branch-manager' || actorRole === 'cashier') && actorCompanyId !== companyId) {
    throw new Error('Not authorized');
  }

  const branchRef = adminDb.collection('companies').doc(companyId).collection('branches').doc(branchId);
  const cashierRef = branchRef.collection('cashiers').doc();
  const pinHash = await hashPin(pin);
  let cashierNumber = 1;
  let branchSlug: string | null = null;
  let companySlug: string | null = null;
  let cashierSlugSegment: string | null = null;

  await adminDb.runTransaction(async (tx) => {
    const branchSnap = await tx.get(branchRef);
    if (!branchSnap.exists) throw new Error('Branch not found');
    const branchData = branchSnap.data() || {};
    branchSlug = typeof branchData.slug === 'string' ? branchData.slug : null;
    companySlug = typeof branchData.companySlug === 'string' ? branchData.companySlug : null;
    cashierNumber = Number(branchData.nextCashierNumber) || 1;
    tx.update(branchRef, {
      nextCashierNumber: cashierNumber + 1,
      updated_at: FieldValue.serverTimestamp(),
    });
    const username = `${branchUsername}-${cashierNumber}`;
    const email = buildVirtualEmail(username);
    cashierSlugSegment = `cashier${cashierNumber}`;

    tx.set(cashierRef, {
      id: cashierRef.id,
      uid: cashierRef.id,
      username,
      displayName,
      status: 'active',
      created_at: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp(),
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
      email,
      displayName,
      pinHash,
      status: 'active',
      permissions: PERMISSIONS.cashier,
      created_at: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp(),
    });
  });

  const username = `${branchUsername}-${cashierNumber}`;
  const email = buildVirtualEmail(username);
  await ensureAuthUser(cashierRef.id, email, displayName, { disabled: false });
  await adminAuth.setCustomUserClaims(cashierRef.id, {
    role: 'cashier',
    accountType: 'company',
    companyId,
    branchId,
    companySlug,
    branchSlug,
    cashierSlug: cashierSlugSegment,
    permissions: PERMISSIONS.cashier,
  });
  await adminDb.collection('companies').doc(companyId).update({
    cashierCount: FieldValue.increment(1),
    updated_at: FieldValue.serverTimestamp(),
  });

  return { cashierId: cashierRef.id, username, email };
}

export async function deleteCashier(input: DeleteCashierInput) {
  const { companyId, branchId, cashierId } = input;
  const branchRef = adminDb.collection('companies').doc(companyId).collection('branches').doc(branchId);
  await Promise.all([
    branchRef.collection('cashiers').doc(cashierId).delete(),
    branchRef.update({ updated_at: FieldValue.serverTimestamp() }).catch(() => null),
    adminDb.collection('users').doc(cashierId).delete().catch(() => null),
    adminAuth.deleteUser(cashierId).catch(() => null),
    adminDb.collection('companies').doc(companyId).update({
      cashierCount: FieldValue.increment(-1),
      updated_at: FieldValue.serverTimestamp(),
    }),
  ]);
}
