import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  try {
    const fileUrl = request.nextUrl.searchParams.get('url');
    const fileNameParam = request.nextUrl.searchParams.get('filename');

    if (!fileUrl) {
      return NextResponse.json({ error: 'Missing url query parameter.' }, { status: 400 });
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(fileUrl);
    } catch {
      return NextResponse.json({ error: 'Invalid file URL.' }, { status: 400 });
    }

    if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
      return NextResponse.json({ error: 'Only http/https URLs are supported.' }, { status: 400 });
    }

    const sourceResponse = await fetch(parsedUrl.toString());
    if (!sourceResponse.ok) {
      return NextResponse.json({ error: 'Failed to fetch source PDF.' }, { status: 502 });
    }

    const sourceBuffer = await sourceResponse.arrayBuffer();
    const sourcePdf = await PDFDocument.load(sourceBuffer);

    const footerPage = sourcePdf.addPage();
    const { width, height } = footerPage.getSize();
    const titleFont = await sourcePdf.embedFont(StandardFonts.HelveticaBold);
    const bodyFont = await sourcePdf.embedFont(StandardFonts.Helvetica);

    const title = 'Made with love by MIC';
    const subtitle = 'For more papers, visit our site.';

    const titleSize = 30;
    const subtitleSize = 18;

    const titleWidth = titleFont.widthOfTextAtSize(title, titleSize);
    const subtitleWidth = bodyFont.widthOfTextAtSize(subtitle, subtitleSize);

    footerPage.drawText(title, {
      x: (width - titleWidth) / 2,
      y: height * 0.58,
      size: titleSize,
      font: titleFont,
      color: rgb(0.15, 0.15, 0.15),
    });

    footerPage.drawText(subtitle, {
      x: (width - subtitleWidth) / 2,
      y: height * 0.48,
      size: subtitleSize,
      font: bodyFont,
      color: rgb(0.25, 0.25, 0.25),
    });

    const modifiedPdf = await sourcePdf.save();
    const outputName = (fileNameParam || 'manuscript.pdf').replace(/[^a-zA-Z0-9._-]/g, '_');

    return new NextResponse(Buffer.from(modifiedPdf), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${outputName}"`,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to process download.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
