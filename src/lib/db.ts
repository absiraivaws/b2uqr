import type { Transaction } from "./types";
import { adminDb } from "./firebaseAdmin";

const COLLECTION = "transactions";
const collectionRef = adminDb.collection(COLLECTION);

export async function createDbTransaction(tx: Omit<Transaction, 'created_at' | 'updated_at'>): Promise<Transaction> {
  const now = new Date().toISOString();
  const newTx: Transaction = {
    ...tx,
    created_at: now,
    updated_at: now,
  };
  // Ensure UID from the incoming object is preserved (if provided).
  // `tx` may include an optional `uid` attached server-side; keep it explicitly.
  if ((tx as any).uid) {
    (newTx as any).uid = (tx as any).uid;
  }
  // Also pass terminal ID in bankResponse for consistency
  if (tx.terminal_id) {
    newTx.bankResponse = { ...newTx.bankResponse, terminal_id: tx.terminal_id };
  }
  await collectionRef.doc(newTx.transaction_uuid).set(newTx);
  return newTx;
}

export async function getDbTransaction(uuid: string): Promise<Transaction | undefined> {
  const snap = await collectionRef.doc(uuid).get();
  return snap.exists ? (snap.data() as Transaction) : undefined;
}

export async function getAllDbTransactions(): Promise<Transaction[]> {
  const snap = await collectionRef.orderBy("created_at", "desc").get();
  return snap.docs.map(doc => doc.data() as Transaction);
}

export async function getLastDbTransaction(): Promise<Transaction | undefined> {
  const snap = await collectionRef.orderBy("created_at", "desc").limit(1).get();
  if (snap.empty) return undefined;
  return snap.docs[0].data() as Transaction;
}

export async function getLastTransactionForToday(uid: string): Promise<Transaction | undefined> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayISO = today.toISOString();

  // Always scope by user UID so counters are isolated per individual user.
  const snap = await collectionRef
    .where("uid", "==", uid)
    .where("created_at", ">=", todayISO)
    .orderBy("created_at", "desc")
    .limit(1)
    .get();

  if (snap.empty) return undefined;
  return snap.docs[0].data() as Transaction;
}

export async function updateDbTransactionStatus(
  uuid: string,
  status: 'PENDING' | 'SUCCESS' | 'FAILED',
  bankResponse: any
): Promise<Transaction | undefined> {
  const ref = collectionRef.doc(uuid);
  const snap = await ref.get();
  if (!snap.exists) return undefined;
  const tx = snap.data() as Transaction;
  const updated: Partial<Transaction> = {
    status,
    bankResponse,
    updated_at: new Date().toISOString(),
  };
  await ref.set(updated, { merge: true });
  return { ...tx, ...updated };
}

export async function findPendingTransactions(before: Date): Promise<Transaction[]> {
  const snap = await collectionRef
    .where("status", "==", "PENDING")
    .where("created_at", "<", before.toISOString())
    .get();
  return snap.docs.map(doc => doc.data() as Transaction);
}
