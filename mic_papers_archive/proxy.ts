import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { cookies } from 'next/headers';
import { createHmac } from 'crypto';
import { redirect } from 'next/dist/server/api-utils';
import { get } from 'http';
const SESSION_COOKIE_NAME = 'mic_admin_session';

function getSessionToken() {
  const secret = process.env.ADMIN_SESSION_SECRET || 'mic-admin-local-secret';
  return createHmac('sha256', secret).update('mic-admin-auth').digest('hex');
}
// This function can be marked `async` if using `await` inside
export default async function  proxy(request: NextRequest) {
     const cookieStore = await cookies();
      const session = cookieStore.get(SESSION_COOKIE_NAME)?.value;
      const pathname = request.nextUrl.pathname
        if (session != getSessionToken() && pathname != '/admin/login')      
  return NextResponse.redirect(new URL('/admin/login', request.url))
 if (pathname == '/admin/login'&& session == getSessionToken()) {
  return  NextResponse.redirect(new URL('/admin/', request.url));
}
return NextResponse.next();
}

// Alternatively, you can use a default export:
// export default function proxy(request: NextRequest) { ... }

export const config = {
  matcher: '/admin/:path*',
  
}