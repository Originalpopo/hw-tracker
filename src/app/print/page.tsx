import Link from 'next/link';
import { Printer, CalendarClock, CheckCircle, Zap, Clock } from 'lucide-react';

export default function PrintHubPage() {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 max-w-4xl mx-auto">
      <div className="bg-white rounded-3xl p-8 text-center">
        <div className="w-20 h-20 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner">
          <Printer className="w-10 h-10 text-blue-600" />
        </div>
        <h1 className="text-3xl font-extrabold text-gray-900 mb-4">
          ศูนย์รวมการพิมพ์ใบงาน
        </h1>
        <p className="text-gray-500 text-lg mb-10 max-w-lg mx-auto">
          เลือกรูปแบบใบติดตามงานที่คุณต้องการพิมพ์ เพื่อนำไปใช้เช็คงานของฮีโร่ตัวน้อย
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link href="/print/pending" className="group text-left bg-gradient-to-br from-orange-400 to-orange-500 rounded-3xl p-8 text-white shadow-md hover:shadow-xl transition-all transform hover:-translate-y-1 relative overflow-hidden">
            <div className="absolute -right-4 -bottom-4 opacity-20 group-hover:scale-110 transition-transform duration-500">
              <CalendarClock className="w-32 h-32" />
            </div>
            <div className="relative z-10">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-6 backdrop-blur-sm">
                <CalendarClock className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-2xl font-bold mb-2">ใบตามงานจากครู</h2>
              <p className="text-orange-50 mb-6">พิมพ์รายการงานทั้งหมดที่ครูสั่ง แต่ยังไม่ได้ตรวจหรือเคลียร์ให้เสร็จ</p>
              <div className="inline-flex items-center text-sm font-bold bg-white text-orange-600 px-4 py-2 rounded-full shadow-sm group-hover:bg-orange-50 transition-colors">
                ไปพิมพ์ใบตามงานจากครู
              </div>
            </div>
          </Link>

          <Link href="/print/in-progress" className="group text-left bg-gradient-to-br from-blue-400 to-blue-500 rounded-3xl p-8 text-white shadow-md hover:shadow-xl transition-all transform hover:-translate-y-1 relative overflow-hidden">
            <div className="absolute -right-4 -bottom-4 opacity-20 group-hover:scale-110 transition-transform duration-500">
              <Zap className="w-32 h-32" />
            </div>
            <div className="relative z-10">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-6 backdrop-blur-sm">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-2xl font-bold mb-2">ใบงานที่กำลังทำ</h2>
              <p className="text-blue-50 mb-6">พิมพ์รายการงานที่ฮีโร่กำลังดำเนินการอยู่ เพื่อใช้เช็คความคืบหน้าระหว่างทำ</p>
              <div className="inline-flex items-center text-sm font-bold bg-white text-blue-600 px-4 py-2 rounded-full shadow-sm group-hover:bg-blue-50 transition-colors">
                ไปพิมพ์ใบงานที่กำลังทำ
              </div>
            </div>
          </Link>

          <Link href="/print/done" className="group text-left bg-gradient-to-br from-green-500 to-green-600 rounded-3xl p-8 text-white shadow-md hover:shadow-xl transition-all transform hover:-translate-y-1 relative overflow-hidden">
            <div className="absolute -right-4 -bottom-4 opacity-20 group-hover:scale-110 transition-transform duration-500">
              <CheckCircle className="w-32 h-32" />
            </div>
            <div className="relative z-10">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-6 backdrop-blur-sm">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-2xl font-bold mb-2">ใบงานรอส่ง</h2>
              <p className="text-green-50 mb-6">พิมพ์รายการงานที่ฮีโร่ทำเสร็จแล้ว เพื่อให้ผู้ปกครองตรวจสอบและนำไปส่งครู</p>
              <div className="inline-flex items-center text-sm font-bold bg-white text-green-600 px-4 py-2 rounded-full shadow-sm group-hover:bg-green-50 transition-colors">
                ไปพิมพ์ใบงานรอส่ง
              </div>
            </div>
          </Link>

          <Link href="/print/submitted" className="group text-left bg-gradient-to-br from-purple-400 to-purple-500 rounded-3xl p-8 text-white shadow-md hover:shadow-xl transition-all transform hover:-translate-y-1 relative overflow-hidden">
            <div className="absolute -right-4 -bottom-4 opacity-20 group-hover:scale-110 transition-transform duration-500">
              <Clock className="w-32 h-32" />
            </div>
            <div className="relative z-10">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-6 backdrop-blur-sm">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-2xl font-bold mb-2">ใบงานที่รอครูอัปเดตชีต</h2>
              <p className="text-purple-50 mb-6">พิมพ์รายการงานที่ส่งให้ครูแล้ว แต่กำลังรอให้ครูตรวจและอัปเดตลงใน Google Sheet</p>
              <div className="inline-flex items-center text-sm font-bold bg-white text-purple-600 px-4 py-2 rounded-full shadow-sm group-hover:bg-purple-50 transition-colors">
                ไปพิมพ์ใบงานที่รอครูอัปเดต
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
