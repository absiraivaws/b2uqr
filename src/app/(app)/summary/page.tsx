
'use client'
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Bar, Line, ResponsiveContainer } from 'recharts';


const data = [
      { name: 'Jan', count: 400, amount: 2400 },
      { name: 'Feb', count: 300, amount: 1398 },
      { name: 'Mar', count: 200, amount: 9800 },
      { name: 'Apr', count: 278, amount: 3908 },
      { name: 'May', count: 189, amount: 4800 },
      { name: 'Jun', count: 239, amount: 3800 },
      { name: 'Jul', count: 349, amount: 4300 },
];

export default function SummaryPage() {
    const [terminalId, setTerminalId] = useState('all');
  return (
    <main className="p-4 sm:p-6 lg:p-8 space-y-8">
        <Card>
            <CardHeader>
                <CardTitle>Summary</CardTitle>
                <CardDescription>View transaction summary and statistics.</CardDescription>
            </CardHeader>
             <CardContent className="space-y-4">
                <div className="flex flex-wrap items-center gap-4">
                    <Input type="date" className="w-full sm:w-[200px]" />
                    <span className="hidden sm:inline">-</span>
                    <Input type="date" className="w-full sm:w-[200px]" />
                    <div className="w-full sm:w-auto">
                        <Select value={terminalId} onValueChange={setTerminalId}>
                            <SelectTrigger className="w-full sm:w-[180px]">
                                <SelectValue placeholder="Select Terminal" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Terminals</SelectItem>
                                <SelectItem value="0001">0001</SelectItem>
                                <SelectItem value="0002">0002</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <Button>Filter</Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Total Transactions</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-3xl font-bold">1,955</p>
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader>
                            <CardTitle>Total Amount</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-3xl font-bold">LKR 25,504.00</p>
                        </CardContent>
                    </Card>
                </div>
            </CardContent>
        </Card>
        <Card>
            <CardHeader>
                <CardTitle>Transaction Chart</CardTitle>
                <CardDescription>Bar with line chart for transaction count and amount.</CardDescription>
            </Header>
            <CardContent>
                 <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis yAxisId="left" />
                        <YAxis yAxisId="right" orientation="right" />
                        <Tooltip />
                        <Legend />
                        <Bar yAxisId="left" dataKey="count" fill="#8884d8" name="Count"/>
                        <Line yAxisId="right" type="monotone" dataKey="amount" stroke="#82ca9d" name="Amount (LKR)"/>
                    </LineChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    </main>
  );
}
