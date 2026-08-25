'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, CheckSquare, Settings, BookOpen, Rocket, Printer, LayoutGrid } from 'lucide-react';
import { clsx } from 'clsx';
import { useEffect, useState } from 'react';

export default function Navigation({ isCollapsed, setIsCollapsed }: { isCollapsed: boolean, setIsCollapsed: (val: boolean) => void }) {
  const pathname = usePathname();
  const [studentName, setStudentName] = useState<string | null>(null);

  useEffect(() => {
    // Read from localStorage to check if student is selected
    const savedName = localStorage.getItem('hw_student_name');
    if (savedName && savedName !== studentName) {
      setTimeout(() => setStudentName(savedName), 0);
    }
  }, [pathname]); // Re-check on navigation

  const navItems = [
    { name: 'ภาพรวม (Dashboard)', href: '/', icon: Home },
    { name: 'งานทั้งหมด (All Tasks)', href: '/all-tasks', icon: CheckSquare },
    { name: 'การบ้าน (Home Work)', href: '/homework', icon: BookOpen },
    { name: 'จัดการงาน (Task Hub)', href: '/reconcile', icon: LayoutGrid },
    { name: 'พิมพ์ใบงาน (Print)', href: '/print', icon: Printer },
    { name: 'ตั้งค่า (Settings)', href: '/settings', icon: Settings },
  ];

  return (
    <>
      {/* Desktop Sidebar & Mobile Top Header wrapper */}
      <nav className={clsx("bg-white md:fixed md:inset-y-0 md:left-0 md:border-r md:border-gray-200 md:shadow-none shadow-sm sticky top-0 z-10 print:hidden md:flex md:flex-col transition-all duration-300", isCollapsed ? "md:w-20" : "md:w-64")}>
        <div className="md:flex-1 md:flex md:flex-col md:px-4 md:py-6 h-16 md:h-auto flex items-center md:items-stretch px-4 sm:px-6">
          <div className={clsx("flex-shrink-0 flex items-center md:mb-8 transition-all", isCollapsed ? "md:justify-center" : "")}>
            <button 
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="flex items-center group transition-transform active:scale-95 cursor-pointer focus:outline-none"
              title={isCollapsed ? "ขยายเมนู" : "ย่อเมนู"}
            >
              <span className={clsx("text-3xl transition-transform group-hover:scale-110 -rotate-45 inline-block", isCollapsed ? "mr-2 md:mr-0" : "mr-2")}>🚀</span>
            </button>
            <Link href="/" className={clsx("flex items-center group transition-transform active:scale-95", isCollapsed ? "md:hidden" : "")}>
              <span className="text-xl md:text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-[#597ecf] to-[#434c60] tracking-tight group-hover:opacity-80 transition-opacity whitespace-nowrap">
                HW Tracker
              </span>
            </Link>
          </div>

          {/* Mobile Right Action Area (Student Name) */}
          <div className="md:hidden ml-auto flex items-center">
            {studentName ? (
              <span className="text-xs text-[#57627a] bg-[#f1f3f6] px-3 py-1.5 rounded-full flex items-center font-medium shadow-inner">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-1.5"></span>
                <span className="truncate max-w-[120px]">{studentName}</span>
              </span>
            ) : (
              <Link href="/settings" className="text-xs text-rose-500 hover:text-rose-700 underline font-medium">
                ตั้งค่าชื่อ
              </Link>
            )}
          </div>

          {/* Desktop Nav Items */}
          <div className="hidden md:flex md:flex-col md:space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  title={isCollapsed ? item.name : undefined}
                  className={clsx(
                    isActive
                      ? 'bg-[#eef3fc] text-[#597ecf] font-bold shadow-2xs'
                      : 'text-[#57627a] hover:bg-[#f4f7fa] hover:text-[#000000] font-medium',
                    'group flex items-center text-sm rounded-xl transition-all duration-200',
                    isCollapsed ? 'justify-center p-3 mx-2' : 'px-4 py-3 mx-4'
                  )}
                >
                  <Icon className={clsx("w-5 h-5 transition-colors flex-shrink-0", isActive ? "text-[#597ecf]" : "text-gray-400 group-hover:text-gray-600", !isCollapsed && "mr-3")} />
                  {!isCollapsed && <span className="whitespace-nowrap">{item.name}</span>}
                </Link>
              );
            })}
          </div>

          {/* Desktop Bottom Action Area */}
          <div className={clsx("hidden md:flex mt-auto pt-6 border-t border-[#e2e8f0]", isCollapsed ? "justify-center pb-6" : "block")}>
            {studentName ? (
              isCollapsed ? (
                <div className="w-3 h-3 bg-emerald-500 rounded-full shadow-sm" title={`กำลังใช้งาน: ${studentName}`}></div>
              ) : (
                <div className="bg-[#f4f7fa] rounded-xl p-4 border border-[#e2e8f0] shadow-xs mx-4 mb-6 w-full">
                  <p className="text-[11px] text-gray-500 font-semibold mb-1 uppercase tracking-wider">กำลังใช้งาน</p>
                  <strong className="text-sm text-[#597ecf] flex items-center">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full mr-2 shadow-xs"></div>
                    <span className="truncate">{studentName}</span>
                  </strong>
                </div>
              )
            ) : (
              isCollapsed ? (
                <Link href="/settings" className="w-3 h-3 bg-rose-500 rounded-full shadow-sm" title="กรุณาตั้งค่าชื่อนักเรียน"></Link>
              ) : (
                <Link href="/settings" className="text-sm text-white bg-rose-500 hover:bg-rose-600 px-4 py-2 rounded-lg flex justify-center transition-colors shadow-sm font-medium mx-4 mb-6 w-full text-center">
                  กรุณาตั้งค่าชื่อนักเรียน
                </Link>
              )
            )}
          </div>
        </div>
      </nav>

      {/* Mobile nav (bottom) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-[#e2e8f0] flex justify-around p-1.5 z-50 print:hidden pb-safe shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)]">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={clsx(
                isActive ? 'text-[#597ecf]' : 'text-[#57627a] hover:text-[#000000]',
                'flex flex-col items-center justify-center w-full p-2 text-[10px] font-bold transition-colors rounded-xl active:bg-gray-50'
              )}
            >
              <div className={clsx("p-1.5 rounded-full mb-0.5 transition-colors", isActive ? "bg-[#eef3fc]" : "")}>
                <Icon className={clsx('w-5 h-5', isActive ? 'text-[#597ecf]' : 'text-gray-400')} />
              </div>
              <span className={clsx(isActive ? "opacity-100" : "opacity-80")}>{item.name.split(' ')[0]}</span>
            </Link>
          );
        })}
      </div>
    </>
  );
}
