
import { getAllDbTransactions } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const terminalId = searchParams.get('terminalId');
        const startDate = searchParams.get('startDate'); // YYYY-MM-DD
        const endDate = searchParams.get('endDate'); // YYYY-MM-DD
        
        let transactions = await getAllDbTransactions();

        if (terminalId) {
            transactions = transactions.filter(tx => (tx.bankResponse?.terminal_id ?? tx.terminal_id) === terminalId);
        }

        if (startDate) {
            transactions = transactions.filter(tx => new Date(tx.created_at) >= new Date(startDate));
        }

        if (endDate) {
            const endOfDay = new Date(endDate);
            endOfDay.setHours(23, 59, 59, 999);
            transactions = transactions.filter(tx => new Date(tx.created_at) <= endOfDay);
        }

        return NextResponse.json(transactions, { status: 200 });

    } catch (error) {
        console.error("Failed to get transactions:", error);
        const message = error instanceof Error ? error.message : "Internal Server Error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
