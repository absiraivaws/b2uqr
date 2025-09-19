'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";

export default function TransactionsPage() {

    const transactions = [
        { date: '2024-07-30', amount: '150.50 LKR', refNo: 'INV-20249876', status: 'SUCCESS' },
        { date: '2024-07-29', amount: '200.00 LKR', refNo: 'INV-20241234', status: 'FAILED' },
        { date: '2024-07-28', amount: '50.00 LKR', refNo: 'INV-20245678', status: 'PENDING' },
    ];

    const getStatusVariant = (status: string) => {
        switch (status) {
            case 'SUCCESS': return 'default';
            case 'FAILED': return 'destructive';
            case 'PENDING': return 'secondary';
            default: return 'outline';
        }
    }


  return (
    <main className="p-4 sm:p-6 lg:p-8">
      <Card>
        <CardHeader>
            <CardTitle>Transactions History</CardTitle>
            <CardDescription>Search and view your past transactions.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
                <div className="relative w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input placeholder="Search by amount, ref no..." className="pl-10" />
                </div>
                <Input type="date" className="w-[200px]" />
                <Button>Search</Button>
            </div>
            <div className="border rounded-lg">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Reference No</TableHead>
                            <TableHead className="text-right">Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {transactions.map((tx, index) => (
                            <TableRow key={index}>
                                <TableCell>{tx.date}</TableCell>
                                <TableCell>{tx.amount}</TableCell>
                                <TableCell>{tx.refNo}</TableCell>
                                <TableCell className="text-right">
                                    <Badge variant={getStatusVariant(tx.status)}>{tx.status}</Badge>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </CardContent>
      </Card>
    </main>
  );
}
