import { NextResponse } from 'next/server';
import { fetchGoogleSheetData, extractTeacherTasksForStudent } from '@/lib/googleSheets';
import { syncTeacherColumn, clearTeacherColumnsForStudent, getChildTasks, updateChildTask, addChildTask, getTeacherColumns, getGlobalSettings } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    let { studentName, sheetUrls } = body;

    const globalSettings = await getGlobalSettings();
    if (globalSettings) {
      if (!studentName) studentName = globalSettings.student_name;
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

    for (const url of sheetUrls) {
      try {
        const result = await fetchGoogleSheetData(url) as any;
        if (result && result.data && result.data.length > 0) {
          const a1 = (result.data[0][0] || '').trim();
          fetchedSheets.push({ data: result.data, tabName: result.sheetName, a1, url });
          if (a1) {
            a1Counts[a1] = (a1Counts[a1] || 0) + 1;
          }
        }
      } catch (e) {
        console.error('Error fetching sheet:', url, e);
      }
    }

    // Phase 2: Extract columns using the determined subject
    for (const sheet of fetchedSheets) {
      let finalSubject = sheet.tabName;
      // If A1 is not empty and is unique across all synced tabs, use A1 as the subject
      if (sheet.a1 && a1Counts[sheet.a1] === 1) {
        finalSubject = sheet.a1;
      }
      const cols = extractTeacherTasksForStudent(sheet.data, studentName, finalSubject);
      allTeacherCols.push(...cols);
    }

    // Fetch existing columns to preserve first_seen_at
    const existingColumns = await getTeacherColumns(studentName);
    const existingColMap = new Map(existingColumns.map(c => [c.id, c]));
    const currentSyncTime = Date.now();

    // Preserve first_seen_at or set to current sync time
    for (const col of allTeacherCols) {
      const existingCol = existingColMap.get(col.id);
      if (existingCol) {
        col.first_seen_at = existingCol.first_seen_at || currentSyncTime;
      } else {
        col.first_seen_at = currentSyncTime;
      }
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

    return NextResponse.json({ success: true, count: allTeacherCols.length, columns: allTeacherCols });
  } catch (error) {
    console.error('Sync error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
