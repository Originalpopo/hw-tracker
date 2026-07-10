import { NextResponse } from 'next/server';
import { fetchGoogleSheetData, extractTeacherTasksForStudent } from '@/lib/googleSheets';
import { syncTeacherColumn, clearTeacherColumnsForStudent, getChildTasks, updateChildTaskStatus, getTeacherColumns, updateChildTask } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { studentName, sheetUrls } = await request.json();
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

    // Update ChildTasks statuses based on synced columns
    try {
      const childTasks = await getChildTasks(studentName);
      for (const task of childTasks) {
        if (task.teacher_column_id && task.id) {
          let currentTeacherColId = task.teacher_column_id;
          
          // Migrate old ID format (which included task name) to new format (column index only)
          const oldFormatMatch = currentTeacherColId.match(/^(.*_col\d+)_.*$/);
          if (oldFormatMatch) {
            currentTeacherColId = oldFormatMatch[1];
          }

          let linkedCol = allTeacherCols.find(c => c.id === currentTeacherColId);
          
          // If we couldn't find linkedCol, it might be because the Subject changed (e.g. from Doc Title to Tab Name)
          // Let's try to find it by matching col index and task_name
          if (!linkedCol) {
             const colMatch = currentTeacherColId.match(/_col(\d+)$/);
             if (colMatch) {
                const colIndex = colMatch[1];
                linkedCol = allTeacherCols.find(c => c.id.endsWith(`_col${colIndex}`) && c.column_name === task.task_name);
             }
          }

          if (linkedCol) {
            const updates: any = {};
            let needsUpdate = false;
            
            // If the subject has changed, migrate it!
            if (task.subject !== linkedCol.subject) {
               updates.subject = linkedCol.subject;
               needsUpdate = true;
            }
            
            // If the ID was updated (because of subject change or old format)
            if (task.teacher_column_id !== linkedCol.id) {
               updates.teacher_column_id = linkedCol.id;
               needsUpdate = true;
            }

            // If teacher checked it, but child task is not Verified, update it
            if (linkedCol.is_checked && task.status !== 'Verified') {
              updates.status = 'Verified';
              needsUpdate = true;
            }
            // If teacher unchecked it, but child task is Verified, update to Rework
            else if (!linkedCol.is_checked && task.status === 'Verified') {
              updates.status = 'Rework';
              needsUpdate = true;
            }
            
            if (needsUpdate) {
               await updateChildTask(task.id, updates);
            }
          }
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
