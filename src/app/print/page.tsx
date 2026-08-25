import Link from 'next/link';
import { Printer, CalendarClock, CheckCircle, Zap, Clock, BookOpen, Sparkles, FileText } from 'lucide-react';

export default function PrintHubPage() {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      
      {/* Standard Website Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-6 sm:p-7 rounded-3xl border border-[#e2e8f0] shadow-sm gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 flex items-center">
            <Printer className="w-6 h-6 text-[#597ecf] mr-2 shrink-0" />
            พิมพ์ใบงาน (Print Hub)
          </h1>
          <p className="text-gray-500 mt-1 text-sm sm:text-base">
            เลือกรูปแบบใบงานที่ต้องการพิมพ์ เพื่อนำไปตรวจเช็คด้วยมือ (Manual Check) หรือให้ลูกนำไปติดตามงานกับครูที่โรงเรียน
          </p>
        </div>
      </div>

      {/* 4 Print Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Card 1: ใบตามงานจากครู (สำหรับถือไปโรงเรียน) */}
        <Link 
          href="/print/pending" 
          className="group text-left bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 rounded-3xl p-6 text-white shadow-md hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 relative overflow-hidden flex flex-col h-full cursor-pointer"
        >
          <div className="absolute -right-6 -bottom-6 opacity-15 group-hover:scale-110 transition-transform duration-500">
            <CalendarClock className="w-36 h-36" />
          </div>
          
          <div className="relative z-10 flex flex-col h-full">
            <div className="flex items-center justify-between mb-4">
              <div className="w-11 h-11 bg-white/15 rounded-2xl flex items-center justify-center backdrop-blur-sm shadow-inner group-hover:scale-105 transition-transform">
                <CalendarClock className="w-6 h-6 text-white" />
              </div>
              <span className="text-[10px] font-extrabold bg-blue-500/30 text-blue-200 border border-blue-400/40 px-2.5 py-1 rounded-full backdrop-blur-sm">
                🎒 ถือไปโรงเรียน
              </span>
            </div>

            <h2 className="text-xl font-black mb-2 tracking-tight group-hover:text-blue-200 transition-colors">
              ใบตามงานจากครู
            </h2>
            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed mb-6 flex-grow">
              รวบรวมงานทั้งหมดที่ครูสั่งแต่ยังไม่ได้ตรวจใน Google Sheet เพื่อให้เด็กนำไปบอกครูที่โรงเรียนเพื่อขอเคลียร์งาน
            </p>

            <div className="inline-flex items-center justify-center text-xs font-bold bg-white text-slate-800 px-4 py-2.5 rounded-xl shadow-sm group-hover:bg-blue-50 group-hover:text-blue-700 transition-all mt-auto w-max active:scale-95">
              <Printer className="w-3.5 h-3.5 mr-1.5" /> พิมพ์ใบตามงานจากครู
            </div>
          </div>
        </Link>

        {/* Card 2: ใบงานที่ยังไม่ทำ (สำหรับ Manual Check ที่บ้าน) */}
        <Link 
          href="/print/in-progress" 
          className="group text-left bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600 rounded-3xl p-6 text-white shadow-md hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 relative overflow-hidden flex flex-col h-full cursor-pointer"
        >
          <div className="absolute -right-6 -bottom-6 opacity-15 group-hover:scale-110 transition-transform duration-500">
            <Zap className="w-36 h-36" />
          </div>

          <div className="relative z-10 flex flex-col h-full">
            <div className="flex items-center justify-between mb-4">
              <div className="w-11 h-11 bg-white/15 rounded-2xl flex items-center justify-center backdrop-blur-sm shadow-inner group-hover:scale-105 transition-transform">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <span className="text-[10px] font-extrabold bg-white/20 text-amber-100 border border-white/30 px-2.5 py-1 rounded-full backdrop-blur-sm">
                ✏️ ติ๊กเช็คที่บ้าน
              </span>
            </div>

            <h2 className="text-xl font-black mb-2 tracking-tight group-hover:text-amber-100 transition-colors">
              ใบงานที่ยังไม่ทำ
            </h2>
            <p className="text-amber-100 text-xs sm:text-sm leading-relaxed mb-6 flex-grow">
              พิมพ์รายการงานที่กำลังทำและยังไม่ได้ทำ สำหรับวางบนโต๊ะทำการบ้าน เพื่อให้ลูกและผู้ปกครองใช้ดินสอ/ปากกาติ๊กเช็คทีละข้อ
            </p>

            <div className="inline-flex items-center justify-center text-xs font-bold bg-white text-orange-700 px-4 py-2.5 rounded-xl shadow-sm group-hover:bg-amber-50 group-hover:text-orange-800 transition-all mt-auto w-max active:scale-95">
              <Printer className="w-3.5 h-3.5 mr-1.5" /> พิมพ์ใบงานที่ยังไม่ทำ
            </div>
          </div>
        </Link>

        {/* Card 3: ใบงานรอส่ง (สำหรับตรวจกระเป๋านักเรียน) */}
        <Link 
          href="/print/done" 
          className="group text-left bg-gradient-to-br from-blue-500 via-indigo-600 to-blue-700 rounded-3xl p-6 text-white shadow-md hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 relative overflow-hidden flex flex-col h-full cursor-pointer"
        >
          <div className="absolute -right-6 -bottom-6 opacity-15 group-hover:scale-110 transition-transform duration-500">
            <CheckCircle className="w-36 h-36" />
          </div>

          <div className="relative z-10 flex flex-col h-full">
            <div className="flex items-center justify-between mb-4">
              <div className="w-11 h-11 bg-white/15 rounded-2xl flex items-center justify-center backdrop-blur-sm shadow-inner group-hover:scale-105 transition-transform">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
              <span className="text-[10px] font-extrabold bg-white/20 text-blue-100 border border-white/30 px-2.5 py-1 rounded-full backdrop-blur-sm">
                📦 เช็คใส่กระเป๋า
              </span>
            </div>

            <h2 className="text-xl font-black mb-2 tracking-tight group-hover:text-blue-100 transition-colors">
              ใบงานรอส่ง
            </h2>
            <p className="text-blue-100 text-xs sm:text-sm leading-relaxed mb-6 flex-grow">
              พิมพ์รายการงานที่เด็กทำเสร็จแล้ว เพื่อให้ผู้ปกครองตรวจสอบความเรียบร้อยและจัดใส่กระเป๋าเตรียมนำไปส่งครู
            </p>

            <div className="inline-flex items-center justify-center text-xs font-bold bg-white text-blue-700 px-4 py-2.5 rounded-xl shadow-sm group-hover:bg-blue-50 transition-all mt-auto w-max active:scale-95">
              <Printer className="w-3.5 h-3.5 mr-1.5" /> พิมพ์ใบงานรอส่ง
            </div>
          </div>
        </Link>

        {/* Card 4: ใบงานรอครูอัปเดตชีต (สำหรับตามเช็คคะแนน) */}
        <Link 
          href="/print/submitted" 
          className="group text-left bg-gradient-to-br from-emerald-500 via-teal-600 to-emerald-700 rounded-3xl p-6 text-white shadow-md hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 relative overflow-hidden flex flex-col h-full cursor-pointer"
        >
          <div className="absolute -right-6 -bottom-6 opacity-15 group-hover:scale-110 transition-transform duration-500">
            <Clock className="w-36 h-36" />
          </div>

          <div className="relative z-10 flex flex-col h-full">
            <div className="flex items-center justify-between mb-4">
              <div className="w-11 h-11 bg-white/15 rounded-2xl flex items-center justify-center backdrop-blur-sm shadow-inner group-hover:scale-105 transition-transform">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <span className="text-[10px] font-extrabold bg-white/20 text-emerald-100 border border-white/30 px-2.5 py-1 rounded-full backdrop-blur-sm">
                📊 เช็คคะแนนในชีต
              </span>
            </div>

            <h2 className="text-xl font-black mb-2 tracking-tight group-hover:text-emerald-100 transition-colors">
              ใบงานรอครูอัปเดต
            </h2>
            <p className="text-emerald-100 text-xs sm:text-sm leading-relaxed mb-6 flex-grow">
              พิมพ์รายการงานที่ส่งให้ครูแล้ว เพื่อใช้ตรวจสอบเมื่อครูทยอยลงคะแนนตรวจใน Google Sheet
            </p>

            <div className="inline-flex items-center justify-center text-xs font-bold bg-white text-emerald-700 px-4 py-2.5 rounded-xl shadow-sm group-hover:bg-emerald-50 transition-all mt-auto w-max active:scale-95">
              <Printer className="w-3.5 h-3.5 mr-1.5" /> พิมพ์ใบงานรออัปเดต
            </div>
          </div>
        </Link>

      </div>
    </div>
  );
}
