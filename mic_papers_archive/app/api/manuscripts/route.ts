// app/api/manuscripts/route.ts
import { NextResponse } from 'next/server';
import { getManuscriptsFromSheet } from '@/lib/googleSheets';

export const revalidate = 60; // Revalidate every 60 seconds

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const includeRejected = searchParams.get('includeRejected') === '1';

  const data = await getManuscriptsFromSheet({ includeRejected });
  return NextResponse.json(data);
}