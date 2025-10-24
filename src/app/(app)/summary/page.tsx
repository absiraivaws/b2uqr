"use client";
import { useState, useEffect } from "react";
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
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";

type Transaction = {
  transaction_uuid: string;
  terminal_id: string;
  amount: number;
  created_at: string;
  // ...other fields...
};

type ChartData = {
  name: string;
  count: number;
  amount: number;
};

export default function SummaryPage() {
  const [terminalId, setTerminalId] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [chartMode, setChartMode] = useState<"monthly" | "daily">("monthly");

  const terminalIdOptions = [
    "all",
    ...Array.from({ length: 10 }, (_, i) =>
      String(i + 1).padStart(4, "0")
    ),
  ];

  async function fetchTransactions() {
    setLoading(true);
    let q = collection(db, "transactions");
    let constraints: any[] = [];
    if (terminalId !== "all") {
      constraints.push(where("terminal_id", "==", terminalId));
    }
    if (startDate) {
      constraints.push(where("created_at", ">=", startDate));
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setDate(end.getDate() + 1);
      constraints.push(where("created_at", "<", end.toISOString().slice(0, 10)));
    }
    // Only show status=SUCCESS
    constraints.push(where("status", "==", "SUCCESS"));
    if (constraints.length > 0) {
      // @ts-ignore
      q = query(q, ...constraints);
    }
    const snap = await getDocs(q);
    setTransactions(snap.docs.map((doc) => doc.data() as Transaction));
    setLoading(false);
  }

  useEffect(() => {
    fetchTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleFilter() {
    fetchTransactions();
  }

  // Group by month for chart
  const monthMap: Record<string, { count: number; amount: number }> = {};
  const dayMap: Record<string, { count: number; amount: number }> = {};

  transactions.forEach((tx) => {
    const date = new Date(tx.created_at);
    // Monthly
    const monthName = date.toLocaleString("default", { month: "short" });
    if (!monthMap[monthName]) monthMap[monthName] = { count: 0, amount: 0 };
    monthMap[monthName].count += 1;
    monthMap[monthName].amount += Number(tx.amount) || 0;
    // Daily
    const dayName = date.toISOString().slice(0, 10); // YYYY-MM-DD
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

  const totalCount = transactions.length;
  const totalAmount = transactions.reduce(
    (sum, tx) => sum + (Number(tx.amount) || 0),
    0
  );

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
            <Button onClick={handleFilter} disabled={loading}>
              {loading ? "Loading..." : "Filter"}
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
