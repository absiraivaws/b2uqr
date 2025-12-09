"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { db } from "@/lib/firebase";
import { collection, query, onSnapshot } from "firebase/firestore";
import useCompanyTransactions from "@/hooks/use-company-transactions";
import type { Transaction as Tx } from "@/lib/types";

interface Props {
  companyId: string;
}

export default function CompanyBranchviseTotal({ companyId }: Props) {
  const { transactions = [], loading } = useCompanyTransactions(companyId);

  const [branchesMap, setBranchesMap] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!companyId) {
      setBranchesMap({});
      return;
    }

    const q = query(collection(db, "companies", companyId, "branches"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const map: Record<string, string> = {};
        snap.docs.forEach((d) => {
          const data = d.data() as any;
          map[d.id] = data?.displayName || data?.name || data?.branchName || d.id;
        });
        setBranchesMap(map);
      },
      (err) => {
        console.warn("Failed to subscribe to branches:", err);
      }
    );

    return () => {
      try {
        unsub();
      } catch {}
    };
  }, [companyId]);

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
      const bid = (tx as any).branchId || (tx as any).branch?.id || "unknown";
      const amt = Number(tx.amount) || 0;
      acc.set(bid, (acc.get(bid) || 0) + amt);
    });
    return acc;
  }, [transactions]);

  const rows = useMemo(() => {
    const items: { id: string; name: string; amount: number }[] = [];
    const ids = new Set<string>([...Object.keys(branchesMap), ...Array.from(totals.keys())]);
    ids.forEach((id) => {
      items.push({ id, name: branchesMap[id] || (id === "unknown" ? "Unassigned" : id), amount: totals.get(id) || 0 });
    });
    // sort by amount desc and take top 5
    items.sort((a, b) => b.amount - a.amount);
    return items.slice(0, 5);
  }, [branchesMap, totals]);

  return (
    <Card className="h-full">
      <CardContent className="h-full p-4 sm:p-6 lg:p-8">
        <div className="h-full flex flex-col">

          <div className="text-lg md:text-2xl text-muted-foreground text-center mb-8">Today's Top 5 Branch Totals</div>

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
