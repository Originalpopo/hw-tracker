import { NextResponse } from 'next/server';
import { fetchGoogleSheetData, extractStudentNames } from '@/lib/googleSheets';

export async function POST(request: Request) {
  try {
    const { sheetUrl } = await request.json();
    if (!sheetUrl) {
      return NextResponse.json({ error: 'กรุณาระบุลิงก์ Google Sheet' }, { status: 400 });
    }

    const result = await fetchGoogleSheetData(sheetUrl);
    if (!result || !result.data) {
      return NextResponse.json({ error: 'ไม่สามารถดึงข้อมูลได้ โปรดตรวจสอบลิงก์หรือการแชร์ไฟล์' }, { status: 500 });
    }

    const roster = extractStudentNames(result.data);
    return NextResponse.json({ students: roster });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}
