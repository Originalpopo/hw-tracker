'use client';

import { useState, useEffect, useMemo } from 'react';
import { getTeacherColumns, getGlobalSettings, TeacherColumn, getChildTasks, ChildTask } from '@/lib/db';
import { CheckSquare, AlertCircle, RefreshCcw, Sparkles, CheckCircle2, BookOpen, X, Eye, EyeOff, Zap, ListTodo, Columns3, Rows3 } from 'lucide-react';
import Link from 'next/link';
import { clsx } from 'clsx';

export default function AllTasksV2Page() {
  const [studentName, setStudentName] = useState<string | null>(null);
  const [teacherCols, setTeacherCols] = useState<TeacherColumn[]>([]);
  const [childTasks, setChildTasks] = useState<ChildTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [sheetUrls, setSheetUrls] = useState<string[]>([]);
  
  // Filter & Layout View Options
  const [layoutMode, setLayoutMode] = useState<'vertical' | 'horizontal'>('vertical');
  const [hideCompleted, setHideCompleted] = useState(false);
  
  // Floating Tooltip State (bypasses overflow clipping)
  const [hoveredTask, setHoveredTask] = useState<{
    x: number;
    y: number;
    isBottom: boolean;
    subject: string;
    seq: number;
    name: string;
    statusText: string;
  } | null>(null);

  // Modal Details State
  const [selectedTaskModal, setSelectedTaskModal] = useState<{
    subject: string;
    seq: number;
    col: TeacherColumn;
    status: 'Checked' | 'WaitingTeacher' | 'Overdue' | 'New';
    statusText: string;
  } | null>(null);

  useEffect(() => {
    const init = async () => {
      let savedName = localStorage.getItem('hw_student_name');
      let savedUrlsStr = localStorage.getItem('hw_sheet_urls');
      const savedLayout = localStorage.getItem('hw_all_tasks_layout_mode') as 'vertical' | 'horizontal' | null;
      if (savedLayout === 'vertical' || savedLayout === 'horizontal') {
        setLayoutMode(savedLayout);
      }
      
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
    };
    init();
  }, []);

  const handleLayoutChange = (mode: 'vertical' | 'horizontal') => {
    setLayoutMode(mode);
    localStorage.setItem('hw_all_tasks_layout_mode', mode);
  };

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

  const mappedTeacherColStatus = useMemo(() => {
    const statusMap = new Map<string, string>();
    childTasks.forEach(task => {
      if (task.teacher_column_id) {
        statusMap.set(task.teacher_column_id, task.status);
      }
    });
    return statusMap;
  }, [childTasks]);

  // Dynamic progress text color helper matching Dashboard
  const getProgressColorClass = (percent: number) => {
    if (percent === 100) return 'text-emerald-600 font-extrabold';
    if (percent >= 75) return 'text-lime-600 font-bold';
    if (percent >= 50) return 'text-amber-500 font-bold';
    if (percent >= 25) return 'text-orange-500 font-bold';
    return 'text-rose-500 font-bold';
  };

  // Overall statistics for top summary banner
  const stats = useMemo(() => {
    let checkedCount = 0;
    let waitingCount = 0;
    let overdueCount = 0;
    let newCount = 0;
    let totalCount = 0;

    teacherCols.forEach(col => {
      if (col.sequence) {
        totalCount++;
        const mappedStatus = mappedTeacherColStatus.get(col.id);
        const isMapped = mappedStatus !== undefined;
        const isSubmittedOrDone = isMapped && ['Done', 'Submitted', 'Verified'].includes(mappedStatus as string);

        if (col.is_checked) {
          checkedCount++;
        } else if (isSubmittedOrDone) {
          waitingCount++;
        } else {
          const isOld = !col.first_seen_at || (Date.now() - col.first_seen_at > 3 * 24 * 60 * 60 * 1000);
          if (isOld) {
            overdueCount++;
          } else {
            newCount++;
          }
        }
      }
    });

    return { checkedCount, waitingCount, overdueCount, newCount, totalCount };
  }, [teacherCols, mappedTeacherColStatus]);

  // Group into Stacks per Subject
  const subjectStacks = useMemo(() => {
    const sMap = new Map<string, TeacherColumn[]>();

    teacherCols.forEach(col => {
      if (col.sequence) {
        if (!sMap.has(col.subject)) {
          sMap.set(col.subject, []);
        }
        sMap.get(col.subject)!.push(col);
      }
    });

    const result: {
      subject: string;
      tasks: TeacherColumn[];
      total: number;
      checked: number;
      pending: number;
      overdue: number;
      waiting: number;
      progress: number;
    }[] = [];

    Array.from(sMap.keys()).sort((a, b) => a.localeCompare(b)).forEach(subject => {
      const list = [...sMap.get(subject)!];
      list.sort((a, b) => (b.sequence || 0) - (a.sequence || 0));

      let checked = 0;
      let overdue = 0;
      let waiting = 0;

      list.forEach(col => {
        const mappedStatus = mappedTeacherColStatus.get(col.id);
        const isMapped = mappedStatus !== undefined;
        const isSubmittedOrDone = isMapped && ['Done', 'Submitted', 'Verified'].includes(mappedStatus as string);

        if (col.is_checked) {
          checked++;
        } else if (isSubmittedOrDone) {
          waiting++;
        } else {
          const isOld = !col.first_seen_at || (Date.now() - col.first_seen_at > 3 * 24 * 60 * 60 * 1000);
          if (isOld) overdue++;
        }
      });

      const total = list.length;
      const progress = total === 0 ? 0 : Math.round((checked / total) * 100);

      result.push({
        subject,
        tasks: list,
        total,
        checked,
        pending: total - checked,
        overdue,
        waiting,
        progress
      });
    });

    return result;
  }, [teacherCols, mappedTeacherColStatus]);

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

  // Render individual task tile helper
  const renderTaskTile = (col: TeacherColumn, stackSubject: string) => {
    const seq = col.sequence || 0;
    const mappedStatus = mappedTeacherColStatus.get(col.id);
    const isMapped = mappedStatus !== undefined;
    const isSubmittedOrDone = isMapped && ['Done', 'Submitted', 'Verified'].includes(mappedStatus as string);

    let cardBg = "bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300 shadow-xs";
    const isOld = !col.first_seen_at || (Date.now() - col.first_seen_at > 3 * 24 * 60 * 60 * 1000);
    let icon = isOld ? "🔥" : "📝";
    let statusKey: 'Checked' | 'WaitingTeacher' | 'Overdue' | 'New' = isOld ? 'Overdue' : 'New';
    let statusText = isOld ? "งานค้างเกิน 3 วัน (ยังไม่ส่ง)" : "งานใหม่ (ยังไม่ส่ง)";

    if (col.is_checked) {
      cardBg = "bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border-emerald-300/80";
      icon = "🏆";
      statusKey = 'Checked';
      statusText = "ครูตรวจแล้วเรียบร้อย";
    } else if (isSubmittedOrDone) {
      cardBg = "bg-[#eef3fc] hover:bg-[#e2ebf9] text-[#597ecf] border-[#597ecf]/40 shadow-xs";
      icon = "⏳";
      statusKey = 'WaitingTeacher';
      statusText = "เด็กส่งแล้ว (รอครูอัปเดตคะแนน)";
    } else if (isOld) {
      cardBg = "bg-rose-50 hover:bg-rose-100 text-rose-900 border-rose-300 shadow-xs";
    }

    return (
      <div
        key={col.id}
        onClick={() => {
          setHoveredTask(null);
          setSelectedTaskModal({
            subject: stackSubject,
            seq,
            col,
            status: statusKey,
            statusText
          });
        }}
        onMouseEnter={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const showBelow = rect.top < 130;
          setHoveredTask({
            x: rect.left + rect.width / 2,
            y: showBelow ? rect.bottom + 8 : rect.top - 8,
            isBottom: showBelow,
            subject: stackSubject,
            seq,
            name: col.column_name,
            statusText
          });
        }}
        onMouseLeave={() => setHoveredTask(null)}
        className={clsx(
          "relative rounded-xl h-[44px] sm:h-[48px] w-[44px] sm:w-[48px] shrink-0 border transition-all cursor-pointer select-none flex flex-col items-center justify-center p-1 hover:scale-105 active:scale-95 shadow-2xs",
          cardBg
        )}
      >
        {/* Sequence Number */}
        <span className="text-[10px] sm:text-[11px] font-black font-mono leading-none">
          #{seq}
        </span>

        {/* Status Icon */}
        <span className="text-sm sm:text-base leading-none mt-0.5 drop-shadow-2xs">
          {icon}
        </span>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      
      {/* Header section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-6 sm:p-7 rounded-3xl border border-[#e2e8f0] shadow-sm gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 flex items-center">
            <CheckSquare className="w-6 h-6 text-[#597ecf] mr-2 shrink-0" />
            งานทั้งหมด (All Tasks)
          </h1>
          <p className="text-gray-500 mt-1 text-sm sm:text-base">
            ตารางแสดงสถานะงานทุกวิชาอ้างอิงจากข้อมูลของครู • งานใหม่อยู่ลำดับแรกสุด
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto mt-4 sm:mt-0">
          {/* Layout Mode Switcher (Vertical vs Horizontal) */}
          <div className="flex items-center bg-[#f4f7fa] p-1 rounded-xl border border-[#e2e8f0] shadow-2xs w-full sm:w-auto justify-center">
            <button
              onClick={() => handleLayoutChange('vertical')}
              className={clsx(
                "px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-all cursor-pointer",
                layoutMode === 'vertical'
                  ? "bg-[#597ecf] text-white shadow-xs font-bold"
                  : "text-gray-600 hover:text-gray-900"
              )}
              title="แสดงแบบตารางแนวตั้ง (แต่ละวิชาเป็นคอลัมน์)"
            >
              <Columns3 className="w-4 h-4" />
              <span>แนวตั้ง</span>
            </button>
            <button
              onClick={() => handleLayoutChange('horizontal')}
              className={clsx(
                "px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-all cursor-pointer",
                layoutMode === 'horizontal'
                  ? "bg-[#597ecf] text-white shadow-xs font-bold"
                  : "text-gray-600 hover:text-gray-900"
              )}
              title="แสดงแบบตารางแนวนอน (แต่ละวิชาเป็นแถวเรียงไปทางขวา)"
            >
              <Rows3 className="w-4 h-4" />
              <span>แนวนอน</span>
            </button>
          </div>

          {/* Toggle Hide Completed Tasks */}
          <button
            onClick={() => setHideCompleted(!hideCompleted)}
            className={clsx(
              "h-[42px] px-4 rounded-xl text-sm font-semibold border flex items-center transition-all active:scale-95 w-full sm:w-auto justify-center cursor-pointer",
              hideCompleted 
                ? "bg-[#eef3fc] border-[#597ecf]/30 text-[#597ecf] shadow-xs font-bold" 
                : "bg-white border-[#e2e8f0] text-gray-700 hover:bg-[#f4f7fa] shadow-xs"
            )}
          >
            {hideCompleted ? <EyeOff className="w-4 h-4 mr-2 text-[#597ecf]" /> : <Eye className="w-4 h-4 mr-2 text-gray-400" />}
            {hideCompleted ? 'ซ่อนงานที่ตรวจแล้ว' : 'แสดงงานทั้งหมด'}
          </button>

          {/* Sync Button */}
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

      {/* KPI Summary Cards (5 Cards) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* Total Tasks Card */}
        <div className="bg-white p-4 rounded-2xl border border-[#e2e8f0] shadow-xs flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-[#eef3fc] text-[#597ecf] flex items-center justify-center text-xl shrink-0">
            <ListTodo className="w-5 h-5 text-[#597ecf]" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">งานทั้งหมด</p>
            <p className="text-xl font-black text-[#597ecf]">{stats.totalCount} <span className="text-xs text-gray-400 font-normal">ชิ้น</span></p>
          </div>
        </div>

        {/* Checked Card */}
        <div className="bg-white p-4 rounded-2xl border border-[#e2e8f0] shadow-xs flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl shrink-0">
            🏆
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">ตรวจแล้ว</p>
            <p className="text-xl font-black text-emerald-600">{stats.checkedCount} <span className="text-xs text-gray-400 font-normal">ชิ้น</span></p>
          </div>
        </div>

        {/* Waiting Teacher Card */}
        <div className="bg-white p-4 rounded-2xl border border-[#e2e8f0] shadow-xs flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-[#eef3fc] text-[#597ecf] flex items-center justify-center text-xl shrink-0">
            ⏳
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">รอครูอัปเดต</p>
            <p className="text-xl font-black text-[#597ecf]">{stats.waitingCount} <span className="text-xs text-gray-400 font-normal">ชิ้น</span></p>
          </div>
        </div>

        {/* Overdue Card */}
        <div className="bg-white p-4 rounded-2xl border border-[#e2e8f0] shadow-xs flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center text-xl shrink-0">
            🔥
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">งานค้าง (&gt;3 วัน)</p>
            <p className="text-xl font-black text-rose-600">{stats.overdueCount} <span className="text-xs text-gray-400 font-normal">ชิ้น</span></p>
          </div>
        </div>

        {/* New Tasks Card */}
        <div className="bg-white p-4 rounded-2xl border border-[#e2e8f0] shadow-xs flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-xl shrink-0">
            📝
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">งานใหม่</p>
            <p className="text-xl font-black text-amber-600">{stats.newCount} <span className="text-xs text-gray-400 font-normal">ชิ้น</span></p>
          </div>
        </div>
      </div>

      {/* Main Equalizer Grid (Supports Vertical & Horizontal Layouts) */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#597ecf]"></div>
        </div>
      ) : (
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-[#e2e8f0]">
          
          {/* Legend Guide Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-5 border-b border-[#e2e8f0] text-xs text-gray-600">
            <div className="flex items-center gap-1 font-bold text-gray-800">
              <Zap className="w-4 h-4 text-[#597ecf]" />
              <span>ความหมาย:</span>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-emerald-500 inline-block"></span> 🏆 ตรวจแล้ว</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-[#597ecf] inline-block"></span> ⏳ รอครูอัปเดต</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-rose-500 inline-block"></span> 🔥 ค้าง &gt;3 วัน</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-amber-400 inline-block"></span> 📝 งานใหม่</span>
            </div>
          </div>

          {/* ======================================================== */}
          {/* MODE 1: VERTICAL LAYOUT (Subjects as Vertical Columns) */}
          {/* ======================================================== */}
          {layoutMode === 'vertical' && (
            <div className="overflow-x-auto pb-4 scrollbar-hover">
              <div className="flex gap-2.5 sm:gap-3.5 min-w-max items-start justify-start">
                {subjectStacks.map((stack) => {
                  const visibleTasks = hideCompleted ? stack.tasks.filter(t => !t.is_checked) : stack.tasks;

                  return (
                    <div 
                      key={stack.subject}
                      className="w-[66px] sm:w-[76px] flex flex-col bg-[#f8fafc] border border-[#e2e8f0] rounded-2xl p-1.5 shadow-2xs relative"
                    >
                      {/* Vertical Rotated Subject Header */}
                      <div className="bg-white rounded-xl py-2.5 px-1 border border-[#e2e8f0] shadow-2xs mb-2.5 text-center flex flex-col items-center justify-between h-[175px] sm:h-[195px] relative overflow-hidden">
                        {/* Mini Status Badge on Top */}
                        <div className="z-10">
                          <span className={clsx(
                            "text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md leading-none inline-block shadow-2xs",
                            stack.pending > 0 ? "bg-rose-50 text-rose-600 border border-rose-200" : "bg-emerald-50 text-emerald-600 border border-emerald-200"
                          )}>
                            {stack.pending > 0 ? `-${stack.pending}` : '✓'}
                          </span>
                        </div>

                        {/* Rotated Subject Text (Truncates with ... when long, anchored to bottom) */}
                        <div className="flex-1 flex flex-col justify-end items-center my-1 w-full max-h-[120px] sm:max-h-[140px] overflow-hidden px-0.5 pb-0.5">
                          <span 
                            className="text-xs sm:text-sm font-black text-gray-800 select-none tracking-tight leading-tight [writing-mode:vertical-rl] rotate-180 max-h-[112px] sm:max-h-[130px] inline-block text-left overflow-hidden text-ellipsis whitespace-nowrap"
                            title={stack.subject}
                          >
                            {stack.subject}
                          </span>
                        </div>

                        {/* Total count & Progress bar with gradient matching Dashboard */}
                        <div className="w-full flex flex-col items-center pt-1.5 border-t border-[#e2e8f0] z-10">
                          <div className="flex items-center justify-between w-full px-0.5 text-[9px] sm:text-[10px]">
                            <span className="font-bold text-gray-500 font-mono leading-none">
                              {stack.total}
                            </span>
                            <span className={clsx("font-mono leading-none", getProgressColorClass(stack.progress))}>
                              {stack.progress}%
                            </span>
                          </div>
                          <div className="w-full bg-[#f4f7fa] rounded-full h-1.5 mt-1 overflow-hidden">
                            <div 
                              className={clsx(
                                "h-full transition-all duration-700 rounded-full",
                                stack.progress === 100 
                                  ? "bg-emerald-500" 
                                  : "bg-gradient-to-r from-orange-400 via-amber-400 to-emerald-500"
                              )}
                              style={{ width: `${stack.progress}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Compact Task Tiles (Vertical Stack: Newest on Top) */}
                      <div className="flex flex-col gap-1.5">
                        {visibleTasks.map((col) => renderTaskTile(col, stack.subject))}

                        {visibleTasks.length === 0 && (
                          <div className="py-4 text-center text-[10px] text-gray-400 font-bold bg-white/50 rounded-xl border border-dashed border-[#e2e8f0]">
                            ครบ ✨
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* MODE 2: HORIZONTAL LAYOUT (Subjects as Horizontal Rows) */}
          {/* ======================================================== */}
          {layoutMode === 'horizontal' && (
            <div className="flex flex-col gap-3 w-full">
              {subjectStacks.map((stack) => {
                const visibleTasks = hideCompleted ? stack.tasks.filter(t => !t.is_checked) : stack.tasks;

                return (
                  <div 
                    key={stack.subject}
                    className="group/row flex flex-col md:flex-row items-stretch md:items-center bg-[#f8fafc] border border-[#e2e8f0] rounded-2xl p-2.5 sm:p-3 shadow-2xs gap-3 relative"
                  >
                    {/* Horizontal Subject Info Card (Left) */}
                    <div className="w-full md:w-[220px] shrink-0 bg-white rounded-xl p-3 border border-[#e2e8f0] shadow-2xs flex flex-row md:flex-col justify-between items-center md:items-start gap-2">
                      <div className="flex items-center justify-between w-full">
                        <span className="text-sm font-black text-gray-900 tracking-tight line-clamp-1" title={stack.subject}>
                          {stack.subject}
                        </span>
                        <span className={clsx(
                          "text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md leading-none shrink-0 shadow-2xs ml-2",
                          stack.pending > 0 ? "bg-rose-50 text-rose-600 border border-rose-200" : "bg-emerald-50 text-emerald-600 border border-emerald-200"
                        )}>
                          {stack.pending > 0 ? `-${stack.pending}` : '✓ ครบ'}
                        </span>
                      </div>

                      <div className="w-full flex items-center justify-between text-xs text-gray-500 pt-1 border-t border-[#e2e8f0] md:border-t-0 md:pt-0">
                        <span className="text-[11px] font-medium text-gray-500">
                          ทั้งหมด: <strong className="text-gray-800">{stack.total}</strong> ชิ้น
                        </span>
                        <span className={clsx("text-xs font-mono font-black", getProgressColorClass(stack.progress))}>
                          {stack.progress}%
                        </span>
                      </div>

                      <div className="w-full bg-[#f4f7fa] rounded-full h-2 overflow-hidden shadow-inner">
                        <div 
                          className={clsx(
                            "h-full transition-all duration-700 rounded-full",
                            stack.progress === 100 
                              ? "bg-emerald-500" 
                              : "bg-gradient-to-r from-orange-400 via-amber-400 to-emerald-500"
                          )}
                          style={{ width: `${stack.progress}%` }}
                        />
                      </div>
                    </div>

                    {/* Task Tiles Strip (Horizontal scrollable row: Newest on Left) */}
                    <div className="flex-1 flex items-center gap-2 overflow-x-auto py-1.5 px-1 min-w-0 scrollbar-hover">
                      {visibleTasks.map((col) => renderTaskTile(col, stack.subject))}

                      {visibleTasks.length === 0 && (
                        <div className="py-2.5 px-4 text-xs text-gray-400 font-bold bg-white/60 rounded-xl border border-dashed border-[#e2e8f0] flex items-center">
                          ✨ ส่งครบเรียบร้อยแล้ว
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>
      )}

      {/* Floating Tooltip Portal (Never clipped by overflow or table borders) */}
      {hoveredTask && (
        <div 
          className="fixed z-[99999] pointer-events-none transition-opacity duration-150 shadow-[0_10px_25px_-5px_rgba(0,0,0,0.5)] border border-gray-700 ring-1 ring-white/10 bg-gray-950 text-white text-xs p-3 rounded-2xl w-max max-w-[260px] animate-in fade-in zoom-in-95 duration-100"
          style={{
            left: `${hoveredTask.x}px`,
            top: `${hoveredTask.y}px`,
            transform: hoveredTask.isBottom ? 'translate(-50%, 0)' : 'translate(-50%, -100%)'
          }}
        >
          <p className="font-extrabold text-amber-300 text-[11px] mb-1 flex items-center gap-1">
            <span>{hoveredTask.subject}</span>
            <span>•</span>
            <span>#{hoveredTask.seq}</span>
          </p>
          <p className="font-semibold text-gray-100 leading-snug mb-1.5 text-xs">{hoveredTask.name}</p>
          <div className="pt-1 border-t border-gray-800 text-[10px] text-gray-400 font-medium">
            {hoveredTask.statusText}
          </div>
          <div className={clsx(
            "absolute left-1/2 -translate-x-1/2 border-6 border-transparent",
            hoveredTask.isBottom 
              ? "bottom-full border-b-gray-950" 
              : "top-full border-t-gray-950"
          )} />
        </div>
      )}

      {/* Task Details Pop-up Modal */}
      {selectedTaskModal && (
        <div 
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setSelectedTaskModal(null)}
        >
          <div 
            className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-[#e2e8f0] relative animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button 
              onClick={() => setSelectedTaskModal(null)}
              className="absolute top-5 right-5 p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="flex items-center space-x-3 mb-4">
              <div className={clsx(
                "w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-inner",
                selectedTaskModal.status === 'Checked' && "bg-emerald-100 text-emerald-700",
                selectedTaskModal.status === 'WaitingTeacher' && "bg-[#eef3fc] text-[#597ecf]",
                selectedTaskModal.status === 'Overdue' && "bg-rose-100 text-rose-700",
                selectedTaskModal.status === 'New' && "bg-amber-100 text-amber-700"
              )}>
                {selectedTaskModal.status === 'Checked' ? '🏆' : selectedTaskModal.status === 'WaitingTeacher' ? '⏳' : selectedTaskModal.status === 'Overdue' ? '🔥' : '📝'}
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#597ecf] bg-[#eef3fc] border border-[#597ecf]/30 px-2.5 py-0.5 rounded-md">
                  {selectedTaskModal.subject} • ชิ้นที่ #{selectedTaskModal.seq}
                </span>
                <h3 className="text-lg font-extrabold text-gray-900 mt-1">รายละเอียดงาน</h3>
              </div>
            </div>

            {/* Task Info Content */}
            <div className="bg-[#f4f7fa] rounded-2xl p-4 space-y-3 border border-[#e2e8f0] mb-5">
              <div>
                <p className="text-xs text-gray-400 font-semibold mb-0.5">ชื่องานที่ครูสั่ง</p>
                <p className="text-sm font-bold text-gray-900">{selectedTaskModal.col.column_name}</p>
              </div>

              <div>
                <p className="text-xs text-gray-400 font-semibold mb-0.5">สถานะปัจจุบัน</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={clsx(
                    "text-xs font-bold px-2.5 py-1 rounded-full",
                    selectedTaskModal.status === 'Checked' && "bg-emerald-100 text-emerald-800",
                    selectedTaskModal.status === 'WaitingTeacher' && "bg-[#eef3fc] text-[#597ecf]",
                    selectedTaskModal.status === 'Overdue' && "bg-rose-100 text-rose-800",
                    selectedTaskModal.status === 'New' && "bg-amber-100 text-amber-800"
                  )}>
                    {selectedTaskModal.statusText}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <Link
                href={`/homework?subject=${encodeURIComponent(selectedTaskModal.subject)}`}
                className="flex-1 bg-[#597ecf] hover:bg-[#486cb8] text-white font-bold py-3 px-4 rounded-xl text-center text-sm flex items-center justify-center gap-2 shadow-xs transition-all active:scale-95 cursor-pointer"
              >
                <BookOpen className="w-4 h-4" /> ไปหน้าการบ้านวิชานี้
              </Link>
              <button
                onClick={() => setSelectedTaskModal(null)}
                className="px-4 py-3 bg-white hover:bg-gray-50 border border-[#e2e8f0] text-gray-700 font-semibold rounded-xl text-sm transition-colors cursor-pointer"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
