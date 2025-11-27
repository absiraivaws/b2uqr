import type { Transaction } from "./types";
import { db } from "./firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  orderBy,
  limit,
  where,
} from "firebase/firestore";

const COLLECTION = "transactions";

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
  await setDoc(doc(db, COLLECTION, newTx.transaction_uuid), newTx);
  return newTx;
}

export async function getDbTransaction(uuid: string): Promise<Transaction | undefined> {
  const snap = await getDoc(doc(db, COLLECTION, uuid));
  return snap.exists() ? (snap.data() as Transaction) : undefined;
}

export async function getAllDbTransactions(): Promise<Transaction[]> {
  const q = query(collection(db, COLLECTION), orderBy("created_at", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map(doc => doc.data() as Transaction);
}

export async function getLastDbTransaction(): Promise<Transaction | undefined> {
  const q = query(collection(db, COLLECTION), orderBy("created_at", "desc"), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) return undefined;
  return snap.docs[0].data() as Transaction;
}

export async function getLastTransactionForToday(terminalId: string): Promise<Transaction | undefined> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayISO = today.toISOString();
  
  const q = query(
    collection(db, COLLECTION),
    where("terminal_id", "==", terminalId),
    where("created_at", ">=", todayISO),
    orderBy("created_at", "desc"),
    limit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) return undefined;
  return snap.docs[0].data() as Transaction;
}

export async function updateDbTransactionStatus(
  uuid: string,
  status: 'PENDING' | 'SUCCESS' | 'FAILED',
  bankResponse: any
): Promise<Transaction | undefined> {
  const ref = doc(db, COLLECTION, uuid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return undefined;
  const tx = snap.data() as Transaction;
  const updated: Partial<Transaction> = {
    status,
    bankResponse,
    updated_at: new Date().toISOString(),
  };
  await updateDoc(ref, updated);
  return { ...tx, ...updated };
}

export async function findPendingTransactions(before: Date): Promise<Transaction[]> {
  const q = query(
    collection(db, COLLECTION),
    where("status", "==", "PENDING"),
    where("created_at", "<", before.toISOString())
  );
  const snap = await getDocs(q);
  return snap.docs.map(doc => doc.data() as Transaction);
}
