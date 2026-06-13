import { NextResponse } from 'next/server';
import { fetchGoogleSheetData, extractStudentNames } from '@/lib/googleSheets';

export async function POST(request: Request) {
  try {
    const { sheetUrl } = await request.json();
    if (!sheetUrl) {
      return NextResponse.json({ error: 'กรุณาระบุลิงก์ Google Sheet' }, { status: 400 });
    }

    const data = await fetchGoogleSheetData(sheetUrl);
    if (!data) {
      return NextResponse.json({ error: 'ไม่สามารถดึงข้อมูลได้ โปรดตรวจสอบลิงก์หรือการแชร์ไฟล์' }, { status: 500 });
    }
    
    const names = extractStudentNames(data as string[][]);
    return NextResponse.json({ students: names });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
