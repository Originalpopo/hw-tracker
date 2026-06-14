'use client';

import { useState, useEffect } from 'react';
import { getChildTasks, ChildTask, getGlobalSettings } from '@/lib/db';
import { Trophy, Target, Star, CalendarDays, ArrowRight, Flame, Zap, Printer, BookOpen, ListTodo } from 'lucide-react';
import { clsx } from 'clsx';
import Link from 'next/link';

export default function DashboardOverview() {
  const [tasks, setTasks] = useState<ChildTask[]>([]);
  const [studentName, setStudentName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
      const data = await getChildTasks(name);
      setTasks(data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!studentName) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 animate-in fade-in duration-700">
        <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mb-6 shadow-inner">
          <Star className="w-12 h-12 text-blue-500" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-4">ยินดีต้อนรับสู่ภารกิจ!</h2>
        <p className="text-gray-500 max-w-md mb-8 text-lg">มาเริ่มสร้างฮีโร่กันเถอะ กรุณาตั้งค่าชื่อนักเรียนเพื่อเริ่มสะสมพลัง</p>
        <Link href="/settings" className="bg-blue-600 text-white px-8 py-3 rounded-full font-medium hover:bg-blue-700 hover:shadow-lg transition-all transform hover:-translate-y-1">
          ไปหน้าตั้งค่า
        </Link>
      </div>
    );
  }

  // Stats calculation
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => ['Done', 'Submitted', 'Verified'].includes(t.status)).length;
  const pendingTasks = tasks.filter(t => !['Done', 'Submitted', 'Verified'].includes(t.status)).length;
  
  const progressPercent = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

  // Recent tasks (last 3 pending)
  const recentPending = tasks
    .filter(t => !['Done', 'Submitted', 'Verified'].includes(t.status))
    .sort((a, b) => {
      const timeA = (a.created_at as any)?.toMillis?.() || Date.now();
      const timeB = (b.created_at as any)?.toMillis?.() || Date.now();
      return timeB - timeA;
    })
    .slice(0, 3);

  // Subject progress calculation
  const subjectStats: Record<string, { total: number, done: number }> = {};
  tasks.forEach(t => {
    if (!subjectStats[t.subject]) {
      subjectStats[t.subject] = { total: 0, done: 0 };
    }
    subjectStats[t.subject].total += 1;
    if (['Done', 'Submitted', 'Verified'].includes(t.status)) {
      subjectStats[t.subject].done += 1;
    }
  });

  const subjects = Object.keys(subjectStats).sort();

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      {/* Hero Welcome Card */}
      <div className="bg-gradient-to-br from-blue-400 to-blue-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 opacity-10 transform translate-x-4 -translate-y-4">
          <Trophy className="w-48 h-48" />
        </div>
        <div className="relative z-10">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-2">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Hi. {studentName}! 🚀
            </h1>
            <Link href="/homework" className="bg-white text-blue-700 px-6 py-3 rounded-xl font-bold hover:bg-blue-50 transition-all shadow-md active:scale-95 flex items-center w-max shrink-0">
              <Zap className="w-5 h-5 mr-2 text-orange-500" /> ลุยภารกิจเลย!
            </Link>
          </div>
          <p className="text-blue-100 text-lg max-w-lg">
            พร้อมทำภารกิจประจำวันหรือยัง? เคลียร์ภารกิจให้หมดเพื่อรับพลังงานเต็มหลอด!
          </p>
        </div>
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Progress Card (Spans 3 columns on desktop) */}
        <div className="md:col-span-3 bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100 flex flex-col justify-center">
          <div className="flex justify-between items-end mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-800 flex items-center">
                <Target className={clsx("w-6 h-6 mr-2", progressPercent === 100 ? "text-green-500" : "text-orange-500")} />
                พลังงานภารกิจ (ความคืบหน้า)
              </h2>
              <p className="text-sm text-gray-500 mt-1">ทำไปแล้ว {completedTasks} จาก {totalTasks} ภารกิจ</p>
            </div>
            <div className={clsx("text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r", progressPercent === 100 ? "from-green-500 to-green-600" : "from-orange-400 to-orange-600")}>
              {progressPercent}%
            </div>
          </div>
          
          <div className="w-full bg-gray-100 rounded-full h-6 shadow-inner mt-2 relative">
            <div 
              className={clsx("h-full rounded-full transition-all duration-1000 ease-out flex items-center justify-end relative", progressPercent === 100 ? "bg-gradient-to-r from-green-400 to-green-500" : "bg-gradient-to-r from-orange-400 to-orange-500")}
              style={{ width: `${progressPercent}%` }}
            >
              {progressPercent > 0 && (
                <span className="absolute -right-3 top-1/2 transform -translate-y-1/2 text-3xl drop-shadow-md z-10">
                  {progressPercent === 100 ? '🏆' : '🔥'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 3 Stats Cards Row */}
        
        {/* Total Tasks Card */}
        <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm flex flex-col justify-between relative overflow-hidden">
          <div className="absolute -right-4 -bottom-4 text-blue-50 opacity-80">
            <ListTodo className="w-32 h-32" />
          </div>
          <div className="relative z-10">
            <h3 className="text-lg font-bold text-gray-800 flex items-center">
              <ListTodo className="w-5 h-5 mr-2 text-blue-500" />
              ภารกิจทั้งหมด
            </h3>
            <p className="text-gray-500 text-sm mt-1">งานที่ได้รับมอบหมาย</p>
            <div className="mt-4 flex items-baseline">
              <span className="text-5xl font-black text-blue-600">{totalTasks}</span>
              <span className="ml-2 text-lg text-gray-400">งาน</span>
            </div>
          </div>
        </div>

        {/* Pending Tasks Card */}
        <div className="bg-gradient-to-br from-orange-300 to-orange-500 rounded-3xl p-6 shadow-sm flex flex-col justify-between relative overflow-hidden text-white">
          <div className="absolute -right-4 -bottom-4 opacity-20">
            <Flame className="w-32 h-32" />
          </div>
          <div className="relative z-10">
            <h3 className="text-lg font-bold opacity-90 flex items-center">
              <Zap className="w-5 h-5 mr-2" />
              ภารกิจที่ต้องเคลียร์!
            </h3>
            <p className="text-amber-100 text-sm mt-1">งานที่ยังทำไม่เสร็จ</p>
            <div className="mt-4 flex items-baseline">
              <span className="text-5xl font-black">{pendingTasks}</span>
              <span className="ml-2 text-lg opacity-80">งาน</span>
            </div>
          </div>
        </div>

        {/* Done Stats */}
        <div className="bg-gradient-to-br from-blue-400 to-blue-700 rounded-3xl p-6 shadow-sm flex flex-col justify-between relative overflow-hidden text-white">
          <div className="absolute -right-4 -bottom-4 opacity-20">
            <Star className="w-32 h-32" />
          </div>
          <div className="relative z-10">
            <h3 className="text-lg font-bold opacity-90 flex items-center">
              <Star className="w-5 h-5 mr-2" />
              เก็บดาวได้แล้ว
            </h3>
            <p className="text-blue-100 text-sm mt-1">งานที่ทำเสร็จทั้งหมด</p>
            <div className="mt-4 flex items-baseline">
              <span className="text-5xl font-black">{completedTasks}</span>
              <span className="ml-2 text-lg opacity-80">งาน</span>
            </div>
          </div>
        </div>

      </div>

      {/* Subject Progress Cards */}
      <div className="mt-8">
        <h2 className="text-xl font-bold text-gray-800 flex items-center mb-6">
          <BookOpen className="w-6 h-6 text-blue-500 mr-2" />
          ความคืบหน้ารายวิชา
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {subjects.map(subject => {
            const stats = subjectStats[subject];
            const percent = stats.total === 0 ? 0 : Math.round((stats.done / stats.total) * 100);
            return (
              <div key={subject} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col justify-center transition-all hover:shadow-md hover:border-orange-100">
                <div className="flex justify-between items-end mb-3">
                  <div className="truncate pr-4">
                    <h3 className="text-sm font-bold text-gray-800 truncate">{subject}</h3>
                    <div className="text-[11px] text-gray-500 mt-1.5 flex items-center">
                      <span>รวม {stats.total}</span>
                      <span className="mx-1.5 text-gray-200">|</span>
                      <span className="text-green-600">ทำแล้ว {stats.done}</span>
                      <span className="mx-1.5 text-gray-200">|</span>
                      <span className={stats.total - stats.done > 0 ? "text-orange-500 font-medium" : "text-gray-400"}>
                        ค้าง {stats.total - stats.done}
                      </span>
                    </div>
                  </div>
                  <div className={clsx(
                    "text-xl font-black",
                    percent === 100 ? "text-green-500" : "text-orange-500"
                  )}>
                    {percent}%
                  </div>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden shadow-inner">
                  <div 
                    className={clsx(
                      "h-full transition-all duration-1000 ease-out flex items-center justify-end px-1",
                      percent === 100 ? "bg-green-500" : "bg-gradient-to-r from-orange-300 to-orange-500"
                    )}
                    style={{ width: `${percent}%` }}
                  >
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Tasks List */}
      <div className="mt-8 bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-bold text-gray-800 flex items-center">
            <CalendarDays className="w-5 h-5 text-blue-500 mr-2" />
            ภารกิจเร่งด่วน (ยังไม่ทำ)
          </h2>
          <Link href="/homework" className="text-sm text-blue-600 font-medium hover:underline flex items-center">
            ดูทั้งหมด <ArrowRight className="w-4 h-4 ml-1" />
          </Link>
        </div>
        
        <div className="space-y-3">
          {recentPending.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
              <p className="text-gray-500 font-medium">ยอดเยี่ยมมาก! ไม่มีภารกิจค้างเลย 🎉</p>
            </div>
          ) : (
            recentPending.map(task => (
              <div key={task.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 hover:border-orange-200 transition-colors">
                <div className="flex items-center overflow-hidden">
                  <div className="w-10 h-10 rounded-xl bg-white border border-gray-100 flex items-center justify-center text-orange-500 mr-4 shrink-0 shadow-sm">
                    <Flame className="w-5 h-5" />
                  </div>
                  <div className="truncate">
                    <p className="font-bold text-gray-800 truncate">{task.task_name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{task.subject}</p>
                  </div>
                </div>
                <Link href="/homework" className="bg-white border border-gray-200 text-gray-600 p-2 rounded-full hover:bg-orange-50 hover:text-orange-600 transition-colors shrink-0 ml-4">
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
