'use client';

import { useState, useEffect, useMemo } from 'react';
import { Plus, BookOpen, Clock, CheckCircle, Send, AlertCircle, Sparkles, Edit2, X, Save, Trash2, Filter, DownloadCloud, StickyNote, RotateCcw } from 'lucide-react';
import { ChildTask, TaskStatus, TeacherColumn, getChildTasks, addChildTask, updateChildTaskStatus, updateChildTask, deleteChildTask, clearAllChildTasks, getTeacherColumns, getGlobalSettings } from '@/lib/db';
import { clsx } from 'clsx';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import confetti from 'canvas-confetti';

const DEFAULT_SUBJECTS = ['ภาษาไทย', 'คณิตศาสตร์', 'วิทยาศาสตร์', 'ภาษาอังกฤษ', 'สังคมศึกษา', 'ประวัติศาสตร์', 'สุขศึกษา', 'ศิลปะ', 'การงานอาชีพ', 'อื่นๆ'];

function HomeworkDashboard() {
  const searchParams = useSearchParams();
  const defaultFilter = searchParams.get('subject') || 'All';

  const [studentName, setStudentName] = useState<string | null>(null);
  const [tasks, setTasks] = useState<ChildTask[]>([]);
  const [teacherCols, setTeacherCols] = useState<TeacherColumn[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form state
  const [isAdding, setIsAdding] = useState(false);
  const [newTaskName, setNewTaskName] = useState('');
  const [newSubject, setNewSubject] = useState(DEFAULT_SUBJECTS[0]);
  const [customSubject, setCustomSubject] = useState('');
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
  const [newNote, setNewNote] = useState('');
  const [importing, setImporting] = useState(false);

  // Filter state
  const [filterSubject, setFilterSubject] = useState<string>(defaultFilter);

  useEffect(() => {
    const init = async () => {
      let savedName = localStorage.getItem('hw_student_name');
      if (!savedName) {
        const globalSettings = await getGlobalSettings();
        if (globalSettings) {
          savedName = globalSettings.student_name;
          localStorage.setItem('hw_student_name', savedName);
          localStorage.setItem('hw_sheet_urls', globalSettings.sheet_urls);
        }
      }
      setStudentName(savedName);
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
      const data = await getChildTasks(name);
      const cols = await getTeacherColumns(name);
      setTeacherCols(cols);
      // Sort by created_at descending (newest first)
      data.sort((a, b) => {
        const timeA = (a.created_at as any)?.toMillis?.() || Date.now();
        const timeB = (b.created_at as any)?.toMillis?.() || Date.now();
        return timeB - timeA;
      });
      setTasks(data);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
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
      alert('ไม่สามารถเพิ่มงานได้ โปรดตรวจสอบการตั้งค่า Firebase');
    }
  };

  const handleUpdateStatus = async (taskId: string, newStatus: TaskStatus) => {
    if (!studentName) return;
    try {
      if (newStatus === 'Done' || newStatus === 'Submitted') {
        confetti({
          particleCount: 50,
          spread: 70,
          origin: { y: 0.7 },
          colors: ['#22c55e', '#eab308', '#3b82f6', '#8b5cf6']
        });
      }

      // Optimistic update
      setTasks(tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
      await updateChildTaskStatus(taskId, newStatus);
    } catch (error) {
      console.error('Error updating status:', error);
      // Revert on error
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

  const handleImportMissing = async () => {
    if (!studentName || !teacherCols.length) {
      alert('ไม่พบข้อมูลจากครู กรุณาไปที่หน้า "จับคู่งาน" แล้วกด "อัปเดตข้อมูลจากครู" ก่อนครับ');
      return;
    }
    
    if (!window.confirm('ระบบจะดึง "งานของครูที่ยังไม่ได้ถูกจับคู่" ไปสร้างเป็นการบ้านใหม่ในช่อง "ยังไม่ทำ" ต้องการดำเนินการต่อหรือไม่?')) {
      return;
    }

    setImporting(true);
    try {
      const linkedColIds = new Set(tasks.map(t => t.teacher_column_id).filter(Boolean));
      const missingCols = teacherCols.filter(col => !linkedColIds.has(col.id));
      
      let addedCount = 0;
      for (const col of missingCols) {
        await addChildTask({
          subject: col.subject,
          task_name: `[จากครู] ${col.sequence ? col.sequence + '. ' : ''}${col.column_name}`,
          status: col.is_checked ? 'Verified' : 'Todo',
          teacher_column_id: col.id,
          student_name: studentName
        });
        addedCount++;
      }
      
      await loadTasks(studentName);
      if (addedCount > 0) {
        alert(`ดึงงานสำเร็จ ${addedCount} งาน`);
      } else {
        alert('ไม่มีงานใหม่จากครู (คุณรับงานมาครบหมดแล้ว)');
      }
    } catch (error) {
      console.error('Error importing missing tasks:', error);
      alert('เกิดข้อผิดพลาดในการดึงงาน');
    } finally {
      setImporting(false);
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

  const handleClearAll = async () => {
    if (!studentName) return;
    
    const isFiltered = filterSubject !== 'All';
    const confirmMsg1 = isFiltered 
      ? `⚠️ คำเตือน: คุณต้องการลบการบ้านวิชา "${filterSubject}" ทั้งหมด ใช่หรือไม่?`
      : `⚠️ คำเตือน: คุณต้องการลบการบ้านของลูก "ทั้งหมด" ใช่หรือไม่?`;
      
    const confirm1 = window.confirm(confirmMsg1);
    if (!confirm1) return;
    const confirm2 = window.confirm('ยืนยันอีกครั้ง: ข้อมูลที่ลบแล้วจะไม่สามารถกู้คืนได้ แน่ใจหรือไม่?');
    if (!confirm2) return;

    try {
      if (isFiltered) {
        setTasks(tasks.filter(t => t.subject !== filterSubject));
      } else {
        setTasks([]);
      }
      await clearAllChildTasks(studentName, filterSubject);
      alert(isFiltered ? `ล้างข้อมูลการบ้านวิชา ${filterSubject} เรียบร้อยแล้ว` : 'ล้างข้อมูลการบ้านทั้งหมดเรียบร้อยแล้ว');
    } catch (error) {
      console.error('Error clearing tasks:', error);
      alert('เกิดข้อผิดพลาดในการลบข้อมูล');
      loadTasks(studentName);
    }
  };

  const uniqueSubjects = useMemo(() => {
    const subjects = new Set(tasks.map(t => t.subject));
    return Array.from(subjects).sort();
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    let result = tasks;
    if (filterSubject !== 'All') {
      result = tasks.filter(t => t.subject === filterSubject);
    }
    
    // Sort tasks by sequence ascending (น้อยไปมาก)
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
        // Fallback to created_at descending if sequences are the same
        const timeA = (a.created_at as any)?.toMillis?.() || 0;
        const timeB = (b.created_at as any)?.toMillis?.() || 0;
        return timeB - timeA;
      }
      return seqA - seqB;
    });
  }, [tasks, filterSubject, teacherCols]);

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

  // Filter tasks that are not Verified (to keep dashboard clean)
  // or maybe group them by status
  const activeTasks = tasks.filter(t => t.status !== 'Verified');
  
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      
      {/* Header section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-6 rounded-2xl gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center">
            <Sparkles className="w-6 h-6 text-yellow-400 mr-2 shrink-0" />
            การบ้านของฉัน (Home Work)
          </h1>
          <p className="text-gray-500 mt-1 text-sm sm:text-base">บันทึกและติดตามงานของคุณได้ที่นี่</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto mt-4 sm:mt-0">
          <button
            onClick={handleImportMissing}
            disabled={importing || teacherCols.length === 0}
            className="h-[44px] w-full sm:w-auto flex items-center justify-center bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 rounded-xl font-medium hover:bg-emerald-100 hover:text-emerald-800 transition-all active:scale-95 disabled:opacity-50"
            title="ดึงงานครูที่เหลือ มาเพิ่มอัตโนมัติ"
          >
            <DownloadCloud className={clsx("w-5 h-5 mr-1.5", importing && "animate-bounce")} />
            เพิ่มงานจากครู
          </button>
          <button
            onClick={() => setIsAdding(!isAdding)}
            className="h-[44px] w-full sm:w-auto flex items-center justify-center bg-indigo-600 text-white px-5 rounded-xl font-medium hover:bg-indigo-700 hover:shadow-md transition-all active:scale-95"
          >
            {isAdding ? 'ยกเลิก' : <><Plus className="w-5 h-5 mr-1" /> เพิ่มงานเอง</>}
          </button>

          {/* Filter by Subject */}
          {tasks.length > 0 && (
            <div className="flex items-center bg-white border border-gray-200 rounded-xl shadow-sm px-3 h-[44px] w-full sm:w-auto">
              <Filter className="w-4 h-4 text-gray-400 mr-2" />
              <select
                value={filterSubject}
                onChange={(e) => {
                  const val = e.target.value;
                  setFilterSubject(val);
                  localStorage.setItem('hw_filter_subject', val);
                }}
                className="text-sm border-none outline-none focus:ring-0 bg-transparent text-gray-700 font-medium w-full"
              >
                <option value="All">ทุกวิชา ({tasks.length})</option>
                {uniqueSubjects.map(sub => (
                  <option key={sub} value={sub}>{sub}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Add Task Form */}
      {isAdding && (
        <form onSubmit={handleAddTask} className="bg-white p-6 rounded-2xl shadow-lg border border-indigo-100 animate-in slide-in-from-top-4 fade-in duration-300">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">วิชา</label>
              <select 
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none mb-2"
              >
                {DEFAULT_SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              {newSubject === 'อื่นๆ' && (
                <input 
                  type="text" 
                  required
                  value={customSubject}
                  onChange={(e) => setCustomSubject(e.target.value)}
                  placeholder="ระบุวิชา..."
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none placeholder:text-gray-400"
                />
              )}
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">ชื่องาน (จดตามความเข้าใจ)</label>
              <input 
                type="text" 
                required
                value={newTaskName}
                onChange={(e) => setNewTaskName(e.target.value)}
                placeholder="เช่น คัดลายมือหน้า 15"
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none placeholder:text-gray-400"
              />
            </div>
            
            <div className="sm:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">วันที่</label>
              <input 
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Note (รายละเอียดเพิ่มเติม)</label>
              <input 
                type="text" 
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="โน้ตสั้นๆ (ถ้ามี)..."
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none placeholder:text-gray-400"
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button type="submit" className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-medium hover:bg-indigo-700 transition-colors shadow-sm flex items-center">
              <Plus className="w-4 h-4 mr-2" /> บันทึกงาน
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
          <p className="text-gray-500">คุณทำเสร็จหมดแล้ว หรือสามารถเพิ่มงานใหม่ได้เลย</p>
        </div>
      ) : (
        <>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {/* TODO Column */}
          <TaskColumn 
            title="ยังไม่ทำ" 
            icon={<BookOpen className="w-5 h-5 text-gray-500" />}
            tasks={filteredTasks.filter(t => t.status === 'Todo' || t.status === 'Rework')}
            bgColor="bg-gray-50"
            borderColor="border-gray-200"
            headerColor="bg-gray-100"
          >
            {(task: ChildTask) => (
              <TaskCard key={task.id} task={task} onUpdate={handleUpdateStatus} onUpdateTask={handleUpdateTask} onDelete={handleDelete}>
                <div className="flex gap-2 mt-3">
                  <button onClick={() => handleUpdateStatus(task.id!, 'In Progress')} className="flex-1 bg-orange-50 text-orange-700 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-orange-100 active:scale-95 transition-all">
                    เริ่มทำ
                  </button>
                </div>
              </TaskCard>
            )}
          </TaskColumn>

          {/* IN PROGRESS Column */}
          <TaskColumn 
            title="กำลังทำ" 
            icon={<Clock className="w-5 h-5 text-orange-500" />}
            tasks={filteredTasks.filter(t => t.status === 'In Progress')}
            bgColor="bg-orange-50/50"
            borderColor="border-orange-100"
            headerColor="bg-orange-100/50"
          >
            {(task: ChildTask) => (
              <TaskCard key={task.id} task={task} onUpdate={handleUpdateStatus} onUpdateTask={handleUpdateTask} onDelete={handleDelete} onUndo={(t: any) => handleUpdateStatus(t.id, 'Todo')}>
                <div className="flex gap-2 mt-3">
                  <button onClick={() => handleUpdateStatus(task.id!, 'Done')} className="flex-1 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-100 active:scale-95 transition-all">
                    ทำเสร็จแล้ว
                  </button>
                </div>
              </TaskCard>
            )}
          </TaskColumn>

          {/* DONE Column */}
          <TaskColumn 
            title="ทำเสร็จ (รอส่ง)" 
            icon={<CheckCircle className="w-5 h-5 text-blue-500" />}
            tasks={filteredTasks.filter(t => t.status === 'Done')}
            bgColor="bg-blue-50/50"
            borderColor="border-blue-100"
            headerColor="bg-blue-100/50"
          >
            {(task: ChildTask) => (
              <TaskCard key={task.id} task={task} onUpdate={handleUpdateStatus} onUpdateTask={handleUpdateTask} onDelete={handleDelete} onUndo={(t: any) => handleUpdateStatus(t.id, 'In Progress')}>
                <div className="flex gap-2 mt-3">
                  <button onClick={() => handleUpdateStatus(task.id!, 'Submitted')} className="flex-1 bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-green-700 active:scale-95 transition-all flex items-center justify-center">
                    <Send className="w-3 h-3 mr-1.5" /> ส่งครูแล้ว
                  </button>
                </div>
              </TaskCard>
            )}
          </TaskColumn>

          {/* SUBMITTED Column */}
          <TaskColumn 
            title="ตรวจแล้ว(รอครูอับเดท)" 
            icon={<Send className="w-5 h-5 text-green-500" />}
            tasks={filteredTasks.filter(t => t.status === 'Submitted')}
            bgColor="bg-green-50/50"
            borderColor="border-green-100"
            headerColor="bg-green-100/50"
          >
            {(task: ChildTask) => (
              <TaskCard key={task.id} task={task} onUpdate={handleUpdateStatus} onUpdateTask={handleUpdateTask} onDelete={handleDelete} onUndo={(t: any) => handleUpdateStatus(t.id, 'Done')}>
                <div className="mt-3 mb-1">
                  {task.teacher_column_id ? (
                    <span className="text-[10px] sm:text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-md border border-amber-200">
                      จับคู่แล้ว: รอครูอัปเดต
                    </span>
                  ) : (
                    <Link href="/reconcile" className="inline-block text-[10px] sm:text-xs font-bold text-rose-600 bg-rose-50 px-2 py-1 rounded-md border border-rose-200 hover:bg-rose-100 hover:border-rose-300 transition-colors cursor-pointer active:scale-95">
                      รอคุณจับคู่งาน ➔
                    </Link>
                  )}
                </div>
              </TaskCard>
            )}
          </TaskColumn>
        </div>
        

        </>
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
        <div className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-bl-lg z-10">
          ต้องแก้!
        </div>
      )}
      <div className="flex justify-between items-start mb-1">
        <div className="text-xs font-semibold text-indigo-600">{task.subject}</div>
        {!isEditing && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white pl-1">
            {onUndo && (
              <button 
                onClick={() => onUndo(task)}
                className="text-gray-400 hover:text-orange-600 p-1 rounded hover:bg-orange-50"
                title="ดึงกลับมา"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
            <button 
              onClick={() => setIsEditing(true)}
              className="text-gray-400 hover:text-indigo-600 p-1 rounded hover:bg-indigo-50"
              title="แก้ไขชื่องาน"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button 
              onClick={() => onDelete(task.id)}
              className="text-gray-400 hover:text-red-600 p-1 rounded hover:bg-red-50"
              title="ลบงาน"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
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
