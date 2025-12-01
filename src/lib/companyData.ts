import { adminDb } from './firebaseAdmin';

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
  const snap = await adminDb.collection('companies').where('slug', '==', slug).limit(1).get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  return { id: doc.id, ...(doc.data() as Record<string, any>) } as CompanyDoc;
}

export async function getCompanyById(id: string): Promise<CompanyDoc | null> {
  const doc = await adminDb.collection('companies').doc(id).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...(doc.data() as Record<string, any>) } as CompanyDoc;
}

export async function getBranchBySlug(companyId: string, branchSlug: string): Promise<BranchDoc | null> {
  const snap = await adminDb
    .collection('companies')
    .doc(companyId)
    .collection('branches')
    .where('slug', '==', branchSlug)
    .limit(1)
    .get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  return { id: doc.id, ...(doc.data() as Record<string, any>) } as BranchDoc;
}
