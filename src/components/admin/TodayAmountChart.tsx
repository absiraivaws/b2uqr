"use client";

import React, { useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Bar,
  Line,
  ResponsiveContainer,
} from "recharts";
import useAllTransactions from "@/hooks/admin/use-all-transactions";
import type { Transaction as TxType } from "@/lib/types";

type Tx = TxType;

function formatCurrency(amount: number) {
  return `LKR ${amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
}

export default function TodayAmountChart() {
  const { transactions = [], loading } = useAllTransactions();

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const todays = useMemo(() => {
    return (transactions || []).filter((tx: Tx) => {
      if (!tx || !tx.created_at) return false;
      let created: Date;
      try {
        if (typeof tx.created_at === "string") created = new Date(tx.created_at);
        else if (tx.created_at && typeof (tx.created_at as any).toDate === "function") created = (tx.created_at as any).toDate();
        else created = new Date(tx.created_at as any);
      } catch (e) {
        return false;
      }
      return created.toISOString().slice(0, 10) === todayStr && tx.status === "SUCCESS";
    });
  }, [transactions, todayStr]);

  // hourly buckets 00..23
  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));

  const bucketMap: Record<string, { count: number; amount: number }> = {};
  hours.forEach((h) => (bucketMap[h] = { count: 0, amount: 0 }));

  todays.forEach((tx) => {
    let date: Date;
    if (typeof tx.created_at === "string") date = new Date(tx.created_at);
    else if (tx.created_at && typeof (tx.created_at as any).toDate === "function") date = (tx.created_at as any).toDate();
    else date = new Date(tx.created_at as any);
    const hh = String(date.getHours()).padStart(2, "0");
    bucketMap[hh].count += 1;
    bucketMap[hh].amount += Number(tx.amount) || 0;
  });

  const chartData = hours.map((h) => ({ name: h, count: bucketMap[h].count, amount: bucketMap[h].amount }));

  const totalAmount = chartData.reduce((s, d) => s + (Number(d.amount) || 0), 0);

  return (
    <Card>
      <CardContent>
        <div className="flex flex-col lg:flex-row items-stretch gap-4 pt-8">
          <div className="w-full lg:w-[260px] flex items-center justify-center border rounded p-6">
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Total Amount (Today)</div>
              <div className="text-3xl font-bold mt-2">{formatCurrency(totalAmount)}</div>
              <div className="text-sm text-muted-foreground mt-1">{loading ? 'Loading...' : `${todays.length} successful tx`}</div>
            </div>
          </div>
          
          <div className="flex-1 min-h-[200px]">
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="count" fill="#8884d8" name="Count" />
                <Line yAxisId="right" type="monotone" dataKey="amount" stroke="#82ca9d" name="Amount (LKR)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
