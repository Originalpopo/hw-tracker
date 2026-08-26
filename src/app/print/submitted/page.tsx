'use client';

import { useState, useEffect, useMemo } from 'react';
import { getChildTasks, ChildTask, getGlobalSettings, getTeacherColumns, TeacherColumn } from '@/lib/db';
import Link from 'next/link';
import { ArrowLeft, Printer, Filter } from 'lucide-react';

export default function PrintSubmittedPage() {
  const [submittedTasks, setSubmittedTasks] = useState<ChildTask[]>([]);
  const [teacherCols, setTeacherCols] = useState<TeacherColumn[]>([]);
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
      const [allTasks, cols] = await Promise.all([
        getChildTasks(name),
        getTeacherColumns(name)
      ]);
      // Filter only tasks that are 'Submitted' (ส่งครูแล้ว - รอครูลงคะแนนในชีต)
      const filteredTasks = allTasks.filter(t => t.status === 'Submitted');
      setSubmittedTasks(filteredTasks);
      setTeacherCols(cols);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const teacherColMap = useMemo(() => {
    const map = new Map<string, TeacherColumn>();
    teacherCols.forEach(col => map.set(col.id, col));
    return map;
  }, [teacherCols]);

  const uniqueSubjects = useMemo(() => {
    const subs = new Set<string>();
    submittedTasks.forEach(t => { if (t.subject?.trim()) subs.add(t.subject.trim()); });
    return Array.from(subs).sort();
  }, [submittedTasks]);

  const displayedTasks = useMemo(() => {
    return submittedTasks.filter(task => {
      if (filterSubject !== 'All' && task.subject !== filterSubject) return false;
      return true;
    }).sort((a, b) => {
      if (a.subject !== b.subject) return a.subject.localeCompare(b.subject);
      const seqA = a.teacher_column_id ? teacherColMap.get(a.teacher_column_id)?.sequence ?? 999 : 999;
      const seqB = b.teacher_column_id ? teacherColMap.get(b.teacher_column_id)?.sequence ?? 999 : 999;
      return seqA - seqB;
    });
  }, [submittedTasks, filterSubject, teacherColMap]);

  // Group by subject
  const groupedTasks: Record<string, ChildTask[]> = useMemo(() => {
    const groups: Record<string, ChildTask[]> = {};
    displayedTasks.forEach(task => {
      if (!groups[task.subject]) {
        groups[task.subject] = [];
      }
      groups[task.subject].push(task);
    });
    return groups;
  }, [displayedTasks]);

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
      
      {/* Non-print controls */}
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
              className="flex items-center justify-center bg-emerald-700 hover:bg-emerald-800 text-white px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-xs cursor-pointer active:scale-95 transition-all w-full sm:w-auto"
            >
              <Printer className="w-4 h-4 mr-1.5" />
              พิมพ์งานรอครูอัปเดต
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#e2e8f0]">
          <div className="text-xs font-semibold text-gray-600">
            รายการงานที่ส่งครูแล้ว (รอผลตรวจในชีต): <strong className="text-emerald-800">{displayedTasks.length} รายการ</strong>
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
            งานรอครูอัปเดต
          </h1>
          <div className="flex justify-between items-center text-xs text-gray-700 mt-1 font-medium px-1">
            <span>นักเรียน: <strong>{studentName}</strong></span>
            <span>หมวด: <strong>{filterSubject === 'All' ? 'ทุกวิชา' : `วิชา ${filterSubject}`}</strong></span>
            <span>วันที่พิมพ์: {new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
          </div>
        </div>

        {Object.keys(groupedTasks).length === 0 ? (
          <div className="text-center py-12 border border-dashed border-gray-400 rounded-xl text-gray-600 font-medium">
            ไม่มีรายการงานรออัปเดตคะแนนในหมวดนี้
          </div>
        ) : (
          <div className="space-y-5">
            {Object.entries(groupedTasks).map(([subject, subjectTasks]) => (
              <table key={subject} className="w-full border-collapse border border-black text-sm">
                <thead>
                  <tr>
                    <th className="bg-gray-100 border border-black py-1.5 px-3 text-left font-bold text-base">
                      <div className="flex justify-between items-center">
                        <span>วิชา {subject}</span>
                        <span className="text-xs font-normal">{subjectTasks.length} รายการ</span>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {subjectTasks.map((task) => {
                    const teacherCol = task.teacher_column_id ? teacherColMap.get(task.teacher_column_id) : null;
                    const seq = teacherCol?.sequence;

                    return (
                      <tr key={task.id} className="border-b border-black">
                        <td className="py-2.5 px-3 align-middle leading-snug w-full">
                          <div className="flex items-center justify-between gap-3">
                            <div className="font-semibold text-gray-950 text-sm flex-1">
                              <span>
                                {typeof seq === 'number' ? `ลำดับงานที่ ${seq} ` : ''}
                                {task.task_name}
                              </span>

                              {/* Original Personal Draft */}
                              {task.original_personal_name && task.original_personal_name !== task.task_name && (
                                <div className="text-xs text-gray-600 mt-0.5 font-normal">
                                  <span>(เดิม: <em>{task.original_personal_name}</em>)</span>
                                </div>
                              )}
                            </div>

                            {/* Submitted date if present */}
                            {(task.date || task.assigned_date) && (
                              <span className="text-xs font-medium text-gray-600 shrink-0">
                                ส่งเมื่อ: {task.date || task.assigned_date}
                              </span>
                            )}
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
