"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Bar } from "recharts";
import { db } from "@/lib/firebase";
import { collection, query, onSnapshot } from "firebase/firestore";
import useCompanyTransactions from "@/hooks/use-company-transactions";
import type { Transaction as Tx } from "@/lib/types";

interface Props {
  companyId: string;
}

export default function BranchTotalsChart({ companyId }: Props) {
  const { transactions = [], loading } = useCompanyTransactions(companyId);

  const [branchesMap, setBranchesMap] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!companyId) return;
    const q = query(collection(db, "companies", companyId, "branches"));
    const unsub = onSnapshot(q, (snap) => {
      const map: Record<string, string> = {};
      snap.docs.forEach((d) => {
        const data = d.data() as any;
        map[d.id] = data?.name || data?.slug || d.id;
      });
      setBranchesMap(map);
    }, (err) => {
      console.warn("Failed to subscribe to branches:", err);
    });
    return () => unsub();
  }, [companyId]);

  const totals = useMemo(() => {
    const acc = new Map<string, number>();
    (transactions || []).forEach((tx: Tx) => {
      if (!tx) return;
      if (tx.status !== "SUCCESS") return;
      const bid = tx.branchId || "unknown";
      const amt = Number(tx.amount) || 0;
      acc.set(bid, (acc.get(bid) || 0) + amt);
    });
    return acc;
  }, [transactions]);

  const chartData = useMemo(() => {
    // include every known branch (from branchesMap) and any branchIds seen in transactions
    const ids = new Set<string>();
    Object.keys(branchesMap).forEach((id) => ids.add(id));
    for (const id of totals.keys()) ids.add(id);
    return Array.from(ids).map((branchId) => ({ branchId, name: branchesMap[branchId] || branchId, amount: totals.get(branchId) || 0 }));
  }, [totals, branchesMap]);

  const totalAmount = chartData.reduce((s, d) => s + Number(d.amount || 0), 0);

  const DashboardTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;

    return (
      <div className="rounded-md border bg-background px-2 py-1 text-xs shadow-sm">
        <div className="font-large">{label}</div>
        <div className="text-muted-foreground">
          LKR {Number(payload[0].value).toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </div>
      </div>
    );
  };



  return (
    <Card className="h-full">
      <CardContent className="h-full p-4 sm:p-6 lg:p-8 flex flex-col">
        <div className="mb-8">
          <h2 className="text-2xl font-medium text-muted-foreground">
            Branch totals
          </h2>
        </div>

        <div className="w-full flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 20, left: 0, bottom: 50 }}
            >
              <XAxis
                dataKey="name"
                angle={-20}
                textAnchor="end"
                interval={0}
                height={55}
                tick={{ fontSize: 12, fill: "#6b7280" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 12, fill: "#6b7280" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                content={<DashboardTooltip />}
                cursor={false}
                formatter={(value: any) => [`LKR ${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 'Amount']}
              />
              <Bar
                dataKey="amount"
                fill="#2563eb"
                radius={[6, 6, 0, 0]}
                name="Amount (LKR)"
                activeBar={{ fill: '#3b82f6' }}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {loading &&
          <div className="text-sm text-muted-foreground mt-2">Loading transactions...</div>
        }
        {!loading && chartData.length === 0 &&
          <div className="text-sm text-muted-foreground mt-2">No successful transactions yet.</div>
        }
      </CardContent>
    </Card>
  );
}
