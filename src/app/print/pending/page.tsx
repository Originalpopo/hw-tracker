'use client';

import { useState, useEffect, useMemo } from 'react';
import { getTeacherColumns, TeacherColumn, getChildTasks, ChildTask, getGlobalSettings } from '@/lib/db';
import Link from 'next/link';
import { ArrowLeft, Printer, Filter } from 'lucide-react';

export default function PrintPendingPage() {
  const [teacherCols, setTeacherCols] = useState<TeacherColumn[]>([]);
  const [childTasks, setChildTasks] = useState<ChildTask[]>([]);
  const [studentName, setStudentName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterSubject, setFilterSubject] = useState<string>('All');

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
      const [cols, tasks] = await Promise.all([
        getTeacherColumns(name),
        getChildTasks(name)
      ]);
      // Filter only unchecked tasks in teacher sheet (งานที่ครูยังไม่ติ๊ก)
      const pendingCols = cols.filter(c => !c.is_checked);
      setTeacherCols(pendingCols);
      setChildTasks(tasks);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const colToTaskMap = useMemo(() => {
    const map = new Map<string, ChildTask>();
    childTasks.forEach(task => {
      if (task.teacher_column_id) {
        map.set(task.teacher_column_id, task);
      }
    });
    return map;
  }, [childTasks]);

  const uniqueSubjects = useMemo(() => {
    const subs = new Set<string>();
    teacherCols.forEach(c => { if (c.subject?.trim()) subs.add(c.subject.trim()); });
    return Array.from(subs).sort();
  }, [teacherCols]);

  const displayedCols = useMemo(() => {
    return teacherCols.filter(col => {
      if (filterSubject !== 'All' && col.subject !== filterSubject) return false;
      return true;
    }).sort((a, b) => {
      if (a.subject !== b.subject) return a.subject.localeCompare(b.subject);
      return (a.sequence || 0) - (b.sequence || 0);
    });
  }, [teacherCols, filterSubject]);

  // Group by subject
  const groupedTasks: Record<string, TeacherColumn[]> = useMemo(() => {
    const groups: Record<string, TeacherColumn[]> = {};
    displayedCols.forEach(col => {
      if (!groups[col.subject]) {
        groups[col.subject] = [];
      }
      groups[col.subject].push(col);
    });
    return groups;
  }, [displayedCols]);

  if (loading) {
    return <div className="p-8 text-center text-gray-500 font-medium">กำลังเตรียมข้อมูลสำหรับพิมพ์...</div>;
  }

  if (!studentName) {
    return <div className="p-8 text-center text-gray-500 font-medium">กรุณาตั้งค่าชื่อนักเรียนก่อน</div>;
  }

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
            margin: 12mm 15mm;
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
      
      {/* Non-print controls toolbar */}
      <div className="mb-6 print:hidden bg-white p-4 sm:p-5 rounded-2xl border border-[#e2e8f0] shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <Link href="/print" className="flex items-center text-gray-700 hover:text-gray-900 font-semibold bg-[#f8fafc] hover:bg-gray-100 px-4 py-2 rounded-xl shadow-2xs border border-[#e2e8f0] active:scale-95 transition-all text-xs sm:text-sm">
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            กลับหน้าพิมพ์
          </Link>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <div className="text-gray-500 text-xs hidden lg:block">
              💡 กดปุ่มพิมพ์ หรือกด <kbd className="bg-gray-100 px-1.5 py-0.5 rounded border border-gray-300 font-mono text-[10px]">Ctrl</kbd> + <kbd className="bg-gray-100 px-1.5 py-0.5 rounded border border-gray-300 font-mono text-[10px]">P</kbd>
            </div>
            <button 
              onClick={() => window.print()} 
              className="flex items-center justify-center bg-slate-800 hover:bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-xs cursor-pointer active:scale-95 transition-all w-full sm:w-auto"
            >
              <Printer className="w-4 h-4 mr-1.5" />
              พิมพ์ตามงาน
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#e2e8f0]">
          <div className="text-xs font-semibold text-gray-600">
            รายการงานที่ครูยังไม่ลงตรวจในชีต: <strong className="text-slate-800">{displayedCols.length} รายการ</strong>
          </div>

          {/* Subject Filter */}
          <div className="flex items-center bg-[#f4f7fa] border border-[#e2e8f0] rounded-xl px-3 h-[36px]">
            <Filter className="w-3.5 h-3.5 text-gray-400 mr-1.5 shrink-0" />
            <select
              value={filterSubject}
              onChange={(e) => setFilterSubject(e.target.value)}
              className="text-xs border-none outline-none focus:ring-0 bg-transparent text-gray-700 font-semibold cursor-pointer"
            >
              <option value="All">ทุกวิชา</option>
              {uniqueSubjects.map(sub => (
                <option key={sub} value={sub}>{sub}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Print Layout */}
      <div className="w-full max-w-[210mm] mx-auto bg-white text-black print:p-0">
        <div className="border-b-2 border-black pb-3 mb-5 text-center">
          <h1 className="text-2xl font-bold tracking-tight">
            ตามงาน
          </h1>
          <div className="flex justify-between items-center text-xs text-gray-700 mt-1 font-medium px-1">
            <span>นักเรียน: <strong>{studentName}</strong></span>
            <span>หมวด: <strong>{filterSubject === 'All' ? 'ทุกวิชา' : `วิชา ${filterSubject}`}</strong></span>
            <span>วันที่พิมพ์: {new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
          </div>
        </div>

        {Object.keys(groupedTasks).length === 0 ? (
          <div className="text-center py-12 border border-dashed border-gray-400 rounded-xl text-gray-600 font-medium">
            ยอดเยี่ยมมาก! ไม่มีงานค้างใน Google Sheet ของครู 🎉
          </div>
        ) : (
          <div className="space-y-5">
            {Object.entries(groupedTasks).map(([subject, cols]) => (
              <table key={subject} className="w-full border-collapse border border-black text-sm">
                <thead>
                  <tr>
                    <th className="bg-gray-100 border border-black py-1.5 px-3 text-left font-bold text-base" colSpan={2}>
                      <div className="flex justify-between items-center">
                        <span>วิชา {subject}</span>
                        <span className="text-xs font-normal">{cols.length} รายการ</span>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {cols.map((col) => {
                    const linkedTask = colToTaskMap.get(col.id);
                    const isSubmitted = linkedTask?.status === 'Submitted';
                    const isDone = linkedTask?.status === 'Done';

                    return (
                      <tr key={col.id} className="border-b border-black">
                        {/* Checkbox for kid to tick when done */}
                        <td className="border-r border-black w-10 text-center align-middle p-2 shrink-0">
                          <div className="w-5 h-5 border-2 border-black mx-auto rounded-sm"></div>
                        </td>

                        {/* Task info */}
                        <td className="py-2 px-3 align-middle leading-snug w-full">
                          <div className="flex items-center justify-between gap-3">
                            {/* Left side: Task Name */}
                            <div className="font-semibold text-gray-950 text-sm flex-1">
                              <span>{col.column_name}</span>

                              {/* Tags: งานในคาบ before การบ้าน */}
                              {['งานในคาบ', 'การบ้าน'].filter(t => linkedTask?.tags?.includes(t)).map(t => (
                                <span key={t} className="inline-block border border-gray-400 text-gray-700 text-[10px] font-bold px-1.5 py-0.2 rounded ml-1.5 align-middle">
                                  {t}
                                </span>
                              ))}

                              {/* Original Personal Draft if different */}
                              {linkedTask?.original_personal_name && linkedTask.original_personal_name !== col.column_name && (
                                <div className="text-xs text-gray-600 mt-0.5 font-normal">
                                  <span>(เดิม: <em>{linkedTask.original_personal_name}</em>)</span>
                                </div>
                              )}
                            </div>

                            {/* Right side: Status Badge (only when submitted or done) */}
                            {isSubmitted ? (
                              <span className="inline-block border border-black bg-gray-100 font-bold text-[11px] px-2 py-0.5 rounded shrink-0">
                                ✓ ส่งครูแล้ว
                              </span>
                            ) : isDone ? (
                              <span className="inline-block border border-gray-500 text-gray-800 font-medium text-[11px] px-2 py-0.5 rounded shrink-0">
                                ทำเสร็จแล้ว (รอส่ง)
                              </span>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
