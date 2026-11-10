'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { Plus, BookOpen, Clock, CheckCircle, Send, AlertCircle, Sparkles, Edit2, X, Save, Trash2, Filter, RefreshCcw, StickyNote, RotateCcw, CheckCircle2, GraduationCap, Home, CheckSquare, FileText, AlertTriangle, History } from 'lucide-react';
import { ChildTask, TaskStatus, TeacherColumn, getChildTasks, updateChildTask, getTeacherColumns, getGlobalSettings } from '@/lib/db';
import { clsx } from 'clsx';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import confetti from 'canvas-confetti';
import { isHomeworkDemo, getHomeworkDemo } from '@/lib/homeworkDemo';
import { WAIT_ALERT_DAYS, isWaitingForTeacher, isWaitTooLong, waitingDays, waitingSince } from '@/lib/homeworkRules';

// Fallback teacher subjects (aligned with official teacher columns)
const FALLBACK_TEACHER_SUBJECTS = [
  'การงานอาชีพ',
  'คณิตศาสตร์+เพิ่มเติม',
  'ทักษะภาษาจีน',
  'ประวัติศาสตร์',
  'ภาษาอังกฤษ',
  'ภาษาไทย',
  'วิทยาศาสตร์',
  'ศิลปะ',
  'สังคมฯ',
  'สุขศึกษา',
  'เทคโนโลยี(วิทยาการคำนวณ)',
  'โครงงานบูรณาการ'
];

