'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
  RefreshCcw, 
  LayoutGrid, 
  CheckCircle2, 
  AlertCircle, 
  Search, 
  Edit2, 
  X, 
  Save, 
  Filter, 
  StickyNote, 
  Trash2, 
  Link2, 
  Unlink, 
  BookOpen, 
  Sparkles, 
  CheckCircle,
  ArrowRight,
  Clock,
  HelpCircle,
  GraduationCap,
  Home,
  CheckSquare,
  FileText,
  Calendar,
  Send,
  History
} from 'lucide-react';
import { 
  ChildTask, 
  TeacherColumn, 
  TaskStatus,
  getChildTasks, 
  getTeacherColumns, 
  updateChildTask, 
  addChildTask,
  getGlobalSettings, 
  deleteChildTask 
} from '@/lib/db';
import confetti from 'canvas-confetti';
import { clsx } from 'clsx';
import Link from 'next/link';

// Local date string in YYYY-MM-DD format (Thailand / Local Time)
const getTodayDateString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function TaskHubPage() {
  const [studentName, setStudentName] = useState<string | null>(null);
  const [childTasks, setChildTasks] = useState<ChildTask[]>([]);
  const [teacherCols, setTeacherCols] = useState<TeacherColumn[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [sheetUrls, setSheetUrls] = useState<string[]>([]);

  // Filter & Search state
  const [filterSubject, setFilterSubject] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [teacherColFilter, setTeacherColFilter] = useState<'pending' | 'checked'>('pending');

  // Link Modal State: Anchor is Teacher Column!
  const [selectedTeacherColToLink, setSelectedTeacherColToLink] = useState<TeacherColumn | null>(null);
  const [targetPersonalTaskId, setTargetPersonalTaskId] = useState<string>('');

  // Editing state for personal note
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editTaskName, setEditTaskName] = useState('');
  const [editTaskAssignedDate, setEditTaskAssignedDate] = useState('');
  const [editTaskDueDate, setEditTaskDueDate] = useState('');
  const [editTaskNote, setEditTaskNote] = useState('');
  const [editTaskTags, setEditTaskTags] = useState<string[]>([]);

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
        loadData(savedName);
      } else {
        setLoading(false);
      }

      const savedFilter = localStorage.getItem('hw_filter_subject');
      if (savedFilter) {
        setFilterSubject(savedFilter);
      }
    };
    init();
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

  const handleSubjectChange = (subject: string) => {
    setFilterSubject(subject);
    localStorage.setItem('hw_filter_subject', subject);
  };

  // Unique subjects across both datasets
  const uniqueSubjects = useMemo(() => {
    const subjects = new Set<string>();
    teacherCols.forEach(c => { if (c.subject?.trim()) subjects.add(c.subject.trim()); });
    childTasks.forEach(t => { if (t.subject?.trim()) subjects.add(t.subject.trim()); });
    return Array.from(subjects).sort();
  }, [teacherCols, childTasks]);

  // All Personal Tasks
  const allPersonalTasks = useMemo(() => {
    return childTasks.filter(t => t.task_type === 'personal' || (!t.task_type && !t.teacher_column_id));
  }, [childTasks]);

  // Map of teacher column ID -> Linked Personal Task
  const teacherColToPersonalTaskMap = useMemo(() => {
    const map = new Map<string, ChildTask>();
    childTasks.forEach(task => {
      if (task.teacher_column_id && (task.original_personal_name || task.task_type === 'personal')) {
        map.set(task.teacher_column_id, task);
      }
    });
    return map;
  }, [childTasks]);

  // Pending vs Checked Teacher Columns Count
  const pendingTeacherCount = useMemo(() => {
    return teacherCols.filter(col => {
      if (col.is_checked) return false;
      if (filterSubject !== 'All' && col.subject !== filterSubject) return false;
      return true;
    }).length;
  }, [teacherCols, filterSubject]);

  const checkedTeacherCount = useMemo(() => {
    return teacherCols.filter(col => {
      if (!col.is_checked) return false;
      if (filterSubject !== 'All' && col.subject !== filterSubject) return false;
      return true;
    }).length;
  }, [teacherCols, filterSubject]);

  // Left Side: Displayed Teacher Columns (Filterable by pending / checked)
  const displayedTeacherCols = useMemo(() => {
    return teacherCols.filter(col => {
      if (teacherColFilter === 'pending' && col.is_checked) return false;
      if (teacherColFilter === 'checked' && !col.is_checked) return false;
      if (filterSubject !== 'All' && col.subject !== filterSubject) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = col.column_name.toLowerCase().includes(q);
        const matchSubject = col.subject.toLowerCase().includes(q);
        if (!matchName && !matchSubject) return false;
      }
      return true;
    }).sort((a, b) => {
      if (a.subject !== b.subject) return a.subject.localeCompare(b.subject);
      return (a.sequence || 0) - (b.sequence || 0);
    });
  }, [teacherCols, filterSubject, searchQuery, teacherColFilter]);

  // Right Side: Filtered Personal Tasks
  const filteredPersonalTasks = useMemo(() => {
    return allPersonalTasks.filter(task => {
      if (filterSubject !== 'All' && task.subject !== filterSubject) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = task.task_name.toLowerCase().includes(q);
        const matchesSub = task.subject.toLowerCase().includes(q);
        const matchesNote = (task.note || '').toLowerCase().includes(q);
        if (!matchesName && !matchesSub && !matchesNote) return false;
      }
      return true;
    }).sort((a, b) => {
      const timeA = (a.created_at as any)?.toMillis?.() || 0;
      const timeB = (b.created_at as any)?.toMillis?.() || 0;
      return timeB - timeA;
    });
  }, [allPersonalTasks, filterSubject, searchQuery]);

  // Suggest matching personal note for a teacher column
  const getAutoSuggestedNote = (col: TeacherColumn) => {
    const candidates = allPersonalTasks.filter(t => t.subject === col.subject && !t.teacher_column_id);
    if (candidates.length === 0) return null;

    const colLower = col.column_name.toLowerCase().replace(/[^a-zA-Z0-9ก-๙]/g, '');
    
    for (const note of candidates) {
      const noteLower = note.task_name.toLowerCase().replace(/[^a-zA-Z0-9ก-๙]/g, '');
      if (colLower.includes(noteLower) || noteLower.includes(colLower)) {
        return note;
      }
    }
    return candidates[0];
  };

  // Open Link Modal from Teacher Column
  const handleOpenLinkModal = (col: TeacherColumn) => {
    setSelectedTeacherColToLink(col);
    const suggested = getAutoSuggestedNote(col);
    setTargetPersonalTaskId(suggested ? suggested.id! : '');
  };

  // Confirm Link (Unified Merge: Teacher Column is MASTER A -> Personal Task is working draft a with revision history)
  const handleConfirmLink = async () => {
    if (!selectedTeacherColToLink || !targetPersonalTaskId || !studentName) return;

    const personalNote = allPersonalTasks.find(t => t.id === targetPersonalTaskId);
    if (!personalNote) return;

    try {
      // 1. Determine final status
      let finalStatus: TaskStatus = 'Submitted';
      if (selectedTeacherColToLink.is_checked) {
        finalStatus = 'Verified';
      } else if (personalNote.status === 'Todo' || personalNote.status === 'Rework') {
        finalStatus = personalNote.status;
      } else if (personalNote.status === 'Verified' || personalNote.status === 'Done') {
        finalStatus = 'Submitted';
      } else {
        finalStatus = personalNote.status;
      }

      // 2. Revision counter & history logs
      const currentRev = personalNote.revision_count || 1;
      const history = [...(personalNote.revision_history || [])];

      if (history.length === 0) {
        history.push({
          revision: currentRev,
          action: 'created',
          note: `สร้างงานร่างเดิม: ${personalNote.task_name}`,
          timestamp: (personalNote.created_at as any)?.toMillis?.() || Date.now()
        });
      }

      history.push({
        revision: currentRev,
        action: 'teacher_linked',
        note: `ผูกเข้ากับงานชีตครู: ${selectedTeacherColToLink.column_name}`,
        timestamp: Date.now()
      });

      if (selectedTeacherColToLink.is_checked) {
        history.push({
          revision: currentRev,
          action: 'verified',
          note: 'ครูตรวจผ่านในชีตเรียบร้อยแล้ว (สมบูรณ์)',
          timestamp: Date.now()
        });
      }

      // 3. Keep original draft name
      const originalDraftName = personalNote.original_personal_name || personalNote.task_name;

      // 4. Update personal task to become the unified official master
      await updateChildTask(personalNote.id!, {
        task_name: selectedTeacherColToLink.column_name,
        original_personal_name: originalDraftName,
        teacher_column_id: selectedTeacherColToLink.id,
        task_type: 'official',
        status: finalStatus,
        revision_count: currentRev,
        revision_history: history
      });

      // 5. Clean up any hollow placeholder official tasks to avoid duplicate rows
      const hollowOfficialTasks = childTasks.filter(
        t => t.teacher_column_id === selectedTeacherColToLink.id && t.id !== personalNote.id
      );
      for (const hollow of hollowOfficialTasks) {
        if (hollow.id) {
          await deleteChildTask(hollow.id);
        }
      }

      await loadData(studentName);

      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.6 }
      });

      setSelectedTeacherColToLink(null);
      setTargetPersonalTaskId('');
    } catch (error) {
      console.error('Error linking task:', error);
      alert('เกิดข้อผิดพลาดในการเชื่อมโยงงาน');
    }
  };

  // Unlink Action
  const handleUnlink = async (personalTask: ChildTask) => {
    if (!personalTask.id || !personalTask.teacher_column_id || !studentName) return;
    const taskTitle = personalTask.original_personal_name || personalTask.task_name;
    if (!confirm(`คุณต้องการยกเลิกการเชื่อมโยงกับงานส่วนตัว "${taskTitle}" ใช่หรือไม่?`)) return;

    try {
      const teacherColId = personalTask.teacher_column_id;
      const history = [...(personalTask.revision_history || [])];
      history.push({
        revision: personalTask.revision_count || 1,
        action: 'parent_reviewed',
        note: 'ยกเลิกการเชื่อมโยงกับชีตครู (กลับเป็นงานส่วนตัวอิสระ)',
        timestamp: Date.now()
      });

      // Revert personal task back to personal draft
      await updateChildTask(personalTask.id, {
        task_name: personalTask.original_personal_name || personalTask.task_name,
        original_personal_name: undefined,
        teacher_column_id: null,
        task_type: 'personal',
        status: 'Done',
        revision_history: history
      });

      // Re-create official task placeholder if teacher column still exists in sheet
      const targetCol = teacherCols.find(c => c.id === teacherColId);
      if (targetCol) {
        await addChildTask({
          student_name: studentName,
          subject: targetCol.subject,
          task_name: targetCol.column_name,
          teacher_column_id: targetCol.id,
          task_type: 'official',
          status: targetCol.is_checked ? 'Verified' : 'Todo',
          date: new Date().toISOString().split('T')[0]
        });
      }

      await loadData(studentName);
    } catch (error) {
      console.error('Error unlinking task:', error);
      alert('เกิดข้อผิดพลาดในการยกเลิกการเชื่อมโยง');
    }
  };

  // Edit Personal Task
  const handleStartEdit = (task: ChildTask) => {
    setEditingTaskId(task.id!);
    setEditTaskName(task.task_name);
    setEditTaskAssignedDate(task.assigned_date || task.date || '');
    setEditTaskDueDate(task.due_date || '');
    setEditTaskNote(task.note || '');
    setEditTaskTags(task.tags || []);
  };

  const handleSaveEdit = async (taskId: string) => {
    const trimmed = editTaskName.trim();
    if (!trimmed) return;

    try {
      const updates: Partial<ChildTask> = {
        task_name: trimmed,
        assigned_date: editTaskAssignedDate,
        due_date: editTaskDueDate,
        date: editTaskAssignedDate,
        note: editTaskNote,
        tags: editTaskTags
      };
      await updateChildTask(taskId, updates);
      setChildTasks(childTasks.map(t => t.id === taskId ? { ...t, ...updates } : t));
      setEditingTaskId(null);
    } catch (error) {
      console.error('Error updating task:', error);
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    }
  };

  // Delete Personal Task
  const handleDeleteTask = async (taskId: string) => {
    if (!confirm("คุณแน่ใจหรือไม่ว่าต้องการลบงานส่วนตัวนี้?")) return;
    try {
      await deleteChildTask(taskId);
      setChildTasks(childTasks.filter(t => t.id !== taskId));
    } catch (error) {
      console.error('Error deleting task:', error);
      alert('เกิดข้อผิดพลาดในการลบงาน');
    }
  };

  if (!studentName) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 animate-in fade-in duration-700">
        <div className="w-24 h-24 bg-[#eef3fc] rounded-full flex items-center justify-center mb-6 shadow-inner">
          <AlertCircle className="w-12 h-12 text-[#597ecf]" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-4">ยินดีต้อนรับสู่ระบบติดตามงาน</h2>
        <p className="text-gray-500 max-w-md mb-8 text-lg">กรุณาตั้งค่าชื่อนักเรียนก่อนเริ่มใช้งาน</p>
        <Link href="/settings" className="bg-[#597ecf] text-white px-8 py-3 rounded-full font-medium hover:bg-[#486cb8] hover:shadow-lg transition-all transform hover:-translate-y-1">
          ไปหน้าตั้งค่า
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      
      {/* Header section adhering to AGENTS.md Standard Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-6 sm:p-7 rounded-3xl border border-[#e2e8f0] shadow-sm gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 flex items-center">
            <LayoutGrid className="w-6 h-6 text-[#597ecf] mr-2 shrink-0" />
            จัดการงาน (Task Hub)
          </h1>
          <p className="text-gray-500 mt-1 text-sm sm:text-base">
            ศูนย์ตรวจสอบงานครูที่ยังไม่เสร็จ และเชื่อมโยงกับงานส่วนตัวของ {studentName}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto mt-4 sm:mt-0">
          <button
            onClick={handleSync}
            disabled={syncing}
            className="h-[42px] px-4 rounded-xl text-sm font-semibold bg-[#597ecf] text-white hover:bg-[#486cb8] flex items-center justify-center shadow-xs hover:shadow-md active:scale-95 transition-all disabled:opacity-50 w-full sm:w-auto cursor-pointer"
          >
            <RefreshCcw className={clsx("w-4 h-4 mr-2", syncing && "animate-spin")} />
            {syncing ? 'กำลังดึงข้อมูล...' : 'อัปเดตข้อมูลจากครู'}
          </button>
        </div>
      </div>

      {/* KPI Overview Summary (4 Cards) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-[#e2e8f0] shadow-xs flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-xl shrink-0">
            <Clock className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">งานครูที่รอตรวจ/ค้าง</p>
            <p className="text-xl font-black text-amber-600">{pendingTeacherCount} <span className="text-xs text-gray-400 font-normal">ชิ้น</span></p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#e2e8f0] shadow-xs flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-[#eff2f7] text-[#57627a] flex items-center justify-center text-xl shrink-0">
            <StickyNote className="w-5 h-5 text-[#57627a]" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">งานส่วนตัวทั้งหมด</p>
            <p className="text-xl font-black text-[#57627a]">{allPersonalTasks.length} <span className="text-xs text-gray-400 font-normal">ชิ้น</span></p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#e2e8f0] shadow-xs flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl shrink-0">
            <Link2 className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">เชื่อมโยงกับครูแล้ว</p>
            <p className="text-xl font-black text-emerald-600">{allPersonalTasks.filter(t => !!t.teacher_column_id).length} <span className="text-xs text-gray-400 font-normal">ชิ้น</span></p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#e2e8f0] shadow-xs flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-[#eef3fc] text-[#597ecf] flex items-center justify-center text-xl shrink-0">
            <Sparkles className="w-5 h-5 text-[#597ecf]" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">งานส่วนตัว (ยังไม่ผูก)</p>
            <p className="text-xl font-black text-[#597ecf]">{allPersonalTasks.filter(t => !t.teacher_column_id).length} <span className="text-xs text-gray-400 font-normal">ชิ้น</span></p>
          </div>
        </div>
      </div>

      {/* Toolbar (Search Bar on the left, Subject Filter on the right) */}
      <div className="bg-white p-4 rounded-2xl border border-[#e2e8f0] shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search Bar */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="ค้นหาชื่องาน หรือข้อความโน้ต..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-[#f4f7fa] border border-[#e2e8f0] rounded-xl outline-none focus:ring-2 focus:ring-[#597ecf] focus:bg-white transition-all placeholder:text-gray-400"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Subject Filter Dropdown */}
        <div className="flex items-center bg-[#f4f7fa] border border-[#e2e8f0] rounded-xl px-3 h-[38px] w-full md:w-auto self-stretch md:self-auto">
          <Filter className="w-4 h-4 text-gray-400 mr-2 shrink-0" />
          <select
            value={filterSubject}
            onChange={(e) => handleSubjectChange(e.target.value)}
            className="text-xs sm:text-sm border-none outline-none focus:ring-0 bg-transparent text-gray-700 font-medium w-full cursor-pointer"
          >
            <option key="all" value="All">ทุกวิชา</option>
            {uniqueSubjects.map(sub => (
              <option key={`sub-${sub}`} value={sub}>{sub}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Split View (2 Columns) */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#597ecf]"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* ======================================================== */}
          {/* LEFT SIDE: งานตามชีตครู (ตัวตั้งในการผูกงาน)              */}
          {/* ======================================================== */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#e2e8f0] shadow-sm flex flex-col h-full">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-4 border-b border-[#e2e8f0] gap-3">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-[#eef3fc] text-[#597ecf] flex items-center justify-center font-bold text-sm">
                  <CheckSquare className="w-4 h-4 text-[#597ecf]" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">งานตามชีตครู</h2>
                  <p className="text-xs sm:text-sm text-gray-500">
                    {teacherColFilter === 'pending' ? 'งานที่ครูยังไม่ติ๊กตรวจในชีต' : 'งานที่ครูตรวจจบงานแล้วในชีต'}
                  </p>
                </div>
              </div>

              {/* Segmented Switcher for Teacher Columns */}
              <div className="flex items-center bg-[#eff2f7] p-1 rounded-xl border border-[#cbd3e0] self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setTeacherColFilter('pending')}
                  className={clsx(
                    "px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                    teacherColFilter === 'pending'
                      ? "bg-white text-[#597ecf] shadow-xs"
                      : "text-gray-500 hover:text-gray-700"
                  )}
                >
                  <span>ยังไม่เสร็จ</span>
                  <span className={clsx(
                    "px-1.5 py-0.2 rounded-full text-[10px] font-extrabold",
                    teacherColFilter === 'pending' ? "bg-[#eef3fc] text-[#597ecf]" : "bg-gray-200 text-gray-600"
                  )}>
                    {pendingTeacherCount}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setTeacherColFilter('checked')}
                  className={clsx(
                    "px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                    teacherColFilter === 'checked'
                      ? "bg-white text-emerald-700 shadow-xs"
                      : "text-gray-500 hover:text-gray-700"
                  )}
                >
                  <span>ตรวจจบแล้ว</span>
                  <span className={clsx(
                    "px-1.5 py-0.2 rounded-full text-[10px] font-extrabold",
                    teacherColFilter === 'checked' ? "bg-emerald-100 text-emerald-800" : "bg-gray-200 text-gray-600"
                  )}>
                    {checkedTeacherCount}
                  </span>
                </button>
              </div>
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto max-h-[650px] pr-1">
              {displayedTeacherCols.length === 0 ? (
                <div className="text-center py-12 bg-[#f4f7fa] rounded-2xl border border-dashed border-[#e2e8f0] text-gray-400 text-sm">
                  {teacherColFilter === 'pending' 
                    ? 'ยอดเยี่ยมมาก! ไม่มีงานค้างจากชีตครูในหมวดนี้' 
                    : 'ยังไม่มีงานที่ครูตรวจจบงานแล้วในหมวดนี้'}
                </div>
              ) : (
                displayedTeacherCols.map(col => {
                  const linkedPersonalTask = teacherColToPersonalTaskMap.get(col.id);

                  return (
                    <div 
                      key={col.id}
                      className={clsx(
                        "p-4 rounded-2xl border transition-all duration-200",
                        linkedPersonalTask 
                          ? "bg-emerald-50/40 border-emerald-200" 
                          : col.is_checked 
                            ? "bg-emerald-50/20 border-emerald-100 hover:bg-white hover:shadow-xs" 
                            : "bg-[#f8fafc] border-[#e2e8f0] hover:bg-white hover:shadow-xs"
                      )}
                    >
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-bold px-2.5 py-0.5 rounded-lg text-[#597ecf] bg-[#eef3fc] border border-[#597ecf]/20">
                            {col.subject}
                          </span>
                          {col.is_checked && (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> ครูตรวจแล้ว
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          {typeof col.sequence === 'number' && (
                            <span className="text-xs font-bold font-mono px-2 py-0.5 rounded-md bg-[#eff2f7] text-[#57627a]">
                              #{col.sequence}
                            </span>
                          )}

                          {linkedPersonalTask ? (
                            <span className="text-[10px] sm:text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> เชื่อมแล้ว
                            </span>
                          ) : (
                            <span className="text-[10px] sm:text-xs font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                              รอเชื่อม
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Content */}
                      <p className="font-bold text-gray-900 text-sm leading-snug mb-3">
                        {col.column_name}
                      </p>

                      {/* Bottom Action Area */}
                      <div className="pt-2 border-t border-[#e2e8f0] flex items-center justify-between gap-2">
                        {linkedPersonalTask ? (
                          <div className="flex items-center justify-between w-full bg-emerald-100/60 text-emerald-900 rounded-xl px-3 py-1.5 text-xs font-semibold">
                            <div className="flex items-center gap-1.5 truncate mr-2">
                              <Link2 className="w-3.5 h-3.5 shrink-0 text-emerald-700" />
                              <span className="truncate">ผูกกับงานส่วนตัว: <strong>{linkedPersonalTask.original_personal_name || linkedPersonalTask.task_name}</strong></span>
                            </div>
                            <button
                              onClick={() => handleUnlink(linkedPersonalTask)}
                              className="text-[11px] font-bold text-rose-600 hover:text-rose-800 bg-white hover:bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200 shrink-0 transition-colors cursor-pointer flex items-center gap-1"
                              title="ยกเลิกการเชื่อมโยง"
                            >
                              <Unlink className="w-3 h-3" /> ยกเลิกผูก
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleOpenLinkModal(col)}
                            className="w-full bg-[#597ecf] hover:bg-[#486cb8] text-white text-xs font-bold py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 shadow-xs active:scale-95 transition-all cursor-pointer"
                          >
                            <Link2 className="w-3.5 h-3.5" /> ผูกกับงานส่วนตัว...
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* ======================================================== */}
          {/* RIGHT SIDE: งานส่วนตัวทั้งหมด (Personal Tasks Archive)   */}
          {/* ======================================================== */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#e2e8f0] shadow-sm flex flex-col h-full">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#e2e8f0]">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-[#eff2f7] text-[#57627a] flex items-center justify-center font-bold text-sm">
                  <FileText className="w-4 h-4 text-[#57627a]" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">งานส่วนตัว & ประวัติงาน (Personal Only)</h2>
                  <p className="text-xs sm:text-sm text-gray-500">เฉพาะงานที่เพิ่มเอง (ดูประวัติและแก้ไข)</p>
                </div>
              </div>
              <span className="text-xs font-bold text-[#57627a] bg-[#eff2f7] border border-[#57627a]/30 px-2.5 py-1 rounded-full">
                {filteredPersonalTasks.length} รายการ
              </span>
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto max-h-[650px] pr-1">
              {filteredPersonalTasks.length === 0 ? (
                <div className="text-center py-12 bg-[#eff2f7]/40 rounded-2xl border border-dashed border-[#cbd3e0] text-gray-400 text-sm">
                  <StickyNote className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  ยังไม่มีงานส่วนตัวในหมวดนี้
                  <p className="text-xs text-gray-400 mt-1">คุณสามารถเพิ่มงานส่วนตัวใหม่ได้ที่หน้า "การบ้านของฉัน"</p>
                </div>
              ) : (
                filteredPersonalTasks.map(task => {
                  const isLinked = !!task.teacher_column_id;
                  const isEditing = editingTaskId === task.id;
                  const linkedCol = isLinked ? teacherCols.find(c => c.id === task.teacher_column_id) : null;
                  const todayStr = getTodayDateString();
                  const isTaskDone = ['Verified', 'Done', 'Submitted'].includes(task.status);
                  const isOverdue = !isTaskDone && !!task.due_date && task.due_date.trim() < todayStr;

                  return (
                    <div 
                      key={task.id}
                      className={clsx(
                        "p-4 rounded-2xl border transition-all duration-200 relative group",
                        isLinked ? "bg-emerald-50/30 border-emerald-200" : "bg-[#eff2f7]/30 border-[#cbd3e0] hover:bg-white"
                      )}
                    >
                      {/* Top Badges */}
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-bold px-2.5 py-0.5 rounded-lg text-[#57627a] bg-[#eff2f7] border border-[#cbd3e0]">
                            {task.subject}
                          </span>
                          
                          {isLinked ? (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300 flex items-center gap-1">
                              <Link2 className="w-2.5 h-2.5" /> ผูกกับงานครูแล้ว
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-[#57627a] bg-[#eff2f7] px-2 py-0.5 rounded-md border border-[#cbd3e0] flex items-center gap-1">
                              <FileText className="w-2.5 h-2.5" /> ส่วนตัว
                            </span>
                          )}

                          {task.revision_count && task.revision_count > 1 && (
                            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 flex items-center gap-1">
                              <History className="w-2.5 h-2.5" /> รอบที่ {task.revision_count}
                            </span>
                          )}

                          {task.tags?.includes('งานในคาบ') && (
                            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 flex items-center gap-1">
                              <GraduationCap className="w-3 h-3" /> งานในคาบ
                            </span>
                          )}
                          {task.tags?.includes('การบ้าน') && (
                            <span className="text-[10px] font-bold text-[#597ecf] bg-[#eef3fc] px-2 py-0.5 rounded border border-[#597ecf]/30 flex items-center gap-1">
                              <Home className="w-3 h-3" /> การบ้าน
                            </span>
                          )}
                        </div>

                        {/* Status Badge */}
                        <span className={clsx(
                          "text-[10px] font-bold px-2.5 py-0.5 rounded-full shrink-0 shadow-2xs flex items-center gap-1",
                          task.status === 'Verified' ? "bg-emerald-100 text-emerald-800 font-extrabold" : task.status === 'Done' ? "bg-[#eef3fc] text-[#597ecf]" : task.status === 'Submitted' ? "bg-sky-100 text-sky-800" : task.status === 'Rework' ? "bg-amber-100 text-amber-900 border border-amber-300" : "bg-gray-100 text-gray-700"
                        )}>
                          {task.status === 'Verified' ? <><CheckCircle2 className="w-3 h-3" /> ตรวจเสร็จแล้ว</> : task.status === 'Done' ? <><CheckCircle className="w-3 h-3" /> ทำเสร็จ-รอส่ง</> : task.status === 'Submitted' ? <><Send className="w-3 h-3" /> ส่งแล้ว-รออัปเดต</> : task.status === 'Rework' ? <><History className="w-3 h-3 text-amber-700" /> ต้องแก้ไข</> : <><FileText className="w-3 h-3" /> ยังไม่ทำ</>}
                        </span>
                      </div>

                      {/* Content / Edit Form */}
                      {isEditing ? (
                        <div className="my-2 space-y-2">
                          <textarea
                            value={editTaskName}
                            onChange={(e) => setEditTaskName(e.target.value)}
                            className="w-full text-sm font-semibold text-gray-900 border border-[#57627a] rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-[#57627a] resize-none bg-white"
                            rows={2}
                          />

                          {/* Checklist options in Edit Mode */}
                          <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">
                              ประเภทงาน
                            </label>
                            <div className="flex gap-1.5 flex-wrap items-center">
                              {[
                                { name: 'งานในคาบ', icon: GraduationCap, activeBg: 'bg-amber-500 hover:bg-amber-600' },
                                { name: 'การบ้าน', icon: Home, activeBg: 'bg-[#597ecf] hover:bg-[#486cb8]' }
                              ].map((item) => {
                                const isChecked = editTaskTags.includes(item.name);
                                const ItemIcon = item.icon;
                                return (
                                  <button
                                    type="button"
                                    key={item.name}
                                    onClick={() => {
                                      if (isChecked) {
                                        setEditTaskTags(editTaskTags.filter(t => t !== item.name));
                                      } else {
                                        setEditTaskTags([...editTaskTags, item.name]);
                                      }
                                    }}
                                    className={clsx(
                                      "px-2.5 py-1 text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1.5 active:scale-95 border",
                                      isChecked 
                                        ? `${item.activeBg} text-white shadow-xs` 
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

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[10px] font-bold text-gray-500 mb-1 flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-gray-400" /> วันที่มอบหมาย
                              </label>
                              <input
                                type="date"
                                value={editTaskAssignedDate}
                                onChange={(e) => setEditTaskAssignedDate(e.target.value)}
                                className="w-full text-xs text-gray-700 border border-[#e2e8f0] rounded-xl p-2 bg-white"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-gray-500 mb-1 flex items-center gap-1">
                                <Clock className="w-3 h-3 text-gray-400" /> กำหนดส่งงาน
                              </label>
                              <input
                                type="date"
                                value={editTaskDueDate}
                                onChange={(e) => setEditTaskDueDate(e.target.value)}
                                className="w-full text-xs text-gray-700 border border-[#e2e8f0] rounded-xl p-2 bg-white"
                              />
                            </div>
                          </div>
                          <div>
                            <input
                              type="text"
                              placeholder="โน้ตเพิ่มเติม..."
                              value={editTaskNote}
                              onChange={(e) => setEditTaskNote(e.target.value)}
                              className="w-full text-xs text-gray-700 border border-[#e2e8f0] rounded-xl p-2 bg-white"
                            />
                          </div>
                          <div className="flex justify-end gap-2 pt-1">
                            <button onClick={() => setEditingTaskId(null)} className="px-3 py-1 bg-white hover:bg-gray-50 text-gray-600 border border-[#e2e8f0] rounded-xl text-xs font-semibold cursor-pointer">
                              ยกเลิก
                            </button>
                            <button onClick={() => handleSaveEdit(task.id!)} className="px-3 py-1 bg-[#57627a] hover:bg-[#434c60] text-white rounded-xl text-xs font-semibold flex items-center gap-1 cursor-pointer">
                              <Save className="w-3 h-3" /> บันทึก
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="my-1.5 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-bold text-gray-900 text-sm leading-snug">
                              {task.task_name}
                            </p>

                            {task.note && (
                              <span className="text-[11px] text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 inline-flex items-center gap-1 shrink-0">
                                <StickyNote className="w-3 h-3 text-amber-600 shrink-0" />
                                <span>โน้ต: {task.note}</span>
                              </span>
                            )}
                          </div>

                          {task.original_personal_name && task.original_personal_name !== task.task_name && (
                            <div className="text-[11px] text-[#57627a] bg-[#eff2f7] px-2 py-0.5 rounded-md border border-[#cbd3e0] inline-flex items-center gap-1 max-w-full">
                              <span className="font-bold text-gray-400">ร่างเดิม:</span>
                              <span className="truncate font-medium">{task.original_personal_name}</span>
                            </div>
                          )}

                          {isLinked && linkedCol && (
                            <div className="text-[11px] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 inline-flex items-center gap-1.5 max-w-full">
                              <Link2 className="w-3 h-3 text-emerald-600 shrink-0" />
                              <span className="truncate">ผูกกับงานครู: <strong>{linkedCol.column_name}</strong> {linkedCol.sequence ? `(#${linkedCol.sequence})` : ''}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Bottom Date Area & Action Buttons */}
                      <div className="mt-2.5 pt-2 border-t border-[#e2e8f0] flex items-center justify-between text-xs gap-2 flex-wrap sm:flex-nowrap">
                        <div className="flex items-center gap-2 flex-wrap text-[11px]">
                          {(task.assigned_date || task.date) && (
                            <span className="text-gray-500">
                              มอบหมาย: <strong className="text-gray-700 font-medium">{task.assigned_date || task.date}</strong>
                            </span>
                          )}
                          {task.due_date && (
                            <span className={clsx(
                              "font-semibold flex items-center gap-1 px-1.5 py-0.5 rounded-md",
                              isOverdue
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

                        {!isEditing && (
                          <div className="flex items-center gap-1 shrink-0 ml-auto">
                            <button
                              onClick={() => handleStartEdit(task)}
                              className="p-1.5 text-gray-400 hover:text-[#597ecf] hover:bg-[#eef3fc] rounded-lg transition-colors cursor-pointer"
                              title="แก้ไขข้อความโน้ต"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteTask(task.id!)}
                              className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="ลบโน้ตนี้"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>
      )}

      {/* Linking Modal (Teacher Column -> Select Personal Note with Auto Suggest) */}
      {selectedTeacherColToLink && (
        <div 
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setSelectedTeacherColToLink(null)}
        >
          <div 
            className="bg-white rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl border border-[#e2e8f0] relative animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button 
              onClick={() => setSelectedTeacherColToLink(null)}
              className="absolute top-5 right-5 p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-[#eef3fc] text-[#597ecf] flex items-center justify-center text-2xl shadow-inner">
                <Link2 className="w-6 h-6 text-[#597ecf]" />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#597ecf] bg-[#eef3fc] border border-[#597ecf]/30 px-2 py-0.5 rounded-md">
                  เชื่อมโยงงานครูกับงานส่วนตัว
                </span>
                <h3 className="text-lg font-extrabold text-gray-900 mt-1">เลือกงานส่วนตัวที่คุณเคยบันทึกไว้</h3>
              </div>
            </div>

            {/* Target Teacher Column Summary (Anchor) */}
            <div className="bg-[#eef3fc]/60 p-4 rounded-2xl border border-[#597ecf]/30 mb-4 text-xs">
              <p className="text-[#597ecf] font-bold mb-0.5">งานของครูในชีต (ตัวตั้ง):</p>
              <p className="font-bold text-gray-900 text-sm">{selectedTeacherColToLink.column_name}</p>
              <p className="text-gray-500 mt-1">วิชา: <strong className="text-[#597ecf]">{selectedTeacherColToLink.subject}</strong> {selectedTeacherColToLink.sequence ? `(ลำดับ #${selectedTeacherColToLink.sequence})` : ''}</p>
            </div>

            {/* Select Target Personal Note */}
            <div className="space-y-2 mb-6">
              <label className="block text-xs font-bold text-gray-700">
                เลือกงานส่วนตัวในวิชา {selectedTeacherColToLink.subject} เพื่อผูกเข้าด้วยกัน:
              </label>
              
              {(() => {
                const availableNotes = allPersonalTasks.filter(t => t.subject === selectedTeacherColToLink.subject);
                const suggestedNote = getAutoSuggestedNote(selectedTeacherColToLink);

                if (availableNotes.length === 0) {
                  return (
                    <div className="text-xs text-gray-400 py-6 text-center bg-[#f4f7fa] rounded-2xl border border-dashed border-[#e2e8f0]">
                      <p className="font-medium text-gray-500 mb-1">ยังไม่มีงานส่วนตัวในวิชา {selectedTeacherColToLink.subject}</p>
                      <p className="text-[11px]">งานนี้จะเป็นงานเดี่ยวจากชีตครูตามปกติ</p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {availableNotes.map(note => {
                      const isSelected = targetPersonalTaskId === note.id;
                      const isSuggested = suggestedNote?.id === note.id;
                      const isAlreadyLinked = !!note.teacher_column_id;

                      return (
                        <div
                          key={note.id}
                          onClick={() => setTargetPersonalTaskId(note.id!)}
                          className={clsx(
                            "p-3 rounded-xl border text-xs font-semibold flex items-center justify-between cursor-pointer transition-all relative",
                            isSelected 
                              ? "bg-[#eef3fc] border-[#597ecf] ring-2 ring-[#597ecf]/40 shadow-xs" 
                              : isSuggested
                                ? "bg-amber-50/70 border-amber-300 hover:bg-amber-50"
                                : isAlreadyLinked
                                  ? "bg-gray-50/60 border-gray-200 opacity-60"
                                  : "bg-white border-[#e2e8f0] hover:border-[#597ecf]/40 hover:bg-[#f4f7fa]"
                          )}
                        >
                          <div className="flex items-center gap-2 overflow-hidden mr-2">
                            <input 
                              type="radio" 
                              name="targetPersonalTask" 
                              checked={isSelected}
                              onChange={() => setTargetPersonalTaskId(note.id!)}
                              className="cursor-pointer text-[#597ecf]"
                            />
                            <div className="truncate">
                              <div className="flex items-center gap-1.5">
                                <span className="text-gray-900 truncate font-bold">{note.task_name}</span>
                                {isSuggested && (
                                  <span className="text-[9px] font-extrabold bg-amber-400 text-amber-950 px-1.5 py-0.2 rounded-full flex items-center gap-0.5 shrink-0 shadow-2xs">
                                    <Sparkles className="w-2.5 h-2.5" /> แนะนำ
                                  </span>
                                )}
                              </div>
                              {note.date && <p className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1"><Calendar className="w-2.5 h-2.5" /> {note.date}</p>}
                            </div>
                          </div>

                          <span className={clsx(
                            "text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1",
                            note.status === 'Verified' ? "bg-emerald-100 text-emerald-800" : note.status === 'Done' ? "bg-[#eef3fc] text-[#597ecf]" : "bg-gray-100 text-gray-700"
                          )}>
                            {note.status === 'Verified' ? <><CheckCircle2 className="w-2.5 h-2.5" /> ตรวจแล้ว</> : note.status === 'Done' ? <><CheckCircle className="w-2.5 h-2.5" /> ทำเสร็จ</> : <><FileText className="w-2.5 h-2.5" /> ยังไม่ทำ</>}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            {/* Modal Buttons */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleConfirmLink}
                disabled={!targetPersonalTaskId}
                className="flex-1 bg-[#597ecf] hover:bg-[#486cb8] disabled:opacity-50 text-white font-bold py-3 px-4 rounded-xl text-center text-sm flex items-center justify-center gap-2 shadow-xs transition-all active:scale-95 cursor-pointer"
              >
                <Link2 className="w-4 h-4" /> ยืนยันการเชื่อมโยง
              </button>
              <button
                onClick={() => setSelectedTeacherColToLink(null)}
                className="px-4 py-3 bg-white hover:bg-gray-50 text-gray-700 font-semibold border border-[#e2e8f0] rounded-xl text-sm transition-colors cursor-pointer"
              >
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
