import { handleWebhook } from '@/lib/actions';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const { status, body } = await handleWebhook(request);
        return NextResponse.json(body, { status });
    } catch (error) {
        console.error("Webhook handler failed:", error);
        const message = error instanceof Error ? error.message : "Internal Server Error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
