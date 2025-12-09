"use client";

import React, { useMemo } from "react";
import useCompanyTransactions from "@/hooks/use-company-transactions";
import { Card, CardContent } from "@/components/ui/card";
import type { Transaction as Tx } from "@/lib/types";

interface Props {
  companyId: string;
}

export default function CompanyTodayTotal({ companyId }: Props) {
  const { transactions = [], loading } = useCompanyTransactions(companyId);

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const total = useMemo(() => {
    let sum = 0;
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
      if (created.toISOString().slice(0, 10) === todayStr) {
        sum += Number(tx.amount) || 0;
      }
    });
    return sum;
  }, [transactions, todayStr]);

  return (
    <div className="mb-6 h-full">
      <Card className="h-full">
        <CardContent className="h-full flex flex-col items-center justify-center p-6">
          <div className="text-lg md:text-2xl text-muted-foreground mb-6">Today's Total</div>
          <div className="text-4xl md:text-7xl font-bold text-blue-800 dark:text-blue-300">
            LKR {total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          {loading && <div className="text-xs text-muted-foreground mt-1">Loading...</div>}
        </CardContent>
      </Card>
    </div>
  );
}