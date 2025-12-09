"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { ResponsiveContainer, BarChart, XAxis, YAxis, Tooltip, Bar } from "recharts";
import { db } from "@/lib/firebase";
import { collection, query, onSnapshot } from "firebase/firestore";
import useCompanyTransactions from "@/hooks/use-company-transactions";
import type { Transaction as Tx } from "@/lib/types";

interface Props {
  companyId: string;
  branchId: string;
}

export default function CashierTotalsChart({ companyId, branchId }: Props) {
  const { transactions = [], loading } = useCompanyTransactions(companyId, branchId);

  const [usersMap, setUsersMap] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!companyId || !branchId) {
      setUsersMap({});
      return;
    }

    const q = query(collection(db, "companies", companyId, "branches", branchId, "cashiers"));
    const unsub = onSnapshot(q, (snap) => {
      const map: Record<string, string> = {};
      snap.docs.forEach((d) => {
        const data = d.data() as any;
        const id = d.id;
        map[id] = data?.displayName || data?.username || data?.name || id;
      });
      setUsersMap(map);
    }, (err) => {
      console.warn("Failed to subscribe to cashiers:", err);
    });
    return () => { try { unsub(); } catch {} };
  }, []);

  const totals = useMemo(() => {
    const acc = new Map<string, number>();
    (transactions || []).forEach((tx: Tx) => {
      if (!tx) return;
      if (tx.status !== "SUCCESS") return;
      const cid = tx.cashierId || "unknown";
      const amt = Number(tx.amount) || 0;
      acc.set(cid, (acc.get(cid) || 0) + amt);
    });
    return acc;
  }, [transactions]);

  const chartData = useMemo(() => {
    const ids = new Set<string>();
    Object.keys(usersMap).forEach((id) => ids.add(id));
    for (const id of totals.keys()) ids.add(id);
    return Array.from(ids).map((cashierId) => ({
      cashierId,
      name: usersMap[cashierId] || (cashierId === 'unknown' ? 'Unassigned' : cashierId),
      amount: totals.get(cashierId) || 0,
    }));
  }, [totals, usersMap]);

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
          <h2 className="text-2xl font-medium text-muted-foreground">Cashier totals</h2>
          <div className="text-sm text-muted-foreground">Branch totals per cashier</div>
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
                fill="#10b981"
                radius={[6, 6, 0, 0]}
                name="Amount (LKR)"
                activeBar={{ fill: '#34d399' }}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {loading &&
          <div className="text-sm text-muted-foreground mt-2">Loading transactions...</div>
        }
        {!loading && chartData.length === 0 &&
          <div className="text-sm text-muted-foreground mt-2">No successful transactions yet for this branch.</div>
        }
      </CardContent>
    </Card>
  );
}
