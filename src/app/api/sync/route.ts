import { NextResponse } from 'next/server';
import { fetchGoogleSheetData, extractTeacherTasksForStudent } from '@/lib/googleSheets';
import { syncTeacherColumn, clearTeacherColumnsForStudent } from '@/lib/db';

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

    // Clear old teacher columns to prevent duplicates when subjects or names change
    await clearTeacherColumnsForStudent(studentName);

    // Save to Firestore
    for (const col of allTeacherCols) {
      await syncTeacherColumn(col);
    }

    return NextResponse.json({ success: true, count: allTeacherCols.length, columns: allTeacherCols });
  } catch (error) {
    console.error('Sync error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
