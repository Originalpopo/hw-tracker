import Papa from 'papaparse';
import Fuse from 'fuse.js';
import { TeacherColumn } from './db';

// ยอมรับชื่อที่คล้ายกันได้ในระดับนี้ (0 = ต้องตรงทุกตัวอักษร, 1 = อะไรก็ได้)
// 0.4 ครอบคลุมพิมพ์ผิด/สลับตัวอักษร 1-2 ตัว แต่ยังกันชื่อคนอื่นในห้องไม่ให้จับคู่ผิด
const STUDENT_NAME_FUZZY_THRESHOLD = 0.4;

// --- สัญญารูปแบบชีทของครู (fixed layout) ---
// แถวที่ 1 (index 0): A1 = ชื่อวิชา, C1 เป็นต้นไป = ชื่อภาระงานแต่ละชิ้น (เพิ่มขึ้นเรื่อยๆ ไปทางขวา)
// แถวที่ 2 (index 1): หัวตาราง (เลขที่ / ชื่อ-สกุล นักเรียน) - ไม่ใช้ประมวลผล ข้ามเสมอ
// แถวที่ 3 (index 2) เป็นต้นไป: A = เลขที่, B = ชื่อ-สกุลนักเรียน, C เป็นต้นไป = TRUE/FALSE ของแต่ละภาระงาน
const TASK_ROW_INDEX = 0;
const STUDENT_START_ROW = 2;
const TASK_NAME_START_COL = 2;

export interface StudentRowMatch {
  row: string[] | null;
  matchedName: string | null;
  matchedRoll: string | null;
  isFuzzy: boolean;
  /** เลขที่ที่ครูลงไว้ตรงกับที่ตั้งค่าไว้หรือไม่ (undefined = ไม่ได้ตั้งเลขที่ไว้ให้ตรวจสอบ) */
  rollMismatch?: boolean;
}

function isValidRollNumber(val: string | undefined): boolean {
  return !!val && /^\d+$/.test(val.trim());
}

/**
 * หาแถวสุดท้ายของ "รายชื่อนักเรียนจริง" (exclusive end index) โดยไล่จากแถวที่ 3 (index 2)
 * ลงไปเรื่อยๆ แล้วหยุดทันทีที่คอลัมน์ A ไม่ใช่เลขที่ (ตัวเลขล้วน) อีกต่อไป
 * เพื่อกันไม่ให้ข้อมูลอื่นที่ครูอาจแปะไว้ใต้ตาราง (สรุปผล, checkbox อื่น, หมายเหตุ ฯลฯ)
 * หลุดเข้ามาปนกับข้อมูลนักเรียนโดยไม่ตั้งใจ
 */
function getRosterEndRow(csvData: string[][]): number {
  let end = STUDENT_START_ROW;
  for (let i = STUDENT_START_ROW; i < csvData.length; i++) {
    const row = csvData[i];
    if (!row || !isValidRollNumber(row[0])) break;
    end = i + 1;
  }
  return end;
}

/**
 * หาแถวของนักเรียนในชีท: เทียบ "เลขที่" ก่อน (แม่นยำสุดเพราะเป็นตัวเลข พิมพ์ผิดยาก)
 * ถ้าไม่ได้ตั้งเลขที่ไว้ หรือหาด้วยเลขที่ไม่เจอ จะเทียบชื่อแบบตรงทุกตัวอักษร
 * และถ้ายังไม่เจอ จะลองจับคู่ชื่อแบบผ่อนปรน (fuzzy) เผื่อครูพิมพ์ชื่อนักเรียนผิดเล็กน้อย
 * ค้นหาเฉพาะในช่วงแถวรายชื่อจริง (ไม่ไล่เกินแถวสุดท้ายที่มีเลขที่ต่อเนื่อง)
 */
