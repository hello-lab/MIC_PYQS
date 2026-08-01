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
  status: 'VERIFIED' | 'MISSING KEY' | 'PENDING AUDIT';
}

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

export async function getManuscriptsFromSheet(): Promise<Manuscript[]> {
  try {
    const rawPrivateKey = process.env.GOOGLE_PRIVATE_KEY || '';
    const formattedPrivateKey = rawPrivateKey
      .replace(/^["']|["']$/g, '')
      .replace(/\\n/g, '\n');

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: formattedPrivateKey,
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // Range A2:G matches: ID, Filename, Course Code, Exam Type, Academic Year, Slot, Download Link
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: 'Sheet1!A2:G',
    });

    const rows = response.data.values || [];

    return rows.map((row, idx) => {
      const id = String(row[0] ?? `REF-${idx + 1}`).trim();
      const filename = String(row[1] ?? 'Untitled.pdf').trim();
      const courseCode = String(row[2] ?? 'N/A').trim().toUpperCase();
      const examType = String(row[3] ?? 'N/A').trim().toUpperCase();
      const academicYear = String(row[4] ?? 'N/A').trim();
      const slot = String(row[5] ?? 'N/A').trim().toUpperCase();
      const downloadUrl = String(row[6] ?? '#').trim();

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
        status: 'VERIFIED',
      };
    });
  } catch (error) {
    console.error('Error fetching Google Sheets data:', error);
    return [];
  }
}