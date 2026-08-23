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
  HelpCircle
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

  // Link Modal State: Anchor is Teacher Column!
  const [selectedTeacherColToLink, setSelectedTeacherColToLink] = useState<TeacherColumn | null>(null);
  const [targetPersonalTaskId, setTargetPersonalTaskId] = useState<string>('');

  // Editing state for personal note
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editTaskName, setEditTaskName] = useState('');
  const [editTaskDate, setEditTaskDate] = useState('');
  const [editTaskNote, setEditTaskNote] = useState('');

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
    teacherCols.forEach(c => subjects.add(c.subject));
    childTasks.forEach(t => subjects.add(t.subject));
    return Array.from(subjects).sort();
  }, [teacherCols, childTasks]);

  // STRICTLY Personal Tasks ONLY
  const allPersonalTasks = useMemo(() => {
    return childTasks.filter(t => t.task_type === 'personal' || (!t.task_type && !t.teacher_column_id));
  }, [childTasks]);

  // Map of teacher column ID -> Linked Personal Task
  const teacherColToPersonalTaskMap = useMemo(() => {
    const map = new Map<string, ChildTask>();
    allPersonalTasks.forEach(task => {
      if (task.teacher_column_id) {
        map.set(task.teacher_column_id, task);
      }
    });
    return map;
  }, [allPersonalTasks]);

  // Left Side: Pending/Unfinished Teacher Tasks ONLY (ตัดงานที่ครูตรวจแล้วออก)
  const pendingTeacherCols = useMemo(() => {
    return teacherCols.filter(col => {
      // แสดงเฉพาะงานที่ครู "ยังไม่ตรวจ" (is_checked === false)
      if (col.is_checked) return false;

      if (filterSubject !== 'All' && col.subject !== filterSubject) return false;
      if (searchQuery.trim() && !col.column_name.toLowerCase().includes(searchQuery.toLowerCase()) && !col.subject.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    }).sort((a, b) => {
      if (a.subject !== b.subject) return a.subject.localeCompare(b.subject);
      return (a.sequence || 0) - (b.sequence || 0); // เรียงตามลำดับชิ้นงาน
    });
  }, [teacherCols, filterSubject, searchQuery]);

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
    
    // Look for best match
    for (const note of candidates) {
      const noteLower = note.task_name.toLowerCase().replace(/[^a-zA-Z0-9ก-๙]/g, '');
      if (colLower.includes(noteLower) || noteLower.includes(colLower)) {
        return note;
      }
    }
    return candidates[0]; // fallback to first note in same subject
  };

  // Open Link Modal from Teacher Column
  const handleOpenLinkModal = (col: TeacherColumn) => {
    setSelectedTeacherColToLink(col);
    const suggested = getAutoSuggestedNote(col);
    setTargetPersonalTaskId(suggested ? suggested.id! : '');
  };

  // Confirm Link (Teacher Column is MASTER -> Personal Note is linked as secondary source)
  const handleConfirmLink = async () => {
    if (!selectedTeacherColToLink || !targetPersonalTaskId || !studentName) return;

    const personalNote = allPersonalTasks.find(t => t.id === targetPersonalTaskId);
    if (!personalNote) return;

    try {
      // 1. Determine status of the Official Teacher Task based on personal note progress
      let officialStatus: TaskStatus = 'Submitted';
      if (personalNote.status === 'Todo' || personalNote.status === 'Rework') {
        officialStatus = 'Todo';
      } else {
        // Child already completed the personal note -> Advance teacher task to 'Submitted' (ส่งแล้ว - รออัปเดต)
        officialStatus = 'Submitted';
      }

      // 2. Ensure Official Teacher Task exists and is set to officialStatus with Teacher's official name (MASTER)
      let officialTask = childTasks.find(t => t.teacher_column_id === selectedTeacherColToLink.id && t.task_type === 'official');
      if (officialTask && officialTask.id) {
        await updateChildTask(officialTask.id, {
          task_name: selectedTeacherColToLink.column_name, // Teacher's name is MASTER
          subject: selectedTeacherColToLink.subject,
          status: officialStatus,
          note: personalNote.note || ''
        });
      } else {
        // If official task wasn't in DB yet, create it as official
        await addChildTask({
          student_name: studentName,
          subject: selectedTeacherColToLink.subject,
          task_name: selectedTeacherColToLink.column_name,
          teacher_column_id: selectedTeacherColToLink.id,
          task_type: 'official',
          status: officialStatus,
          date: new Date().toISOString().split('T')[0],
          note: personalNote.note || ''
        });
      }

      // 3. Update personal note to link to teacher column and mark as Verified (closed personal note)
      await updateChildTask(personalNote.id!, {
        teacher_column_id: selectedTeacherColToLink.id,
        task_type: 'personal',
        status: 'Verified'
      });

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

  // Unlink Action: Reverts Teacher Task back to Todo (Column 1) and Personal Note back to unlinked
  const handleUnlink = async (personalTask: ChildTask) => {
    if (!personalTask.id || !personalTask.teacher_column_id || !studentName) return;
    if (!confirm(`คุณต้องการยกเลิกการเชื่อมโยงกับโน้ต "${personalTask.task_name}" ใช่หรือไม่?`)) return;

    try {
      const teacherColId = personalTask.teacher_column_id;

      // 1. Revert Official Teacher Task back to 'Todo' in Column 1 with original teacher name
      const officialTask = childTasks.find(t => t.teacher_column_id === teacherColId && t.task_type === 'official');
      if (officialTask && officialTask.id) {
        await updateChildTask(officialTask.id, {
          status: 'Todo'
        });
      }

      // 2. Revert Personal Note back to unlinked personal note (keeps status as Verified in archive, NOT popping up on homework board)
      await updateChildTask(personalTask.id, {
        teacher_column_id: null,
        task_type: 'personal',
        status: 'Verified'
      });

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
    setEditTaskDate(task.date || '');
    setEditTaskNote(task.note || '');
  };

  const handleSaveEdit = async (taskId: string) => {
    const trimmed = editTaskName.trim();
    if (!trimmed) return;

    try {
      const updates: Partial<ChildTask> = {
        task_name: trimmed,
        date: editTaskDate,
        note: editTaskNote
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
    if (!confirm("คุณแน่ใจหรือไม่ว่าต้องการลบโน้ตงานนี้?")) return;
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
        <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mb-6 shadow-inner">
          <AlertCircle className="w-12 h-12 text-blue-500" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-4">ยินดีต้อนรับสู่ระบบติดตามงาน</h2>
        <p className="text-gray-500 max-w-md mb-8 text-lg">กรุณาตั้งค่าชื่อนักเรียนก่อนเริ่มใช้งาน</p>
        <Link href="/settings" className="bg-blue-600 text-white px-8 py-3 rounded-full font-medium hover:bg-blue-700 hover:shadow-lg transition-all transform hover:-translate-y-1">
          ไปหน้าตั้งค่า
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      
      {/* Header section adhering to AGENTS.md Standard Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-6 rounded-2xl gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center">
            <LayoutGrid className="w-6 h-6 text-gray-400 mr-2 shrink-0" />
            จัดการงาน (Task Hub)
          </h1>
          <p className="text-gray-500 mt-1 text-sm sm:text-base">
            ศูนย์ตรวจสอบงานครูที่ยังไม่เสร็จ และเชื่อมโยงกับโน้ตส่วนตัวของ {studentName}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto mt-4 sm:mt-0">
          <button
            onClick={handleSync}
            disabled={syncing}
            className="h-[42px] px-4 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 flex items-center justify-center shadow-sm hover:shadow active:scale-95 transition-all disabled:opacity-50 w-full sm:w-auto cursor-pointer"
          >
            <RefreshCcw className={clsx("w-4 h-4 mr-2", syncing && "animate-spin")} />
            {syncing ? 'กำลังดึงข้อมูล...' : 'อัปเดตข้อมูลจากครู'}
          </button>
        </div>
      </div>

      {/* KPI Overview Summary (4 Cards) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-xl shrink-0">
            <Clock className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">งานครูที่รอตรวจ/ค้าง</p>
            <p className="text-xl font-black text-amber-600">{pendingTeacherCols.length} <span className="text-xs text-gray-400 font-normal">ชิ้น</span></p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center text-xl shrink-0">
            <StickyNote className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">โน้ตส่วนตัวทั้งหมด</p>
            <p className="text-xl font-black text-purple-600">{allPersonalTasks.length} <span className="text-xs text-gray-400 font-normal">ชิ้น</span></p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl shrink-0">
            <Link2 className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">เชื่อมโยงกับครูแล้ว</p>
            <p className="text-xl font-black text-emerald-600">{allPersonalTasks.filter(t => !!t.teacher_column_id).length} <span className="text-xs text-gray-400 font-normal">ชิ้น</span></p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl shrink-0">
            <Sparkles className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">โน้ตอิสระ (ยังไม่ผูก)</p>
            <p className="text-xl font-black text-blue-600">{allPersonalTasks.filter(t => !t.teacher_column_id).length} <span className="text-xs text-gray-400 font-normal">ชิ้น</span></p>
          </div>
        </div>
      </div>

      {/* Toolbar (Subject Filter and Search Bar) */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        
        {/* Subject Filter Dropdown */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400 shrink-0" />
          <select
            value={filterSubject}
            onChange={(e) => handleSubjectChange(e.target.value)}
            className="bg-gray-50 border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="All">🌟 ทุกวิชา ({uniqueSubjects.length} วิชา)</option>
            {uniqueSubjects.map(sub => (
              <option key={sub} value={sub}>{sub}</option>
            ))}
          </select>
        </div>

        {/* Search Bar */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="ค้นหาชื่องาน หรือข้อความโน้ต..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all placeholder:text-gray-400"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Split View (2 Columns) */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* ======================================================== */}
          {/* LEFT SIDE: งานจากชีตครูที่ยังไม่เสร็จ (ตัวตั้งในการผูกงาน) */}
          {/* ======================================================== */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-200 shadow-sm flex flex-col h-full">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-gray-100">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm">
                  📋
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900">งานครูที่ยังไม่เสร็จ (ตัวตั้ง)</h2>
                  <p className="text-xs text-gray-400">เฉพาะงานที่ครูยังไม่ติ๊กตรวจใน Google Sheet</p>
                </div>
              </div>
              <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
                {pendingTeacherCols.length} รายการ
              </span>
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto max-h-[650px] pr-1 scrollbar-hover">
              {pendingTeacherCols.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-2xl border border-dashed border-gray-200 text-gray-400 text-sm">
                  🎉 ยอดเยี่ยมมาก! ไม่มีงานค้างจากชีตครูในหมวดนี้
                </div>
              ) : (
                pendingTeacherCols.map(col => {
                  const linkedPersonalTask = teacherColToPersonalTaskMap.get(col.id);

                  return (
                    <div 
                      key={col.id}
                      className={clsx(
                        "p-4 rounded-2xl border transition-all duration-200 relative group",
                        linkedPersonalTask ? "bg-emerald-50/40 border-emerald-300" : "bg-gray-50/80 border-gray-200 hover:border-blue-300 hover:bg-white"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-bold text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded-md">
                            {col.subject}
                          </span>
                          {col.sequence && (
                            <span className="text-[11px] font-mono font-black text-gray-600 bg-white border border-gray-200 px-1.5 py-0.2 rounded">
                              #{col.sequence}
                            </span>
                          )}
                        </div>

                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0 bg-amber-100 text-amber-800 shadow-2xs">
                          ⏳ รอครูตรวจ
                        </span>
                      </div>

                      <p className="font-bold text-gray-900 text-sm leading-snug mb-3">
                        {col.column_name}
                      </p>

                      {/* Linking Footer & Action Button (Teacher is Anchor) */}
                      <div className="pt-2.5 border-t border-gray-200/70 flex items-center justify-between gap-2">
                        {linkedPersonalTask ? (
                          <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-1 text-emerald-800 font-semibold text-xs truncate mr-2">
                              <Link2 className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                              <span className="truncate">ผูกกับโน้ต: <strong>{linkedPersonalTask.task_name}</strong></span>
                            </div>
                            <button
                              onClick={() => handleUnlink(linkedPersonalTask)}
                              className="text-[11px] font-bold text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-lg border border-rose-200 shrink-0 transition-colors cursor-pointer"
                              title="ยกเลิกการเชื่อมโยง"
                            >
                              <Unlink className="w-3 h-3 inline mr-1" /> ยกเลิกผูก
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleOpenLinkModal(col)}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 shadow-2xs active:scale-95 transition-all cursor-pointer"
                          >
                            <Link2 className="w-3.5 h-3.5" /> 🔗 ผูกกับโน้ตส่วนตัว...
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
          {/* RIGHT SIDE: โน้ตส่วนตัวทั้งหมด (Personal Notes Archive) */}
          {/* ======================================================== */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-200 shadow-sm flex flex-col h-full">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-gray-100">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-sm">
                  📝
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900">โน้ตส่วนตัว & ประวัติงาน (Personal Only)</h2>
                  <p className="text-xs text-gray-400">เฉพาะโน้ตที่เพิ่มเอง (ดูประวัติและแก้ไข)</p>
                </div>
              </div>
              <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2.5 py-1 rounded-full">
                {filteredPersonalTasks.length} รายการ
              </span>
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto max-h-[650px] pr-1 scrollbar-hover">
              {filteredPersonalTasks.length === 0 ? (
                <div className="text-center py-12 bg-purple-50/40 rounded-2xl border border-dashed border-purple-200 text-gray-400 text-sm">
                  <StickyNote className="w-8 h-8 mx-auto mb-2 text-purple-300" />
                  ยังไม่มีโน้ตส่วนตัวในหมวดนี้
                  <p className="text-xs text-gray-400 mt-1">คุณสามารถเพิ่มโน้ตใหม่ได้ที่หน้า "การบ้านของฉัน"</p>
                </div>
              ) : (
                filteredPersonalTasks.map(task => {
                  const isLinked = !!task.teacher_column_id;
                  const isEditing = editingTaskId === task.id;
                  const linkedCol = isLinked ? teacherCols.find(c => c.id === task.teacher_column_id) : null;

                  return (
                    <div 
                      key={task.id}
                      className={clsx(
                        "p-4 rounded-2xl border transition-all duration-200 relative group",
                        isLinked ? "bg-emerald-50/30 border-emerald-200" : "bg-purple-50/30 border-purple-200/80 hover:bg-white"
                      )}
                    >
                      {/* Top Badges */}
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-bold px-2 py-0.5 rounded-md text-purple-700 bg-purple-100/70">
                            {task.subject}
                          </span>
                          
                          {isLinked ? (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded border border-emerald-300 flex items-center gap-1">
                              <Link2 className="w-2.5 h-2.5" /> ผูกกับงานครูแล้ว
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.2 rounded border border-amber-300">
                              ⚪ โน้ตอิสระ
                            </span>
                          )}
                        </div>

                        {/* Status Badge */}
                        <span className={clsx(
                          "text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 shadow-2xs",
                          task.status === 'Verified' ? "bg-emerald-100 text-emerald-800 font-extrabold" : task.status === 'Done' ? "bg-blue-100 text-blue-800" : task.status === 'Submitted' ? "bg-sky-100 text-sky-800" : "bg-gray-100 text-gray-700"
                        )}>
                          {task.status === 'Verified' ? '🏆 ตรวจเสร็จแล้ว' : task.status === 'Done' ? '⏳ ทำเสร็จ-รอส่ง' : task.status === 'Submitted' ? '📤 ส่งแล้ว-รออัปเดต' : '📝 ยังไม่ทำ'}
                        </span>
                      </div>

                      {/* Content / Edit Form */}
                      {isEditing ? (
                        <div className="my-2 space-y-2">
                          <textarea
                            value={editTaskName}
                            onChange={(e) => setEditTaskName(e.target.value)}
                            className="w-full text-sm font-semibold text-gray-900 border border-purple-300 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none bg-white"
                            rows={2}
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              type="date"
                              value={editTaskDate}
                              onChange={(e) => setEditTaskDate(e.target.value)}
                              className="text-xs text-gray-700 border border-purple-200 rounded-lg p-2 bg-white"
                            />
                            <input
                              type="text"
                              placeholder="โน้ตเพิ่มเติม..."
                              value={editTaskNote}
                              onChange={(e) => setEditTaskNote(e.target.value)}
                              className="text-xs text-gray-700 border border-purple-200 rounded-lg p-2 bg-white"
                            />
                          </div>
                          <div className="flex justify-end gap-2 pt-1">
                            <button onClick={() => setEditingTaskId(null)} className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-xs font-semibold cursor-pointer">
                              ยกเลิก
                            </button>
                            <button onClick={() => handleSaveEdit(task.id!)} className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer">
                              <Save className="w-3 h-3" /> บันทึก
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="my-1.5">
                          <p className="font-bold text-gray-900 text-sm leading-snug">
                            {task.task_name}
                          </p>

                          {(task.date || task.note) && (
                            <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                              {task.date && <span>📅 {task.date}</span>}
                              {task.note && <span className="text-amber-600 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">โน้ต: {task.note}</span>}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Linking Info / Actions */}
                      <div className="mt-2.5 pt-2 border-t border-gray-200/60 flex items-center justify-between text-xs">
                        {isLinked && linkedCol ? (
                          <span className="text-emerald-800 font-medium truncate">
                            ผูกกับงานครู: <strong>{linkedCol.column_name}</strong> {linkedCol.sequence ? `(#${linkedCol.sequence})` : ''}
                          </span>
                        ) : (
                          <span className="text-gray-400 font-medium">
                            โน้ตส่วนตัวอิสระ
                          </span>
                        )}

                        {!isEditing && (
                          <div className="flex items-center gap-1 shrink-0 ml-2">
                            <button
                              onClick={() => handleStartEdit(task)}
                              className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors cursor-pointer"
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
            className="bg-white rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl border border-gray-100 relative animate-in zoom-in-95 duration-200"
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
              <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center text-2xl shadow-inner">
                🔗
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                  เชื่อมโยงงานครูกับโน้ตส่วนตัว
                </span>
                <h3 className="text-lg font-extrabold text-gray-900 mt-1">เลือกโน้ตที่คุณเคยจดไว้</h3>
              </div>
            </div>

            {/* Target Teacher Column Summary (Anchor) */}
            <div className="bg-blue-50/70 p-3.5 rounded-2xl border border-blue-200 mb-4 text-xs">
              <p className="text-blue-600 font-bold mb-0.5">งานของครูในชีต (ตัวตั้ง):</p>
              <p className="font-bold text-gray-900 text-sm">{selectedTeacherColToLink.column_name}</p>
              <p className="text-gray-500 mt-1">วิชา: <strong className="text-blue-700">{selectedTeacherColToLink.subject}</strong> {selectedTeacherColToLink.sequence ? `(ลำดับ #${selectedTeacherColToLink.sequence})` : ''}</p>
            </div>

            {/* Select Target Personal Note */}
            <div className="space-y-2 mb-6">
              <label className="block text-xs font-bold text-gray-700">
                เลือกโน้ตส่วนตัวในวิชา {selectedTeacherColToLink.subject} เพื่อผูกเข้าด้วยกัน:
              </label>
              
              {(() => {
                const availableNotes = allPersonalTasks.filter(t => t.subject === selectedTeacherColToLink.subject);
                const suggestedNote = getAutoSuggestedNote(selectedTeacherColToLink);

                if (availableNotes.length === 0) {
                  return (
                    <div className="text-xs text-gray-400 py-6 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
                      <p className="font-medium text-gray-500 mb-1">ยังไม่มีโน้ตส่วนตัวในวิชา {selectedTeacherColToLink.subject}</p>
                      <p className="text-[11px]">งานนี้จะเป็นงานเดี่ยวจากชีตครูตามปกติ</p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1 scrollbar-hover">
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
                              ? "bg-purple-50 border-purple-500 ring-2 ring-purple-400/50 shadow-xs" 
                              : isSuggested
                                ? "bg-amber-50/50 border-amber-300 hover:bg-amber-50"
                                : isAlreadyLinked
                                  ? "bg-gray-50/60 border-gray-200 opacity-60"
                                  : "bg-white border-gray-200 hover:border-purple-300 hover:bg-purple-50/20"
                          )}
                        >
                          <div className="flex items-center gap-2 overflow-hidden mr-2">
                            <input 
                              type="radio" 
                              name="targetPersonalTask" 
                              checked={isSelected}
                              onChange={() => setTargetPersonalTaskId(note.id!)}
                              className="cursor-pointer text-purple-600"
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
                              {note.date && <p className="text-[10px] text-gray-400 mt-0.5">📅 {note.date}</p>}
                            </div>
                          </div>

                          <span className={clsx(
                            "text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0",
                            note.status === 'Verified' ? "bg-emerald-100 text-emerald-800" : note.status === 'Done' ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-700"
                          )}>
                            {note.status === 'Verified' ? '✓ ตรวจแล้ว' : note.status === 'Done' ? '⏳ ทำเสร็จ' : '📝 ยังไม่ทำ'}
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
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-xl text-center text-sm flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95 cursor-pointer"
              >
                <Link2 className="w-4 h-4" /> ยืนยันการเชื่อมโยง
              </button>
              <button
                onClick={() => setSelectedTeacherColToLink(null)}
                className="px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl text-sm transition-colors cursor-pointer"
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