function findStudentRow(csvData: string[][], studentName: string, rollNumber?: string): StudentRowMatch {
  const rosterEnd = getRosterEndRow(csvData);
  const candidates: { name: string; roll: string; row: string[] }[] = [];
  for (let i = STUDENT_START_ROW; i < rosterEnd; i++) {
    const row = csvData[i];
    if (!row) continue;
    const name = row[1]?.trim();
    if (!name || name.length <= 2 || name.includes('หมายเหตุ')) continue;
    candidates.push({ name, roll: row[0]?.trim() || '', row });
  }

  // 1. จับคู่ด้วยเลขที่ก่อน (ถ้าตั้งค่าไว้) - เชื่อถือได้มากกว่าชื่อ เพราะเป็นตัวเลขล้วน
  if (rollNumber && rollNumber.trim()) {
    const byRoll = candidates.find(c => c.roll === rollNumber.trim());
    if (byRoll) {
      return {
        row: byRoll.row,
        matchedName: byRoll.name,
        matchedRoll: byRoll.roll,
        isFuzzy: byRoll.name !== studentName,
        rollMismatch: false,
      };
    }
  }

  // 2. จับคู่ชื่อแบบตรงทุกตัวอักษร
  const exact = candidates.find(c => c.name === studentName);
  if (exact) {
    return {
      row: exact.row,
      matchedName: exact.name,
      matchedRoll: exact.roll,
      isFuzzy: false,
      rollMismatch: rollNumber ? rollNumber.trim() !== exact.roll : undefined,
    };
  }

  // 3. จับคู่ชื่อแบบผ่อนปรน (fuzzy) - เผื่อครูพิมพ์ชื่อผิดเล็กน้อย
  if (candidates.length > 0) {
    const fuse = new Fuse(candidates, { keys: ['name'], includeScore: true, threshold: STUDENT_NAME_FUZZY_THRESHOLD });
    const result = fuse.search(studentName);
    if (result.length > 0) {
      const item = result[0].item;
      return {
        row: item.row,
        matchedName: item.name,
        matchedRoll: item.roll,
        isFuzzy: true,
        rollMismatch: rollNumber ? rollNumber.trim() !== item.roll : undefined,
      };
    }
  }

  return { row: null, matchedName: null, matchedRoll: null, isFuzzy: false };
}

/**
 * ตัวระบุ "แท็บ" ของ Google Sheet ที่คงที่เสมอ ไม่ขึ้นกับชื่อวิชา/ชื่อ Tab ที่ครูแก้ไขได้
 * (gid ของแท็บไม่เปลี่ยนแม้ครูจะเปลี่ยนชื่อวิชาหรือชื่อ Tab ภายหลัง) ใช้เป็นกุญแจหลักในการทำ id
 * ของ TeacherColumn แทนชื่อวิชา เพื่อไม่ให้สถานะ/ประวัติงานที่บันทึกไว้หลุดเมื่อครูเปลี่ยนชื่อ
 */
export function getSheetKey(sheetUrl: string): string {
  const gidMatch = sheetUrl.match(/gid=([0-9]+)/);
  if (gidMatch) return `gid${gidMatch[1]}`;
  const idMatch = sheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
  return idMatch ? idMatch[1] : sheetUrl.replace(/[^a-zA-Z0-9]/g, '').slice(-40);
}

