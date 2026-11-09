import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'MIC2026';
const SESSION_COOKIE_NAME = 'mic_admin_session';

function getSessionToken() {
  const secret = process.env.ADMIN_SESSION_SECRET || 'mic-admin-local-secret';
  return createHmac('sha256', secret).update('mic-admin-auth').digest('hex');
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const password = String(body?.password ?? '');

    if (!password || password !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Invalid password.' }, { status: 401 });
    }

    const response = NextResponse.json({ success: true });
    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: getSessionToken(),
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 8,
    });

    return response;
  } catch {
    return NextResponse.json({ error: 'Unable to process login.' }, { status: 500 });
  }
}
