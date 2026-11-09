import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ReactNode } from 'react';
import { createHmac } from 'crypto';

const SESSION_COOKIE_NAME = 'mic_admin_session';

function getSessionToken() {
  const secret = process.env.ADMIN_SESSION_SECRET || 'mic-admin-local-secret';
  return createHmac('sha256', secret).update('mic-admin-auth').digest('hex');
}

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  const session = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (session !== getSessionToken() ) {
   // 
   
//redirect('/admin/login');
    //reload();
  }

  return <>{children}</>;
}