export async function fetchGoogleSheetData(sheetUrl: string) {
  // แปลง URL ให้เป็นรูปแบบ CSV Export อัตโนมัติ
  const match = sheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
  const gidMatch = sheetUrl.match(/gid=([0-9]+)/);

  if (!match) {
    throw new Error('ลิงก์ไม่ใช่รูปแบบ Google Sheet ที่ถูกต้อง (หา Sheet ID ในลิงก์ไม่เจอ)');
  }

  let exportUrl = `https://docs.google.com/spreadsheets/d/${match[1]}/export?format=csv`;
  if (gidMatch) {
    exportUrl += `&gid=${gidMatch[1]}`;
  }

  const response = await fetch(exportUrl, { cache: 'no-store' });
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error('ไม่มีสิทธิ์เข้าถึงชีทนี้ - ตรวจสอบว่าตั้งค่าแชร์เป็น "ทุกคนที่มีลิงก์" (Anyone with the link) แล้ว');
    }
    throw new Error(`ดึงข้อมูลชีทไม่สำเร็จ (HTTP ${response.status})`);
  }

  // Extract sheet name from Content-Disposition header
  // e.g. attachment; filename="DocName-TabName.csv"; filename*=UTF-8''DocName%20-%20TabName.csv
  let sheetName = "ทั่วไป";
  const contentDisposition = response.headers.get('content-disposition');
  if (contentDisposition) {
    const filenameStarMatch = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
    let filename = "";
    if (filenameStarMatch) {
      filename = decodeURIComponent(filenameStarMatch[1]);
    } else {
      const filenameMatch = contentDisposition.match(/filename="([^"]+)"/i);
      if (filenameMatch) {
        filename = filenameMatch[1];
      }
    }

    if (filename) {
      // Remove .csv extension
      filename = filename.replace(/\.csv$/i, '');
      // The format is usually "Document Name - Tab Name"
      // We split by " - " and take the last part as the tab name
      const parts = filename.split(' - ');
      if (parts.length > 1) {
        // If the document name itself has " - ", we just take the last part as the tab name
        sheetName = parts[parts.length - 1].trim();
      } else {
        sheetName = filename.trim();
      }
    }
  }

  console.log('[SYNC DEBUG] exportUrl:', exportUrl);
  console.log('[SYNC DEBUG] contentDisposition:', contentDisposition);
  console.log('[SYNC DEBUG] extracted sheetName:', sheetName);

  const csvText = await response.text();

  return new Promise<{ data: string[][]; sheetName: string }>((resolve, reject) => {
    Papa.parse(csvText, {
      complete: (results) => {
        resolve({ data: results.data as string[][], sheetName });
      },
      error: (error: any) => {
        reject(new Error('แปลงข้อมูล CSV ไม่สำเร็จ: ' + (error?.message || error)));
      }
    });
  });
}

export interface StudentRosterEntry {
  roll: string;
  name: string;
}

/**
 * Extracts the student roster from the CSV data, per the fixed sheet layout:
 * row 3 (index 2) onward, column A = เลขที่ (roll number), column B = ชื่อ-สกุล นักเรียน
 */
export function extractStudentNames(csvData: string[][]): StudentRosterEntry[] {
  if (!csvData || csvData.length <= STUDENT_START_ROW) return [];

  const rosterEnd = getRosterEndRow(csvData);
  const roster: StudentRosterEntry[] = [];
  for (let i = STUDENT_START_ROW; i < rosterEnd; i++) {
    const row = csvData[i];
    if (!row) continue;

    const name = row[1]?.trim();
    // ตรวจสอบว่ามีชื่อ และความยาวเหมาะสม ไม่ใช่แถวหมายเหตุ
    if (name && name.length > 2 && !name.includes('หมายเหตุ')) {
      roster.push({ roll: row[0]?.trim() || '', name });
    }
  }
  return roster;
}

/**
 * Extracts teacher columns and their status for a specific student
 */
export type ExtractReason = 'ok' | 'no_roster' | 'no_task_header' | 'student_not_found';

