import Link from 'next/link';
import { Printer, CalendarClock, CheckCircle, Zap, Clock } from 'lucide-react';

export default function PrintHubPage() {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 max-w-[90rem] mx-auto px-4">
      <div className="bg-white rounded-3xl p-6 md:p-8 text-center">
        <h1 className="text-3xl font-extrabold text-gray-900 mb-4">
          ศูนย์รวมการพิมพ์ใบงาน
        </h1>
        <p className="text-gray-500 text-lg mb-10 max-w-lg mx-auto">
          เลือกรูปแบบใบติดตามงานที่คุณต้องการพิมพ์ เพื่อนำไปใช้เช็คงานของฮีโร่ตัวน้อย
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link href="/print/pending" className="group text-left bg-gradient-to-br from-gray-400 to-gray-500 rounded-2xl p-5 text-white shadow-md hover:shadow-xl transition-all transform hover:-translate-y-1 relative overflow-hidden flex flex-col h-full">
            <div className="absolute -right-4 -bottom-4 opacity-20 group-hover:scale-110 transition-transform duration-500">
              <CalendarClock className="w-24 h-24" />
            </div>
            <div className="relative z-10 flex flex-col h-full">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center mb-4 backdrop-blur-sm">
                <CalendarClock className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-bold mb-2">ใบตามงานจากครู</h2>
              <p className="text-gray-50 text-sm mb-6 flex-grow">พิมพ์รายการงานทั้งหมดที่ครูสั่ง แต่ยังไม่ได้ตรวจหรือเคลียร์ให้เสร็จ</p>
              <div className="inline-flex items-center justify-center text-xs font-bold bg-white text-gray-600 px-3 py-2 rounded-full shadow-sm group-hover:bg-gray-50 transition-colors mt-auto w-max">
                ไปพิมพ์ใบตามงานจากครู
              </div>
            </div>
          </Link>

          <Link href="/print/in-progress" className="group text-left bg-gradient-to-br from-orange-400 to-orange-500 rounded-2xl p-5 text-white shadow-md hover:shadow-xl transition-all transform hover:-translate-y-1 relative overflow-hidden flex flex-col h-full">
            <div className="absolute -right-4 -bottom-4 opacity-20 group-hover:scale-110 transition-transform duration-500">
              <Zap className="w-24 h-24" />
            </div>
            <div className="relative z-10 flex flex-col h-full">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center mb-4 backdrop-blur-sm">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-bold mb-2">ใบงานที่กำลังทำ / ยังไม่ทำ</h2>
              <p className="text-orange-50 text-sm mb-6 flex-grow">พิมพ์รายการงานที่ฮีโร่กำลังดำเนินการอยู่หรือยังไม่ได้เริ่มทำ</p>
              <div className="inline-flex items-center justify-center text-xs font-bold bg-white text-orange-600 px-3 py-2 rounded-full shadow-sm group-hover:bg-orange-50 transition-colors mt-auto w-max">
                ไปพิมพ์ใบงานที่กำลังทำ / ยังไม่ทำ
              </div>
            </div>
          </Link>

          <Link href="/print/done" className="group text-left bg-gradient-to-br from-blue-400 to-blue-500 rounded-2xl p-5 text-white shadow-md hover:shadow-xl transition-all transform hover:-translate-y-1 relative overflow-hidden flex flex-col h-full">
            <div className="absolute -right-4 -bottom-4 opacity-20 group-hover:scale-110 transition-transform duration-500">
              <CheckCircle className="w-24 h-24" />
            </div>
            <div className="relative z-10 flex flex-col h-full">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center mb-4 backdrop-blur-sm">
                <CheckCircle className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-bold mb-2">ใบงานรอส่ง</h2>
              <p className="text-blue-50 text-sm mb-6 flex-grow">พิมพ์รายการงานที่ฮีโร่ทำเสร็จแล้ว เพื่อให้ผู้ปกครองตรวจสอบและนำไปส่งครู</p>
              <div className="inline-flex items-center justify-center text-xs font-bold bg-white text-blue-600 px-3 py-2 rounded-full shadow-sm group-hover:bg-blue-50 transition-colors mt-auto w-max">
                ไปพิมพ์ใบงานรอส่ง
              </div>
            </div>
          </Link>

          <Link href="/print/submitted" className="group text-left bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-5 text-white shadow-md hover:shadow-xl transition-all transform hover:-translate-y-1 relative overflow-hidden flex flex-col h-full">
            <div className="absolute -right-4 -bottom-4 opacity-20 group-hover:scale-110 transition-transform duration-500">
              <Clock className="w-24 h-24" />
            </div>
            <div className="relative z-10 flex flex-col h-full">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center mb-4 backdrop-blur-sm">
                <Clock className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-bold mb-2">ใบงานที่รอครูอัปเดตชีต</h2>
              <p className="text-green-50 text-sm mb-6 flex-grow">พิมพ์รายการงานที่ส่งให้ครูแล้ว แต่กำลังรอให้ครูตรวจและอัปเดตลงใน Google Sheet</p>
              <div className="inline-flex items-center justify-center text-xs font-bold bg-white text-green-600 px-3 py-2 rounded-full shadow-sm group-hover:bg-green-50 transition-colors mt-auto w-max">
                ไปพิมพ์ใบงานที่รอครูอัปเดต
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
