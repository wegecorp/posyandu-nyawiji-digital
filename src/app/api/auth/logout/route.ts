import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/api-auth';
import { clearSessionCookie } from '@/lib/session';

export async function POST(req: Request) {
  // Naikkan tokenVersion supaya token yang sudah terbit benar-benar mati,
  // bukan sekadar dihapus dari cookie browser.
  try {
    const session = await getAuthSession(req);
    if (session) {
      await prisma.user.update({
        where: { id: session.userId },
        data: { tokenVersion: { increment: 1 } },
      });
    }
  } catch (e) {
    console.error('Logout token revoke failed:', e);
  }

  const cookie = await clearSessionCookie();
  const response = NextResponse.json({ success: true, message: 'Logged out successfully' });
  response.headers.append('Set-Cookie', cookie);
  return response;
}
