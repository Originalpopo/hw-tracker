import { NextResponse } from 'next/server';
import { fetchGoogleSheetData, extractTeacherTasksForStudent, getSheetKey } from '@/lib/googleSheets';
import { syncTeacherColumn, clearTeacherColumnsForStudent, getChildTasks, updateChildTask, addChildTask, getTeacherColumns, getGlobalSettings } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    let { studentName, sheetUrls, rollNumber } = body;

    const globalSettings = await getGlobalSettings();
    if (globalSettings) {
      if (!studentName) studentName = globalSettings.student_name;
      if (!rollNumber) rollNumber = globalSettings.student_roll_number;
      const globalUrls = (globalSettings.sheet_urls || '').split('\n').map((u: string) => u.trim()).filter(Boolean);
      if (!sheetUrls || !Array.isArray(sheetUrls) || sheetUrls.length < globalUrls.length) {
        sheetUrls = globalUrls;
      }
    }

    if (!studentName || !sheetUrls || !Array.isArray(sheetUrls) || sheetUrls.length === 0) {
      return NextResponse.json({ error: 'studentName and sheetUrls array are required' }, { status: 400 });
    }

    let allTeacherCols: any[] = [];

    // Phase 1: Fetch all sheets and collect A1 cell data
    const fetchedSheets: { data: string[][], tabName: string, a1: string, url: string }[] = [];
    const a1Counts: Record<string, number> = {};
    const failedSheets: { url: string; error: string }[] = [];

    for (const url of sheetUrls) {
      try {
        const result = await fetchGoogleSheetData(url);
        if (result && result.data && result.data.length > 0) {
          const a1 = (result.data[0][0] || '').trim();
          fetchedSheets.push({ data: result.data, tabName: result.sheetName, a1, url });
          if (a1) {
            a1Counts[a1] = (a1Counts[a1] || 0) + 1;
          }
        } else {
          failedSheets.push({ url, error: 'ไม่พบข้อมูลในชีทนี้ (ชีทว่างเปล่า)' });
        }
      } catch (e: any) {
        console.error('Error fetching sheet:', url, e);
        failedSheets.push({ url, error: e?.message || 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ' });
      }
    }

    // Phase 2: Extract columns using the determined subject
    for (const sheet of fetchedSheets) {
      let finalSubject = sheet.tabName;
      // If A1 is not empty and is unique across all synced tabs, use A1 as the subject
      if (sheet.a1 && a1Counts[sheet.a1] === 1) {
        finalSubject = sheet.a1;
      }
      const { tasks: cols, match, reason } = extractTeacherTasksForStudent(sheet.data, studentName, finalSubject, rollNumber, getSheetKey(sheet.url));
      allTeacherCols.push(...cols);

      if (reason === 'no_roster') {
        failedSheets.push({ url: sheet.url, error: `ชีทวิชา "${finalSubject}" ไม่พบรายชื่อนักเรียนเลย (ไม่มีข้อมูลตั้งแต่แถวที่ 3 เป็นต้นไป) - รูปแบบชีทอาจต่างจากที่ระบบรองรับ` });
      } else if (reason === 'no_task_header') {
        failedSheets.push({ url: sheet.url, error: `ชีทวิชา "${finalSubject}" มีรายชื่อนักเรียนแล้ว แต่ครูยังไม่ได้ลงชื่อภาระงานในแถวที่ 1 (คอลัมน์ C เป็นต้นไป) - ยังดึงงานไม่ได้จนกว่าครูจะเริ่มลงงาน` });
      } else if (reason === 'student_not_found') {
        failedSheets.push({ url: sheet.url, error: `ไม่พบชื่อ "${studentName}"${rollNumber ? ` (เลขที่ ${rollNumber})` : ''} ในรายชื่อของชีทวิชา "${finalSubject}" - ตรวจสอบว่าครูสะกดชื่อ/ลงเลขที่ถูกต้อง หรือคีย์ชื่อไว้ในชีทนี้แล้วหรือยัง` });
      } else if (match.rollMismatch) {
        failedSheets.push({ url: sheet.url, error: `ชีทวิชา "${finalSubject}" จับคู่ชื่อ "${match.matchedName}" ได้ แต่เลขที่ในชีท (${match.matchedRoll}) ไม่ตรงกับเลขที่ที่ตั้งไว้ (${rollNumber}) - ควรตรวจสอบว่าเป็นนักเรียนคนเดียวกันจริงหรือไม่` });
      } else if (match.isFuzzy) {
        failedSheets.push({ url: sheet.url, error: `ชีทวิชา "${finalSubject}" มีชื่อสะกดต่างจากที่ตั้งไว้เล็กน้อย: ครูเขียนว่า "${match.matchedName}" (ระบบจับคู่ให้อัตโนมัติ) - ควรแจ้งครูให้แก้ให้ตรงกับ "${studentName}"` });
      }
    }

    // Fetch existing columns to preserve first_seen_at
    const existingColumns = await getTeacherColumns(studentName);
    const existingColMap = new Map(existingColumns.map(c => [c.id, c]));
    const usedExistingColIds = new Set<string>();
    const currentSyncTime = Date.now();

    // Preserve first_seen_at or set to current sync time.
    // Primary match: same id (column position unchanged since last sync).
    // Fallback match: same subject + task name - handles the teacher inserting/removing
    // a task column elsewhere in the same sheet, which shifts every later column's
    // position (and therefore its id) without actually changing that task's identity.
    // Without this fallback, shifted tasks would be wrongly flagged as "new" every sync.
    for (const col of allTeacherCols) {
      let existingCol = existingColMap.get(col.id);
      if (!existingCol) {
        existingCol = existingColumns.find(c =>
          !usedExistingColIds.has(c.id) && c.subject === col.subject && c.column_name === col.column_name
        );
      }
      if (existingCol) usedExistingColIds.add(existingCol.id);
      col.first_seen_at = existingCol?.first_seen_at || currentSyncTime;
    }

    // Clear old teacher columns to prevent duplicates when subjects or names change
    await clearTeacherColumnsForStudent(studentName);

    // Save to Firestore
    for (const col of allTeacherCols) {
      await syncTeacherColumn(col);
    }

    // Auto-Sync and Auto-Create ChildTasks based on synced columns
    try {
      const childTasks = await getChildTasks(studentName);
      const matchedTaskIds = new Set<string>();

      for (const col of allTeacherCols) {
        // Find if a ChildTask already exists for this teacher column
        let linkedTask = childTasks.find(t => t.teacher_column_id === col.id);
        
        // Fallback match: if col ID changed but subject + name matches an existing official task
        if (!linkedTask) {
          linkedTask = childTasks.find(t => 
            !matchedTaskIds.has(t.id!) && 
            t.subject === col.subject && 
            t.task_name === col.column_name
          );
        }

        if (linkedTask && linkedTask.id) {
          matchedTaskIds.add(linkedTask.id);
          const updates: any = {};
          let needsUpdate = false;

          if (linkedTask.task_type !== 'official') {
            updates.task_type = 'official';
            needsUpdate = true;
          }

          if (linkedTask.teacher_column_id !== col.id) {
            updates.teacher_column_id = col.id;
            needsUpdate = true;
          }

          if (linkedTask.subject !== col.subject) {
            updates.subject = col.subject;
            needsUpdate = true;
          }

          if (linkedTask.task_name !== col.column_name) {
            updates.task_name = col.column_name;
            needsUpdate = true;
          }

          // If teacher checked it, update status to Verified
          if (col.is_checked && linkedTask.status !== 'Verified') {
            updates.status = 'Verified';
            needsUpdate = true;
          }
          // If teacher unchecked it and it was Verified
          else if (!col.is_checked && linkedTask.status === 'Verified') {
            if (linkedTask.task_type === 'personal') {
              updates.status = 'Submitted';
            } else {
              updates.status = 'Rework';
            }
            needsUpdate = true;
          }

          if (needsUpdate) {
            await updateChildTask(linkedTask.id, updates);
          }
        } else {
          // Task does not exist yet -> Auto-create official ChildTask directly from teacher column!
          await addChildTask({
            student_name: studentName,
            subject: col.subject,
            task_name: col.column_name,
            teacher_column_id: col.id,
            task_type: 'official',
            status: col.is_checked ? 'Verified' : 'Todo',
            date: new Date().toISOString().split('T')[0],
            note: ''
          });
        }
      }
    } catch (e) {
      console.error('Error updating child tasks statuses:', e);
    }

    return NextResponse.json({ success: true, count: allTeacherCols.length, columns: allTeacherCols, failedSheets });
  } catch (error) {
    console.error('Sync error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
