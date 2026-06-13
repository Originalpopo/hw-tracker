'use client';

import { useState, useEffect, useMemo } from 'react';
import { RefreshCcw, Link as LinkIcon, CheckCircle2, AlertCircle, Search, ArrowRightLeft, XCircle, Edit2, X, Save, DownloadCloud, Filter } from 'lucide-react';
import { ChildTask, TeacherColumn, getChildTasks, getTeacherColumns, updateChildTask, addChildTask } from '@/lib/db';
import Fuse from 'fuse.js';
import { clsx } from 'clsx';
import Link from 'next/link';

export default function ReconcilePage() {
  const [studentName, setStudentName] = useState<string | null>(null);
  const [childTasks, setChildTasks] = useState<ChildTask[]>([]);
  const [teacherCols, setTeacherCols] = useState<TeacherColumn[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [sheetUrls, setSheetUrls] = useState<string[]>([]);

  // For manual mapping
  const [selectedChildTask, setSelectedChildTask] = useState<string | null>(null);
  const [manualTeacherColId, setManualTeacherColId] = useState<string>('');
  const [importing, setImporting] = useState(false);
  
  // For editing task name
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editTaskName, setEditTaskName] = useState('');

  // Filter state
  const [filterSubject, setFilterSubject] = useState<string>('All');
  
  useEffect(() => {
    const savedName = localStorage.getItem('hw_student_name');
    const savedUrlsStr = localStorage.getItem('hw_sheet_urls');
    const oldUrl = localStorage.getItem('hw_sheet_url');
    
    setStudentName(savedName);
    
    let urls: string[] = [];
    if (savedUrlsStr) {
      urls = savedUrlsStr.split('\n').map(u => u.trim()).filter(Boolean);
    } else if (oldUrl) {
      urls = [oldUrl];
    }
    setSheetUrls(urls);

    if (savedName) {
      loadData(savedName);
    } else {
      setLoading(false);
    }
  }, []);

  const loadData = async (name: string) => {
    setLoading(true);
    try {
      const [tasks, cols] = await Promise.all([
        getChildTasks(name),
        getTeacherColumns(name)
      ]);
      setChildTasks(tasks);
      setTeacherCols(cols);
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

  // Derived states
  const uniqueSubjects = useMemo(() => {
    const subs = new Set([...childTasks.map(t => t.subject), ...teacherCols.map(c => c.subject)]);
    return Array.from(subs).sort();
  }, [childTasks, teacherCols]);

  const filteredChildTasks = useMemo(() => {
    if (filterSubject === 'All') return childTasks;
    return childTasks.filter(t => t.subject === filterSubject);
  }, [childTasks, filterSubject]);

  const filteredTeacherCols = useMemo(() => {
    if (filterSubject === 'All') return teacherCols;
    return teacherCols.filter(c => c.subject === filterSubject);
  }, [teacherCols, filterSubject]);

  const pendingTasks = filteredChildTasks.filter(t => t.status === 'Submitted' && !t.teacher_column_id);
  const mappedTasks = filteredChildTasks.filter(t => t.teacher_column_id && t.status === 'Submitted');

  // Setup Fuse.js for fuzzy search
  const fuse = useMemo(() => new Fuse(teacherCols, {
    keys: ['column_name', 'subject'],
    threshold: 0.4,
    includeScore: true
  }), [teacherCols]);

  const handleLink = async (childTaskId: string, teacherColId: string) => {
    if (!studentName) return;
    const col = teacherCols.find(c => c.id === teacherColId);
    if (!col) return;

    try {
      const newStatus = col.is_checked ? 'Verified' : 'Submitted';
      
      await updateChildTask(childTaskId, {
        teacher_column_id: teacherColId,
        status: newStatus
      });
      
      await loadData(studentName);
      setSelectedChildTask(null);
    } catch (error) {
      console.error('Link error:', error);
    }
  };

  const handleReject = async (childTaskId: string) => {
    try {
      await updateChildTask(childTaskId, {
        status: 'Rework',
        teacher_column_id: null
      });
      await loadData(studentName!);
    } catch (error) {
      console.error('Reject error:', error);
    }
  };

  const handleUpdateName = async (taskId: string) => {
    if (!editTaskName.trim()) return;
    try {
      setChildTasks(childTasks.map(t => t.id === taskId ? { ...t, task_name: editTaskName } : t));
      await updateChildTask(taskId, { task_name: editTaskName });
      setEditingTaskId(null);
    } catch (error) {
      console.error('Update name error:', error);
      loadData(studentName!);
    }
  };

  if (!studentName) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 animate-in fade-in duration-700">
        <div className="w-24 h-24 bg-indigo-100 rounded-full flex items-center justify-center mb-6 shadow-inner">
          <AlertCircle className="w-12 h-12 text-indigo-500" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-4">ยินดีต้อนรับสู่ระบบสอบทานงาน</h2>
        <p className="text-gray-500 max-w-md mb-8 text-lg">กรุณาตั้งค่าชื่อนักเรียนก่อนเริ่มใช้งาน</p>
        <Link href="/settings" className="bg-indigo-600 text-white px-8 py-3 rounded-full font-medium hover:bg-indigo-700 hover:shadow-lg transition-all transform hover:-translate-y-1">
          ไปหน้าตั้งค่า
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-gray-100 gap-4 md:gap-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center">
            <LinkIcon className="w-6 h-6 text-indigo-600 mr-2 shrink-0" />
            จับคู่งาน (Reconcile)
          </h1>
          <p className="text-gray-500 mt-1 text-sm sm:text-base">จับคู่งานของลูกกับข้อมูลจากครู เพื่อยืนยันความถูกต้อง</p>
        </div>
        <div className="flex flex-row flex-wrap sm:flex-nowrap items-center gap-3 w-full md:w-auto md:shrink-0 justify-start md:justify-end">
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex-1 sm:flex-none flex items-center justify-center bg-white border border-gray-300 text-gray-700 px-4 py-2.5 rounded-xl text-sm sm:text-base font-medium hover:bg-gray-50 hover:text-indigo-600 transition-all active:scale-95 whitespace-nowrap"
          >
            <RefreshCcw className={clsx("w-4 h-4 sm:w-5 sm:h-5 mr-2", syncing && "animate-spin")} />
            {syncing ? 'กำลังดึง...' : 'อัปเดตข้อมูลจากครู'}
          </button>

          <div className="flex-1 sm:flex-none flex items-center bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5">
            <Filter className="w-4 h-4 text-gray-400 mr-2 shrink-0" />
            <select
              value={filterSubject}
              onChange={(e) => setFilterSubject(e.target.value)}
              className="text-sm sm:text-base border-none outline-none focus:ring-0 bg-transparent text-gray-700 font-medium cursor-pointer w-full"
            >
              <option value="All">ทุกวิชา</option>
              {uniqueSubjects.map(sub => (
                <option key={sub} value={sub}>{sub}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center bg-white py-3 px-4 rounded-xl border border-gray-100 shadow-sm">
              <span className="bg-indigo-100 text-indigo-800 w-8 h-8 rounded-full flex items-center justify-center mr-3 font-bold">1</span>
              งานที่ลูกส่งแล้ว (รอจับคู่)
            </h2>
            
            {pendingTasks.length === 0 ? (
              <div className="bg-white/50 border border-dashed border-gray-200 rounded-xl p-8 text-center">
                <CheckCircle2 className="w-10 h-10 text-green-400 mx-auto mb-2" />
                <p className="text-gray-500">ไม่มีงานที่รอจับคู่</p>
              </div>
            ) : (
              pendingTasks.map(task => {
                const results = fuse.search(task.task_name);
                const recommendations = results.slice(0, 2).map(r => r.item);

                return (
                  <div key={task.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 hover:border-indigo-300 transition-colors group">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1 pr-4">
                        <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md mb-2 inline-block">{task.subject}</span>
                        {editingTaskId === task.id ? (
                          <div className="flex flex-col mt-1">
                            <textarea
                              value={editTaskName}
                              onChange={(e) => setEditTaskName(e.target.value)}
                              className="w-full text-sm font-semibold text-gray-900 border border-indigo-300 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                              rows={2}
                              autoFocus
                            />
                            <div className="flex justify-end gap-2 mt-2">
                              <button onClick={() => setEditingTaskId(null)} className="flex items-center text-xs text-gray-500 hover:text-gray-700 bg-gray-100 px-2 py-1 rounded">
                                <X className="w-3 h-3 mr-1" /> ยกเลิก
                              </button>
                              <button onClick={() => handleUpdateName(task.id!)} className="flex items-center text-xs text-white bg-green-500 hover:bg-green-600 px-2 py-1 rounded">
                                <Save className="w-3 h-3 mr-1" /> บันทึก
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start">
                            <h3 className="font-semibold text-gray-900">{task.task_name}</h3>
                            <button 
                              onClick={() => {
                                setEditingTaskId(task.id!);
                                setEditTaskName(task.task_name);
                              }}
                              className="ml-2 mt-0.5 text-gray-400 hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                              title="แก้ไขชื่องาน"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {recommendations.length > 0 && (
                      <div className="mt-4 bg-indigo-50/50 rounded-xl p-4 border border-indigo-100">
                        <p className="text-xs font-semibold text-indigo-600 flex items-center mb-3">
                          <Search className="w-3 h-3 mr-1" /> แนะนำการจับคู่ที่คล้ายกัน
                        </p>
                        <div className="space-y-2">
                          {recommendations.map(rec => (
                            <div key={rec.id} className="flex items-center justify-between bg-white p-3 rounded-lg border border-indigo-50 shadow-sm text-sm">
                              <div className="flex-1 min-w-0 pr-3">
                                <p className="text-gray-800 font-medium truncate">{rec.column_name}</p>
                                <p className="text-xs text-gray-500">
                                  สถานะครู: <span className={rec.is_checked ? "text-green-600 font-bold" : "text-amber-500 font-bold"}>
                                    {rec.is_checked ? 'ส่งแล้ว (ติ๊กถูก)' : 'ยังไม่ส่ง/ต้องแก้'}
                                  </span>
                                </p>
                              </div>
                              <button
                                onClick={() => handleLink(task.id!, rec.id)}
                                className="shrink-0 bg-indigo-600 text-white px-3 py-1.5 rounded-md text-xs font-medium hover:bg-indigo-700 transition-colors"
                              >
                                จับคู่
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {recommendations.length === 0 && (
                      <div className="mt-3 text-sm text-gray-500 flex items-center mb-3">
                        <AlertCircle className="w-4 h-4 mr-1 text-amber-500" /> ไม่มีงานที่คล้ายกันจากครู
                      </div>
                    )}

                    <div className="mt-3 border-t border-gray-100 pt-3">
                      {selectedChildTask === task.id ? (
                        <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
                          <label className="block text-xs font-medium text-gray-700 mb-1">เลือกงานของครูจากรายการทั้งหมด:</label>
                          <select 
                            value={manualTeacherColId}
                            onChange={(e) => setManualTeacherColId(e.target.value)}
                            className="w-full p-2 mb-2 text-sm bg-white border border-gray-300 rounded-lg outline-none focus:border-indigo-500"
                          >
                            <option value="" disabled>-- เลือกงาน --</option>
                            {filteredTeacherCols.map(col => (
                              <option key={col.id} value={col.id}>
                                [{col.subject}] {col.column_name} {col.is_checked ? '(✓)' : ''}
                              </option>
                            ))}
                          </select>
                          <div className="flex justify-end gap-2">
                            <button 
                              onClick={() => setSelectedChildTask(null)}
                              className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700"
                            >
                              ยกเลิก
                            </button>
                            <button 
                              disabled={!manualTeacherColId}
                              onClick={() => {
                                handleLink(task.id!, manualTeacherColId);
                                setManualTeacherColId('');
                              }}
                              className="bg-indigo-600 text-white px-3 py-1.5 rounded-md text-xs font-medium hover:bg-indigo-700 disabled:opacity-50"
                            >
                              ยืนยันจับคู่
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button 
                          onClick={() => {
                            setSelectedChildTask(task.id!);
                            setManualTeacherColId('');
                          }}
                          className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center"
                        >
                          + ค้นหาและจับคู่เอง (Manual)
                        </button>
                      )}
                    </div>
                  </div>
                )
              })
            )}

            {mappedTasks.length > 0 && (
              <div className="mt-8">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 px-2">จับคู่แล้ว (รอครูตรวจ)</h3>
                <div className="space-y-3">
                  {mappedTasks.map(task => {
                    const linkedCol = teacherCols.find(c => c.id === task.teacher_column_id);
                    return (
                      <div key={task.id} className="bg-white p-5 rounded-2xl shadow-sm border border-amber-200 relative overflow-hidden transition-all hover:shadow-md">
                        <div className="absolute top-0 right-0 bg-amber-500 text-white text-[10px] sm:text-xs font-bold px-3 py-1 rounded-bl-xl shadow-sm">
                          รอครูอัปเดตชีต
                        </div>
                        <div className="mb-4 pr-24">
                          <div className="text-xs font-bold text-indigo-600 mb-1">{task.subject}</div>
                          <p className="text-sm sm:text-base font-medium text-gray-900 leading-snug">{task.task_name}</p>
                          <div className="text-xs text-gray-500 mt-2.5 bg-gray-50 inline-flex items-center px-2.5 py-1.5 rounded-lg border border-gray-100">
                            <ArrowRightLeft className="w-3 h-3 mr-1.5 text-indigo-400" /> จากครู: {linkedCol?.column_name || 'ไม่ทราบชื่อ'}
                          </div>
                        </div>
                        
                        <div className="flex justify-end pt-3 border-t border-gray-100 mt-2">
                          <button 
                            onClick={() => handleReject(task.id!)} 
                            className="bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 hover:border-red-300 px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all flex items-center active:scale-95 shadow-sm"
                          >
                            <X className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5" />
                            ให้ลูกแก้ใหม่
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

          </div>

          <div className="space-y-4">
             <div className="flex items-center justify-between bg-white py-3 px-4 rounded-xl border border-gray-100 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-800 flex items-center">
                  <span className="bg-emerald-100 text-emerald-800 w-8 h-8 rounded-full flex items-center justify-center mr-3 font-bold">2</span>
                  ข้อมูลทั้งหมดจากครู
                </h2>
             </div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="max-h-[600px] overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ชื่องาน (ครู)</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">สถานะ</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredTeacherCols.map((col) => (
                      <tr key={col.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="text-xs font-semibold text-indigo-600 mb-0.5">{col.subject}</div>
                          <div className="text-sm text-gray-900 font-medium">{col.column_name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          {col.is_checked ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                              <CheckCircle2 className="w-3 h-3 mr-1" /> ตรวจแล้ว
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
                              <XCircle className="w-3 h-3 mr-1 text-gray-400" /> รอส่ง
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {filteredTeacherCols.length === 0 && (
                      <tr>
                        <td colSpan={2} className="px-6 py-8 text-center text-gray-500 text-sm">
                          ไม่มีข้อมูล ลองกด "อัปเดตข้อมูลจากครู"
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
