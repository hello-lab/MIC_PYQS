import { NextRequest, NextResponse } from 'next/server';
import { rejectManuscriptById } from '@/lib/googleSheets';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const manuscriptId = String(body?.manuscriptId ?? '').trim();

    if (!manuscriptId) {
      return NextResponse.json({ error: 'manuscriptId is required.' }, { status: 400 });
    }

    await rejectManuscriptById(manuscriptId);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to reject manuscript.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
