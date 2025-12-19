import { NextResponse } from 'next/server';
import { getRevocationMetrics } from '@/lib/metrics';

// Dev-only debug endpoint: returns in-memory metrics when not in production.
export async function GET(req: Request) {
  // Allow local/dev access without authentication. In production this endpoint
  // is forbidden to prevent exposing internal metrics.
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
