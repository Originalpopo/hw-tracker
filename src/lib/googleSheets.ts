import Papa from 'papaparse';
import { TeacherColumn } from './db';

export async function fetchGoogleSheetData(sheetUrl: string) {
  try {
    // แปลง URL ให้เป็นรูปแบบ CSV Export อัตโนมัติ
    let exportUrl = sheetUrl;
    const match = sheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
    const gidMatch = sheetUrl.match(/gid=([0-9]+)/);
    
    if (match) {
      exportUrl = `https://docs.google.com/spreadsheets/d/${match[1]}/export?format=csv`;
      if (gidMatch) {
        exportUrl += `&gid=${gidMatch[1]}`;
      }
    }

    const response = await fetch(exportUrl, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error('Failed to fetch Google Sheet CSV');
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

    return new Promise((resolve, reject) => {
      Papa.parse(csvText, {
        complete: (results) => {
          resolve({ data: results.data as string[][], sheetName });
        },
        error: (error: any) => {
          reject(error);
        }
      });
    });
  } catch (error) {
    console.error('Error fetching google sheet:', error);
    return null;
  }
}

/**
 * Extracts unique student names from the CSV data
 * The student names start from Row 11 (index 10), column 2 (index 1)
 */
export function extractStudentNames(csvData: string[][]): string[] {
  if (!csvData || csvData.length === 0) return [];
  
  // Find the header row index
  let startRow = -1;
  for (let i = 0; i < csvData.length; i++) {
    if (csvData[i][1]?.trim() === 'ชื่อ-สกุล นักเรียน' || csvData[i][0]?.trim() === 'เลขที่') {
      startRow = i + 1;
      break;
    }
  }

  if (startRow === -1) return []; // Header not found

  const names: string[] = [];
  for (let i = startRow; i < csvData.length; i++) {
    const row = csvData[i];
    if (!row) continue;
    
    const name = row[1]?.trim();
    // ตรวจสอบว่ามีชื่อ และความยาวเหมาะสม ไม่ใช่แถวหมายเหตุ
    if (name && name.length > 2 && !name.includes('หมายเหตุ')) {
      names.push(name);
    }
  }
  return names;
}

/**
 * Extracts teacher columns and their status for a specific student
 */
export function extractTeacherTasksForStudent(csvData: string[][], studentName: string, sheetName: string = "ทั่วไป"): TeacherColumn[] {
  if (!csvData || csvData.length === 0) return [];

  // Find task header row and student start row
  let taskRowIndex = -1;
  let studentStartRow = -1;

  for (let i = 0; i < csvData.length; i++) {
    const col1 = csvData[i][1]?.trim();
    if (col1 === 'ภาระงาน') {
      taskRowIndex = i;
    }
    if (col1 === 'ชื่อ-สกุล นักเรียน' || csvData[i][0]?.trim() === 'เลขที่') {
      studentStartRow = i + 1;
    }
  }

  if (taskRowIndex === -1 || studentStartRow === -1) return [];

  const taskRow = csvData[taskRowIndex];

  // Find the student's row
  let studentRow: string[] | null = null;
  for (let i = studentStartRow; i < csvData.length; i++) {
    if (csvData[i][1]?.trim() === studentName) {
      studentRow = csvData[i];
      break;
    }
  }

  if (!studentRow) return [];

  const tasks: TeacherColumn[] = [];
  const now = new Date();
  
  // วิชาหลักถูกดึงมาจากชื่อ Sheet แทนการอ่านจาก A1
  const mainSubject = sheetName;

  // Iterate through columns starting from index 2
  for (let col = 2; col < taskRow.length; col++) {
    const taskNameRaw = taskRow[col]?.trim();
    if (!taskNameRaw) continue;

    // ตรวจสอบว่ามีนักเรียนอย่างน้อย 1 คนที่ได้ติ๊กถูก (TRUE) ในคอลัมน์นี้หรือไม่
    // ถ้าไม่มีเลย แสดงว่าครูยังไม่สั่งงานนี้
    let hasAnyTrue = false;
    for (let r = studentStartRow; r < csvData.length; r++) {
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

    // Generate safe ID
    // Remove characters that might be invalid in Firestore document IDs
    const safeSubject = subject.replace(/[\/\\]/g, '-');
    const safeColumnName = columnName.replace(/[\/\\]/g, '-');
    const safeStudentName = studentName.replace(/[\/\\]/g, '-');
    // เพิ่ม col เข้ารหัส id และใช้ col เป็นตัวอ้างอิงหลักแทนชื่องาน
    // เพื่อให้เมื่อครูเปลี่ยนชื่องาน (แต่คอลัมน์เดิม) ระบบจะยังมองว่าเป็นงานเดิม
    const id = `${safeStudentName}_${safeSubject}_col${col}`.replace(/\s+/g, '_').substring(0, 150);

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

  return tasks;
}
