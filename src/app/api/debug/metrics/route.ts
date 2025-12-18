import { NextResponse } from 'next/server';
import { getRevocationMetrics } from '@/lib/metrics';

// Dev-only: return in-memory metrics at /api/debug/metrics
export async function GET(req: Request) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  }

  try {
    const metrics = getRevocationMetrics();
    return NextResponse.json({ ok: true, metrics });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
