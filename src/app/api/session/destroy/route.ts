import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const cookieOptions = [`session=`, `Max-Age=0`, `HttpOnly`, `Path=/`, `SameSite=Lax`];
    if (process.env.NODE_ENV === 'production') cookieOptions.push('Secure');
    return NextResponse.json({ ok: true }, { headers: { 'Set-Cookie': cookieOptions.join('; ') } });
  } catch (err: any) {
    console.error('session destroy error', err);
    return NextResponse.json({ ok: false, message: err?.message || 'Server error' }, { status: 500 });
  }
}
