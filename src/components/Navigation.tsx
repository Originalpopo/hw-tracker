'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, CheckSquare, Settings, BookOpen } from 'lucide-react';
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
    { name: 'ตั้งค่า (Settings)', href: '/settings', icon: Settings },
  ];

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10 print:hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                HW Tracker
              </span>
            </div>
            <div className="hidden sm:ml-4 md:ml-8 sm:flex sm:space-x-4 md:space-x-8">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={clsx(
                      isActive
                        ? 'border-indigo-500 text-gray-900'
                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700',
                      'inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors duration-200'
                    )}
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </div>
          <div className="flex items-center">
            {studentName ? (
              <span className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full flex items-center">
                นักเรียน: <strong className="ml-1 text-indigo-600">{studentName}</strong>
              </span>
            ) : (
              <Link href="/settings" className="text-sm text-red-500 hover:text-red-700 underline flex items-center transition-colors">
                กรุณาตั้งค่าชื่อนักเรียน
              </Link>
            )}
          </div>
        </div>
      </div>
      
      {/* Mobile nav (bottom) */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around p-2 z-50 print:hidden">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={clsx(
                isActive ? 'text-indigo-600' : 'text-gray-500 hover:text-gray-700',
                'flex flex-col items-center justify-center w-full p-2 text-xs font-medium transition-colors'
              )}
            >
              <Icon className={clsx('w-6 h-6 mb-1', isActive ? 'text-indigo-600' : 'text-gray-500')} />
              {item.name}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
