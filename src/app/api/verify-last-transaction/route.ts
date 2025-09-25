
import { NextResponse } from 'next/server';
import { getLastTransaction } from '@/lib/actions';
import { useSettingsStore } from '@/hooks/use-settings';

export async function GET() {
    try {
        const lastTx = await getLastTransaction();

        if (!lastTx) {
            return NextResponse.json({ error: 'No transaction found' }, { status: 404 });
        }
        
        // This part is tricky because useSettingsStore is a client hook.
        // For an API route, this data would typically be retrieved from a server-side source.
        // We will simulate getting it, but in a real app this would need a different approach.
        // For this demo, we'll assume a fixed value for the account number.
        // In a real app, you might pass the account number with the request or have a server-side config.
        const accountNumber = "123456789012345"; // Placeholder

        const responsePayload = {
            Date: lastTx.created_at,
            AccountNumber: accountNumber,
            amount: lastTx.amount,
            ReferenceNumber: lastTx.reference_number,
        };

        return NextResponse.json(responsePayload, { status: 200 });

    } catch (error) {
        console.error("Failed to get last transaction:", error);
        const message = error instanceof Error ? error.message : "Internal Server Error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
