'use client';

import { useState, type ChangeEvent, type FormEvent } from 'react';
import Link from 'next/link';

type UploadMode = 'pdf' | 'photos';

type PhotoItem = {
  file: File;
  previewDataUrl: string;
  rotation: number;
};

export default function IntakePage() {
  const [uploadMode, setUploadMode] = useState<UploadMode>('pdf');
  const [file, setFile] = useState<File | null>(null);
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [courseCode, setCourseCode] = useState('');
  const [examType, setExamType] = useState('CAT 1');
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [slot, setSlot] = useState('A1');

  const [statusState, setStatusState] = useState<
    'IDLE' | 'CLIENT_OCR' | 'COMPILING_PHOTOS' | 'UPLOADING' | 'SUCCESS' | 'ERROR'
  >('IDLE');
  const [errorMessage, setErrorMessage] = useState('');
  const [successData, setSuccessData] = useState<{ filename: string; drivePreviewUrl: string } | null>(
    null
  );

  const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('Failed to load image for PDF conversion.'));
      image.src = src;
    });
  };

  const readFileAsDataUrl = (nextFile: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result !== 'string') {
          reject(new Error('Failed to prepare image preview.'));
          return;
        }

        resolve(reader.result);
      };
      reader.onerror = () => reject(new Error(`Failed to read ${nextFile.name}.`));
      reader.readAsDataURL(nextFile);
    });
  };

  const buildFilename = () => {
    const formattedExamType = examType.trim().toUpperCase().replace(/\s+/g, '_');
    return `${courseCode.trim().toUpperCase()}_${formattedExamType}_${academicYear.trim()}_Slot_${slot
      .trim()
      .toUpperCase()}.pdf`;
  };

  const convertPhotosToPdf = async (): Promise<File> => {
    const { jsPDF } = await import('jspdf');

    let pdfDoc: InstanceType<typeof jsPDF> | null = null;

    for (let index = 0; index < photos.length; index += 1) {
      const photo = photos[index];
      const rotation = ((photo.rotation % 360) + 360) % 360;
      const sourceImage = await loadImage(photo.previewDataUrl);

      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) {
        throw new Error('Unable to initialize image editor canvas.');
      }

      if (rotation === 90 || rotation === 270) {
        canvas.width = sourceImage.height;
        canvas.height = sourceImage.width;
      } else {
        canvas.width = sourceImage.width;
        canvas.height = sourceImage.height;
      }

      context.translate(canvas.width / 2, canvas.height / 2);
      context.rotate((rotation * Math.PI) / 180);
      context.drawImage(sourceImage, -sourceImage.width / 2, -sourceImage.height / 2);

      const dataUrl = canvas.toDataURL('image/jpeg', 0.95);

      const orientation = canvas.width > canvas.height ? 'landscape' : 'portrait';

      if (!pdfDoc) {
        pdfDoc = new jsPDF({
          orientation,
          unit: 'pt',
          format: [canvas.width, canvas.height],
        });
      } else {
        pdfDoc.addPage([canvas.width, canvas.height], orientation);
      }

      pdfDoc.addImage(dataUrl, 'JPEG', 0, 0, canvas.width, canvas.height);
    }

    if (!pdfDoc) {
      throw new Error('No photos selected.');
    }

    const outputBlob = pdfDoc.output('blob');

    console.log('Compiled PDF Blob:', outputBlob);
    return new File([outputBlob], buildFilename(), { type: 'application/pdf' });
  };

  const extractPdfTextClientSide = async (pdfFile: File): Promise<string> => {
    const pdfjsLib = await import('pdfjs-dist');
    const Tesseract = await import('tesseract.js');

    pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

    const arrayBuffer = await pdfFile.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const extractedPages: string[] = [];

    for (let i = 1; i <= pdf.numPages; i += 1) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const digitalText = textContent.items
        .map((item: unknown) => (typeof item === 'object' && item !== null && 'str' in item ? String(item.str) : ''))
        .join(' ')
        .trim();

      if (digitalText) {
        extractedPages.push(digitalText);
        continue;
      }

      const viewport = page.getViewport({ scale: 2 });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');

      if (!context) {
        continue;
      }

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await page.render({
        canvas,
        canvasContext: context,
        viewport,
      }).promise;

      const ocrResult = await Tesseract.recognize(canvas, 'eng');
      extractedPages.push(ocrResult.data?.text ?? '');
    }

    return extractedPages.join(' ').toUpperCase();
  };

  const normalizeMatchText = (value: string) => value.toUpperCase().replace(/[^A-Z0-9]/g, '');

  const rotatePhoto = (index: number) => {
    setPhotos((current) =>
      current.map((photo, photoIndex) => {
        if (photoIndex !== index) {
          return photo;
        }

        return {
          ...photo,
          rotation: (photo.rotation + 90) % 360,
        };
      })
    );
  };

  const clearPhotos = () => {
    setPhotos([]);
  };

  const handleModeSwitch = (nextMode: UploadMode) => {
    setUploadMode(nextMode);
    setErrorMessage('');
    setStatusState('IDLE');

    if (nextMode === 'pdf') {
      clearPhotos();
      return;
    }

    setFile(null);
  };

  const removePhoto = (indexToRemove: number) => {
    setPhotos((current) => current.filter((_, index) => index !== indexToRemove));
  };

  const handlePhotoChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';

    if (!files.length) {
      return;
    }

    try {
      const mappedPhotos = await Promise.all(
        files.map(async (nextFile) => ({
          file: nextFile,
          previewDataUrl: await readFileAsDataUrl(nextFile),
          rotation: 0,
        }))
      );

      setPhotos((current) => [...current, ...mappedPhotos]);
      setErrorMessage('');
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to prepare selected photos.');
    }
  };

  const verifyPdfAgainstForm = async (pdfFile: File) => {
    const pdfText = await extractPdfTextClientSide(pdfFile);
    console.log('Extracted PDF Text:', pdfText);

    const cleanCourse = normalizeMatchText(courseCode);
    const cleanExamType = normalizeMatchText(examType);
    const cleanPdfText = normalizeMatchText(pdfText);

    const courseMatch = cleanPdfText.includes(cleanCourse);
    const examMatch =
      cleanPdfText.includes(cleanExamType) ||
      cleanPdfText.includes(normalizeMatchText(examType.replace(' ', '')));

  
    if (!(courseMatch && examMatch)) {
      throw new Error(
        `Client OCR Verification Failed! The PDF content does not match your form input. Missing match for: ${
          !courseMatch ? `Course Code (${courseCode})` : ''
        } ${!examMatch ? `Exam Term (${examType})` : ''}.`
      );
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (uploadMode === 'pdf' && !file) {
      setErrorMessage('Please attach a manuscript PDF file.');
      return;
    }

    if (uploadMode === 'photos' && photos.length === 0) {
      setErrorMessage('Please upload one or more photos.');
      return;
    }

    setErrorMessage('');

    try {
      let finalPdfFile: File;

      if (uploadMode === 'pdf') {
        setStatusState('CLIENT_OCR');
        await verifyPdfAgainstForm(file as File);
        finalPdfFile = file as File;
      } else {
        setStatusState('COMPILING_PHOTOS');

        let file1: File;
        file1 = await convertPhotosToPdf();
        console.log('Compiled PDF from Photos:', file1);
        
          await verifyPdfAgainstForm(file1 as File);
        finalPdfFile = file1;
        
      }

      setStatusState('UPLOADING');

      const formData = new FormData();
      formData.append('file', finalPdfFile);
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
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred during intake.';
      setErrorMessage(message);
      setStatusState('ERROR');
    }
  };

  return (
    <div className="max-w-[900px] mx-auto space-y-8">
      <div className="bg-vellum border-4 border-black p-6 shadow-[8px_8px_0_#000] flex justify-between items-center">
        <div>
          <span className="px-2 py-1 bg-wax text-vellum text-[8px] font-pixel uppercase">
            NEW INTAKE CHAMBER
          </span>
          <h1 className="font-pixel text-lg text-mahog mt-2">DEPOSIT NEW MANUSCRIPT</h1>
          <p className="text-xs text-iron/70 mt-1">
            Upload as PDF or photos. Photo uploads are auto-compiled into PDF before deposit.
          </p>
        </div>
        <Link
          href="/"
          className="px-4 py-2 block lg:hidden bg-gold text-mahog font-pixel text-[9px] border-2 border-black pixel-btn shrink-0"
        >
          « VAULT
        </Link>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-vellum border-4 border-black shadow-[8px_8px_0_#000] p-8 space-y-6"
      >
        <div className="border-b-2 border-black/20 pb-4 space-y-4">
          <h2 className="font-pixel text-xs text-gold uppercase tracking-widest">
            MANUSCRIPT METADATA FORM
          </h2>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => handleModeSwitch('pdf')}
              className={`px-4 py-2 border-2 border-black font-pixel text-[9px] ${
                uploadMode === 'pdf' ? 'bg-gold text-mahog' : 'bg-[#ebe0d4] text-iron'
              }`}
            >
              Upload as PDF
            </button>
            <button
              type="button"
              onClick={() => handleModeSwitch('photos')}
              className={`px-4 py-2 border-2 border-black font-pixel text-[9px] ${
                uploadMode === 'photos' ? 'bg-gold text-mahog' : 'bg-[#ebe0d4] text-iron'
              }`}
            >
              Upload as Photos
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block font-pixel text-[9px] text-mahog mb-2 uppercase">Course Code *</label>
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
            <label className="block font-pixel text-[9px] text-mahog mb-2 uppercase">Exam Term *</label>
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
            <label className="block font-pixel text-[9px] text-mahog mb-2 uppercase">Slot Code *</label>
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

        {uploadMode === 'pdf' ? (
          <div className="pt-2">
            <label className="block font-pixel text-[9px] text-mahog mb-2 uppercase">Scroll PDF File *</label>
            <div className="border-4 border-dashed border-black/30 bg-[#ebe0d4] p-6 text-center hover:bg-gold/10 transition-colors relative cursor-pointer">
              <input
                type="file"
                accept=".pdf"
                required={uploadMode === 'pdf'}
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="space-y-2">
                <span className="text-3xl">📜</span>
                <p className="text-xs font-bold text-mahog">
                  {file ? file.name : 'Click or Drag PDF ARCHIVE here'}
                </p>
                {file && (
                  <p className="text-[10px] text-iron/60 font-mono">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="pt-2 space-y-4">
            <label className="block font-pixel text-[9px] text-mahog mb-2 uppercase">Paper Photos *</label>
            <div className="border-4 border-dashed border-black/30 bg-[#ebe0d4] p-6 text-center hover:bg-gold/10 transition-colors relative cursor-pointer">
              <input
                type="file"
                accept="image/*"
                multiple
              //  required={uploadMode === 'photos'}
                onChange={handlePhotoChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="space-y-2">
                <span className="text-3xl">📸</span>
                <p className="text-xs font-bold text-mahog">Click to add one or more page photos</p>
                <p className="text-[10px] text-iron/70">
                  Every selection is appended. You can add more pages anytime before upload.
                </p>
              </div>
            </div>

            {photos.length > 0 && (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3 border-2 border-black bg-[#ebe0d4] px-3 py-2">
                  <p className="text-[10px] font-bold text-mahog uppercase">{photos.length} page(s) selected</p>
                  <button
                    type="button"
                    onClick={clearPhotos}
                    className="py-2 px-3 bg-iron text-vellum font-pixel text-[9px] border-2 border-black pixel-btn"
                  >
                    Clear all pages
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {photos.map((photo, index) => (
                    <div key={`${photo.file.name}-${index}`} className="border-2 border-black bg-[#ebe0d4] p-3 space-y-2">
                      <p className="text-[10px] font-bold text-mahog truncate">Page {index + 1}: {photo.file.name}</p>
                      <div className="h-52 bg-vellum border border-black flex items-center justify-center overflow-hidden">
                        <img
                          src={photo.previewDataUrl}
                          alt={`Photo page ${index + 1}`}
                          style={{ transform: `rotate(${photo.rotation}deg)` }}
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => rotatePhoto(index)}
                          className="w-full py-2 bg-gold text-mahog font-pixel text-[9px] border-2 border-black pixel-btn"
                        >
                          Rotate 90°
                        </button>
                        <button
                          type="button"
                          onClick={() => removePhoto(index)}
                          className="w-full py-2 bg-wax text-vellum font-pixel text-[9px] border-2 border-black pixel-btn"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {statusState === 'CLIENT_OCR' && (
          <div className="p-4 bg-gold/20 border-2 border-black font-pixel text-[9px] text-mahog animate-pulse">
            🔍 VERIFYING PDF TEXT LOCALLY IN BROWSER...
          </div>
        )}

        {statusState === 'COMPILING_PHOTOS' && (
          <div className="p-4 bg-gold/20 border-2 border-black font-pixel text-[9px] text-mahog animate-pulse">
            🧩 COMPILING PHOTOS INTO PDF...
          </div>
        )}

        {statusState === 'UPLOADING' && (
          <div className="p-4 bg-gold/20 border-2 border-black font-pixel text-[9px] text-mahog animate-pulse">
            ⚡ DEPOSITING TO ARCHIVE...
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
            <p>
              <strong>Filename:</strong> {successData.filename}
            </p>
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

        <div className="pt-4 border-t-2 border-black/20">
          <button
            type="submit"
            disabled={
              statusState === 'CLIENT_OCR' || statusState === 'COMPILING_PHOTOS' || statusState === 'UPLOADING'
            }
            className="w-full py-4 bg-gold text-mahog font-pixel text-[10px] border-2 border-black pixel-btn disabled:opacity-50"
          >
            {uploadMode === 'photos' ? 'COMPILE + DEPOSIT ARCHIVE' : 'VERIFY OCR & DEPOSIT ARCHIVE'}
          </button>
        </div>
      </form>
    </div>
  );
}
