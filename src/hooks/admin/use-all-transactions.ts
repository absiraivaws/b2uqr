"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import type { Transaction } from "@/lib/types";

type UseTransactionsResult = {
  transactions: Transaction[];
  loading: boolean;
  error: Error | null;
};

/**
 * Hook: subscribe to all transactions in the `transactions` collection.
 *
 * - No `where` filter; returns all documents ordered by `created_at` desc.
 * - Uses Firestore `onSnapshot` for real-time updates.
 */
export default function useAllTransactions(): UseTransactionsResult {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const q = query(
      collection(db, "transactions"),
      orderBy("created_at", "desc")
    );

    setLoading(true);
    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs.map((d) => d.data() as Transaction);
      setTransactions(docs);
      setLoading(false);
    }, (err) => {
      setError(err as Error);
      setLoading(false);
    });

    return () => {
      try { unsub(); } catch {}
    };
  }, []);

  return { transactions, loading, error };
}
