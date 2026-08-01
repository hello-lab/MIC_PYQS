'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function IntakePage() {
  const [file, setFile] = useState<File | null>(null);
  const [courseCode, setCourseCode] = useState('');
  const [examType, setExamType] = useState('CAT 1');
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [slot, setSlot] = useState('A1');

  const [statusState, setStatusState] = useState<
    'IDLE' | 'CLIENT_OCR' | 'UPLOADING' | 'SUCCESS' | 'ERROR'
  >('IDLE');
  const [errorMessage, setErrorMessage] = useState('');
  const [successData, setSuccessData] = useState<{ filename: string; drivePreviewUrl: string } | null>(
    null
  );

  // Client-side PDF Text Extraction Function
  const extractPdfTextClientSide = async (pdfFile: File): Promise<string> => {
    const pdfjsLib = await import('pdfjs-dist');
    
    // Set CDN worker for pdfjs
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

    const arrayBuffer = await pdfFile.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    let fullText = '';
    // Extract text from all pages
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      fullText += pageText + ' ';
    }

    return fullText.toUpperCase();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setErrorMessage('Please attach a manuscript PDF file.');
      return;
    }

    setErrorMessage('');
    setStatusState('CLIENT_OCR');

    try {
      // 1. PERFORM CLIENT-SIDE TEXT EXTRACTION & VERIFICATION
      const pdfText = await extractPdfTextClientSide(file);

      const cleanCourse = courseCode.replace(/[^A-Z0-9]/g, '');
      const cleanPdfText = pdfText.replace(/[^A-Z0-9]/g, '');

      const courseMatch = cleanPdfText.includes(cleanCourse);
      const examMatch =
        pdfText.includes(examType.toUpperCase()) ||
        pdfText.includes(examType.toUpperCase().replace(' ', ''));

      if (pdfText.length > 30 && (!courseMatch || !examMatch)) {
        throw new Error(
          `Client OCR Verification Failed! The PDF content does not match your form input. Missing match for: ${
            !courseMatch ? `Course Code (${courseCode})` : ''
          } ${!examMatch ? `Exam Term (${examType})` : ''}.`
        );
      }

      // 2. PROCEED TO SERVER UPLOAD (MEGA + Google Sheets)
      setStatusState('UPLOADING');

      const formData = new FormData();
      formData.append('file', file);
      formData.append('courseCode', courseCode);
      formData.append('examType', examType);
      formData.append('academicYear', academicYear);
      formData.append('slot', slot);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || 'Failed to process manuscript deposit.');
      }

      setSuccessData({
        filename: result.data.filename,
        drivePreviewUrl: result.data.drivePreviewUrl,
      });
      setStatusState('SUCCESS');
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred during intake.');
      setStatusState('ERROR');
    }
  };

  return (
    <div className="max-w-[800px] mx-auto space-y-8">
      {/* Header Banner */}
      <div className="bg-vellum border-4 border-black p-6 shadow-[8px_8px_0_#000] flex justify-between items-center">
        <div>
          <span className="px-2 py-1 bg-wax text-vellum text-[8px] font-pixel uppercase">
            NEW INTAKE CHAMBER
          </span>
          <h1 className="font-pixel text-lg text-mahog mt-2">DEPOSIT NEW MANUSCRIPT</h1>
          <p className="text-xs text-iron/70 mt-1">
            Client-side OCR verifies pdf contents locally before uploading to vault.
          </p>
        </div>
        <Link
          href="/"
          className="px-4 py-2 block  lg:hidden bg-gold text-mahog font-pixel text-[9px] border-2 border-black pixel-btn shrink-0"
        >
          « VAULT
        </Link>
      </div>

      {/* Form Section */}
      <form
        onSubmit={handleSubmit}
        className="bg-vellum border-4 border-black shadow-[8px_8px_0_#000] p-8 space-y-6"
      >
        <div className="border-b-2 border-black/20 pb-4">
          <h2 className="font-pixel text-xs text-gold uppercase tracking-widest">
            MANUSCRIPT METADATA FORM
          </h2>
        </div>

        {/* Input Fields Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block font-pixel text-[9px] text-mahog mb-2 uppercase">
              Course Code *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. BCSE202L or BMAT101L"
              value={courseCode}
              onChange={(e) => setCourseCode(e.target.value.toUpperCase())}
              className="w-full bg-[#ebe0d4] border-2 border-black rounded px-4 py-2 text-xs text-ink font-bold focus:outline-none focus:ring-2 focus:ring-gold uppercase"
            />
          </div>

          <div>
            <label className="block font-pixel text-[9px] text-mahog mb-2 uppercase">
              Exam Term *
            </label>
            <select
              value={examType}
              onChange={(e) => setExamType(e.target.value)}
              className="w-full bg-[#ebe0d4] border-2 border-black rounded px-4 py-2 text-xs text-ink font-bold focus:outline-none focus:ring-2 focus:ring-gold"
            >
              <option value="CAT 1">CAT 1</option>
              <option value="CAT 2">CAT 2</option>
              <option value="FAT">FAT Final Exam</option>
              <option value="LAB FAT">Lab FAT</option>
            </select>
          </div>

          <div>
            <label className="block font-pixel text-[9px] text-mahog mb-2 uppercase">
              Academic Era / Year *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. 2025, 2025-26"
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              className="w-full bg-[#ebe0d4] border-2 border-black rounded px-4 py-2 text-xs text-ink font-bold focus:outline-none focus:ring-2 focus:ring-gold"
            />
          </div>

          <div>
            <label className="block font-pixel text-[9px] text-mahog mb-2 uppercase">
              Slot Code *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. A1, B2, E1_1"
              value={slot}
              onChange={(e) => setSlot(e.target.value.toUpperCase())}
              className="w-full bg-[#ebe0d4] border-2 border-black rounded px-4 py-2 text-xs text-ink font-bold focus:outline-none focus:ring-2 focus:ring-gold uppercase"
            />
          </div>
        </div>

        {/* File Attachment Upload Box */}
        <div className="pt-2">
          <label className="block font-pixel text-[9px] text-mahog mb-2 uppercase">
            Scroll PDF File *
          </label>
          <div className="border-4 border-dashed border-black/30 bg-[#ebe0d4] p-6 text-center hover:bg-gold/10 transition-colors relative cursor-pointer">
            <input
              type="file"
              accept=".pdf"
              required
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div className="space-y-2">
              <span className="text-3xl">📜</span>
              <p className="text-xs font-bold text-mahog">
                {file ? file.name : 'Click or Drag PDF ARCHIVE here'}
              </p>
              {file && (
                <p className="text-[10px] text-iron/60 font-mono">
                  {(file.size / (1024 * 1024)).toFixed(2)} MB
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Status Messaging */}
        {statusState === 'CLIENT_OCR' && (
          <div className="p-4 bg-gold/20 border-2 border-black font-pixel text-[9px] text-mahog animate-pulse">
            🔍 VERIFYING PDF TEXT LOCALLY IN BROWSER...
          </div>
        )}

        {statusState === 'UPLOADING' && (
          <div className="p-4 bg-gold/20 border-2 border-black font-pixel text-[9px] text-mahog animate-pulse">
            ⚡ OCR PASSED! DEPOSITING TO ARCHIVE 
          </div>
        )}

        {errorMessage && (
          <div className="p-4 bg-wax/20 border-2 border-wax text-wax font-mono text-xs font-bold space-y-1">
            <p className="font-pixel text-[9px] uppercase">❌ INTAKE REJECTED:</p>
            <p>{errorMessage}</p>
          </div>
        )}

        {statusState === 'SUCCESS' && successData && (
          <div className="p-4 bg-emerald/20 border-2 border-emerald text-emerald font-mono text-xs space-y-2">
            <p className="font-pixel text-[9px] uppercase">✨ MANUSCRIPT PRESERVED!</p>
            <p><strong>Filename:</strong> {successData.filename}</p>
            <p className="break-all">
              <strong>ARCHIVE URL:</strong>{' '}
              <a
                href={successData.drivePreviewUrl}
                target="_blank"
                rel="noreferrer"
                className="underline font-bold"
              >
                {successData.drivePreviewUrl}
              </a>
            </p>
          </div>
        )}

        {/* Submit Button */}
        <div className="pt-4 border-t-2 border-black/20">
          <button
            type="submit"
            disabled={statusState === 'CLIENT_OCR' || statusState === 'UPLOADING'}
            className="w-full py-4 bg-gold text-mahog font-pixel text-[10px] border-2 border-black pixel-btn disabled:opacity-50"
          >
            VERIFY OCR & DEPOSIT ARCHOVE
          </button>
        </div>
      </form>
    </div>
  );
}