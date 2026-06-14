'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, CheckSquare, Settings, BookOpen, Flame, Printer } from 'lucide-react';
import { clsx } from 'clsx';
import { useEffect, useState } from 'react';

export default function Navigation() {
  const pathname = usePathname();
  const [studentName, setStudentName] = useState<string | null>(null);

  useEffect(() => {
    // Read from localStorage to check if student is selected
    const savedName = localStorage.getItem('hw_student_name');
    if (savedName) {
      setStudentName(savedName);
    }
  }, [pathname]); // Re-check on navigation

  const navItems = [
    { name: 'ภาพรวม (Dashboard)', href: '/', icon: Home },
    { name: 'การบ้าน (Home Work)', href: '/homework', icon: BookOpen },
    { name: 'จับคู่งาน (Reconcile)', href: '/reconcile', icon: CheckSquare },
    { name: 'พิมพ์ใบงาน (Print)', href: '/print', icon: Printer },
    { name: 'ตั้งค่า (Settings)', href: '/settings', icon: Settings },
  ];

  return (
    <>
      {/* Desktop Sidebar & Mobile Top Header wrapper */}
      <nav className="bg-white md:fixed md:inset-y-0 md:left-0 md:w-64 md:border-r md:border-gray-200 md:shadow-none shadow-sm sticky top-0 z-10 print:hidden md:flex md:flex-col">
        <div className="md:flex-1 md:flex md:flex-col md:px-4 md:py-6 h-16 md:h-auto flex items-center md:items-stretch px-4 sm:px-6">
          <div className="flex-shrink-0 flex items-center md:mb-8">
            <Link href="/" className="flex items-center group transition-transform active:scale-95">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center shadow-sm mr-3">
                <Flame className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl md:text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-blue-800 tracking-tight group-hover:opacity-80 transition-opacity">
                HW Tracker
              </span>
            </Link>
          </div>

          {/* Mobile Right Action Area (Student Name) */}
          <div className="md:hidden ml-auto flex items-center">
            {studentName ? (
              <span className="text-xs text-gray-600 bg-gray-100 px-3 py-1.5 rounded-full flex items-center font-medium shadow-inner">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5"></span>
                <span className="truncate max-w-[120px]">{studentName}</span>
              </span>
            ) : (
              <Link href="/settings" className="text-xs text-red-500 hover:text-red-700 underline font-medium">
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
                  className={clsx(
                    isActive
                      ? 'bg-blue-50 text-blue-700 font-bold'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 font-medium',
                    'group flex items-center px-4 py-3 text-sm rounded-xl transition-all duration-200'
                  )}
                >
                  <Icon className={clsx("w-5 h-5 mr-3 transition-colors", isActive ? "text-blue-600" : "text-gray-400 group-hover:text-gray-500")} />
                  {item.name}
                </Link>
              );
            })}
          </div>

          {/* Desktop Bottom Action Area */}
          <div className="hidden md:block mt-auto pt-6 border-t border-gray-100">
            {studentName ? (
              <div className="bg-gray-50/80 rounded-xl p-4 border border-gray-100 shadow-sm">
                <p className="text-[11px] text-gray-500 font-semibold mb-1 uppercase tracking-wider">กำลังใช้งาน</p>
                <strong className="text-sm text-blue-700 flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2 shadow-sm shadow-green-200"></div>
                  <span className="truncate">{studentName}</span>
                </strong>
              </div>
            ) : (
              <Link href="/settings" className="text-sm text-white bg-red-500 hover:bg-red-600 px-4 py-2 rounded-lg flex justify-center transition-colors shadow-sm font-medium">
                กรุณาตั้งค่าชื่อนักเรียน
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile nav (bottom) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-gray-200 flex justify-around p-1.5 z-50 print:hidden pb-safe shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)]">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={clsx(
                isActive ? 'text-blue-600' : 'text-gray-500 hover:text-gray-900',
                'flex flex-col items-center justify-center w-full p-2 text-[10px] font-bold transition-colors rounded-xl active:bg-gray-50'
              )}
            >
              <div className={clsx("p-1.5 rounded-full mb-0.5 transition-colors", isActive ? "bg-blue-50" : "")}>
                <Icon className={clsx('w-5 h-5', isActive ? 'text-blue-600' : 'text-gray-400')} />
              </div>
              <span className={clsx(isActive ? "opacity-100" : "opacity-80")}>{item.name.split(' ')[0]}</span>
            </Link>
          );
        })}
      </div>
    </>
  );
}
