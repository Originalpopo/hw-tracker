'use client';

import { useState, useEffect } from 'react';
import { Save, UserCircle, RefreshCcw, CheckCircle2, Trash2, AlertTriangle, X, ShieldAlert } from 'lucide-react';
import { getGlobalSettings, saveGlobalSettings, clearAllChildTasks } from '@/lib/db';

export default function SettingsPage() {
  const [students, setStudents] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<string>('');
  const [sheetUrls, setSheetUrls] = useState<string>('');
  const [appPin, setAppPin] = useState<string>('0411');
  const [appPinHint, setAppPinHint] = useState<string>('ค่าเริ่มต้น: 0411');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [error, setError] = useState<string | null>(null);

  // Danger Zone / Clear DB state
  const [showClearModal, setShowClearModal] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [clearSuccess, setClearSuccess] = useState(false);

  const fetchStudents = async (url: string) => {
    if (!url) {
      setError('กรุณาใส่ลิงก์ Google Sheet ก่อน');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sheetUrl: url })
      });
      const data = await res.json();
      if (res.ok) {
        setStudents(data.students || []);
      } else {
        setError(data.error || 'Failed to fetch students');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      let savedName = localStorage.getItem('hw_student_name');
      let savedUrls = localStorage.getItem('hw_sheet_urls');
      const oldUrl = localStorage.getItem('hw_sheet_url'); // fallback
      
      if (!savedName || (!savedUrls && !oldUrl)) {
        const globalSettings = await getGlobalSettings();
        if (globalSettings) {
          savedName = globalSettings.student_name;
          savedUrls = globalSettings.sheet_urls;
          if (globalSettings.app_pin) {
            setAppPin(globalSettings.app_pin);
          }
          if (globalSettings.app_pin_hint) {
            setAppPinHint(globalSettings.app_pin_hint);
          }
          localStorage.setItem('hw_student_name', savedName);
          localStorage.setItem('hw_sheet_urls', savedUrls);
        }
      } else {
        // Just fetch the pin if local storage existed
        const globalSettings = await getGlobalSettings();
        if (globalSettings) {
          if (globalSettings.app_pin) setAppPin(globalSettings.app_pin);
          if (globalSettings.app_pin_hint) setAppPinHint(globalSettings.app_pin_hint);
        }
      }
      
      if (savedName) setSelectedStudent(savedName);
      
      if (savedUrls) {
        setSheetUrls(savedUrls);
        fetchStudents(savedUrls.split('\n')[0]);
      } else if (oldUrl) {
        setSheetUrls(oldUrl);
        fetchStudents(oldUrl);
      }
    };
    init();
  }, []);

  const handleSave = async () => {
    const urls = sheetUrls.split('\n').map(u => u.trim()).filter(Boolean);
    if (!selectedStudent || urls.length === 0) {
      setError('กรุณาใส่ลิงก์อย่างน้อย 1 ลิงก์ และเลือกชื่อนักเรียน');
      return;
    }
    if (appPin.length !== 4 || !/^\d{4}$/.test(appPin)) {
      setError('รหัส PIN ต้องเป็นตัวเลข 4 หลักเท่านั้น');
      return;
    }
    setSaveStatus('saving');
    
    // Save to localStorage
    localStorage.setItem('hw_student_name', selectedStudent);
    localStorage.setItem('hw_sheet_urls', sheetUrls);
    
    // Save to Firebase globally
    await saveGlobalSettings({
      student_name: selectedStudent,
      sheet_urls: sheetUrls,
      app_pin: appPin,
      app_pin_hint: appPinHint
    });
    
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 2000);
    // Force reload or trigger an event so Navigation updates (in a real app we might use Context/Zustand)
    window.dispatchEvent(new Event('storage'));
  };

  const handleClearDatabase = async () => {
    if (!selectedStudent) {
      setError('กรุณาเลือกชื่อนักเรียนก่อนทำการล้างข้อมูล');
      setShowClearModal(false);
      return;
    }

    setClearing(true);
    try {
      // Clear ONLY child tasks for this student in Firestore
      await clearAllChildTasks(selectedStudent);
      setClearSuccess(true);
      setShowClearModal(false);
      setTimeout(() => setClearSuccess(false), 4000);
    } catch (err) {
      console.error('Error clearing tasks:', err);
      setError('เกิดข้อผิดพลาดในการล้างข้อมูลงาน');
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-16">
      <div className="bg-white rounded-3xl shadow-sm border border-[#e2e8f0] p-6 sm:p-8">
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-3 bg-[#eef3fc] rounded-2xl">
            <UserCircle className="w-6 h-6 text-[#597ecf]" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 flex items-center">
              ตั้งค่าระบบ (Settings)
            </h1>
            <p className="text-gray-500 mt-1 text-sm sm:text-base">
              เลือกว่าคุณคือใคร และตั้งค่าลิงก์ Google Sheet ของครู
            </p>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 text-red-600 rounded-lg text-sm mb-6 flex items-center justify-between">
            <span>เกิดข้อผิดพลาด: {error}</span>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-700">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="space-y-6">
          
          {/* Google Sheet URL Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ลิงก์ Google Sheet ของครู (ใส่หลายลิงก์ได้)
            </label>
            <textarea 
              value={sheetUrls}
              onChange={(e) => setSheetUrls(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/...&#10;https://docs.google.com/spreadsheets/d/..."
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#597ecf] focus:border-transparent outline-none resize-none"
              rows={4}
            />
            <p className="text-xs text-gray-500 mt-2">
              หากครูแยกวิชาละ 1 Tab (แผ่นงาน) ให้คลิกไปที่ Tab แต่ละวิชา แล้วก๊อปปี้ลิงก์ URL มาวาง **บรรทัดละ 1 ลิงก์**
            </p>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              รายชื่อนักเรียนจากระบบ (อิงจากลิงก์แรก)
            </label>
            
            <div className="flex space-x-2">
              <div className="relative flex-1">
                <select
                  className="w-full pl-4 pr-10 py-3 text-base bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#597ecf] focus:border-transparent transition-all appearance-none cursor-pointer"
                  value={selectedStudent}
                  onChange={(e) => setSelectedStudent(e.target.value)}
                  disabled={loading || students.length === 0}
                >
                  <option value="" disabled>-- กรุณาเลือกชื่อนักเรียน --</option>
                  {students.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              
              <button
                onClick={() => fetchStudents(sheetUrls.split('\n')[0])}
                disabled={loading || !sheetUrls}
                className="p-3 text-gray-500 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 hover:text-gray-700 transition-colors disabled:opacity-50"
                title="ดึงรายชื่อใหม่"
              >
                <RefreshCcw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  รหัส PIN (4 หลัก)
                </label>
                <input 
                  type="text"
                  maxLength={4}
                  pattern="\d*"
                  value={appPin}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    setAppPin(val);
                  }}
                  placeholder="0411"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#597ecf] focus:border-transparent outline-none text-center text-xl tracking-[0.5em] font-bold text-gray-800"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  คำใบ้รหัสผ่าน (PIN Hint)
                </label>
                <input 
                  type="text"
                  value={appPinHint}
                  onChange={(e) => setAppPinHint(e.target.value)}
                  placeholder="เช่น วันเดือนเกิดของลูก"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#597ecf] focus:border-transparent outline-none text-gray-800"
                />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-3 text-center">
              รหัสผ่านที่ใช้สำหรับปลดล็อกเข้าสู่ระบบของทุกคนในครอบครัว
            </p>
          </div>

          <div className="pt-4">
            <button
              onClick={handleSave}
              disabled={!selectedStudent || !sheetUrls || saveStatus === 'saving'}
              className={`w-full flex items-center justify-center py-3 px-4 rounded-xl text-base font-semibold text-white shadow-xs transition-all duration-200 active:scale-95 cursor-pointer ${
                !selectedStudent ? 'bg-gray-300 cursor-not-allowed' : 
                saveStatus === 'saved' ? 'bg-emerald-600 hover:bg-emerald-700' :
                'bg-[#597ecf] hover:bg-[#486cb8]'
              }`}
            >
              {saveStatus === 'saved' ? (
                <>
                  <CheckCircle2 className="w-5 h-5 mr-2" />
                  บันทึกเรียบร้อย
                </>
              ) : (
                <>
                  <Save className="w-5 h-5 mr-2" />
                  {saveStatus === 'saving' ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Danger Zone: Clear Tasks Database */}
      <div className="bg-white rounded-2xl shadow-sm border border-red-100 p-6 sm:p-8">
        <div className="flex items-start space-x-3">
          <div className="p-3 bg-red-50 text-red-600 rounded-xl shrink-0">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-gray-900">จัดการข้อมูล (Danger Zone)</h2>
            <p className="text-sm text-gray-500 mt-1">
              ล้างรายการงานการบ้านทั้งหมดที่คีย์ไว้ในระบบของนักเรียนที่เลือก เพื่อเริ่มต้นดึงข้อมูลจาก Google Sheet ของครูแบบใหม่หมดจด
            </p>
            
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mt-3 text-xs text-amber-800 flex items-start space-x-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                <strong>รับประกันความปลอดภัย:</strong> ลิงก์ Google Sheet, รายชื่อนักเรียน, รหัส PIN และการตั้งค่าทั้งหมดในหน้านี้จะ<strong>ไม่ถูกลบ</strong>
              </span>
            </div>

            {clearSuccess && (
              <div className="mt-4 p-3 bg-emerald-50 text-emerald-800 rounded-xl text-sm flex items-center font-medium border border-emerald-200 animate-in fade-in">
                <CheckCircle2 className="w-5 h-5 mr-2 text-emerald-600 shrink-0" />
                ล้างข้อมูลรายการงานการบ้านของ {selectedStudent} เรียบร้อยแล้ว!
              </div>
            )}

            <div className="mt-5">
              <button
                onClick={() => setShowClearModal(true)}
                disabled={!selectedStudent || clearing}
                className="flex items-center justify-center py-2.5 px-4 bg-red-50 text-red-600 border border-red-200 rounded-xl text-sm font-medium hover:bg-red-600 hover:text-white hover:border-transparent transition-all shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                ล้างข้อมูลงานการบ้าน ({selectedStudent || 'ยังไม่เลือกนักเรียน'})
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showClearModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-gray-100 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto text-red-600">
              <AlertTriangle className="w-6 h-6" />
            </div>
            
            <div className="text-center space-y-2">
              <h3 className="text-xl font-bold text-gray-900">ยืนยันการล้างข้อมูลงาน?</h3>
              <p className="text-sm text-gray-500">
                คุณกำลังจะลบรายการงานการบ้านทั้งหมดของ <strong className="text-gray-800">{selectedStudent}</strong> ออกจาก Database
              </p>
              <div className="bg-gray-50 p-3 rounded-xl text-xs text-gray-600 text-left space-y-1 mt-3">
                <p className="font-semibold text-gray-700">สิ่งที่เกิดขึ้น:</p>
                <p>• รายการงานการบ้านทั้งหมดจะถูกล้างออกจากระบบ</p>
                <p>• ลิงก์ Google Sheet, รายชื่อ และ PIN จะยังคงอยู่ครบถ้วน</p>
                <p>• คุณสามารถกด Sync เพื่อดึงงานชุดใหม่จากครูได้ทันที</p>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowClearModal(false)}
                disabled={clearing}
                className="flex-1 py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl text-sm transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleClearDatabase}
                disabled={clearing}
                className="flex-1 py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl text-sm transition-colors flex items-center justify-center shadow-sm"
              >
                {clearing ? (
                  <>
                    <RefreshCcw className="w-4 h-4 mr-2 animate-spin" />
                    กำลังล้างข้อมูล...
                  </>
                ) : (
                  'ยืนยันการล้างข้อมูล'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
