import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/api-auth';
import { getUserBySession, serializeUser } from '@/lib/user-profile';

// GET /api/auth/me
// Sumber kebenaran sesi di sisi client: validasi cookie terhadap DB.
export async function GET() {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'Sesi tidak valid.' }, { status: 401 });
    }

    const user = await getUserBySession(session.userId);
    if (!user) {
      return NextResponse.json({ error: 'Akun tidak ditemukan.' }, { status: 401 });
    }

    return NextResponse.json({ success: true, user: serializeUser(user) });
  } catch (error) {
    console.error('Error on /api/auth/me:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan pada server' }, { status: 500 });
  }
}
