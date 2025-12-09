"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import type { Transaction } from "@/lib/types";

type UseBranchTransactionsResult = {
  transactions: Transaction[];
  loading: boolean;
  error: Error | null;
};

export function useBranchTransactions(companyId: string | undefined, branchId: string | undefined): UseBranchTransactionsResult {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let unsubSnapshot: (() => void) | null = null;
    setLoading(true);

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (unsubSnapshot) {
        try { unsubSnapshot(); } catch { }
        unsubSnapshot = null;
      }

      if (!user || !branchId || !companyId) {
        setTransactions([]);
        setLoading(false);
        return;
      }

      // For Firestore security rules to validate queries that check company access,
      // include both companyId and branchId equality filters so rules that inspect
      // resource.data.companyId can be enforced for the query.
      const q = query(
        collection(db, "transactions"),
        where("companyId", "==", companyId),
        where("branchId", "==", branchId),
        orderBy("created_at", "desc")
      );

      setLoading(true);
      unsubSnapshot = onSnapshot(q, (snap) => {
        const docs = snap.docs.map((d) => d.data() as Transaction);
        setTransactions(docs);
        setLoading(false);
      }, (err) => {
        console.error("Error fetching branch transactions:", err);
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
  }, [companyId, branchId]);

  return { transactions, loading, error };
}

export default useBranchTransactions;
