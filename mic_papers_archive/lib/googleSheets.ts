import { google } from 'googleapis';

export interface Manuscript {
  id: string;
  filename: string;
  courseCode: string;
  courseTitle: string;
  examType: string;
  academicYear: string;
  slot: string;
  downloadUrl: string;
  division: string;
  semester: string;
  term: string;
  source: string;
  status: 'VERIFIED' | 'MISSING KEY' | 'PENDING AUDIT' | 'REJECTED';
  sheetRowNumber: number;
}

type ManuscriptFetchOptions = {
  includeRejected?: boolean;
};

function getSchoolFromCourseCode(courseCode: string): string {
  const prefix = courseCode.substring(0, 3).toUpperCase();

  const SCHOOL_MAP: Record<string, string> = {
    BCS: 'SCOPE (Computer Science)',
    CSE: 'SCOPE (Computer Science)',
    SWE: 'SCOPE (Software Eng)',
    BMA: 'SAS (Mathematics)',
    MAT: 'SAS (Mathematics)',
    BPH: 'SAS (Physics)',
    PHY: 'SAS (Physics)',
    BCH: 'SAS (Chemistry)',
    CHY: 'SAS (Chemistry)',
    BEC: 'SENSE (Electronics)',
    ECE: 'SENSE (Electronics)',
    EEE: 'SELECT (Electrical)',
    BME: 'SMEC (Mechanical)',
    MEE: 'SMEC (Mechanical)',
    HUM: 'SSL (Humanities)',
    MGT: 'VITBS (Management)',
    ARE: 'SENSE (Automation & Robotics)',
  };

  return SCHOOL_MAP[prefix] || `${prefix} Department`;
}

function getPrivateKey(): string {
  const rawPrivateKey = process.env.GOOGLE_PRIVATE_KEY || '';
  return rawPrivateKey.replace(/^["']|["']$/g, '').replace(/\\n/g, '\n');
}

function getSheetClient(readonly = true) {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: getPrivateKey(),
    },
    scopes: [
      readonly
        ? 'https://www.googleapis.com/auth/spreadsheets.readonly'
        : 'https://www.googleapis.com/auth/spreadsheets',
    ],
  });

  return google.sheets({ version: 'v4', auth });
}

function normalizeStatus(value: string): Manuscript['status'] {
  const upper = value.trim().toUpperCase();
  if (upper === 'REJECTED' || upper === 'MISSING KEY' || upper === 'PENDING AUDIT') {
    return upper;
  }

  return 'VERIFIED';
}

export async function getManuscriptsFromSheet(
  options: ManuscriptFetchOptions = {}
): Promise<Manuscript[]> {
  const { includeRejected = false } = options;

  try {
    const sheets = getSheetClient(true);
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: 'Sheet1!A2:I',
    });

    const rows = response.data.values || [];
    const manuscripts: Manuscript[] = rows.map((row, idx) => {
      const id = String(row[0] ?? `REF-${idx + 1}`).trim();
      const filename = String(row[1] ?? 'Untitled.pdf').trim();
      const courseCode = String(row[2] ?? 'N/A').trim().toUpperCase();
      const examType = String(row[3] ?? 'N/A').trim().toUpperCase();
      const academicYear = String(row[4] ?? 'N/A').trim();
      const slot = String(row[5] ?? 'N/A').trim().toUpperCase();
      const downloadUrl = String(row[6] ?? '#').trim();
      const source = String(row[7] ?? 'Vhelp').trim() || 'Vhelp';
      const status = normalizeStatus(String(row[8] ?? 'VERIFIED'));

      return {
        id,
        filename,
        courseCode,
        courseTitle: `${courseCode} Paper (${examType})`,
        examType,
        academicYear,
        slot,
        downloadUrl,
        division: getSchoolFromCourseCode(courseCode),
        semester: `AY ${academicYear}`,
        term: examType,
        source,
        status,
        sheetRowNumber: idx + 2,
      };
    });

    if (includeRejected) {
      return manuscripts;
    }

    return manuscripts.filter((item) => item.status !== 'REJECTED');
  } catch (error) {
    console.error('Error fetching Google Sheets data:', error);
    return [];
  }
}

export async function rejectManuscriptById(manuscriptId: string): Promise<void> {
  await updateManuscriptStatusById(manuscriptId, 'REJECTED');
}

export async function unrejectManuscriptById(manuscriptId: string): Promise<void> {
  await updateManuscriptStatusById(manuscriptId, 'VERIFIED');
}

async function updateManuscriptStatusById(
  manuscriptId: string,
  nextStatus: Manuscript['status']
): Promise<void> {
  const trimmedId = manuscriptId.trim();
  if (!trimmedId) {
    throw new Error('Manuscript ID is required.');
  }

  const sheets = getSheetClient(false);

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: 'Sheet1!A2:A',
  });

  const ids = response.data.values || [];
  const rowIndex = ids.findIndex((row) => String(row[0] ?? '').trim() === trimmedId);

  if (rowIndex < 0) {
    throw new Error(`Manuscript with ID ${trimmedId} not found.`);
  }

  const sheetRowNumber = rowIndex + 2;
  await sheets.spreadsheets.values.update({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `Sheet1!I${sheetRowNumber}:I${sheetRowNumber}`,
    valueInputOption: 'RAW',
    requestBody: {
      values: [[nextStatus]],
    },
  });
}
