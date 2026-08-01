// app/api/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const file = formData.get('file') as File | null;
    const courseCode = (formData.get('courseCode') as string || '').trim().toUpperCase();
    const examType = (formData.get('examType') as string || '').trim().toUpperCase();
    const academicYear = (formData.get('academicYear') as string || '').trim();
    const slot = (formData.get('slot') as string || '').trim().toUpperCase();

    if (!file || !courseCode || !examType || !academicYear || !slot) {
      return NextResponse.json(
        { error: 'All fields (file, courseCode, examType, academicYear, slot) are required.' },
        { status: 400 }
      );
    }

    const formattedExamType = examType.replace(/\s+/g, '_');
    const filename = `${courseCode}_${formattedExamType}_${academicYear}_Slot_${slot}.pdf`;

    // Convert PDF file buffer to Base64
    const arrayBuffer = await file.arrayBuffer();
    const base64File = Buffer.from(arrayBuffer).toString('base64');

    // Send payload to Google Apps Script Web App
    const res = await fetch(process.env.GOOGLE_WEB_APP_URL!, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filename,
        courseCode,
        examType,
        academicYear,
        slot,
        fileBase64: base64File,
      }),
    });

    const result = await res.json();

    if (!result.success) {
      throw new Error(result.error || 'Google Apps Script failed to save manuscript.');
    }

    return NextResponse.json({
      success: true,
      message: 'Manuscript saved to Personal Google Drive & Google Sheet!',
      data: {
        filename,
        drivePreviewUrl: result.drivePreviewUrl,
      },
    });
  } catch (error: any) {
    console.error('Upload Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Server error processing manuscript upload.' },
      { status: 500 }
    );
  }
}