export function extractTeacherTasksForStudent(
  csvData: string[][],
  studentName: string,
  sheetName: string = "ทั่วไป",
  rollNumber?: string,
  // ตัวระบุชีทที่ "คงที่" ไม่ขึ้นกับชื่อวิชา (เช่น gid ของ Tab) - ใช้ทำ id แทนชื่อวิชา
  // เพื่อไม่ให้ข้อมูล/สถานะที่บันทึกไว้ "หลุด" เวลาครูเปลี่ยนชื่อวิชาหรือชื่อ Tab ภายหลัง
  sheetKey: string = sheetName
): { tasks: TeacherColumn[]; match: StudentRowMatch; reason: ExtractReason } {
  const emptyMatch: StudentRowMatch = { row: null, matchedName: null, matchedRoll: null, isFuzzy: false };
  if (!csvData || csvData.length <= STUDENT_START_ROW) return { tasks: [], match: emptyMatch, reason: 'no_roster' };

  const rosterEnd = getRosterEndRow(csvData);
  if (rosterEnd <= STUDENT_START_ROW) return { tasks: [], match: emptyMatch, reason: 'no_roster' };

  const taskRow = csvData[TASK_ROW_INDEX];

  // ไม่มีคอลัมน์ภาระงานเลย (แถว 1 มีแค่ A1/B1 ไม่มีอะไรตั้งแต่ C1 เป็นต้นไป) -
  // คนละกรณีกับ "หาชื่อนักเรียนไม่เจอ": ชื่อนักเรียนอาจมีอยู่แล้ว แค่ครูยังไม่ได้ลงงาน
  if (!taskRow || taskRow.length <= TASK_NAME_START_COL) {
    return { tasks: [], match: emptyMatch, reason: 'no_task_header' };
  }

  // Find the student's row (roll number first, then exact name, then fuzzy name fallback)
  const match = findStudentRow(csvData, studentName, rollNumber);
  const studentRow = match.row;

  if (!studentRow) return { tasks: [], match, reason: 'student_not_found' };

  const tasks: TeacherColumn[] = [];
  const now = new Date();

  // วิชาหลักถูกกำหนดจากภายนอก (A1 ถ้าไม่ซ้ำกับชีทอื่น ไม่งั้นใช้ชื่อ Tab)
  const mainSubject = sheetName;

  // Iterate through columns starting from column C (index 2)
  for (let col = TASK_NAME_START_COL; col < taskRow.length; col++) {
    const taskNameRaw = taskRow[col]?.trim();
    if (!taskNameRaw) continue;

    // ตรวจสอบว่ามีนักเรียนอย่างน้อย 1 คนที่ได้ติ๊กถูก (TRUE) ในคอลัมน์นี้หรือไม่
    // ถ้าไม่มีเลย แสดงว่าครูยังไม่สั่งงานนี้ (นี่คือความตั้งใจ ไม่ใช่บั๊ก)
    let hasAnyTrue = false;
    for (let r = STUDENT_START_ROW; r < rosterEnd; r++) {
      const row = csvData[r];
      if (!row) continue;

      const rowName = row[1]?.trim();
      // ข้ามแถวที่ไม่ใช่ชื่อนักเรียน เช่น แถวหมายเหตุ หรือแถวว่าง
      if (!rowName || rowName.length <= 2 || rowName.includes('หมายเหตุ')) {
        continue;
      }

      if (row[col]?.trim().toUpperCase() === 'TRUE') {
        hasAnyTrue = true;
        break;
      }
    }

    if (!hasAnyTrue) continue;

    const subject = mainSubject;
    const columnName = taskNameRaw;

    const isCheckedText = studentRow[col]?.trim().toUpperCase();
    const isChecked = isCheckedText === 'TRUE';

    // Generate a STABLE ID: keyed by (นักเรียน, gid ของ Tab, ตำแหน่งคอลัมน์) เท่านั้น
    // ไม่ผูกกับชื่อวิชา/ชื่องาน เพราะสองอย่างนี้ครูแก้ไขได้ทีหลัง - ถ้าเอาไปรวมใน id
    // แล้วครูเปลี่ยนชื่อ จะทำให้ id เปลี่ยนตาม ระบบมองว่าเป็นงานใหม่ทันที (สถานะ/ประวัติเดิมหลุด)
    // Remove characters that might be invalid in Firestore document IDs
    const safeSheetKey = sheetKey.replace(/[\/\\]/g, '-');
    const safeStudentName = studentName.replace(/[\/\\]/g, '-');
    const id = `${safeStudentName}_${safeSheetKey}_col${col}`.replace(/\s+/g, '_').substring(0, 150);

    tasks.push({
      id,
      subject,
      column_name: columnName,
      is_checked: isChecked,
      student_name: studentName,
      last_synced: now,
      sequence: col - 1,
    });
  }

  return { tasks, match, reason: 'ok' };
}
