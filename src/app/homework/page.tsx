'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { Plus, BookOpen, Clock, CheckCircle, Send, AlertCircle, Sparkles, Edit2, X, Save, Trash2, Filter, RefreshCcw, StickyNote, RotateCcw, CheckCircle2, GraduationCap, Home, CheckSquare, FileText, AlertTriangle, History } from 'lucide-react';
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
  const [newAssignedDate, setNewAssignedDate] = useState(new Date().toISOString().split('T')[0]);
  const [newDueDate, setNewDueDate] = useState('');
  const [newNote, setNewNote] = useState('');
  const [newTags, setNewTags] = useState<string[]>(['การบ้าน']);

  // Filter states
  const defaultType = (searchParams.get('type') as 'official' | 'personal') || 'official';
  const [filterSubject, setFilterSubject] = useState<string>(defaultFilter);
  const [filterType, setFilterType] = useState<'official' | 'personal'>(defaultType);

  const availableSubjects = useMemo(() => {
    const subjects = new Set<string>();
    DEFAULT_SUBJECTS.forEach(s => subjects.add(s));
    tasks.forEach(t => {
      if (t.subject) subjects.add(t.subject);
    });
    return Array.from(subjects);
  }, [tasks]);

  useEffect(() => {
    const urlSubject = searchParams.get('subject');
    const urlType = searchParams.get('type') as 'official' | 'personal' | null;

    if (urlSubject) {
      setFilterSubject(urlSubject);
    } else {
      setFilterSubject('All');
    }

    if (urlType === 'official' || urlType === 'personal') {
      setFilterType(urlType);
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

  const handleToggleAdding = () => {
    setIsAdding(!isAdding);
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName || !newTaskName.trim()) return;

    const finalSubject = newSubject === 'อื่นๆ' ? customSubject.trim() : newSubject;
    if (!finalSubject) return;

    try {
      const initialHistory = [{
        revision: 1,
        action: 'created' as const,
        note: `สร้างงานส่วนตัว: ${newTaskName.trim()}`,
        timestamp: Date.now()
      }];

      const newTaskId = await addChildTask({
        student_name: studentName,
        subject: finalSubject,
        task_name: newTaskName.trim(),
        teacher_column_id: null,
        task_type: 'personal',
        status: 'Todo',
        date: newAssignedDate,
        assigned_date: newAssignedDate,
        due_date: newDueDate,
        note: newNote.trim(),
        tags: newTags,
        revision_count: 1,
        revision_history: initialHistory
      });

      const newTask: ChildTask = {
        id: newTaskId,
        student_name: studentName,
        subject: finalSubject,
        task_name: newTaskName.trim(),
        teacher_column_id: null,
        task_type: 'personal',
        status: 'Todo',
        date: newAssignedDate,
        assigned_date: newAssignedDate,
        due_date: newDueDate,
        note: newNote.trim(),
        tags: newTags,
        revision_count: 1,
        revision_history: initialHistory,
        created_at: new Date(),
        updated_at: new Date()
      };

      setTasks([newTask, ...tasks]);
      setNewTaskName('');
      setNewDueDate('');
      setNewNote('');
      setIsAdding(false);
    } catch (error) {
      console.error('Error adding task:', error);
      alert('ไม่สามารถเพิ่มงานได้ โปรดตรวจสอบการเชื่อมต่อ');
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
      await updateChildTask(taskId, updates);

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
      await updateChildTask(taskId, updates);
    } catch (error) {
      console.error('Error updating task:', error);
      loadTasks(studentName!);
    }
  };

  const handleDelete = async (task: ChildTask) => {
    if (!studentName || !task.id) return;
    const isPersonal = !task.teacher_column_id;

    if (isPersonal) {
      if (!window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบงานส่วนตัว "${task.task_name}"?`)) return;
      try {
        setTasks(tasks.filter(t => t.id !== task.id));
        await deleteChildTask(task.id);
      } catch (error) {
        console.error('Error deleting task:', error);
        loadTasks(studentName);
      }
    } else {
      // Official task that has an original personal draft (a merged into A)
      if (!task.original_personal_name) return;
      if (!window.confirm(`คุณต้องการลบประวัติงานส่วนตัวเดิม "${task.original_personal_name}" ออกจากงานหลัก "${task.task_name}" ใช่หรือไม่?\n(ชื่องานชีตครูและสถานะจะยังคงอยู่ตามเดิม)`)) return;
      try {
        const history = [...(task.revision_history || [])];
        history.push({
          revision: task.revision_count || 1,
          action: 'parent_reviewed',
          note: `ลบประวัติงานส่วนตัวเดิม (${task.original_personal_name}) ออกจากงานหลัก`,
          timestamp: Date.now()
        });

        const updates: Partial<ChildTask> = {
          original_personal_name: '',
          revision_history: history
        };

        setTasks(tasks.map(t => t.id === task.id ? { ...t, ...updates } : t));
        await updateChildTask(task.id, updates);
      } catch (error) {
        console.error('Error removing draft from task:', error);
        loadTasks(studentName);
      }
    }
  };

  const uniqueSubjects = useMemo(() => {
    const relevantTasks = tasks.filter(t => 
      filterType === 'official' 
        ? (t.task_type === 'official' || !!t.teacher_column_id)
        : (t.task_type === 'personal' || (!t.task_type && !t.teacher_column_id))
    );
    const subjects = new Set<string>();
    relevantTasks.forEach(t => {
      if (t.subject && typeof t.subject === 'string' && t.subject.trim()) {
        subjects.add(t.subject.trim());
      }
    });
    return Array.from(subjects).sort();
  }, [tasks, filterType]);

  // Safety synchronization: if current filterSubject is not in uniqueSubjects, reset to 'All'
  useEffect(() => {
    if (filterSubject !== 'All' && uniqueSubjects.length > 0 && !uniqueSubjects.includes(filterSubject)) {
      setFilterSubject('All');
    }
  }, [uniqueSubjects, filterSubject]);

  const handleFilterTypeChange = (newType: 'official' | 'personal') => {
    setFilterType(newType);
    const newRelevantTasks = tasks.filter(t => 
      newType === 'official' 
        ? (t.task_type === 'official' || !!t.teacher_column_id)
        : (t.task_type === 'personal' || (!t.task_type && !t.teacher_column_id))
    );
    const newSubjects = new Set<string>();
    newRelevantTasks.forEach(t => {
      if (t.subject && t.subject.trim()) newSubjects.add(t.subject.trim());
    });
    if (filterSubject !== 'All' && !newSubjects.has(filterSubject)) {
      setFilterSubject('All');
    }
  };

  const countOfficial = useMemo(() => {
    return tasks.filter(t => (t.task_type === 'official' || !!t.teacher_column_id) && t.status !== 'Verified').length;
  }, [tasks]);

  const countPersonal = useMemo(() => {
    return tasks.filter(t => t.task_type === 'personal' || (!t.task_type && !t.teacher_column_id)).length;
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    let result = tasks;

    // Filter by type
    if (filterType === 'official') {
      result = result.filter(t => t.task_type === 'official' || !!t.teacher_column_id);
    } else if (filterType === 'personal') {
      result = result.filter(t => t.task_type === 'personal' || (!t.task_type && !t.teacher_column_id));
    }

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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-6 sm:p-7 rounded-3xl border border-[#e2e8f0] shadow-sm gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 flex items-center">
            <BookOpen className="w-6 h-6 text-[#597ecf] mr-2 shrink-0" />
            การบ้านของฉัน (Home Work)
          </h1>
          <p className="text-gray-500 mt-1 text-sm sm:text-base">ติดตามงานจากครูและงานส่วนตัวของ {studentName}</p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto mt-4 sm:mt-0">
          <button
            onClick={handleToggleAdding}
            className={clsx(
              "h-[42px] px-4 rounded-xl text-sm font-semibold flex items-center justify-center transition-all active:scale-95 w-full sm:w-auto cursor-pointer",
              isAdding 
                ? "bg-[#f1f3f6] text-[#57627a] hover:bg-[#e2e6eb]" 
                : "bg-white border border-[#e2e8f0] text-gray-700 hover:bg-[#f4f7fa] shadow-xs"
            )}
          >
            {isAdding ? 'ยกเลิก' : <><Plus className="w-4 h-4 mr-1.5 text-[#597ecf]" /> เพิ่มงานส่วนตัว</>}
          </button>

          <button
            onClick={handleSyncFromTeacher}
            disabled={syncing}
            className="h-[42px] px-4 rounded-xl text-sm font-semibold bg-[#597ecf] text-white hover:bg-[#486cb8] flex items-center justify-center shadow-xs hover:shadow-md active:scale-95 transition-all disabled:opacity-50 w-full sm:w-auto cursor-pointer"
            title="อัปเดตข้อมูลการบ้านทั้งหมดจาก Google Sheet ของครู"
          >
            <RefreshCcw className={clsx("w-4 h-4 mr-2", syncing && "animate-spin")} />
            {syncing ? 'กำลังดึงข้อมูล...' : 'อัปเดตข้อมูลจากครู'}
          </button>
        </div>
      </div>

      {/* Filter Toolbar Card */}
      <div className="bg-white p-4 rounded-2xl shadow-xs border border-[#e2e8f0] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* 2-Mode Segmented Control Switcher */}
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          <button
            onClick={() => handleFilterTypeChange('official')}
            className={clsx(
              "px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer active:scale-95",
              filterType === 'official'
                ? "bg-[#597ecf] text-white shadow-xs"
                : "bg-[#eef3fc] text-[#597ecf] hover:bg-[#e2ebf9] border border-[#597ecf]/30"
            )}
          >
            <CheckSquare className="w-4 h-4" />
            <span>งานตามชีตครู</span>
            <span className={clsx("px-2 py-0.5 rounded-full text-xs font-extrabold", filterType === 'official' ? "bg-white/20 text-white" : "bg-[#597ecf]/20 text-[#597ecf]")}>
              {countOfficial}
            </span>
          </button>

          <button
            onClick={() => handleFilterTypeChange('personal')}
            className={clsx(
              "px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer active:scale-95",
              filterType === 'personal'
                ? "bg-[#57627a] text-white shadow-xs"
                : "bg-[#eff2f7] text-[#57627a] hover:bg-[#e2e6eb] border border-[#57627a]/30"
            )}
          >
            <FileText className="w-4 h-4" />
            <span>งานส่วนตัว</span>
            <span className={clsx("px-2 py-0.5 rounded-full text-xs font-extrabold", filterType === 'personal' ? "bg-white/20 text-white" : "bg-[#57627a]/20 text-[#57627a]")}>
              {countPersonal}
            </span>
          </button>
        </div>

        {/* Subject Filter Dropdown */}
        {tasks.length > 0 && (
          <div className="flex items-center bg-[#f4f7fa] border border-[#e2e8f0] rounded-xl px-3 h-[38px] w-full md:w-auto self-stretch md:self-auto">
            <Filter className="w-4 h-4 text-gray-400 mr-2 shrink-0" />
            <select
              value={uniqueSubjects.includes(filterSubject) ? filterSubject : 'All'}
              onChange={(e) => {
                const val = e.target.value;
                setFilterSubject(val);
                if (val !== 'All') {
                  if (availableSubjects.includes(val)) {
                    setNewSubject(val);
                    setCustomSubject('');
                  } else {
                    setNewSubject('อื่นๆ');
                    setCustomSubject(val);
                  }
                }
              }}
              className="text-xs sm:text-sm border-none outline-none focus:ring-0 bg-transparent text-gray-700 font-medium w-full cursor-pointer"
            >
              <option key="filter-all" value="All">ทุกวิชา</option>
              {uniqueSubjects.map(sub => (
                <option key={`filter-subj-${sub}`} value={sub}>{sub}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Add Task Form (Personal Task) */}
      {isAdding && (
        <form onSubmit={handleAddTask} className="bg-white p-6 sm:p-7 rounded-3xl shadow-md border border-[#e2e8f0] animate-in slide-in-from-top-4 fade-in duration-300">
          {/* Form Header */}
          <div className="flex items-center justify-between pb-4 mb-5 border-b border-[#e2e8f0]">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-[#eff2f7] text-[#57627a] flex items-center justify-center text-lg font-bold shadow-2xs">
                <FileText className="w-5 h-5 text-[#57627a]" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">
                  เพิ่มงานส่วนตัว (Personal Task)
                </h3>
                <p className="text-xs sm:text-sm text-gray-500">
                  บันทึกงานที่ต้องการทำด้วยตนเอง หรือบันทึกเพิ่มเติม (ไม่อิง Google Sheet ของครู)
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="text-gray-400 hover:text-gray-600 p-2 rounded-xl hover:bg-[#f4f7fa] transition-colors cursor-pointer"
              title="ปิดฟอร์ม"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            {/* แถวที่ 1: วิชา อยู่แถวบนสุด */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                วิชา <span className="text-rose-500">*</span>
              </label>
              <div className="space-y-2">
                <select 
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#f4f7fa] border border-[#e2e8f0] rounded-xl text-sm font-semibold text-gray-800 focus:bg-white focus:ring-2 focus:ring-[#597ecf] focus:border-[#597ecf] outline-none transition-all cursor-pointer"
                >
                  {availableSubjects.map((s, idx) => (
                    <option key={`add-subj-${s}-${idx}`} value={s}>{s}</option>
                  ))}
                </select>
                {newSubject === 'อื่นๆ' && (
                  <input 
                    type="text" 
                    required
                    value={customSubject}
                    onChange={(e) => setCustomSubject(e.target.value)}
                    placeholder="พิมพ์ระบุชื่อวิชา..."
                    className="w-full px-3.5 py-2.5 bg-white border border-[#597ecf] rounded-xl text-sm text-gray-800 focus:ring-2 focus:ring-[#597ecf] outline-none placeholder:text-gray-400"
                  />
                )}
              </div>
            </div>

            {/* แถวที่ 2: วันที่มอบหมาย และ กำหนดส่งงาน อยู่แถวเดียวกัน */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  วันที่มอบหมาย
                </label>
                <input 
                  type="date"
                  value={newAssignedDate}
                  onChange={(e) => setNewAssignedDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#f4f7fa] border border-[#e2e8f0] rounded-xl text-sm font-medium text-gray-700 focus:bg-white focus:ring-2 focus:ring-[#597ecf] focus:border-[#597ecf] outline-none transition-all cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  กำหนดส่งงาน
                </label>
                <input 
                  type="date"
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#f4f7fa] border border-[#e2e8f0] rounded-xl text-sm font-medium text-gray-700 focus:bg-white focus:ring-2 focus:ring-[#597ecf] focus:border-[#597ecf] outline-none transition-all cursor-pointer"
                />
              </div>
            </div>

            {/* แถวที่ 2: ชื่องาน / รายละเอียด * */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                ชื่องาน / รายละเอียด <span className="text-rose-500">*</span>
              </label>
              <input 
                type="text" 
                required
                value={newTaskName}
                onChange={(e) => setNewTaskName(e.target.value)}
                placeholder="เช่น อ่านทบทวนบทที่ 3, ทำแบบฝึกหัดเสริมหน้า 42..."
                className="w-full px-4 py-2.5 bg-[#f4f7fa] border border-[#e2e8f0] rounded-xl text-sm text-gray-800 focus:bg-white focus:ring-2 focus:ring-[#597ecf] focus:border-[#597ecf] outline-none transition-all placeholder:text-gray-400 font-medium"
              />
            </div>

            {/* แถวที่ 3: ประเภทงาน (เลือกได้หลายข้อ) */}
            <div className="pt-0.5">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                ประเภทงาน (เลือกได้หลายข้อ)
              </label>
              <div className="flex items-center gap-2.5 flex-wrap">
                {[
                  { name: 'งานในคาบ', icon: GraduationCap, activeClass: 'bg-amber-500 text-white shadow-xs border-amber-500' },
                  { name: 'การบ้าน', icon: Home, activeClass: 'bg-[#597ecf] text-white shadow-xs border-[#597ecf]' }
                ].map((item) => {
                  const isChecked = newTags.includes(item.name);
                  const ItemIcon = item.icon;
                  return (
                    <button
                      type="button"
                      key={item.name}
                      onClick={() => {
                        if (isChecked) {
                          setNewTags(newTags.filter(t => t !== item.name));
                        } else {
                          setNewTags([...newTags, item.name]);
                        }
                      }}
                      className={clsx(
                        "h-[40px] px-4 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 border select-none active:scale-95",
                        isChecked 
                          ? item.activeClass
                          : "bg-[#f4f7fa] border-[#e2e8f0] text-gray-600 hover:bg-white hover:border-gray-300"
                      )}
                    >
                      <ItemIcon className="w-4 h-4 shrink-0" />
                      <span>{item.name}</span>
                      <span className={clsx(
                        "w-4 h-4 rounded-full flex items-center justify-center text-[10px] ml-0.5",
                        isChecked ? "bg-white/25 text-white" : "bg-gray-200 text-gray-500"
                      )}>
                        {isChecked ? "✓" : "+"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* แถวที่ 4: Note (บันทึกเตือนความจำเพิ่มเติม - ถ้ามี) */}
            <div className="pt-0.5">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Note (บันทึกเตือนความจำเพิ่มเติม - ถ้ามี)
              </label>
              <input 
                type="text" 
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="เช่น ส่งวันพุธหน้า, ทำร่วมกับเพื่อน 2 คน, เตรียมสีไม้..."
                className="w-full px-4 py-2.5 bg-[#f4f7fa] border border-[#e2e8f0] rounded-xl text-sm text-gray-800 focus:bg-white focus:ring-2 focus:ring-[#597ecf] focus:border-[#597ecf] outline-none transition-all placeholder:text-gray-400"
              />
            </div>
          </div>

          {/* Action Bar */}
          <div className="mt-6 pt-4 border-t border-[#e2e8f0] flex items-center justify-end gap-3">
            <button 
              type="button" 
              onClick={() => setIsAdding(false)} 
              className="px-5 py-2.5 text-sm font-semibold text-gray-600 hover:text-gray-900 bg-white hover:bg-[#f4f7fa] border border-[#e2e8f0] rounded-xl transition-all cursor-pointer"
            >
              ยกเลิก
            </button>
            <button 
              type="submit" 
              className="bg-[#597ecf] hover:bg-[#486cb8] text-white px-6 py-2.5 rounded-xl font-bold shadow-xs hover:shadow-md transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> บันทึกงานส่วนตัว
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#597ecf]"></div>
        </div>
      ) : (filterType === 'official' ? filteredTasks.filter(t => t.status !== 'Verified').length === 0 : filteredTasks.length === 0) ? (
        <div className="bg-white border border-[#e2e8f0] rounded-3xl p-12 text-center shadow-xs">
          <div className="bg-[#eef3fc] w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-2xs">
            <CheckCircle className="w-8 h-8 text-[#597ecf]" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            {filterType === 'official' ? 'เย้! ไม่มีงานตามชีตครูค้างอยู่' : 'ยังไม่มีงานส่วนตัว'}
          </h3>
          <p className="text-gray-500 mb-5 text-sm max-w-md mx-auto">
            {filterType === 'official' 
              ? 'คุณทำเสร็จหมดแล้ว หรือสามารถกด "อัปเดตข้อมูลจากครู" เพื่อดึงงานชุดใหม่ได้' 
              : 'คุณสามารถกดปุ่ม "เพิ่มงานส่วนตัว" ด้านล่างหรือด้านบน เพื่อบันทึกงานที่ต้องการทำด้วยตนเองได้เลย'}
          </p>
          {filterType === 'official' ? (
            <button
              onClick={handleSyncFromTeacher}
              disabled={syncing}
              className="inline-flex items-center bg-[#597ecf] hover:bg-[#486cb8] text-white px-6 py-2.5 rounded-xl text-sm font-bold transition-all shadow-xs active:scale-95 cursor-pointer"
            >
              <RefreshCcw className={clsx("w-4 h-4 mr-2", syncing && "animate-spin")} />
              {syncing ? 'กำลังดึงข้อมูล...' : 'อัปเดตข้อมูลจากครู'}
            </button>
          ) : (
            <button
              onClick={() => setIsAdding(true)}
              className="inline-flex items-center bg-[#57627a] hover:bg-[#434c60] text-white px-6 py-2.5 rounded-xl text-sm font-bold transition-all shadow-xs active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4 mr-2" />
              เพิ่มงานส่วนตัว
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* 1. TODO Column (ยังไม่ทำ) */}
          <TaskColumn 
            title="ยังไม่ทำ" 
            icon={<BookOpen className="w-5 h-5 text-[#57627a]" />}
            tasks={filteredTasks.filter(t => t.status === 'Todo' || t.status === 'Rework' || t.status === 'In Progress')}
            bgColor="bg-[#f8fafc]"
            borderColor="border-[#e2e8f0]"
            headerColor="bg-[#eff2f7]"
          >
            {(task: ChildTask) => (
              <TaskCard key={task.id} task={task} onUpdate={handleUpdateStatus} onUpdateTask={handleUpdateTask} onDelete={handleDelete}>
                <div className="flex gap-2 mt-3">
                  <button 
                    onClick={() => handleUpdateStatus(task.id!, 'Done')} 
                    className={clsx(
                      "flex-1 px-3.5 py-2.5 rounded-xl text-sm font-bold active:scale-95 transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer",
                      task.status === 'Rework'
                        ? "bg-rose-600 hover:bg-rose-700 text-white"
                        : "bg-[#597ecf] hover:bg-[#486cb8] text-white"
                    )}
                  >
                    <CheckCircle className="w-4 h-4" /> 
                    {task.status === 'Rework' ? 'แก้ไขเสร็จแล้ว (รอส่ง)' : (filterType === 'personal' ? 'ทำเสร็จแล้ว' : 'ทำเสร็จแล้ว (รอส่ง)')}
                  </button>
                </div>
              </TaskCard>
            )}
          </TaskColumn>

          {/* 2. DONE Column (ทำเสร็จ - รอส่ง / รอตรวจ) */}
          <TaskColumn 
            title={filterType === 'personal' ? 'ทำเสร็จ (รอตรวจ)' : 'ทำเสร็จ (รอส่ง)'} 
            icon={<CheckCircle2 className="w-5 h-5 text-[#597ecf]" />}
            tasks={filteredTasks.filter(t => t.status === 'Done')}
            bgColor="bg-[#eef3fc]/20"
            borderColor="border-[#597ecf]/30"
            headerColor="bg-[#eef3fc]"
          >
            {(task: ChildTask) => {
              const isPersonal = !task.teacher_column_id;

              return (
                <TaskCard key={task.id} task={task} onUpdate={handleUpdateStatus} onUpdateTask={handleUpdateTask} onDelete={handleDelete} onUndo={(t: any) => handleUpdateStatus(t.id, 'Todo')}>
                  <div className="flex gap-2 mt-3">
                    {isPersonal ? (
                      <>
                        <button 
                          onClick={() => handleUpdateStatus(task.id!, 'Verified')} 
                          className="flex-1 bg-[#57627a] hover:bg-[#434c60] text-white px-3 py-2.5 rounded-xl text-xs sm:text-sm font-bold active:scale-95 transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                          title="ตรวจความเรียบร้อยและปิดงานสำเร็จทันที"
                        >
                          <CheckCircle2 className="w-4 h-4" /> ตรวจแล้ว (ผ่าน)
                        </button>
                        <button 
                          onClick={() => handleUpdateStatus(task.id!, 'Rework')} 
                          className="px-3 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold active:scale-95 transition-all flex items-center justify-center gap-1 cursor-pointer shrink-0"
                          title="พบจุดผิด ให้เด็กนำกลับไปแก้ไขใหม่ (เพิ่มรอบการแก้)"
                        >
                          <RotateCcw className="w-3.5 h-3.5" /> ให้แก้
                        </button>
                      </>
                    ) : (
                      <>
                        <button 
                          onClick={() => handleUpdateStatus(task.id!, 'Submitted')} 
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2.5 rounded-xl text-xs sm:text-sm font-bold active:scale-95 transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                          title="ส่งครูที่โรงเรียนแล้ว รอครูอัปเดตคะแนนในชีต"
                        >
                          <Send className="w-4 h-4" /> ส่งครูแล้ว
                        </button>
                        <button 
                          onClick={() => handleUpdateStatus(task.id!, 'Rework')} 
                          className="px-3 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold active:scale-95 transition-all flex items-center justify-center gap-1 cursor-pointer shrink-0"
                          title="พบจุดผิด ให้เด็กนำกลับไปแก้ไขใหม่ (เพิ่มรอบการแก้)"
                        >
                          <RotateCcw className="w-3.5 h-3.5" /> ให้แก้
                        </button>
                      </>
                    )}
                  </div>
                </TaskCard>
              );
            }}
          </TaskColumn>

          {/* 3. SUBMITTED / VERIFIED Column */}
          <TaskColumn 
            title={filterType === 'personal' ? 'เสร็จสมบูรณ์ (ตรวจแล้ว)' : 'ส่งแล้ว (รออัปเดต)'} 
            icon={filterType === 'personal' ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <Send className="w-5 h-5 text-emerald-600" />}
            tasks={filterType === 'personal' 
              ? filteredTasks.filter(t => t.status === 'Verified') 
              : filteredTasks.filter(t => t.status === 'Submitted')
            }
            bgColor="bg-emerald-50/20"
            borderColor="border-emerald-200"
            headerColor="bg-emerald-50"
          >
            {(task: ChildTask) => {
              const isPersonal = !task.teacher_column_id;

              return (
                <TaskCard 
                  key={task.id} 
                  task={task} 
                  onUpdate={handleUpdateStatus} 
                  onUpdateTask={handleUpdateTask} 
                  onDelete={handleDelete} 
                  onUndo={(t: any) => handleUpdateStatus(t.id, 'Done')}
                >
                  <div className="mt-3 mb-1">
                    {isPersonal ? (
                      <div className="flex items-center justify-between bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
                        <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>ทำเสร็จสมบูรณ์แล้ว</span>
                        </span>
                        <button 
                          onClick={() => handleUpdateStatus(task.id!, 'Done')}
                          className="text-xs text-gray-500 hover:text-[#597ecf] bg-white border border-[#e2e8f0] px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1 cursor-pointer transition-all active:scale-95 shadow-2xs shrink-0"
                          title="ดึงกลับไปช่องทำเสร็จ (รอตรวจ)"
                        >
                          <RotateCcw className="w-3 h-3" /> ดึงกลับ
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                        <span className="text-xs font-bold text-amber-800 flex items-center gap-1.5">
                          <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                          <span>รอครูตรวจในชีต</span>
                        </span>
                        <button
                          onClick={() => handleUpdateStatus(task.id!, 'Rework')}
                          className="text-xs text-rose-600 hover:text-rose-700 bg-white hover:bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1 cursor-pointer transition-all active:scale-95 shadow-2xs shrink-0"
                          title="ครูให้กลับมาแก้ไขใหม่ ดีดกลับไปช่องยังไม่ทำ"
                        >
                          <RotateCcw className="w-3 h-3 text-rose-500" /> ครูให้แก้ไข
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

function TaskCard({ task, children, onUpdateTask, onDelete, onUndo }: any) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(task.task_name);
  const [editOriginalDraftName, setEditOriginalDraftName] = useState(task.original_personal_name || '');
  const [editAssignedDate, setEditAssignedDate] = useState(task.assigned_date || task.date || '');
  const [editDueDate, setEditDueDate] = useState(task.due_date || '');
  const [editNote, setEditNote] = useState(task.note || '');
  const [editTags, setEditTags] = useState<string[]>(task.tags || []);

  const isPersonal = !task.teacher_column_id;

  const handleSaveEdit = () => {
    const trimmedName = editName.trim();
    const trimmedDraftName = editOriginalDraftName.trim();

    const updates: Partial<ChildTask> = {};
    if (isPersonal && trimmedName && trimmedName !== task.task_name) {
      updates.task_name = trimmedName;
    }
    if (!isPersonal && trimmedDraftName !== (task.original_personal_name || '')) {
      updates.original_personal_name = trimmedDraftName;
    }
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
    <div className="bg-white p-4 rounded-2xl shadow-xs border border-[#e2e8f0] hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 relative overflow-hidden group">
      {task.status === 'Rework' && (
        <div className="absolute top-0 right-0 bg-rose-600 text-white text-[10px] font-extrabold px-2.5 py-0.5 rounded-bl-xl z-10 shadow-xs flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" /> ต้องแก้!
        </div>
      )}
      
      <div className="flex justify-between items-start mb-2.5 gap-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-bold text-[#597ecf] bg-[#eef3fc] px-2.5 py-0.5 rounded-lg border border-[#597ecf]/20">
            {task.subject}
          </span>
          {isPersonal ? (
            <span className="text-[10px] font-bold text-[#57627a] bg-[#eff2f7] px-2 py-0.5 rounded-md border border-[#cbd3e0] flex items-center gap-1">
              <FileText className="w-2.5 h-2.5" /> ส่วนตัว
            </span>
          ) : (
            <span className="text-[10px] font-bold text-[#597ecf] bg-[#eef3fc] px-2 py-0.5 rounded-md border border-[#597ecf]/30 flex items-center gap-1">
              <CheckSquare className="w-2.5 h-2.5" /> ชีตครู
            </span>
          )}
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
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white pl-1">
            {onUndo && (
              <button 
                onClick={() => onUndo(task)}
                className="text-gray-400 hover:text-orange-600 p-1 rounded-lg hover:bg-orange-50 cursor-pointer transition-colors"
                title="ดึงกลับมา"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
            
            <button 
              onClick={() => {
                setIsEditing(true);
                setEditName(task.task_name);
                setEditOriginalDraftName(task.original_personal_name || '');
                setEditAssignedDate(task.assigned_date || task.date || '');
                setEditDueDate(task.due_date || '');
                setEditNote(task.note || '');
                setEditTags(task.tags || []);
              }}
              className="text-gray-400 hover:text-[#597ecf] p-1 rounded-lg hover:bg-[#eef3fc] cursor-pointer transition-colors"
              title={isPersonal ? "แก้ไขงานส่วนตัว" : "แก้ไขรายละเอียดและร่างงานเดิม"}
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>

            {isPersonal ? (
              <button 
                onClick={() => onDelete(task)}
                className="text-gray-400 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 cursor-pointer transition-colors"
                title="ลบงานส่วนตัวนี้"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            ) : task.original_personal_name ? (
              <button 
                onClick={() => onDelete(task)}
                className="text-gray-400 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 cursor-pointer transition-colors"
                title="ลบประวัติงานส่วนตัวเดิมออกจากงานนี้"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            ) : null}
          </div>
        )}
      </div>

      {isEditing ? (
        <div className="mb-2 space-y-2.5 bg-[#f4f7fa] p-3.5 rounded-2xl border border-[#e2e8f0]">
          {isPersonal ? (
            <div>
              <label className="block text-[10px] font-bold text-gray-500 mb-1">ชื่องานส่วนตัว</label>
              <textarea
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full text-sm font-medium text-gray-900 bg-white border border-[#e2e8f0] rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-[#597ecf] resize-none"
                rows={2}
                autoFocus
              />
            </div>
          ) : (
            <div className="space-y-2">
              <div className="bg-[#eff2f7] p-2.5 rounded-xl border border-[#cbd3e0]">
                <span className="text-[10px] font-bold text-[#57627a] block mb-0.5">
                  ชื่องานหลัก (อิงตามชีตครู - ล็อกไว้)
                </span>
                <p className="text-xs sm:text-sm font-bold text-gray-800 leading-snug">{task.task_name}</p>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-600 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <FileText className="w-3 h-3 text-[#597ecf]" /> ชื่องานส่วนตัวเดิม (ร่างเดิม)
                  </span>
                  {editOriginalDraftName && (
                    <button
                      type="button"
                      onClick={() => setEditOriginalDraftName('')}
                      className="text-[10px] text-rose-500 hover:text-rose-700 font-semibold cursor-pointer"
                    >
                      ลบชื่อร่างเดิม
                    </button>
                  )}
                </label>
                <input
                  type="text"
                  value={editOriginalDraftName}
                  onChange={(e) => setEditOriginalDraftName(e.target.value)}
                  placeholder="เช่น a, การบ้านข้อ 1-5..."
                  className="w-full text-xs font-semibold text-gray-800 bg-white border border-[#e2e8f0] rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#597ecf]"
                />
              </div>
            </div>
          )}

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
                setEditName(task.task_name); 
                setEditOriginalDraftName(task.original_personal_name || '');
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

          {task.original_personal_name && task.original_personal_name !== task.task_name && (
            <div className="text-[11px] text-[#57627a] bg-[#eff2f7] px-2 py-0.5 rounded-md border border-[#cbd3e0] inline-flex items-center gap-1 max-w-full my-1">
              <span className="font-bold text-gray-400">ร่างเดิม:</span>
              <span className="truncate font-medium">{task.original_personal_name}</span>
            </div>
          )}

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
