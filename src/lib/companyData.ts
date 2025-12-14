import { adminDb } from './firebaseAdmin';

// Small in-memory cache to avoid repeated Firestore reads during rapid navigations
// TTL is intentionally short to keep data reasonably fresh while improving
// perceived navigation performance in dev and low-load prod scenarios.
const CACHE_TTL = 5000; // milliseconds
const cache = new Map<string, { value: any; expires: number }>();

function getCached<T>(key: string): T | null {
  const e = cache.get(key);
  if (!e) return null;
  if (e.expires < Date.now()) {
    cache.delete(key);
    return null;
  }
  return e.value as T;
}

function setCached(key: string, value: any) {
  cache.set(key, { value, expires: Date.now() + CACHE_TTL });
}

export interface CompanyDoc {
  id: string;
  slug: string;
  name: string;
  ownerUid: string;
  [key: string]: any;
}

export interface BranchDoc {
  id: string;
  slug: string;
  companyId: string;
  companySlug: string;
  name: string;
  [key: string]: any;
}

export async function getCompanyBySlug(slug: string): Promise<CompanyDoc | null> {
  const key = `company:slug:${slug}`;
  const cached = getCached<CompanyDoc>(key);
  if (cached) return cached;

  const snap = await adminDb.collection('companies').where('slug', '==', slug).limit(1).get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  const result = { id: doc.id, ...(doc.data() as Record<string, any>) } as CompanyDoc;
  setCached(key, result);
  return result;
}

export async function getCompanyById(id: string): Promise<CompanyDoc | null> {
  const key = `company:id:${id}`;
  const cached = getCached<CompanyDoc>(key);
  if (cached) return cached;

  const doc = await adminDb.collection('companies').doc(id).get();
  if (!doc.exists) return null;
  const result = { id: doc.id, ...(doc.data() as Record<string, any>) } as CompanyDoc;
  setCached(key, result);
  return result;
}

export async function getBranchBySlug(companyId: string, branchSlug: string): Promise<BranchDoc | null> {
  const key = `branch:slug:${companyId}:${branchSlug}`;
  const cached = getCached<BranchDoc>(key);
  if (cached) return cached;

  const snap = await adminDb
    .collection('companies')
    .doc(companyId)
    .collection('branches')
    .where('slug', '==', branchSlug)
    .limit(1)
    .get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  const result = { id: doc.id, ...(doc.data() as Record<string, any>) } as BranchDoc;
  setCached(key, result);
  return result;
}
