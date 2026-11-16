import { NextResponse } from 'next/server';
import { fetchGoogleSheetData, extractTeacherTasksForStudent, getSheetKey, teacherColumnIdPrefix } from '@/lib/googleSheets';
import { replaceTeacherColumnsForStudent, getChildTasks, updateChildTask, addChildTask, getTeacherColumns, getGlobalSettings } from '@/lib/db';
import type { TeacherColumn } from '@/lib/db';

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
    // ชีทที่ดึงงานไม่สำเร็จรอบนี้ -> เก็บงานเดิมของชีทนั้นไว้ (ไม่ลบทิ้ง) งานจะได้ไม่หายจากหน้างานค้าง
    const keepOldSheetUrls = new Set<string>();

    // ดึงทุกชีทพร้อมกัน (แต่ละชีทใช้เวลารอ Google ~1 วินาที - ดึงทีละชีทต่อกัน 15 วิชาเคยใช้ ~17 วินาที)
    // ระหว่างนั้นอ่านคอลัมน์เดิมจาก Firestore ไปพร้อมกันด้วย
    const existingColumnsPromise = getTeacherColumns(studentName);
    const fetchResults = await Promise.allSettled(sheetUrls.map((url: string) => fetchGoogleSheetData(url)));

    // ไล่ผลตามลำดับชีทในการตั้งค่า (ลำดับเดิม)
    for (let i = 0; i < sheetUrls.length; i++) {
      const url: string = sheetUrls[i];
      const settled = fetchResults[i];
      try {
        if (settled.status === 'rejected') throw settled.reason;
        const result = settled.value;
        if (result && result.data && result.data.length > 0) {
          const a1 = (result.data[0][0] || '').trim();
          fetchedSheets.push({ data: result.data, tabName: result.sheetName, a1, url });
          if (a1) {
            a1Counts[a1] = (a1Counts[a1] || 0) + 1;
          }
        } else {
          keepOldSheetUrls.add(url);
          failedSheets.push({ url, error: 'ไม่พบข้อมูลในชีทนี้ (ชีทว่างเปล่า)' });
        }
      } catch (e: any) {
        console.error('Error fetching sheet:', url, e);
        keepOldSheetUrls.add(url);
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
      if (reason !== 'ok') keepOldSheetUrls.add(sheet.url);

      if (reason === 'no_roster') {
        failedSheets.push({ url: sheet.url, error: `ชีทวิชา "${finalSubject}" ไม่พบรายชื่อนักเรียนเลย (หาแถวที่คอลัมน์ A เป็นเลขที่และ B เป็นชื่อไม่เจอ) - รูปแบบชีทอาจต่างจากที่ระบบรองรับ` });
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
    const existingColumns = await existingColumnsPromise;
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

    // งานเดิมของชีทที่ดึงไม่สำเร็จรอบนี้ - เก็บไว้ตามเดิม (ไม่นับซ้ำกับงานที่เพิ่งดึงได้)
    const newColIds = new Set(allTeacherCols.map(c => c.id));
    const keptOldCols: TeacherColumn[] = [];
    for (const url of keepOldSheetUrls) {
      const prefix = teacherColumnIdPrefix(studentName, getSheetKey(url));
      const kept = existingColumns.filter(c => c.id && c.id.startsWith(prefix) && !newColIds.has(c.id));
      if (kept.length > 0) {
        keptOldCols.push(...kept);
        kept.forEach(c => newColIds.add(c.id));
        failedSheets.push({ url, error: `ใช้ข้อมูลงานเดิมของชีทนี้ไว้ก่อน (${kept.length} งาน) จนกว่าจะดึงได้สำเร็จ` });
      }
    }

    // แทนที่คอลัมน์เดิมทั้งหมด (กันซ้ำเวลาครูเปลี่ยนชื่อวิชา/ชื่องาน) ด้วย
    // งานที่ดึงได้รอบนี้ + งานเดิมของชีทที่ดึงไม่สำเร็จ - บันทึกครั้งเดียว
    await replaceTeacherColumnsForStudent(studentName, [...allTeacherCols, ...keptOldCols]);

    // Auto-Sync and Auto-Create ChildTasks based on synced columns
    try {
      const childTasks = await getChildTasks(studentName);
      const matchedTaskIds = new Set<string>();
      // ตัดสินใจจับคู่ทีละงาน (ในหน่วยความจำ) แต่ส่งคำสั่งเขียนทั้งหมดพร้อมกันตอนท้าย
      const writes: Promise<unknown>[] = [];

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
            updates.status = 'Rework';
            needsUpdate = true;
          }

          if (needsUpdate) {
            writes.push(updateChildTask(linkedTask.id, updates));
          }
        } else {
          // Task does not exist yet -> Auto-create official ChildTask directly from teacher column!
          writes.push(addChildTask({
            student_name: studentName,
            subject: col.subject,
            task_name: col.column_name,
            teacher_column_id: col.id,
            task_type: 'official',
            status: col.is_checked ? 'Verified' : 'Todo',
            date: new Date().toISOString().split('T')[0],
            note: ''
          }));
        }
      }
      await Promise.all(writes);
    } catch (e) {
      console.error('Error updating child tasks statuses:', e);
    }

    return NextResponse.json({ success: true, count: allTeacherCols.length, columns: allTeacherCols, failedSheets });
  } catch (error) {
    console.error('Sync error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
