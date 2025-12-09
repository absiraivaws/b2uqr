"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { db } from "@/lib/firebase";
import { collection, query, onSnapshot } from "firebase/firestore";
import useBranchTransactions from "@/hooks/use-branch-transactions";
import type { Transaction as Tx } from "@/lib/types";

interface Props {
  companyId: string;
  branchId: string;
}

export default function BranchCashierviseTotal({ companyId, branchId }: Props) {
  const { transactions = [], loading } = useBranchTransactions(companyId, branchId);

  const [cashiersMap, setCashiersMap] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!companyId || !branchId) {
      setCashiersMap({});
      return;
    }

    const q = query(collection(db, "companies", companyId, "branches", branchId, "cashiers"));
    const unsub = onSnapshot(q, (snap) => {
      const map: Record<string, string> = {};
      snap.docs.forEach((d) => {
        const data = d.data() as any;
        map[d.id] = data?.displayName || data?.username || data?.name || d.id;
      });
      setCashiersMap(map);
    }, (err) => {
      console.warn("Failed to subscribe to cashiers:", err);
    });

    return () => { try { unsub(); } catch {} };
  }, [companyId, branchId]);

  const totals = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const acc = new Map<string, number>();
    (transactions || []).forEach((tx: Tx) => {
      if (!tx || tx.status !== "SUCCESS" || !tx.created_at) return;
      let created: Date;
      try {
        if (typeof tx.created_at === "string") created = new Date(tx.created_at);
        else if (tx.created_at && typeof (tx.created_at as any).toDate === "function") created = (tx.created_at as any).toDate();
        else created = new Date(tx.created_at as any);
      } catch (e) {
        return;
      }
      if (created.toISOString().slice(0, 10) !== todayStr) return;
      const cid = tx.cashierId || "unknown";
      const amt = Number(tx.amount) || 0;
      acc.set(cid, (acc.get(cid) || 0) + amt);
    });
    return acc;
  }, [transactions]);

  const rows = useMemo(() => {
    const items: { id: string; name: string; amount: number }[] = [];
    const ids = new Set<string>([...Object.keys(cashiersMap), ...Array.from(totals.keys())]);
    ids.forEach((id) => {
      items.push({ id, name: cashiersMap[id] || (id === 'unknown' ? 'Unassigned' : id), amount: totals.get(id) || 0 });
    });
    // sort by amount desc
    items.sort((a, b) => b.amount - a.amount);
    return items;
  }, [cashiersMap, totals]);

  return (
    <Card className="h-full">
      <CardContent className="h-full p-4 sm:p-6 lg:p-8">
        <div className="h-full flex flex-col">

          <div className="text-lg md:text-2xl text-muted-foreground text-center mb-8">Today's Cashier Totals</div>

          {loading && <div className="text-sm text-muted-foreground mb-2">Loading...</div>}

          <div className="w-full flex-1 overflow-auto">
            {rows.length === 0 ? (
              <div className="text-sm text-muted-foreground">No transactions today.</div>
            ) : (
              <ul className="divide-y">
                {rows.map((r) => (
                  <li key={r.id} className="flex items-center justify-between py-3">
                    <div className="text-sm font-medium">{r.name}</div>
                    <div className="text-sm text-muted-foreground">LKR {Number(r.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
