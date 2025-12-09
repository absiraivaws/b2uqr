"use client";
import { useState, useMemo } from "react";
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
import type { Transaction } from '@/lib/types';

interface SummaryDashboardProps {
  transactions: Transaction[];
  title?: string;
  description?: string;
  branchOptions?: { id: string; slug?: string; name?: string }[];
  cashierOptions?: { id: string; username?: string; displayName?: string }[];
  selectedBranchId?: string | undefined;
  onBranchChange?: (branchId: string | 'ALL' | undefined) => void;
  selectedCashierId?: string | undefined;
  onCashierChange?: (cashierId: string | 'ALL' | undefined) => void;
  showCashierSelect?: boolean;
  showBranchSelect?: boolean;
}

type ChartData = {
  name: string;
  count: number;
  amount: number;
};

export default function SummaryDashboard({
  transactions,
  title = "Summary",
  description = "View transaction summary and statistics.",
  branchOptions,
  cashierOptions,
  selectedBranchId,
  onBranchChange,
  selectedCashierId,
  onCashierChange,
  showCashierSelect = true,
  showBranchSelect = true,
}: SummaryDashboardProps) {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [chartMode, setChartMode] = useState<"monthly" | "daily">("monthly");
  const [cashierFilter, setCashierFilter] = useState('ALL');
  const [branchFilter, setBranchFilter] = useState('ALL');

  const effectiveBranch = selectedBranchId ?? branchFilter;
  const effectiveCashier = selectedCashierId ?? cashierFilter;

  const filteredTransactions = useMemo(() => {
    return (transactions || []).filter((tx) => {

      // Parse created_at defensively
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

      // Only include successful transactions
      if (tx.status !== 'SUCCESS') return false;

      // Branch filter
      if (effectiveBranch !== 'ALL') {
        if (!tx.branchId || tx.branchId !== effectiveBranch) return false;
      }

      // Cashier filter
      if (effectiveCashier !== 'ALL') {
        if (!tx.cashierId || tx.cashierId !== effectiveCashier) return false;
      }

      return true;
    });
  }, [transactions, startDate, endDate, cashierFilter, branchFilter, selectedBranchId, selectedCashierId]);

  // Group by month/day
  const monthMap: Record<string, { count: number; amount: number }> = {};
  const dayMap: Record<string, { count: number; amount: number }> = {};

  filteredTransactions.forEach((tx) => {
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

  const chartDataMonthly: ChartData[] = Object.keys(monthMap)
    .map((name) => ({ name, ...monthMap[name] }))
    .sort((a, b) => {
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      return months.indexOf(a.name) - months.indexOf(b.name);
    });

  const chartDataDaily: ChartData[] = Object.keys(dayMap)
    .map((name) => ({ name, ...dayMap[name] }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const chartData = chartMode === "monthly" ? chartDataMonthly : chartDataDaily;

  const totalCount = filteredTransactions.length;
  const totalAmount = filteredTransactions.reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);

  const filtersActive = startDate !== '' || endDate !== '' || chartMode !== 'monthly' || effectiveBranch !== 'ALL' || effectiveCashier !== 'ALL';

  const clearFilters = () => {
    setStartDate('');
    setEndDate('');
    setChartMode('monthly');
    setBranchFilter('ALL');
    setCashierFilter('ALL');
    if (onBranchChange) onBranchChange(undefined);
    if (onCashierChange) onCashierChange(undefined);
  };

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
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

            {/* Branch filter appears before cashier filter and renders immediately (optional) */}
            {showBranchSelect && (
            <Select
              value={selectedBranchId ?? branchFilter}
              onValueChange={(val) => {
                if (onBranchChange) onBranchChange(val === 'ALL' ? undefined : val);
                else setBranchFilter(val);
                // clear cashier when branch changes
                if (onCashierChange) onCashierChange(undefined);
                else setCashierFilter('ALL');
              }}
            >
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Branch" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Branches</SelectItem>
                {branchOptions == null ? (
                  <SelectItem value="LOADING" disabled>Loading branches...</SelectItem>
                ) : (
                  branchOptions.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.name || b.slug || b.id}</SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            )}

            {/* Cashier select (can be hidden for individual users) */}
            {showCashierSelect && (
              <Select
                value={selectedCashierId ?? cashierFilter}
                onValueChange={(val) => {
                  if (onCashierChange) onCashierChange(val === 'ALL' ? undefined : val);
                  else setCashierFilter(val);
                }}
              >
                <SelectTrigger className="w-full sm:w-[200px]" disabled={!((selectedBranchId ?? branchFilter) !== 'ALL')}>
                  <SelectValue placeholder={(selectedBranchId ?? branchFilter) === 'ALL' ? 'Select branch first' : 'Cashier'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Cashiers</SelectItem>
                  {cashierOptions == null ? (
                    <SelectItem value="LOADING" disabled>Loading cashiers...</SelectItem>
                  ) : (
                    cashierOptions.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.displayName || c.username || c.id}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            )}
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              onClick={clearFilters}
              disabled={!filtersActive}
            >
              Clear
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
    </div>
  );
}
