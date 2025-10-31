"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import type { Transaction } from "@/lib/types";

type UseTransactionsResult = {
  transactions: Transaction[];
  loading: boolean;
  error: Error | null;
};

/**
 * Hook: subscribe to transactions belonging to the current authenticated user.
 *
 * - Filters documents where `uid` === currentUser.uid using a Firestore query.
 * - Orders by `created_at` descending (keeps existing string-based timestamp ordering).
 * - Returns real-time updates via onSnapshot.
 */
export function useTransactions(): UseTransactionsResult {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let unsubSnapshot: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      // Clean up previous snapshot listener when auth state changes
      if (unsubSnapshot) {
        try { unsubSnapshot(); } catch {}
        unsubSnapshot = null;
      }

      if (!user) {
        // Not signed in — clear list and stop
        setTransactions([]);
        setLoading(false);
        return;
      }

      const uid = user.uid;
      const q = query(
        collection(db, "transactions"),
        where("uid", "==", uid),
        orderBy("created_at", "desc")
      );

      setLoading(true);
      unsubSnapshot = onSnapshot(q, (snap) => {
        const docs = snap.docs.map((d) => d.data() as Transaction);
        setTransactions(docs);
        setLoading(false);
      }, (err) => {
        setError(err as Error);
        setLoading(false);
      });
    });

    return () => {
      try { unsubAuth(); } catch {}
      if (unsubSnapshot) {
        try { unsubSnapshot(); } catch {}
      }
    };
    // Intentionally no deps other than mounted lifecycle
  }, []);

  return { transactions, loading, error };
}

export default useTransactions;
