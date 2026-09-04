import { NextResponse } from 'next/server';
import { clearSessionCookie } from '@/lib/session';

export async function POST() {
  const cookie = await clearSessionCookie();
  const response = NextResponse.json({ success: true, message: 'Logged out successfully' });
  response.headers.append('Set-Cookie', cookie);
  return response;
}
