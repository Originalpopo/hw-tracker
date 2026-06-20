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
    
    // Loop over each url to fetch data for all subjects
    for (const url of sheetUrls) {
      try {
        const data = await fetchGoogleSheetData(url);
        if (data) {
          const cols = extractTeacherTasksForStudent(data as string[][], studentName);
          allTeacherCols.push(...cols);
        }
      } catch (e) {
        console.error('Error fetching sheet:', url, e);
        // Continue to next sheet even if one fails
      }
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
            await updateChildTask(task.id, { teacher_column_id: currentTeacherColId });
          }

          const linkedCol = allTeacherCols.find(c => c.id === currentTeacherColId);
          if (linkedCol) {
            // If teacher checked it, but child task is not Verified, update it
            if (linkedCol.is_checked && task.status !== 'Verified') {
              await updateChildTaskStatus(task.id, 'Verified');
            }
            // If teacher unchecked it, but child task is Verified, update to Rework
            else if (!linkedCol.is_checked && task.status === 'Verified') {
              await updateChildTaskStatus(task.id, 'Rework');
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
