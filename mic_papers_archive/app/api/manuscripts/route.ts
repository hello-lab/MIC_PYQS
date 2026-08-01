// app/api/manuscripts/route.ts
import { NextResponse } from 'next/server';
import { getManuscriptsFromSheet } from '@/lib/googleSheets';

export const revalidate = 60; // Revalidate every 60 seconds

export async function GET() {
  const data = await getManuscriptsFromSheet();
  return NextResponse.json(data);
}