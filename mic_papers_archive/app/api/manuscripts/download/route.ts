import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { File as MegaFile } from 'megajs';

export const maxDuration = 60;

function isPdf(buf: Buffer): boolean {
  // The %PDF header may be preceded by a little junk, but must be near the start.
  return buf.subarray(0, 1024).includes('%PDF-');
}

function driveFileId(url: URL): string | null {
  if (!url.hostname.endsWith('google.com')) return null;
  const m = url.pathname.match(/\/file\/d\/([^/]+)/);
  return m?.[1] ?? url.searchParams.get('id');
}

async function fetchSourcePdf(url: URL): Promise<Buffer> {
  // Mega links are web pages, not files: download through the Mega API.
  if (url.hostname.endsWith('mega.nz') || url.hostname.endsWith('mega.co.nz')) {
    const file = MegaFile.fromURL(url.toString());
    await file.loadAttributes();
    return Buffer.from(await file.downloadBuffer());
  }

  // Google Drive preview/view links are HTML pages: use the direct download endpoint.
  const id = driveFileId(url);
  const target = id
    ? `https://drive.google.com/uc?export=download&id=${id}`
    : url.toString();

  const res = await fetch(target, { redirect: 'follow' });
  if (!res.ok) throw new Error(`Source returned HTTP ${res.status}.`);
  return Buffer.from(await res.arrayBuffer());
}

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

    let sourceBuffer: Buffer;
    try {
      sourceBuffer = await fetchSourcePdf(parsedUrl);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'unknown error';
      return NextResponse.json({ error: `Failed to fetch source PDF: ${msg}` }, { status: 502 });
    }

    if (!isPdf(sourceBuffer)) {
      return NextResponse.json(
        { error: 'The source link did not return a PDF file.' },
        { status: 502 }
      );
    }

    const sourcePdf = await PDFDocument.load(sourceBuffer, { ignoreEncryption: true });

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
