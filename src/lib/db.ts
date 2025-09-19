import type { Transaction } from "./types";

// In-memory store to simulate a database like Firestore
const transactions = new Map<string, Transaction>();

export async function createDbTransaction(tx: Omit<Transaction, 'created_at' | 'updated_at'>): Promise<Transaction> {
  const now = new Date().toISOString();
  const newTx: Transaction = {
    ...tx,
    created_at: now,
    updated_at: now,
  };
  transactions.set(newTx.transaction_uuid, newTx);
  return newTx;
}

export async function getDbTransaction(uuid: string): Promise<Transaction | undefined> {
  return transactions.get(uuid);
}

export async function updateDbTransactionStatus(uuid: string, status: 'SUCCESS' | 'FAILED', bankResponse: any): Promise<Transaction | undefined> {
  const tx = transactions.get(uuid);
  if (tx) {
    tx.status = status;
    tx.bankResponse = bankResponse;
    tx.updated_at = new Date().toISOString();
    transactions.set(uuid, tx);
    return tx;
  }
  return undefined;
}

export async function findPendingTransactions(before: Date): Promise<Transaction[]> {
    const pending: Transaction[] = [];
    for (const tx of transactions.values()) {
        if (tx.status === 'PENDING' && new Date(tx.created_at) < before) {
            pending.push(tx);
        }
    }
    return pending;
}
