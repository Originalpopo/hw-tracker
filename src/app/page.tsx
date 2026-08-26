'use client';

import { useState, useEffect } from 'react';
import { getChildTasks, ChildTask, getGlobalSettings } from '@/lib/db';
import { Trophy, Star, Flame, Zap, BookOpen, ListTodo, CheckSquare, FileText } from 'lucide-react';
import { clsx } from 'clsx';
import Link from 'next/link';
import confetti from 'canvas-confetti';

interface SubjectStatDetail {
  total: number;
  done: number;
  officialTotal: number;
  officialDone: number;
  personalTotal: number;
  personalDone: number;
}

export default function DashboardOverview() {
  const [tasks, setTasks] = useState<ChildTask[]>([]);
  const [studentName, setStudentName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [animateBars, setAnimateBars] = useState(false);

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

    const t = setTimeout(() => setAnimateBars(true), 100);
    return () => clearTimeout(t);
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

  // Stats calculation
  const totalTasks = tasks.length;
  const officialTotal = tasks.filter(t => !!t.teacher_column_id).length;
  const personalTotal = tasks.filter(t => !t.teacher_column_id).length;

  const completedTasks = tasks.filter(t => ['Done', 'Submitted', 'Verified'].includes(t.status)).length;
  const officialCompleted = tasks.filter(t => !!t.teacher_column_id && ['Done', 'Submitted', 'Verified'].includes(t.status)).length;
  const personalCompleted = tasks.filter(t => !t.teacher_column_id && ['Done', 'Submitted', 'Verified'].includes(t.status)).length;

  const pendingTasks = tasks.filter(t => !['Done', 'Submitted', 'Verified'].includes(t.status)).length;
  const officialPending = tasks.filter(t => !!t.teacher_column_id && !['Done', 'Submitted', 'Verified'].includes(t.status)).length;
  const personalPending = tasks.filter(t => !t.teacher_column_id && !['Done', 'Submitted', 'Verified'].includes(t.status)).length;
  
  const progressPercent = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

  const getProgressColorClass = (percent: number) => {
    if (percent === 100) return 'text-emerald-600';
    if (percent >= 75) return 'text-emerald-500';
    if (percent >= 50) return 'text-amber-500';
    if (percent >= 25) return 'text-orange-400';
    return 'text-orange-300';
  };

  // Trigger confetti when hitting 100%
  useEffect(() => {
    if (progressPercent === 100 && totalTasks > 0) {
      const duration = 3000;
      const end = Date.now() + duration;

      const frame = () => {
        confetti({
          particleCount: 5,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#597ecf', '#f97316', '#059669', '#57627a', '#eab308']
        });
        confetti({
          particleCount: 5,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#597ecf', '#f97316', '#059669', '#57627a', '#eab308']
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };
      frame();
    }
  }, [progressPercent, totalTasks]);

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

  // Subject progress calculation (Dual: Official Sheet Tasks vs Personal Tasks)
  const subjectStats: Record<string, SubjectStatDetail> = {};
  tasks.forEach(t => {
    if (!t.subject) return;
    const sub = t.subject.trim();
    if (!subjectStats[sub]) {
      subjectStats[sub] = { 
        total: 0, 
        done: 0, 
        officialTotal: 0, 
        officialDone: 0, 
        personalTotal: 0, 
        personalDone: 0 
      };
    }
    const isDone = ['Done', 'Submitted', 'Verified'].includes(t.status);
    subjectStats[sub].total += 1;
    if (isDone) subjectStats[sub].done += 1;

    if (t.teacher_column_id) {
      subjectStats[sub].officialTotal += 1;
      if (isDone) subjectStats[sub].officialDone += 1;
    } else {
      subjectStats[sub].personalTotal += 1;
      if (isDone) subjectStats[sub].personalDone += 1;
    }
  });

  const subjects = Object.keys(subjectStats).sort();

  const getHeroPercentColorClass = (percent: number) => {
    if (percent === 100) return 'text-emerald-300';
    if (percent >= 75) return 'text-teal-300';
    if (percent >= 50) return 'text-sky-300';
    if (percent >= 25) return 'text-yellow-300';
    return 'text-amber-400';
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      {/* Hero Welcome Card with Integrated Progress Bar */}
      <div className="bg-gradient-to-br from-[#597ecf] via-[#4a6fb8] to-[#434c60] rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 opacity-10 transform translate-x-4 -translate-y-4 animate-float">
          <Trophy className="w-48 h-48" />
        </div>
        <div className="relative z-10">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-baseline gap-2 mb-1">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Hi, {studentName}!
            </h1>
            <div className={clsx("text-3xl sm:text-4xl font-black drop-shadow-md transition-colors duration-500", getHeroPercentColorClass(progressPercent))}>
              {progressPercent}%
            </div>
          </div>

          <p className="text-blue-100 text-sm sm:text-base mb-4">
            พร้อมทำภารกิจประจำวันหรือยัง?
          </p>

          {/* Integrated Progress Bar */}
          <div className="w-full bg-black/20 backdrop-blur-xs rounded-full h-6 shadow-inner relative mt-2">
            <div 
              className={clsx(
                "h-full rounded-full transition-all duration-1000 ease-out flex items-center justify-end relative",
                progressPercent === 100 ? "bg-gradient-to-r from-emerald-400 to-emerald-500" : "bg-gradient-to-r from-amber-400 via-sky-300 to-emerald-400"
              )}
              style={{ width: animateBars ? `${progressPercent}%` : '0%' }}
            >
              {progressPercent > 0 && (
                <span className="absolute -right-5 top-1/2 transform -translate-y-1/2 text-5xl sm:text-6xl drop-shadow-2xl z-10 pointer-events-none">
                  {progressPercent === 100 ? '🏆' : <span className="inline-block rotate-45">🚀</span>}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3 Stats Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* 1. Total Tasks Card */}
        <div className="bg-white border border-[#e2e8f0] rounded-3xl p-6 shadow-xs flex flex-col justify-between relative overflow-hidden group hover:border-[#597ecf]/40 transition-all">
          <div className="absolute -right-4 -bottom-4 text-[#597ecf] opacity-[0.06] group-hover:scale-105 transition-transform">
            <ListTodo className="w-36 h-36" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center">
              <div className="w-9 h-9 rounded-xl bg-[#eef3fc] text-[#597ecf] flex items-center justify-center mr-3 shrink-0 shadow-2xs">
                <ListTodo className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">ภารกิจทั้งหมด</h3>
                <p className="text-gray-500 text-xs mt-0.5">งานที่ได้รับมอบหมาย</p>
              </div>
            </div>

            <div className="mt-4 flex items-baseline">
              <span className="text-4xl sm:text-5xl font-black text-[#597ecf]">{totalTasks}</span>
              <span className="ml-2 text-sm sm:text-base font-semibold text-gray-400">งาน</span>
            </div>

            {/* Breakdown Sub-row with Monotone Icons */}
            <div className="mt-4 pt-3 border-t border-[#e2e8f0] flex items-center gap-2 text-xs font-semibold text-gray-600 flex-wrap">
              <span className="inline-flex items-center gap-1.5 bg-[#f4f7fa] px-2.5 py-1 rounded-lg border border-[#e2e8f0]">
                <CheckSquare className="w-3.5 h-3.5 text-[#597ecf]" />
                ชีตครู: <strong className="text-gray-900">{officialTotal}</strong>
              </span>
              <span className="inline-flex items-center gap-1.5 bg-[#f4f7fa] px-2.5 py-1 rounded-lg border border-[#e2e8f0]">
                <FileText className="w-3.5 h-3.5 text-gray-500" />
                งานส่วนตัว: <strong className="text-gray-900">{personalTotal}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* 2. Pending Tasks Card */}
        <div className="bg-white border border-[#e2e8f0] rounded-3xl p-6 shadow-xs flex flex-col justify-between relative overflow-hidden group hover:border-amber-300 transition-all">
          <div className="absolute -right-4 -bottom-4 text-amber-500 opacity-[0.06] group-hover:scale-105 transition-transform">
            <Flame className="w-36 h-36" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center">
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mr-3 shrink-0 shadow-2xs">
                <Flame className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">ภารกิจที่ต้องเคลียร์!</h3>
                <p className="text-gray-500 text-xs mt-0.5">งานที่ยังทำไม่เสร็จ</p>
              </div>
            </div>

            <div className="mt-4 flex items-baseline">
              <span className="text-4xl sm:text-5xl font-black text-amber-600">{pendingTasks}</span>
              <span className="ml-2 text-sm sm:text-base font-semibold text-gray-400">งาน</span>
            </div>

            {/* Breakdown Sub-row with Monotone Icons */}
            <div className="mt-4 pt-3 border-t border-[#e2e8f0] flex items-center gap-2 text-xs font-semibold text-gray-600 flex-wrap">
              <span className="inline-flex items-center gap-1.5 bg-[#f4f7fa] px-2.5 py-1 rounded-lg border border-[#e2e8f0]">
                <CheckSquare className="w-3.5 h-3.5 text-amber-600" />
                ชีตครู: <strong className="text-gray-900">{officialPending}</strong>
              </span>
              <span className="inline-flex items-center gap-1.5 bg-[#f4f7fa] px-2.5 py-1 rounded-lg border border-[#e2e8f0]">
                <FileText className="w-3.5 h-3.5 text-gray-500" />
                งานส่วนตัว: <strong className="text-gray-900">{personalPending}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* 3. Done Stats Card */}
        <div className="bg-white border border-[#e2e8f0] rounded-3xl p-6 shadow-xs flex flex-col justify-between relative overflow-hidden group hover:border-[#57627a]/40 transition-all">
          <div className="absolute -right-4 -bottom-4 text-[#57627a] opacity-[0.06] group-hover:scale-105 transition-transform">
            <Star className="w-36 h-36" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center">
              <div className="w-9 h-9 rounded-xl bg-[#eff2f7] text-[#57627a] flex items-center justify-center mr-3 shrink-0 shadow-2xs">
                <Star className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">เก็บดาวได้แล้ว</h3>
                <p className="text-gray-500 text-xs mt-0.5">งานที่ทำเสร็จทั้งหมด</p>
              </div>
            </div>

            <div className="mt-4 flex items-baseline">
              <span className="text-4xl sm:text-5xl font-black text-[#57627a]">{completedTasks}</span>
              <span className="ml-2 text-sm sm:text-base font-semibold text-gray-400">งาน</span>
            </div>

            {/* Breakdown Sub-row with Monotone Icons */}
            <div className="mt-4 pt-3 border-t border-[#e2e8f0] flex items-center gap-2 text-xs font-semibold text-gray-600 flex-wrap">
              <span className="inline-flex items-center gap-1.5 bg-[#f4f7fa] px-2.5 py-1 rounded-lg border border-[#e2e8f0]">
                <CheckSquare className="w-3.5 h-3.5 text-[#57627a]" />
                ชีตครู: <strong className="text-gray-900">{officialCompleted}</strong>
              </span>
              <span className="inline-flex items-center gap-1.5 bg-[#f4f7fa] px-2.5 py-1 rounded-lg border border-[#e2e8f0]">
                <FileText className="w-3.5 h-3.5 text-gray-500" />
                งานส่วนตัว: <strong className="text-gray-900">{personalCompleted}</strong>
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* Subject Progress Cards (Dual Bars: Official Sheet Tasks vs Personal Tasks) */}
      <div className="mt-8">
        <h2 className="text-xl font-bold text-gray-800 flex items-center mb-6">
          <BookOpen className="w-6 h-6 text-[#597ecf] mr-2" />
          ความคืบหน้ารายวิชา
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {subjects.map(subject => {
            const stats = subjectStats[subject];
            const pendingCount = stats.total - stats.done;
            const overallPercent = stats.total === 0 ? 0 : Math.round((stats.done / stats.total) * 100);
            
            const officialPercent = stats.officialTotal === 0 ? 100 : Math.round((stats.officialDone / stats.officialTotal) * 100);
            const personalPercent = stats.personalTotal === 0 ? 100 : Math.round((stats.personalDone / stats.personalTotal) * 100);

            const isCompleted = pendingCount === 0 && stats.total > 0;

            const cardContent = (
              <div className={clsx(
                "rounded-3xl p-5 shadow-xs border flex flex-col justify-between transition-all duration-300 relative overflow-hidden",
                !isCompleted 
                  ? "bg-white border-[#e2e8f0] hover:shadow-md hover:-translate-y-1 hover:border-[#597ecf]/40 cursor-pointer group" 
                  : "bg-gradient-to-br from-emerald-500 to-teal-700 border-emerald-600 text-white shadow-md"
              )}>
                {isCompleted && (
                  <div className="absolute -right-4 -bottom-4 opacity-15 text-white pointer-events-none drop-shadow-sm">
                    <Trophy className="w-28 h-28" />
                  </div>
                )}

                {/* Card Header: Subject Name & Total */}
                <div className="relative z-10 flex justify-between items-start mb-4">
                  <div className="truncate pr-3">
                    <h3 className={clsx(
                      "text-base font-bold truncate transition-colors",
                      !isCompleted ? "text-gray-900 group-hover:text-[#597ecf]" : "text-white"
                    )}>
                      {subject}
                    </h3>
                    <div className={clsx("text-xs mt-0.5 font-medium flex items-center gap-1.5", !isCompleted ? "text-gray-500" : "text-emerald-100")}>
                      <span>ทั้งหมด {stats.total} งาน</span>
                      <span>•</span>
                      <span className={!isCompleted ? "text-emerald-600 font-semibold" : "text-white font-semibold"}>เสร็จ {stats.done}</span>
                      {pendingCount > 0 && (
                        <>
                          <span>•</span>
                          <span className="text-orange-500 font-bold">ค้าง {pendingCount}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className={clsx(
                    "text-xl font-black shrink-0",
                    !isCompleted ? getProgressColorClass(overallPercent) : "text-white"
                  )}>
                    {overallPercent}%
                  </div>
                </div>

                {/* Dual Bars Section */}
                <div className="relative z-10 space-y-3.5 pt-1">
                  
                  {/* Bar 1: งานตามชีตครู */}
                  <div>
                    <div className="flex justify-between items-center text-[11px] font-semibold mb-1">
                      <span className={clsx("flex items-center gap-1.5", !isCompleted ? "text-gray-700" : "text-emerald-50")}>
                        <CheckSquare className="w-3.5 h-3.5 opacity-80" />
                        <span>ชีตครู:</span>
                        <span className="font-normal">{stats.officialDone}/{stats.officialTotal}</span>
                      </span>
                      <span className={!isCompleted ? "text-gray-600 font-bold" : "text-white font-bold"}>
                        {officialPercent}%
                      </span>
                    </div>
                    <div className={clsx("w-full rounded-full h-3 relative shadow-inner overflow-visible", !isCompleted ? "bg-[#f1f3f6]" : "bg-white/20")}>
                      <div 
                        className={clsx(
                          "h-full rounded-full transition-all duration-1000 ease-out flex items-center justify-end relative",
                          isCompleted ? "bg-white/70" : officialPercent === 100 ? "bg-gradient-to-r from-emerald-400 to-emerald-500" : "bg-gradient-to-r from-orange-300 via-amber-400 to-emerald-500"
                        )}
                        style={{ width: animateBars ? `${officialPercent}%` : '0%' }}
                      >
                        {officialPercent > 0 && (
                          <span className="absolute -right-3.5 top-1/2 -translate-y-1/2 text-2xl leading-none drop-shadow-md z-10 pointer-events-none flex items-center justify-center">
                            {officialPercent === 100 ? '🏆' : <span className="inline-block rotate-45">✈️</span>}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Bar 2: งานส่วนตัว */}
                  <div>
                    <div className="flex justify-between items-center text-[11px] font-semibold mb-1">
                      <span className={clsx("flex items-center gap-1.5", !isCompleted ? "text-gray-700" : "text-emerald-50")}>
                        <FileText className="w-3.5 h-3.5 opacity-80" />
                        <span>งานส่วนตัว:</span>
                        <span className="font-normal">{stats.personalDone}/{stats.personalTotal}</span>
                      </span>
                      <span className={!isCompleted ? "text-gray-600 font-bold" : "text-white font-bold"}>
                        {personalPercent}%
                      </span>
                    </div>
                    <div className={clsx("w-full rounded-full h-3 relative shadow-inner overflow-visible", !isCompleted ? "bg-[#f1f3f6]" : "bg-white/20")}>
                      <div 
                        className={clsx(
                          "h-full rounded-full transition-all duration-1000 ease-out flex items-center justify-end relative",
                          isCompleted ? "bg-white/70" : personalPercent === 100 ? "bg-gradient-to-r from-emerald-400 to-emerald-500" : "bg-gradient-to-r from-orange-300 via-amber-400 to-emerald-500"
                        )}
                        style={{ width: animateBars ? `${personalPercent}%` : '0%' }}
                      >
                        {personalPercent > 0 && (
                          <span className={clsx(
                            "absolute leading-none drop-shadow-md z-10 pointer-events-none flex items-center justify-center",
                            personalPercent === 100 
                              ? "-right-3.5 top-1/2 -translate-y-1/2 text-2xl" 
                              : "-right-5 top-1/2 -translate-y-[72%] text-4xl"
                          )}>
                            {personalPercent === 100 ? '🏆' : <span className="inline-block scale-x-[-1]">🏎️</span>}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                </div>

              </div>
            );

            if (pendingCount > 0) {
              return (
                <Link key={subject} href={`/homework?subject=${encodeURIComponent(subject)}`} className="block">
                  {cardContent}
                </Link>
              );
            }

            return (
              <div key={subject}>
                {cardContent}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
