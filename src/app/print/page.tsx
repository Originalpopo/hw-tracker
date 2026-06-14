'use client';

import { useState, useEffect } from 'react';
import { getTeacherColumns, TeacherColumn, getGlobalSettings } from '@/lib/db';
import Link from 'next/link';
import { ArrowLeft, Printer } from 'lucide-react';

export default function PrintPage() {
  const [teacherCols, setTeacherCols] = useState<TeacherColumn[]>([]);
  const [studentName, setStudentName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      let name = localStorage.getItem('hw_student_name');
      if (!name) {
        const globalSettings = await getGlobalSettings();
        if (globalSettings) {
          name = globalSettings.student_name;
          localStorage.setItem('hw_student_name', name);
          localStorage.setItem('hw_sheet_urls', globalSettings.sheet_urls);
        }
      }
      if (name) {
        setStudentName(name);
        loadData(name);
      } else {
        setLoading(false);
      }
    };
    init();
  }, []);

  const loadData = async (name: string) => {
    try {
      const cols = await getTeacherColumns(name);
      // Filter only unchecked tasks (งานที่ครูยังไม่ติ๊ก)
      const pendingCols = cols.filter(c => !c.is_checked);
      setTeacherCols(pendingCols);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Removed auto-print useEffect per user request

  if (loading) {
    return <div className="p-8 text-center">กำลังเตรียมข้อมูลสำหรับพิมพ์...</div>;
  }

  if (!studentName) {
    return <div className="p-8 text-center">กรุณาตั้งค่าชื่อนักเรียนก่อน</div>;
  }

  // Group by subject
  const groupedTasks: Record<string, TeacherColumn[]> = {};
  teacherCols.forEach(col => {
    if (!groupedTasks[col.subject]) {
      groupedTasks[col.subject] = [];
    }
    groupedTasks[col.subject].push(col);
  });

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          @page {
            size: A4 portrait;
            margin: 15mm;
          }
          body {
            background-color: white !important;
          }
          main {
            padding: 0 !important;
            min-height: auto !important;
          }
        }
      `}} />
      
      {/* Non-print controls */}
      <div className="mb-8 print:hidden flex flex-col sm:flex-row justify-between items-center bg-indigo-50 p-4 rounded-xl border border-indigo-100 gap-4">
        <Link href="/" className="flex items-center text-indigo-600 hover:text-indigo-800 font-medium bg-white px-4 py-2 rounded-lg shadow-sm border border-indigo-200">
          <ArrowLeft className="w-5 h-5 mr-2" />
          กลับหน้าหลัก
        </Link>
        <div className="flex items-center gap-4">
          <div className="text-gray-600 text-sm hidden sm:block">
            💡 ระบบจะเปิดหน้าต่างพิมพ์ให้อัตโนมัติ หากไม่เปิด ให้กด <kbd className="bg-white px-2 py-1 rounded border shadow-sm font-mono text-xs">Ctrl</kbd> + <kbd className="bg-white px-2 py-1 rounded border shadow-sm font-mono text-xs">P</kbd>
          </div>
          <button onClick={() => window.print()} className="flex items-center bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 shadow-sm">
            <Printer className="w-5 h-5 mr-2" />
            พิมพ์อีกครั้ง
          </button>
        </div>
      </div>

      {/* Print Layout */}
      <div className="w-full max-w-[210mm] mx-auto bg-white text-black print:p-0">
        <h1 className="text-2xl font-bold text-center mb-6 border-b-2 border-black pb-4">
          ใบติดตามงาน - {studentName}
        </h1>

        {Object.keys(groupedTasks).length === 0 ? (
          <div className="text-center py-10 border border-dashed border-gray-300 rounded-lg text-gray-500">
            ไม่พบงานค้างจากครู ยอดเยี่ยมมาก! 🎉
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedTasks).map(([subject, tasks]) => (
              <table key={subject} className="w-full border-collapse border border-black text-sm">
                <thead>
                  <tr>
                    <th className="bg-[#FFFF00] border border-black py-2 px-4 text-center font-bold text-lg" colSpan={2}>
                      {subject}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map((task) => (
                    <tr key={task.id}>
                      <td className="border border-black py-2.5 px-3 align-top leading-tight w-full">
                        {task.column_name}
                      </td>
                      <td className="border border-black w-16 text-center align-middle p-2">
                        <div className="w-6 h-6 border-2 border-black mx-auto"></div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
