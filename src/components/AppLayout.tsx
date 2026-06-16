'use client';

import { useState } from 'react';
import Navigation from './Navigation';
import { clsx } from 'clsx';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(true);

  return (
    <>
      <Navigation isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
      <div className={clsx("flex flex-col min-h-screen transition-all duration-300", isCollapsed ? "md:pl-20" : "md:pl-64")}>
        <main className="flex-1 w-full p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </>
  );
}
