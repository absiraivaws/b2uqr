"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import type { Transaction } from "@/lib/types";

type UseCompanyTransactionsResult = {
  transactions: Transaction[];
  loading: boolean;
  error: Error | null;
};

/**
 * Hook: subscribe to transactions for a specific company.
 *
 * - Filters documents where `companyId` === provided companyId.
 * - Orders by `created_at` descending.
 * - Returns real-time updates via onSnapshot.
 */
export function useCompanyTransactions(
  companyId: string | undefined,
  branchId?: string | undefined,
  cashierId?: string | undefined,
): UseCompanyTransactionsResult {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let unsubSnapshot: (() => void) | null = null;
    setLoading(true);

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      // Clean up previous snapshot listener when auth state changes
      if (unsubSnapshot) {
        try { unsubSnapshot(); } catch { }
        unsubSnapshot = null;
      }

      if (!user || !companyId) {
        // Not signed in or no companyId — clear list and stop
        setTransactions([]);
        setLoading(false);
        return;
      }

      // Build query constraints. Include companyId always so rules can validate.
      const constraints: any[] = [where("companyId", "==", companyId)];
      if (branchId) constraints.push(where("branchId", "==", branchId));
      if (cashierId) constraints.push(where("cashierId", "==", cashierId));

      const q = query(collection(db, "transactions"), ...constraints, orderBy("created_at", "desc"));

      setLoading(true);
      unsubSnapshot = onSnapshot(q, (snap) => {
        const docs = snap.docs.map((d) => d.data() as Transaction);
        setTransactions(docs);
        setLoading(false);
      }, (err) => {
        console.error("Error fetching company transactions:", err);
        setError(err as Error);
        setLoading(false);
      });
    });

    return () => {
      try { unsubAuth(); } catch { }
      if (unsubSnapshot) {
        try { unsubSnapshot(); } catch { }
      }
    };
  }, [companyId, branchId, cashierId]);

  return { transactions, loading, error };
}

export default useCompanyTransactions;