function HomeworkDashboard() {
  const searchParams = useSearchParams();
  // ?demo=1 (เฉพาะตอน dev) = ใช้ข้อมูลสมมติ ไม่อ่าน/เขียน Firestore
  const demo = isHomeworkDemo(searchParams);
  const defaultFilter = searchParams.get('subject') || 'All';
  // กดงานมาจากหน้างานทั้งหมด -> เลื่อนไปหาและไฮไลต์การ์ดงานชิ้นนั้น
  const focusColId = searchParams.get('task');

  const [studentName, setStudentName] = useState<string | null>(null);
  const [tasks, setTasks] = useState<ChildTask[]>([]);
  const [teacherCols, setTeacherCols] = useState<TeacherColumn[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [sheetUrls, setSheetUrls] = useState<string[]>([]);

  // Filter states (หน้านี้แสดงเฉพาะงานค้างจากครู - ไม่มีระบบงานส่วนตัวแล้ว)
  const [filterSubject, setFilterSubject] = useState<string>(defaultFilter);

  // รายชื่อวิชาของครู (ดึงจาก TeacherColumn และ ChildTask สาย official)
  const teacherSubjects = useMemo(() => {
    const subjects = new Set<string>();
    teacherCols.forEach(c => {
      if (c.subject && typeof c.subject === 'string' && c.subject.trim()) {
        subjects.add(c.subject.trim());
      }
    });
    tasks.forEach(t => {
      if ((t.task_type === 'official' || !!t.teacher_column_id) && t.subject && typeof t.subject === 'string' && t.subject.trim()) {
        subjects.add(t.subject.trim());
      }
    });

    if (subjects.size === 0) {
      return [...FALLBACK_TEACHER_SUBJECTS].sort((a, b) => a.localeCompare(b, 'th'));
    }

    return Array.from(subjects).sort((a, b) => a.localeCompare(b, 'th'));
  }, [teacherCols, tasks]);

  useEffect(() => {
    const urlSubject = searchParams.get('subject');

    if (urlSubject) {
      setFilterSubject(urlSubject);
    } else {
      setFilterSubject('All');
    }
  }, [searchParams]);

  useEffect(() => {
    const init = async () => {
      let savedName = localStorage.getItem('hw_student_name');
      let savedUrlsStr = localStorage.getItem('hw_sheet_urls');

      const globalSettings = await getGlobalSettings();
      if (globalSettings) {
        savedName = globalSettings.student_name || savedName;
        savedUrlsStr = globalSettings.sheet_urls || savedUrlsStr;
        if (savedName) localStorage.setItem('hw_student_name', savedName);
        if (savedUrlsStr) localStorage.setItem('hw_sheet_urls', savedUrlsStr);
      }

      setStudentName(savedName || null);

      let urls: string[] = [];
      if (savedUrlsStr) {
        urls = savedUrlsStr.split('\n').map(u => u.trim()).filter(Boolean);
      }
      setSheetUrls(urls);

      if (savedName) {
        loadTasks(savedName);
      } else {
        setLoading(false);
      }
    };
    init();
  }, []);

  const loadTasks = async (name: string) => {
    setLoading(true);
    if (demo) {
      const d = getHomeworkDemo(name);
      setTeacherCols(d.cols);
      setTasks(d.tasks);
      setLoading(false);
      return;
    }
    try {
      const [data, cols] = await Promise.all([
        getChildTasks(name),
        getTeacherColumns(name)
      ]);
      setTeacherCols(cols);

      // Sort tasks
      data.sort((a, b) => {
        const timeA = (a.created_at as any)?.toMillis?.() || 0;
        const timeB = (b.created_at as any)?.toMillis?.() || 0;
        return timeB - timeA;
      });
      setTasks(data);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncFromTeacher = async () => {
    if (demo) return;
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
        await loadTasks(studentName);
      } else {
        alert('เกิดข้อผิดพลาดในการดึงข้อมูลจาก Google Sheet');
      }
    } catch (error) {
      console.error('Sync error:', error);
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setSyncing(false);
    }
  };

  const handleUpdateStatus = async (taskId: string, status: TaskStatus) => {
    try {
      const task = tasks.find(t => t.id === taskId);
      if (!task) return;

      let newRevision = task.revision_count || 1;
      const history = [...(task.revision_history || [])];

      if (history.length === 0) {
        history.push({
          revision: newRevision,
          action: 'created',
          note: `สร้างงาน: ${task.task_name}`,
          timestamp: (task.created_at as any)?.toMillis?.() || Date.now()
        });
      }

      if (status === 'Rework') {
        newRevision += 1;
        history.push({
          revision: newRevision,
          action: 'rework_requested',
          note: `ขอให้แก้ไขใหม่ (เข้าสู่รอบที่ ${newRevision})`,
          timestamp: Date.now()
        });
      } else if (status === 'Submitted') {
        history.push({
          revision: newRevision,
          action: 'submitted',
          note: 'ส่งงานให้ครูตรวจ',
          timestamp: Date.now()
        });
      } else if (status === 'Verified') {
        history.push({
          revision: newRevision,
          action: 'verified',
          note: 'ตรวจผ่านเรียบร้อยสมบูรณ์',
          timestamp: Date.now()
        });
      } else if (status === 'Done') {
        history.push({
          revision: newRevision,
          action: 'parent_reviewed',
          note: 'ทำเสร็จเรียบร้อย (รอตรวจ/รอส่ง)',
          timestamp: Date.now()
        });
      }

      const updates: Partial<ChildTask> = {
        status,
        revision_count: newRevision,
        revision_history: history
      };

      setTasks(tasks.map(t => t.id === taskId ? { ...t, ...updates } : t));
      if (!demo) await updateChildTask(taskId, updates);

      if (status === 'Verified') {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.8 }
        });
      }
    } catch (error) {
      console.error('Error updating task status:', error);
      loadTasks(studentName!);
    }
  };

  const handleUpdateTask = async (taskId: string, updates: Partial<ChildTask>) => {
    try {
      setTasks(tasks.map(t => t.id === taskId ? { ...t, ...updates } : t));
      if (!demo) await updateChildTask(taskId, updates);
    } catch (error) {
      console.error('Error updating task:', error);
      loadTasks(studentName!);
    }
  };


  const uniqueSubjects = teacherSubjects;

  // Safety synchronization: if current filterSubject is not in uniqueSubjects, reset to 'All'
  useEffect(() => {
    if (filterSubject !== 'All' && uniqueSubjects.length > 0 && !uniqueSubjects.includes(filterSubject)) {
      setFilterSubject('All');
    }
  }, [uniqueSubjects, filterSubject]);

  // งานค้างจากครู = งานที่ยังมีช่องอยู่ในชีทครูตอนนี้ และครูยังไม่ติ๊ก
  // (ดูจากช่องติ๊กในชีทโดยตรง ไม่ใช่สถานะฝั่งลูก - งานที่ครูลบช่องออกจากชีทไปแล้วจะไม่ค้างอยู่ในหน้านี้)
  const uncheckedColIds = useMemo(() => {
    return new Set(teacherCols.filter(c => !c.is_checked).map(c => c.id));
  }, [teacherCols]);

  const countOfficial = useMemo(() => {
    return tasks.filter(t => !!t.teacher_column_id && uncheckedColIds.has(t.teacher_column_id)).length;
  }, [tasks, uncheckedColIds]);

  // งานที่ทำเสร็จแล้วรอครูติ๊กเกิน WAIT_ALERT_DAYS วัน
  const countWaitTooLong = useMemo(() => {
    return tasks.filter(t => !!t.teacher_column_id && uncheckedColIds.has(t.teacher_column_id) && isWaitTooLong(t)).length;
  }, [tasks, uncheckedColIds]);

  useEffect(() => {
    if (loading || !focusColId) return;
    const timer = setTimeout(() => {
      document.getElementById(`task-${focusColId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 300);
    return () => clearTimeout(timer);
  }, [loading, focusColId, tasks]);

  const filteredTasks = useMemo(() => {
    let result = tasks;

    // เฉพาะงานที่ครูยังไม่ติ๊ก
    result = result.filter(t => !!t.teacher_column_id && uncheckedColIds.has(t.teacher_column_id));

    // Filter by subject
    if (filterSubject !== 'All') {
      result = result.filter(t => t.subject === filterSubject);
    }

    // Sort tasks by sequence ascending if available, or created_at descending
    return [...result].sort((a, b) => {
      let seqA = Infinity;
      let seqB = Infinity;

      if (a.teacher_column_id) {
        const colA = teacherCols.find(c => c.id === a.teacher_column_id);
        if (colA && typeof colA.sequence === 'number') seqA = colA.sequence;
      }
      if (b.teacher_column_id) {
        const colB = teacherCols.find(c => c.id === b.teacher_column_id);
        if (colB && typeof colB.sequence === 'number') seqB = colB.sequence;
      }

      if (seqA === seqB) {
        const timeA = (a.created_at as any)?.toMillis?.() || 0;
        const timeB = (b.created_at as any)?.toMillis?.() || 0;
        return timeB - timeA;
      }
      return seqA - seqB;
    });
  }, [tasks, filterSubject, teacherCols, uncheckedColIds]);

  if (!studentName) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 animate-in fade-in duration-700">
        <div className="w-24 h-24 bg-indigo-100 rounded-full flex items-center justify-center mb-6 shadow-inner">
          <AlertCircle className="w-12 h-12 text-indigo-500" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-4">ยินดีต้อนรับสู่ HW Tracker!</h2>
        <p className="text-gray-500 max-w-md mb-8 text-lg">ดูเหมือนว่าคุณยังไม่ได้เลือกชื่อนักเรียน กรุณาตั้งค่าเพื่อเริ่มต้นใช้งานระบบ</p>
        <Link href="/settings" className="bg-indigo-600 text-white px-8 py-3 rounded-full font-medium hover:bg-indigo-700 hover:shadow-lg transition-all transform hover:-translate-y-1">
          ไปหน้าตั้งค่า
        </Link>
      </div>
    );
  }

  const activeTasks = tasks.filter(t => t.status !== 'Verified');

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">

      {/* Header section adhering to AGENTS.md Standard Page Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center bg-white p-6 sm:p-7 rounded-3xl border border-[#e2e8f0] shadow-sm gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 flex items-center">
            <BookOpen className="w-6 h-6 text-[#597ecf] mr-2 shrink-0" />
            งานค้างจากครู (Pending Work)
          </h1>
          <p className="text-gray-500 mt-1 text-sm sm:text-base">งานที่ครูยังไม่ได้ติ๊กในชีตของ {studentName} ทำเสร็จแล้วกด &quot;ทำเสร็จแล้ว&quot; งานจะไปรอครูติ๊ก ถ้าเกิน {WAIT_ALERT_DAYS} วันครูยังไม่ติ๊กจะขึ้นเตือน</p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto lg:shrink-0">
          <button
            onClick={handleSyncFromTeacher}
            disabled={syncing}
            className="h-[42px] px-4 rounded-xl text-sm font-semibold bg-[#597ecf] text-white hover:bg-[#486cb8] flex items-center justify-center shadow-xs hover:shadow-md active:scale-95 transition-all disabled:opacity-50 w-full sm:w-auto cursor-pointer whitespace-nowrap shrink-0"
            title="อัปเดตข้อมูลการบ้านทั้งหมดจาก Google Sheet ของครู"
          >
            <RefreshCcw className={clsx("w-4 h-4 mr-2", syncing && "animate-spin")} />
            {syncing ? 'กำลังดึงข้อมูล...' : 'อัปเดตข้อมูลจากครู'}
          </button>
        </div>
      </div>

      {/* Filter Toolbar Card */}
      <div className="bg-white p-4 rounded-2xl shadow-xs border border-[#e2e8f0] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-2 w-full md:w-auto">
          <span className="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 whitespace-nowrap bg-[#597ecf] text-white shadow-xs">
            <CheckSquare className="w-4 h-4" />
            <span>งานค้างจากครู</span>
            <span className="px-2 py-0.5 rounded-full text-xs font-extrabold bg-white/20 text-white">
              {countOfficial}
            </span>
          </span>
          {countWaitTooLong > 0 && (
            <span className="px-3 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 whitespace-nowrap bg-rose-50 text-rose-700 border border-rose-200">
              <AlertTriangle className="w-4 h-4" />
              รอครูติ๊กเกิน {WAIT_ALERT_DAYS} วัน: {countWaitTooLong}
            </span>
          )}
        </div>

        {/* Subject Filter Dropdown */}
        {tasks.length > 0 && (
          <div className="flex items-center bg-[#f4f7fa] border border-[#e2e8f0] rounded-xl px-3 h-[42px] w-full md:w-auto self-stretch md:self-auto">
            <Filter className="w-4 h-4 text-gray-400 mr-2 shrink-0" />
            <select
              value={uniqueSubjects.includes(filterSubject) ? filterSubject : 'All'}
              onChange={(e) => setFilterSubject(e.target.value)}
              className="h-full text-xs sm:text-sm border-none outline-none focus:ring-0 bg-transparent text-gray-700 font-medium w-full cursor-pointer"
            >
              <option key="filter-all" value="All">ทุกวิชา</option>
              {uniqueSubjects.map(sub => (
                <option key={`filter-subj-${sub}`} value={sub}>{sub}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#597ecf]"></div>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="bg-white border border-[#e2e8f0] rounded-3xl p-12 text-center shadow-xs">
          <div className="bg-[#eef3fc] w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-2xs">
            <CheckCircle className="w-8 h-8 text-[#597ecf]" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            เย้! ไม่มีงานค้าง ครูติ๊กครบทุกงานแล้ว
          </h3>
          <p className="text-gray-500 mb-5 text-sm max-w-md mx-auto">
            กด &quot;อัปเดตข้อมูลจากครู&quot; เพื่อเช็กว่าครูสั่งงานใหม่หรือยัง
          </p>
          <button
              onClick={handleSyncFromTeacher}
              disabled={syncing}
              className="inline-flex items-center bg-[#597ecf] hover:bg-[#486cb8] text-white px-6 py-2.5 rounded-xl text-sm font-bold transition-all shadow-xs active:scale-95 cursor-pointer"
            >
              <RefreshCcw className={clsx("w-4 h-4 mr-2", syncing && "animate-spin")} />
              {syncing ? 'กำลังดึงข้อมูล...' : 'อัปเดตข้อมูลจากครู'}
            </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 1. ยังไม่ทำ (รวมงานที่ครูให้แก้ไข) */}
          <TaskColumn
            title="ยังไม่ทำ"
            icon={<BookOpen className="w-5 h-5 text-[#57627a]" />}
            tasks={filteredTasks.filter(t => !isWaitingForTeacher(t))}
            bgColor="bg-[#f8fafc]"
            borderColor="border-[#e2e8f0]"
            headerColor="bg-[#eff2f7]"
          >
            {(task: ChildTask) => (
              <TaskCard key={task.id} task={task} highlighted={task.teacher_column_id === focusColId} onUpdate={handleUpdateStatus} onUpdateTask={handleUpdateTask}>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => handleUpdateStatus(task.id!, 'Submitted')}
                    className={clsx(
                      "flex-1 px-3.5 py-2.5 rounded-xl text-sm font-bold active:scale-95 transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer",
                      task.status === 'Rework'
                        ? "bg-rose-600 hover:bg-rose-700 text-white"
                        : "bg-[#597ecf] hover:bg-[#486cb8] text-white"
                    )}
                  >
                    <CheckCircle className="w-4 h-4" />
                    {task.status === 'Rework' ? 'แก้ไขเสร็จแล้ว' : 'ทำเสร็จแล้ว'}
                  </button>
                </div>
              </TaskCard>
            )}
          </TaskColumn>

          {/* 2. ทำเสร็จแล้ว รอครูติ๊ก (รอนานสุดอยู่บนสุด) */}
          <TaskColumn
            title="ทำเสร็จแล้ว (รอครูติ๊ก)"
            icon={<Clock className="w-5 h-5 text-[#597ecf]" />}
            tasks={filteredTasks.filter(isWaitingForTeacher).sort((a, b) => waitingSince(a) - waitingSince(b))}
            bgColor="bg-[#eef3fc]/20"
            borderColor="border-[#597ecf]/30"
            headerColor="bg-[#eef3fc]"
          >
            {(task: ChildTask) => {
              const days = waitingDays(task);
              const tooLong = days >= WAIT_ALERT_DAYS;
              return (
                <TaskCard
                  key={task.id}
                  task={task}
                  highlighted={task.teacher_column_id === focusColId}
                  onUpdate={handleUpdateStatus}
                  onUpdateTask={handleUpdateTask}
                  onUndo={(t: any) => handleUpdateStatus(t.id, 'Todo')}
                >
                  <div className="mt-3 mb-1">
                    <div className={clsx(
                      "flex items-center justify-between gap-2 p-2.5 rounded-xl border",
                      tooLong ? "bg-rose-50 border-rose-200" : "bg-amber-50 border-amber-200"
                    )}>
                      <span className={clsx("text-xs font-bold flex items-start gap-1.5", tooLong ? "text-rose-800" : "text-amber-800")}>
                        {tooLong
                          ? <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                          : <Clock className="w-4 h-4 text-amber-600 shrink-0" />}
                        {tooLong ? (
                          <span>
                            รอครูติ๊กมา {days} วันแล้ว
                            <span className="block font-medium text-rose-700">ตามงานกับครู อาจยังไม่ได้ส่ง หรือต้องแก้ไข</span>
                          </span>
                        ) : (
                          <span>รอครูติ๊ก · ทำเสร็จ{days === 0 ? 'วันนี้' : ` ${days} วันที่แล้ว`}</span>
                        )}
                      </span>
                      <button
                        onClick={() => handleUpdateStatus(task.id!, 'Rework')}
                        className="text-xs text-rose-600 hover:text-rose-700 bg-white hover:bg-rose-50 border border-rose-200 px-3 min-h-[36px] rounded-lg font-semibold flex items-center gap-1 cursor-pointer whitespace-nowrap transition-all active:scale-95 shadow-2xs shrink-0"
                        title="ครูให้กลับมาแก้ไขใหม่ ดีดกลับไปช่องยังไม่ทำ"
                      >
                        <RotateCcw className="w-3 h-3 text-rose-500" /> ครูให้แก้ไข
                      </button>
                    </div>
                  </div>
                </TaskCard>
              );
            }}
          </TaskColumn>
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  return (
    <Suspense fallback={
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#597ecf]"></div>
      </div>
    }>
      <HomeworkDashboard />
    </Suspense>
  );
}

// Sub-components

function TaskColumn({ title, icon, tasks, children, bgColor, borderColor, headerColor }: any) {
  return (
    <div className={clsx("rounded-3xl border flex flex-col h-full bg-white shadow-xs", borderColor)}>
      <div className={clsx("px-5 py-4 border-b flex items-center justify-between rounded-t-3xl", borderColor, headerColor)}>
        <h3 className="font-bold text-gray-900 flex items-center text-sm sm:text-base">
          {icon} <span className="ml-2">{title}</span>
        </h3>
        <span className="bg-white text-gray-700 text-xs font-bold px-2.5 py-1 rounded-full shadow-2xs border border-gray-200/50">{tasks.length}</span>
      </div>
      <div className="p-4 flex-1 space-y-3 overflow-y-auto">
        {tasks.map((task: ChildTask) => children(task))}
        {tasks.length === 0 && (
          <div className="text-center py-12 text-gray-400 text-sm">
            ไม่มีงานในช่องนี้
          </div>
        )}
      </div>
    </div>
  );
}

function TaskCard({ task, children, onUpdateTask, onUndo, highlighted }: any) {
  const [isEditing, setIsEditing] = useState(false);
  const [editAssignedDate, setEditAssignedDate] = useState(task.assigned_date || task.date || '');
  const [editDueDate, setEditDueDate] = useState(task.due_date || '');
  const [editNote, setEditNote] = useState(task.note || '');
  const [editTags, setEditTags] = useState<string[]>(task.tags || []);

  const handleSaveEdit = () => {
    const updates: Partial<ChildTask> = {};
    if (editAssignedDate !== (task.assigned_date || task.date || '')) {
      updates.assigned_date = editAssignedDate;
      updates.date = editAssignedDate;
    }
    if (editDueDate !== (task.due_date || '')) {
      updates.due_date = editDueDate;
    }
    if (editNote !== (task.note || '')) {
      updates.note = editNote;
    }
    if (JSON.stringify(editTags) !== JSON.stringify(task.tags || [])) {
      updates.tags = editTags;
    }

    if (Object.keys(updates).length > 0) {
      onUpdateTask(task.id, updates);
    }
    setIsEditing(false);
  };

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div
      id={task.teacher_column_id ? `task-${task.teacher_column_id}` : undefined}
      className={clsx(
        "bg-white p-4 rounded-2xl shadow-xs border hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 relative overflow-hidden group scroll-mt-24",
        highlighted ? "border-[#597ecf] ring-4 ring-[#597ecf]/30" : "border-[#e2e8f0]"
      )}
    >
      {task.status === 'Rework' && (
        <div className="absolute top-0 right-0 bg-rose-600 text-white text-[10px] font-extrabold px-2.5 py-0.5 rounded-bl-xl z-10 shadow-xs pointer-events-none flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" /> ต้องแก้!
        </div>
      )}

      <div className="flex justify-between items-start mb-2.5 gap-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-bold text-[#597ecf] bg-[#eef3fc] px-2.5 py-0.5 rounded-lg border border-[#597ecf]/20">
            {task.subject}
          </span>
          <span className="text-[10px] font-bold text-[#597ecf] bg-[#eef3fc] px-2 py-0.5 rounded-md border border-[#597ecf]/30 flex items-center gap-1">
            <CheckSquare className="w-2.5 h-2.5" /> ชีตครู
          </span>
          {task.revision_count && task.revision_count > 1 && (
            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 flex items-center gap-1">
              <History className="w-2.5 h-2.5" /> รอบที่ {task.revision_count}
            </span>
          )}
          {task.tags?.includes('งานในคาบ') && (
            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 flex items-center gap-1">
              <GraduationCap className="w-3 h-3" /> งานในคาบ
            </span>
          )}
          {task.tags?.includes('การบ้าน') && (
            <span className="text-[10px] font-bold text-[#597ecf] bg-[#eef3fc] px-2 py-0.5 rounded-md border border-[#597ecf]/30 flex items-center gap-1">
              <Home className="w-3 h-3" /> การบ้าน
            </span>
          )}
        </div>

        {!isEditing && (
          <div className="flex items-center gap-1 opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 transition-opacity bg-white pl-1">
            {onUndo && (
              <button
                onClick={() => onUndo(task)}
                className="text-gray-400 hover:text-orange-600 p-2.5 -m-1.5 rounded-lg hover:bg-orange-50 cursor-pointer transition-colors"
                title="ดึงกลับมา"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              onClick={() => {
                setIsEditing(true);
                setEditAssignedDate(task.assigned_date || task.date || '');
                setEditDueDate(task.due_date || '');
                setEditNote(task.note || '');
                setEditTags(task.tags || []);
              }}
              className="text-gray-400 hover:text-[#597ecf] p-2.5 -m-1.5 rounded-lg hover:bg-[#eef3fc] cursor-pointer transition-colors"
              title="แก้ไขรายละเอียด"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {isEditing ? (
        <div className="mb-2 space-y-2.5 bg-[#f4f7fa] p-3.5 rounded-2xl border border-[#e2e8f0]">
              <div className="bg-[#eff2f7] p-2.5 rounded-xl border border-[#cbd3e0]">
                <span className="text-[10px] font-bold text-[#57627a] block mb-0.5">
                  ชื่องานหลัก (อิงตามชีตครู - ล็อกไว้)
                </span>
                <p className="text-xs sm:text-sm font-bold text-gray-800 leading-snug">{task.task_name}</p>
              </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-bold text-gray-500 mb-0.5">วันที่มอบหมาย</label>
              <input
                type="date"
                value={editAssignedDate}
                onChange={(e) => setEditAssignedDate(e.target.value)}
                className="w-full text-xs text-gray-700 bg-white border border-[#e2e8f0] rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#597ecf]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-500 mb-0.5">กำหนดส่งงาน</label>
              <input
                type="date"
                value={editDueDate}
                onChange={(e) => setEditDueDate(e.target.value)}
                className="w-full text-xs text-gray-700 bg-white border border-[#e2e8f0] rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#597ecf]"
              />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-500 mb-0.5">โน้ตช่วยจำ</label>
            <input
              type="text"
              value={editNote}
              onChange={(e) => setEditNote(e.target.value)}
              placeholder="โน้ตเพิ่มเติม เช่น หน้า 10-12..."
              className="w-full text-xs text-gray-700 bg-white border border-[#e2e8f0] rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#597ecf]"
            />
          </div>

          {/* Checklist options in Edit Mode */}
          <div className="pt-1">
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
              ประเภทงาน (เลือกได้หลายข้อ)
            </label>
            <div className="flex gap-2 flex-wrap items-center">
              {[
                { name: 'งานในคาบ', icon: GraduationCap, activeClass: 'bg-amber-500 text-white shadow-xs border-amber-500' },
                { name: 'การบ้าน', icon: Home, activeClass: 'bg-[#597ecf] text-white shadow-xs border-[#597ecf]' }
              ].map((item) => {
                const isChecked = editTags.includes(item.name);
                const ItemIcon = item.icon;
                return (
                  <button
                    type="button"
                    key={item.name}
                    onClick={() => {
                      if (isChecked) {
                        setEditTags(editTags.filter(t => t !== item.name));
                      } else {
                        setEditTags([...editTags, item.name]);
                      }
                    }}
                    className={clsx(
                      "px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 border active:scale-95",
                      isChecked
                        ? item.activeClass
                        : "bg-white border-[#e2e8f0] text-gray-600 hover:bg-gray-50"
                    )}
                  >
                    <ItemIcon className="w-3.5 h-3.5 shrink-0" />
                    <span>{item.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-2 pt-2 border-t border-[#e2e8f0]">
            <button
              onClick={() => {
                setIsEditing(false);
                setEditAssignedDate(task.assigned_date || task.date || '');
                setEditDueDate(task.due_date || '');
                setEditNote(task.note || '');
                setEditTags(task.tags || []);
              }}
              className="px-3 py-1.5 text-xs font-semibold text-gray-600 bg-white border border-[#e2e8f0] rounded-lg hover:bg-gray-50 cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              onClick={handleSaveEdit}
              className="px-3 py-1.5 text-xs font-bold text-white bg-[#597ecf] hover:bg-[#486cb8] rounded-lg shadow-xs cursor-pointer flex items-center gap-1"
            >
              <Save className="w-3.5 h-3.5" /> บันทึก
            </button>
          </div>
        </div>
      ) : (
        <div className="mb-2">
          <p className="text-sm font-medium text-gray-900 line-clamp-2">{task.task_name}</p>

          {(task.assigned_date || task.due_date || task.date || task.note) && (
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100 flex-wrap gap-1.5 text-xs text-gray-500">
              <div className="flex items-center gap-2 flex-wrap text-[11px]">
                {(task.assigned_date || task.date) && (
                  <span className="text-gray-500">มอบหมาย: <strong className="text-gray-700 font-medium">{task.assigned_date || task.date}</strong></span>
                )}
                {task.due_date && (
                  <span className={clsx(
                    "font-semibold flex items-center gap-1 px-1.5 py-0.5 rounded-md",
                    !['Verified', 'Done', 'Submitted'].includes(task.status) && task.due_date < todayStr
                      ? "bg-rose-50 text-rose-600 border border-rose-200"
                      : "text-[#597ecf] bg-[#eef3fc]"
                  )}>
                    ส่ง: {task.due_date}
                  </span>
                )}
                {!task.assigned_date && !task.due_date && task.date && (
                  <span className="text-gray-400">{task.date}</span>
                )}
              </div>

              {task.note && (
                <div className="relative group/note cursor-help flex items-center ml-auto">
                  <StickyNote className="w-3.5 h-3.5 text-amber-500" />
                  <div className="absolute bottom-full right-0 mb-1 w-max max-w-xs bg-gray-900 text-white text-xs px-2.5 py-1 rounded-lg opacity-0 group-hover/note:opacity-100 pointer-events-none transition-opacity z-50 shadow-lg break-words">
                    {task.note}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {children}
    </div>
  );
}
