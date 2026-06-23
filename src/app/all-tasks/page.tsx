'use client';

import { useState, useEffect, useMemo } from 'react';
import { getTeacherColumns, getGlobalSettings, TeacherColumn, getChildTasks, ChildTask } from '@/lib/db';
import { CheckSquare, AlertCircle, RefreshCcw } from 'lucide-react';
import Link from 'next/link';
import { clsx } from 'clsx';

export default function AllTasksPage() {
  const [studentName, setStudentName] = useState<string | null>(null);
  const [teacherCols, setTeacherCols] = useState<TeacherColumn[]>([]);
  const [childTasks, setChildTasks] = useState<ChildTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [sheetUrls, setSheetUrls] = useState<string[]>([]);

  useEffect(() => {
    const init = async () => {
      let savedName = localStorage.getItem('hw_student_name');
      let savedUrlsStr = localStorage.getItem('hw_sheet_urls');
      
      if (!savedName || !savedUrlsStr) {
        const globalSettings = await getGlobalSettings();
        if (globalSettings) {
          savedName = globalSettings.student_name;
          savedUrlsStr = globalSettings.sheet_urls;
          localStorage.setItem('hw_student_name', savedName);
          localStorage.setItem('hw_sheet_urls', savedUrlsStr);
        }
      }

      setStudentName(savedName || null);
      
      let urls: string[] = [];
      if (savedUrlsStr) {
        urls = savedUrlsStr.split('\n').map(u => u.trim()).filter(Boolean);
      }
      setSheetUrls(urls);

      if (savedName) {
        loadData(savedName);
      } else {
        setLoading(false);
      }
    };
    init();
  }, []);

  const loadData = async (name: string) => {
    setLoading(true);
    try {
      const [cols, tasks] = await Promise.all([
        getTeacherColumns(name),
        getChildTasks(name)
      ]);
      setTeacherCols(cols);
      setChildTasks(tasks);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    if (!studentName || sheetUrls.length === 0) {
      alert("กรุณาตั้งค่าลิงก์ Google Sheet ในหน้า Settings ก่อนครับ");
      return;
    }
    setSyncing(true);
    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentName, sheetUrls })
      });
      if (res.ok) {
        await loadData(studentName);
      }
    } catch (error) {
      console.error('Sync error:', error);
    } finally {
      setSyncing(false);
    }
  };

  // Group data by subject and find max sequence
  const { subjects, maxSequence, subjectMaxSequence } = useMemo(() => {
    const subjectsMap = new Map<string, Map<number, TeacherColumn>>();
    let maxSeq = 0;
    const subjectMaxSeq = new Map<string, number>();

    teacherCols.forEach(col => {
      if (col.sequence) {
        if (!subjectsMap.has(col.subject)) {
          subjectsMap.set(col.subject, new Map());
        }
        subjectsMap.get(col.subject)!.set(col.sequence, col);
        
        if (col.sequence > maxSeq) {
          maxSeq = col.sequence;
        }

        const currentSubjectMax = subjectMaxSeq.get(col.subject) || 0;
        if (col.sequence > currentSubjectMax) {
          subjectMaxSeq.set(col.subject, col.sequence);
        }
      }
    });

    return {
      subjects: Array.from(subjectsMap.entries()).sort((a, b) => a[0].localeCompare(b[0])),
      maxSequence: maxSeq,
      subjectMaxSequence: subjectMaxSeq
    };
  }, [teacherCols]);

  const mappedTeacherColStatus = useMemo(() => {
    const statusMap = new Map<string, string>();
    childTasks.forEach(task => {
      if (task.teacher_column_id) {
        statusMap.set(task.teacher_column_id, task.status);
      }
    });
    return statusMap;
  }, [childTasks]);

  if (!studentName) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 animate-in fade-in duration-700">
        <div className="w-24 h-24 bg-indigo-100 rounded-full flex items-center justify-center mb-6 shadow-inner">
          <AlertCircle className="w-12 h-12 text-indigo-500" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-4">ยินดีต้อนรับสู่ระบบติดตามงาน</h2>
        <p className="text-gray-500 max-w-md mb-8 text-lg">กรุณาตั้งค่าชื่อนักเรียนก่อนเริ่มใช้งาน</p>
        <Link href="/settings" className="bg-indigo-600 text-white px-8 py-3 rounded-full font-medium hover:bg-indigo-700 hover:shadow-lg transition-all transform hover:-translate-y-1">
          ไปหน้าตั้งค่า
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-6 rounded-2xl gap-4 md:gap-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center">
            <CheckSquare className="w-6 h-6 text-gray-400 mr-2 shrink-0" />
            งานทั้งหมด (All Tasks)
          </h1>
          <p className="text-gray-500 mt-1 text-sm sm:text-base">ตารางแสดงสถานะงานทุกวิชาอ้างอิงจากข้อมูลของครู</p>
        </div>
        <div className="flex flex-col sm:flex-row flex-wrap sm:flex-nowrap items-center gap-3 w-full md:w-auto md:shrink-0 justify-start md:justify-end mt-4 md:mt-0">
          <button
            onClick={handleSync}
            disabled={syncing}
            className="h-[44px] w-full sm:w-auto flex items-center justify-center bg-white border border-gray-300 text-gray-700 px-4 rounded-xl text-sm sm:text-base font-medium hover:bg-gray-50 hover:text-indigo-600 transition-all active:scale-95 whitespace-nowrap shadow-sm"
          >
            <RefreshCcw className={clsx("w-4 h-4 sm:w-5 sm:h-5 mr-2", syncing && "animate-spin")} />
            {syncing ? 'กำลังดึง...' : 'อัปเดตข้อมูลจากครู'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 border-collapse">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-r border-gray-200 min-w-[120px] sticky left-0 z-20 bg-gray-50 shadow-[4px_0_8px_-2px_rgba(0,0,0,0.05)]">
                    วิชา
                  </th>
                  {Array.from({ length: maxSequence }).map((_, i) => (
                    <th key={i + 1} className="px-2 py-3 text-center text-xs font-bold text-gray-500 border-b border-r border-gray-200 min-w-[50px]">
                      {i + 1}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {subjects.map(([subjectName, columnsMap]) => {
                  const currentSubjectMax = subjectMaxSequence.get(subjectName) || 0;
                  
                  return (
                    <tr key={subjectName} className="hover:bg-gray-50 transition-colors group">
                      <td className="px-4 py-3 text-sm font-bold text-gray-900 border-r border-gray-200 sticky left-0 z-10 bg-white group-hover:bg-gray-50 shadow-[4px_0_8px_-2px_rgba(0,0,0,0.05)] transition-colors">
                        {subjectName}
                      </td>
                      {Array.from({ length: maxSequence }).map((_, i) => {
                        const seq = i + 1;
                        const col = columnsMap.get(seq);
                        const isBeyondSubjectMax = seq > currentSubjectMax;

                        if (isBeyondSubjectMax) {
                          // สีทึบ (dark cell)
                          return (
                            <td key={seq} className="px-2 py-3 border-r border-gray-200 bg-gray-200">
                              <div className="w-full h-full flex items-center justify-center min-h-[24px]"></div>
                            </td>
                          );
                        }

                        if (!col) {
                          // ตรงนี้เว้นว่าง (อาจจะมีช่องว่างใน sequence ของวิชานั้น)
                          return (
                            <td key={seq} className="px-2 py-3 border-r border-gray-200 text-center">
                               <div className="w-full h-full flex items-center justify-center min-h-[24px]"></div>
                            </td>
                          );
                        }

                        // แสดงสถานะ 🏆, ⏳ หรือ 🔥 และพื้นหลังสีตามสถานะ
                        const mappedStatus = mappedTeacherColStatus.get(col.id);
                        const isMapped = mappedStatus !== undefined;
                        const isSubmittedOrDone = isMapped && ['Done', 'Submitted', 'Verified'].includes(mappedStatus as string);
                        
                        let bgColor = "bg-orange-100/80";
                        const isOld = !col.first_seen_at || (Date.now() - col.first_seen_at > 3 * 24 * 60 * 60 * 1000);
                        let icon = isOld ? "🔥" : "📝";
                        let titleSuffix = "";

                        if (col.is_checked) {
                          bgColor = "bg-green-100/60";
                          icon = "🏆";
                        } else if (isSubmittedOrDone) {
                          bgColor = "bg-blue-100/80";
                          icon = "⏳";
                          titleSuffix = " (รอครูอัปเดต)";
                        }

                        return (
                          <td 
                            key={seq} 
                            className={clsx(
                              "px-2 py-3 border-r border-gray-200 text-center transition-colors",
                              bgColor
                            )}
                            title={col.column_name + titleSuffix}
                          >
                            <div className="flex items-center justify-center text-lg drop-shadow-sm transition-transform hover:scale-150 cursor-default">
                              {icon}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
                {subjects.length === 0 && (
                  <tr>
                    <td colSpan={maxSequence + 1} className="px-6 py-12 text-center text-gray-500 text-sm">
                      ไม่มีข้อมูล กรุณากด "อัปเดตข้อมูลจากครู" หรือตรวจสอบการตั้งค่า Sheet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
