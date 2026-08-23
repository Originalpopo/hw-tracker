'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { Plus, BookOpen, Clock, CheckCircle, Send, AlertCircle, Sparkles, Edit2, X, Save, Trash2, Filter, RefreshCcw, StickyNote, RotateCcw, CheckCircle2 } from 'lucide-react';
import { ChildTask, TaskStatus, TeacherColumn, getChildTasks, addChildTask, updateChildTaskStatus, updateChildTask, deleteChildTask, getTeacherColumns, getGlobalSettings } from '@/lib/db';
import { clsx } from 'clsx';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import confetti from 'canvas-confetti';

const DEFAULT_SUBJECTS = ['ภาษาไทย', 'คณิตศาสตร์', 'วิทยาศาสตร์', 'ภาษาอังกฤษ', 'สังคมฯ', 'ประวัติศาสตร์', 'สุขศึกษา', 'ศิลปะ', 'การงานอาชีพ', 'อื่นๆ'];

function HomeworkDashboard() {
  const searchParams = useSearchParams();
  const defaultFilter = searchParams.get('subject') || 'All';

  const [studentName, setStudentName] = useState<string | null>(null);
  const [tasks, setTasks] = useState<ChildTask[]>([]);
  const [teacherCols, setTeacherCols] = useState<TeacherColumn[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [sheetUrls, setSheetUrls] = useState<string[]>([]);
  
  // Form state
  const [isAdding, setIsAdding] = useState(false);
  const [newTaskName, setNewTaskName] = useState('');
  const [newSubject, setNewSubject] = useState(DEFAULT_SUBJECTS[0]);
  const [customSubject, setCustomSubject] = useState('');
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
  const [newNote, setNewNote] = useState('');

  // Filter states
  const [filterSubject, setFilterSubject] = useState<string>(defaultFilter);
  const [filterType, setFilterType] = useState<'all' | 'official' | 'personal'>('all');

  const availableSubjects = useMemo(() => {
    const subjects = new Set<string>();
    if (teacherCols.length > 0) {
      teacherCols.forEach(col => subjects.add(col.subject));
    } else {
      DEFAULT_SUBJECTS.forEach(s => subjects.add(s));
    }
    subjects.delete('อื่นๆ');
    const result = Array.from(subjects).sort();
    result.push('อื่นๆ');
    return result;
  }, [teacherCols]);

  useEffect(() => {
    if (availableSubjects.length > 0 && !availableSubjects.includes(newSubject)) {
      setNewSubject(availableSubjects[0]);
    }
  }, [availableSubjects, newSubject]);

  useEffect(() => {
    const init = async () => {
      let savedName = localStorage.getItem('hw_student_name');
      let savedUrlsStr = localStorage.getItem('hw_sheet_urls');
      const oldUrl = localStorage.getItem('hw_sheet_url');

      if (!savedName || (!savedUrlsStr && !oldUrl)) {
        const globalSettings = await getGlobalSettings();
        if (globalSettings) {
          savedName = globalSettings.student_name;
          savedUrlsStr = globalSettings.sheet_urls;
          if (savedName) localStorage.setItem('hw_student_name', savedName);
          if (savedUrlsStr) localStorage.setItem('hw_sheet_urls', savedUrlsStr);
        }
      }
      
      setStudentName(savedName || null);

      let urls: string[] = [];
      if (savedUrlsStr) {
        urls = savedUrlsStr.split('\n').map(u => u.trim()).filter(Boolean);
      } else if (oldUrl) {
        urls = [oldUrl];
      }
      setSheetUrls(urls);

      if (savedName) {
        loadTasks(savedName);
      } else {
        setLoading(false);
      }

      const savedFilter = localStorage.getItem('hw_filter_subject');
      const urlSubject = searchParams.get('subject');
      if (urlSubject) {
        setFilterSubject(urlSubject);
        localStorage.setItem('hw_filter_subject', urlSubject);
      } else if (savedFilter) {
        setFilterSubject(savedFilter);
      }
    };
    init();
  }, []);

  const loadTasks = async (name: string) => {
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

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalSubject = newSubject === 'อื่นๆ' ? customSubject.trim() : newSubject;
    if (!studentName || !newTaskName.trim() || !finalSubject) return;

    try {
      await addChildTask({
        subject: finalSubject,
        task_name: newTaskName.trim(),
        status: 'Todo',
        teacher_column_id: null,
        task_type: 'personal',
        student_name: studentName,
        date: newDate,
        note: newNote.trim()
      });
      setNewTaskName('');
      setCustomSubject('');
      setNewDate(new Date().toISOString().split('T')[0]);
      setNewNote('');
      setIsAdding(false);
      loadTasks(studentName);
    } catch (error) {
      console.error('Error adding task:', error);
      alert('ไม่สามารถเพิ่มงานได้ โปรดตรวจสอบการเชื่อมต่อ');
    }
  };

  const handleUpdateStatus = async (taskId: string, newStatus: TaskStatus) => {
    if (!studentName) return;
    try {
      if (newStatus === 'Done' || newStatus === 'Submitted' || newStatus === 'Verified') {
        confetti({
          particleCount: 50,
          spread: 70,
          origin: { y: 0.7 },
          colors: ['#22c55e', '#eab308', '#3b82f6', '#8b5cf6']
        });
      }

      const targetTask = tasks.find(t => t.id === taskId);

      // Optimistic update
      setTasks(tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
      await updateChildTaskStatus(taskId, newStatus);

      // If status changed to Rework on a teacher task, automatically release any linked personal note
      if (newStatus === 'Rework' && targetTask?.teacher_column_id) {
        const linkedPersonalTask = tasks.find(t => t.id !== taskId && t.teacher_column_id === targetTask.teacher_column_id && t.task_type === 'personal');
        if (linkedPersonalTask && linkedPersonalTask.id) {
          await updateChildTask(linkedPersonalTask.id, {
            teacher_column_id: null,
            status: 'Verified'
          });
        }
      }
    } catch (error) {
      console.error('Error updating status:', error);
      loadTasks(studentName);
    }
  };

  const handleUpdateTask = async (taskId: string, updates: Partial<ChildTask>) => {
    if (!studentName) return;
    try {
      setTasks(tasks.map(t => t.id === taskId ? { ...t, ...updates } : t));
      await updateChildTask(taskId, updates);
    } catch (error) {
      console.error('Error updating task:', error);
      loadTasks(studentName);
    }
  };

  const handleDelete = async (taskId: string) => {
    if (!studentName || !window.confirm('คุณแน่ใจหรือไม่ว่าต้องการลบงานนี้?')) return;
    try {
      setTasks(tasks.filter(t => t.id !== taskId));
      await deleteChildTask(taskId);
    } catch (error) {
      console.error('Error deleting task:', error);
      loadTasks(studentName);
    }
  };

  const uniqueSubjects = useMemo(() => {
    const subjects = new Set(tasks.map(t => t.subject));
    return Array.from(subjects).sort();
  }, [tasks]);

  const countOfficial = useMemo(() => {
    return tasks.filter(t => t.task_type === 'official' || !!t.teacher_column_id).length;
  }, [tasks]);

  const countPersonal = useMemo(() => {
    return tasks.filter(t => t.task_type === 'personal' || (!t.task_type && !t.teacher_column_id)).length;
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    let result = tasks;

    // Filter by subject
    if (filterSubject !== 'All') {
      result = result.filter(t => t.subject === filterSubject);
    }

    // Filter by type
    if (filterType === 'official') {
      result = result.filter(t => t.task_type === 'official' || !!t.teacher_column_id);
    } else if (filterType === 'personal') {
      result = result.filter(t => t.task_type === 'personal' || (!t.task_type && !t.teacher_column_id));
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
  }, [tasks, filterSubject, filterType, teacherCols]);

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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-6 rounded-2xl gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center">
            <BookOpen className="w-6 h-6 text-gray-400 mr-2 shrink-0" />
            การบ้านของฉัน (Home Work)
          </h1>
          <p className="text-gray-500 mt-1 text-sm sm:text-base">ติดตามงานจากครูและโน้ตส่วนตัวของ {studentName}</p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto mt-4 sm:mt-0">
          <button
            onClick={() => setIsAdding(!isAdding)}
            className={clsx(
              "h-[42px] px-4 rounded-xl text-sm font-semibold flex items-center justify-center transition-all active:scale-95 w-full sm:w-auto cursor-pointer",
              isAdding 
                ? "bg-gray-100 text-gray-700 hover:bg-gray-200" 
                : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 shadow-sm"
            )}
          >
            {isAdding ? 'ยกเลิก' : <><Plus className="w-4 h-4 mr-1.5 text-gray-500" /> เพิ่มโน้ตงานเอง</>}
          </button>

          <button
            onClick={handleSyncFromTeacher}
            disabled={syncing}
            className="h-[42px] px-4 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 flex items-center justify-center shadow-sm hover:shadow active:scale-95 transition-all disabled:opacity-50 w-full sm:w-auto cursor-pointer"
            title="อัปเดตข้อมูลการบ้านทั้งหมดจาก Google Sheet ของครู"
          >
            <RefreshCcw className={clsx("w-4 h-4 mr-2", syncing && "animate-spin")} />
            {syncing ? 'กำลังดึงข้อมูล...' : 'อัปเดตข้อมูลจากครู'}
          </button>
        </div>
      </div>

      {/* Filter Toolbar Card */}
      <div className="bg-white p-4 rounded-2xl shadow-xs border border-gray-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Type Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          <button
            onClick={() => setFilterType('all')}
            className={clsx(
              "px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap",
              filterType === 'all'
                ? "bg-gray-900 text-white shadow-xs"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            )}
          >
            🌟 ทั้งหมด ({tasks.length})
          </button>
          
          <button
            onClick={() => setFilterType('official')}
            className={clsx(
              "px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap",
              filterType === 'official'
                ? "bg-blue-600 text-white shadow-xs"
                : "bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200/60"
            )}
          >
            <span>📋 งานตามชีตครู</span>
            <span className={clsx("px-1.5 py-0.2 rounded-full text-xs font-bold", filterType === 'official' ? "bg-white/20 text-white" : "bg-blue-200 text-blue-800")}>
              {countOfficial}
            </span>
          </button>

          <button
            onClick={() => setFilterType('personal')}
            className={clsx(
              "px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap",
              filterType === 'personal'
                ? "bg-purple-600 text-white shadow-xs"
                : "bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200/60"
            )}
          >
            <span>📝 โน้ตส่วนตัว</span>
            <span className={clsx("px-1.5 py-0.2 rounded-full text-xs font-bold", filterType === 'personal' ? "bg-white/20 text-white" : "bg-purple-200 text-purple-800")}>
              {countPersonal}
            </span>
          </button>
        </div>

        {/* Subject Filter Dropdown */}
        {tasks.length > 0 && (
          <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl px-3 h-[38px] w-full md:w-auto self-stretch md:self-auto">
            <Filter className="w-4 h-4 text-gray-400 mr-2 shrink-0" />
            <select
              value={filterSubject}
              onChange={(e) => {
                const val = e.target.value;
                setFilterSubject(val);
                localStorage.setItem('hw_filter_subject', val);
              }}
              className="text-xs sm:text-sm border-none outline-none focus:ring-0 bg-transparent text-gray-700 font-medium w-full cursor-pointer"
            >
              <option value="All">ทุกวิชา</option>
              {uniqueSubjects.map(sub => (
                <option key={sub} value={sub}>{sub}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Add Task Form (Personal Task) */}
      {isAdding && (
        <form onSubmit={handleAddTask} className="bg-white p-6 rounded-2xl shadow-lg border border-purple-100 animate-in slide-in-from-top-4 fade-in duration-300">
          <div className="flex items-center space-x-2 mb-4 text-purple-700 font-bold text-sm">
            <span className="bg-purple-100 p-1.5 rounded-lg">📝</span>
            <span>เพิ่มโน้ตการบ้านส่วนตัว (ไม่อิง Google Sheet ของครู)</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">วิชา</label>
              <select 
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none mb-2"
              >
                {availableSubjects.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              {newSubject === 'อื่นๆ' && (
                <input 
                  type="text" 
                  required
                  value={customSubject}
                  onChange={(e) => setCustomSubject(e.target.value)}
                  placeholder="ระบุวิชา..."
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none placeholder:text-gray-400"
                />
              )}
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">ชื่องาน / รายละเอียด</label>
              <input 
                type="text" 
                required
                value={newTaskName}
                onChange={(e) => setNewTaskName(e.target.value)}
                placeholder="เช่น อ่านทบทวนบทที่ 3, ทำแบบฝึกหัดเสริม..."
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none placeholder:text-gray-400"
              />
            </div>
            
            <div className="sm:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">วันที่</label>
              <input 
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Note (บันทึกเตือนความจำเพิ่มเติม)</label>
              <input 
                type="text" 
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="โน้ตสั้นๆ (ถ้ามี)..."
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none placeholder:text-gray-400"
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button 
              type="button" 
              onClick={() => setIsAdding(false)} 
              className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700"
            >
              ยกเลิก
            </button>
            <button 
              type="submit" 
              className="bg-purple-600 text-white px-6 py-2.5 rounded-xl font-medium hover:bg-purple-700 transition-colors shadow-sm flex items-center"
            >
              <Plus className="w-4 h-4 mr-2" /> บันทึกโน้ตงาน
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
        </div>
      ) : activeTasks.length === 0 ? (
        <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl p-12 text-center">
          <div className="bg-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">เย้! ไม่มีงานค้าง</h3>
          <p className="text-gray-500 mb-4">คุณทำเสร็จหมดแล้ว หรือสามารถกด "อัปเดตข้อมูลจากครู" เพื่อดึงงานชุดใหม่ได้</p>
          <button
            onClick={handleSyncFromTeacher}
            disabled={syncing}
            className="inline-flex items-center bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-all shadow-sm active:scale-95 cursor-pointer"
          >
            <RefreshCcw className={clsx("w-4 h-4 mr-2", syncing && "animate-spin")} />
            {syncing ? 'กำลังดึงข้อมูล...' : 'อัปเดตข้อมูลจากครู'}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* 1. TODO Column (ยังไม่ทำ) */}
          <TaskColumn 
            title="ยังไม่ทำ" 
            icon={<BookOpen className="w-5 h-5 text-gray-500" />}
            tasks={filteredTasks.filter(t => t.status === 'Todo' || t.status === 'Rework' || t.status === 'In Progress')}
            bgColor="bg-gray-50/80"
            borderColor="border-gray-200"
            headerColor="bg-gray-100"
          >
            {(task: ChildTask) => (
              <TaskCard key={task.id} task={task} onUpdate={handleUpdateStatus} onUpdateTask={handleUpdateTask} onDelete={handleDelete}>
                <div className="flex gap-2 mt-3">
                  <button 
                    onClick={() => handleUpdateStatus(task.id!, 'Done')} 
                    className={clsx(
                      "flex-1 px-3 py-2 rounded-xl text-sm font-bold active:scale-95 transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer",
                      task.status === 'Rework'
                        ? "bg-rose-600 hover:bg-rose-700 text-white"
                        : "bg-amber-500 hover:bg-amber-600 text-white"
                    )}
                  >
                    <CheckCircle className="w-4 h-4" /> 
                    {task.status === 'Rework' ? 'แก้ไขเสร็จแล้ว (รอส่ง)' : 'ทำเสร็จแล้ว (รอส่ง)'}
                  </button>
                </div>
              </TaskCard>
            )}
          </TaskColumn>

          {/* 2. DONE Column (ทำเสร็จ - รอส่ง) */}
          <TaskColumn 
            title="ทำเสร็จ (รอส่ง)" 
            icon={<CheckCircle className="w-5 h-5 text-amber-500" />}
            tasks={filteredTasks.filter(t => t.status === 'Done')}
            bgColor="bg-amber-50/40"
            borderColor="border-amber-200/80"
            headerColor="bg-amber-100/70"
          >
            {(task: ChildTask) => {
              const isPersonal = !task.teacher_column_id;

              return (
                <TaskCard key={task.id} task={task} onUpdate={handleUpdateStatus} onUpdateTask={handleUpdateTask} onDelete={handleDelete} onUndo={(t: any) => handleUpdateStatus(t.id, 'Todo')}>
                  <div className="flex gap-2 mt-3">
                    {isPersonal ? (
                      <button 
                        onClick={() => handleUpdateStatus(task.id!, 'Verified')} 
                        className="flex-1 bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-xl text-sm font-bold active:scale-95 transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                        title="ตรวจความเรียบร้อยและปิดงานสำเร็จทันที"
                      >
                        <CheckCircle2 className="w-4 h-4" /> ตรวจแล้ว (ปิดงานทันที)
                      </button>
                    ) : (
                      <button 
                        onClick={() => handleUpdateStatus(task.id!, 'Submitted')} 
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-xl text-sm font-bold active:scale-95 transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                        title="ส่งครูที่โรงเรียนแล้ว รอครูอัปเดตคะแนนในชีต"
                      >
                        <Send className="w-4 h-4" /> ส่งครูแล้ว
                      </button>
                    )}
                  </div>
                </TaskCard>
              );
            }}
          </TaskColumn>

          {/* 3. SUBMITTED Column (ส่งแล้ว - รออัปเดต) */}
          <TaskColumn 
            title="ส่งแล้ว (รออัปเดต)" 
            icon={<Send className="w-5 h-5 text-emerald-500" />}
            tasks={filteredTasks.filter(t => t.status === 'Submitted')}
            bgColor="bg-emerald-50/40"
            borderColor="border-emerald-200/80"
            headerColor="bg-emerald-100/70"
          >
            {(task: ChildTask) => {
              const isPersonal = !task.teacher_column_id;

              return (
                <TaskCard key={task.id} task={task} onUpdate={handleUpdateStatus} onUpdateTask={handleUpdateTask} onDelete={handleDelete} onUndo={(t: any) => handleUpdateStatus(t.id, 'Done')}>
                  <div className="mt-3 mb-1">
                    {task.teacher_column_id ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                          <span className="text-xs font-bold text-amber-800 flex items-center gap-1.5">
                            <span>⏳</span> รอครูติ๊กตรวจใน Google Sheet
                          </span>
                        </div>
                        <button
                          onClick={() => handleUpdateStatus(task.id!, 'Rework')}
                          className="w-full bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-800 border border-rose-200 px-3 py-1.5 rounded-xl text-xs font-bold active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                          title="ครูให้กลับมาแก้ไขใหม่ ดีดกลับไปช่องยังไม่ทำ"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-rose-500" /> ↩️ ครูให้แก้ไข (ดีดกลับไปทำใหม่)
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between bg-purple-50 p-2.5 rounded-xl border border-purple-200">
                        <span className="text-xs font-bold text-purple-700 flex items-center">
                          <CheckCircle2 className="w-4 h-4 mr-1 text-purple-600" /> ตรวจเรียบร้อย (โน้ตส่วนตัว)
                        </span>
                        <button 
                          onClick={() => handleUpdateStatus(task.id!, 'Verified')}
                          className="text-xs bg-purple-600 text-white px-2.5 py-1 rounded-lg font-bold hover:bg-purple-700 active:scale-95 transition-all cursor-pointer"
                          title="ปิดงานสมบูรณ์"
                        >
                          ปิดงาน
                        </button>
                      </div>
                    )}
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
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
      </div>
    }>
      <HomeworkDashboard />
    </Suspense>
  );
}

// Sub-components

function TaskColumn({ title, icon, tasks, children, bgColor, borderColor, headerColor }: any) {
  return (
    <div className={clsx("rounded-2xl border flex flex-col h-full", bgColor, borderColor)}>
      <div className={clsx("px-4 py-3 border-b flex items-center justify-between rounded-t-2xl", borderColor, headerColor)}>
        <h3 className="font-semibold text-gray-700 flex items-center">
          {icon} <span className="ml-2">{title}</span>
        </h3>
        <span className="bg-white text-gray-600 text-xs font-bold px-2.5 py-1 rounded-full shadow-sm">{tasks.length}</span>
      </div>
      <div className="p-4 flex-1 space-y-3 overflow-y-auto">
        {tasks.map((task: ChildTask) => children(task))}
        {tasks.length === 0 && (
          <div className="text-center py-8 text-gray-400 text-sm">
            ไม่มีงานในช่องนี้
          </div>
        )}
      </div>
    </div>
  );
}

function TaskCard({ task, children, onUpdateTask, onDelete, onUndo }: any) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(task.task_name);
  const [editDate, setEditDate] = useState(task.date || '');
  const [editNote, setEditNote] = useState(task.note || '');

  const isPersonal = !task.teacher_column_id;

  const handleSaveEdit = () => {
    const trimmedName = editName.trim();
    if (trimmedName && (trimmedName !== task.task_name || editDate !== task.date || editNote !== task.note)) {
      onUpdateTask(task.id, { task_name: trimmedName, date: editDate, note: editNote });
    }
    setIsEditing(false);
  };

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group">
      {task.status === 'Rework' && (
        <div className="absolute top-0 right-0 bg-red-600 text-white text-[10px] font-extrabold px-2.5 py-0.5 rounded-bl-xl z-10 shadow-xs flex items-center gap-1">
          <span>🚨</span> ต้องแก้!
        </div>
      )}
      
      <div className="flex justify-between items-start mb-2 gap-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-semibold text-indigo-600 bg-indigo-50/80 px-2 py-0.5 rounded-md">
            {task.subject}
          </span>
          {isPersonal ? (
            <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200/60">
              📝 ส่วนตัว
            </span>
          ) : (
            <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200/60">
              📋 ชีตครู
            </span>
          )}
        </div>

        {!isEditing && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white pl-1">
            {onUndo && (
              <button 
                onClick={() => onUndo(task)}
                className="text-gray-400 hover:text-orange-600 p-1 rounded hover:bg-orange-50 cursor-pointer"
                title="ดึงกลับมา"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
            {isPersonal && (
              <>
                <button 
                  onClick={() => setIsEditing(true)}
                  className="text-gray-400 hover:text-indigo-600 p-1 rounded hover:bg-indigo-50 cursor-pointer"
                  title="แก้ไขชื่องาน"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button 
                  onClick={() => onDelete(task.id)}
                  className="text-gray-400 hover:text-red-600 p-1 rounded hover:bg-red-50 cursor-pointer"
                  title="ลบงาน"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {isEditing ? (
        <div className="mb-2">
          <textarea
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            className="w-full text-sm font-medium text-gray-900 border border-indigo-300 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none mb-2"
            rows={2}
            autoFocus
          />
          <input 
            type="date"
            value={editDate}
            onChange={(e) => setEditDate(e.target.value)}
            className="w-full text-sm text-gray-600 border border-indigo-300 rounded-lg px-2 py-1.5 mb-2 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <input 
            type="text"
            value={editNote}
            onChange={(e) => setEditNote(e.target.value)}
            placeholder="โน้ตเพิ่มเติม..."
            className="w-full text-sm text-gray-600 border border-indigo-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <div className="flex justify-end gap-1 mt-2">
            <button onClick={() => { setIsEditing(false); setEditName(task.task_name); setEditDate(task.date || ''); setEditNote(task.note || ''); }} className="p-1 text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
            <button onClick={handleSaveEdit} className="p-1 text-green-600 hover:text-green-700">
              <Save className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="mb-2">
          <p className="text-sm font-medium text-gray-900 line-clamp-2">{task.task_name}</p>
          {(task.date || task.note) && (
            <div className="flex items-center mt-1 space-x-2">
              {task.date && (
                <p className="text-xs text-gray-400">{task.date}</p>
              )}
              {task.note && (
                <div className="relative group/note cursor-help flex items-center">
                  <StickyNote className="w-3.5 h-3.5 text-yellow-500" />
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 w-max max-w-xs bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover/note:opacity-100 pointer-events-none transition-opacity z-50 shadow-lg break-words">
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
