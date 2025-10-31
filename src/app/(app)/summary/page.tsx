"use client";
import { useState, useEffect, useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import useTransactions from '@/hooks/use-transactions';
import type { Transaction as TxType } from '@/lib/types';

// Use the shared Transaction type (amount stored as string in the DB)
type Transaction = TxType;

type ChartData = {
  name: string;
  count: number;
  amount: number;
};

export default function SummaryPage() {
  const [terminalId, setTerminalId] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  // Subscribe to current user's transactions (hook filters by uid)
  const { transactions: userTransactions, loading } = useTransactions();
  const [chartLoading, setChartLoading] = useState(false);
  const [chartMode, setChartMode] = useState<"monthly" | "daily">("monthly");

  const terminalIdOptions = [
    "all",
    ...Array.from({ length: 10 }, (_, i) =>
      String(i + 1).padStart(4, "0")
    ),
  ];

  // We now compute filtered transactions from `userTransactions` returned by the hook.

  useEffect(() => {
    // nothing to do on mount — data is provided by the hook
  }, []);

  function handleFilter() {
    // Filters are computed reactively from `userTransactions` — no manual fetch required.
    // Toggle a tiny loading flag to give user feedback if desired.
    setChartLoading(true);
    setTimeout(() => setChartLoading(false), 150); // small UX pulse
  }

  const filteredTransactions = useMemo(() => {
    return (userTransactions || []).filter((tx) => {
      // Terminal filter
      if (terminalId !== "all") {
        if ((tx.terminal_id ?? tx.bankResponse?.terminal_id) !== terminalId) return false;
      }

      // Parse created_at defensively (string or Firestore Timestamp)
      let created: Date;
      try {
        if (typeof tx.created_at === 'string') {
          created = new Date(tx.created_at);
        } else if (tx.created_at && typeof (tx.created_at as any).toDate === 'function') {
          created = (tx.created_at as any).toDate();
        } else {
          created = new Date(tx.created_at as any);
        }
      } catch (e) {
        created = new Date();
      }

      if (startDate) {
        const s = new Date(startDate);
        if (created < s) return false;
      }
      if (endDate) {
        const e = new Date(endDate);
        e.setDate(e.getDate() + 1); // include endDate day
        if (created >= e) return false;
      }

      // Only include successful transactions (as before)
      if (tx.status !== 'SUCCESS') return false;

      return true;
    });
  }, [userTransactions, terminalId, startDate, endDate]);

  // Group by month/day for chart using filtered transactions
  const monthMap: Record<string, { count: number; amount: number }> = {};
  const dayMap: Record<string, { count: number; amount: number }> = {};

  filteredTransactions.forEach((tx) => {
    // Defensive created_at parsing
    let date: Date;
    if (typeof tx.created_at === 'string') date = new Date(tx.created_at);
    else if (tx.created_at && typeof (tx.created_at as any).toDate === 'function') date = (tx.created_at as any).toDate();
    else date = new Date(tx.created_at as any);

    const monthName = date.toLocaleString('default', { month: 'short' });
    if (!monthMap[monthName]) monthMap[monthName] = { count: 0, amount: 0 };
    monthMap[monthName].count += 1;
    monthMap[monthName].amount += Number(tx.amount) || 0;

    const dayName = date.toISOString().slice(0, 10);
    if (!dayMap[dayName]) dayMap[dayName] = { count: 0, amount: 0 };
    dayMap[dayName].count += 1;
    dayMap[dayName].amount += Number(tx.amount) || 0;
  });

  // Prepare chart data arrays
  const chartDataMonthly: ChartData[] = Object.keys(monthMap)
    .map((name) => ({ name, ...monthMap[name] }))
    .sort((a, b) => {
      const months = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];
      return months.indexOf(a.name) - months.indexOf(b.name);
    });

  const chartDataDaily: ChartData[] = Object.keys(dayMap)
    .map((name) => ({ name, ...dayMap[name] }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const chartData = chartMode === "monthly" ? chartDataMonthly : chartDataDaily;

  const totalCount = filteredTransactions.length;
  const totalAmount = filteredTransactions.reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);

  return (
    <main className="p-4 sm:p-6 lg:p-8 space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Summary</CardTitle>
          <CardDescription>View transaction summary and statistics.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-4">
            <Input
              type="date"
              className="w-full sm:w-[200px]"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <span className="hidden sm:inline">-</span>
            <Input
              type="date"
              className="w-full sm:w-[200px]"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
            <div className="w-full sm:w-auto">
              <Select value={terminalId} onValueChange={setTerminalId}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Select Terminal" />
                </SelectTrigger>
                <SelectContent>
                  {terminalIdOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option === "all" ? "All Terminals" : option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleFilter} disabled={loading || chartLoading}>
              {loading || chartLoading ? "Loading..." : "Filter"}
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Total Transactions</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">
                  {totalCount.toLocaleString()}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Total Amount</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">
                  LKR{" "}
                  {totalAmount.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })}
                </p>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Transaction Chart</CardTitle>
            <CardDescription>
              {chartMode === "monthly"
                ? "Bar with line chart for transaction count and amount (monthly)."
                : "Bar with line chart for transaction count and amount (daily)."}
            </CardDescription>
          </div>
          <div>
            <Select
              value={chartMode}
              onValueChange={(v) => setChartMode(v as "monthly" | "daily")}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="daily">Daily</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart
              data={chartData}
              margin={{ top: 5, right: 20, left: -10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Bar
                yAxisId="left"
                dataKey="count"
                fill="#8884d8"
                name="Count"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="amount"
                stroke="#82ca9d"
                name="Amount (LKR)"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </main>
  );
}
