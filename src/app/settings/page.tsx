'use client';

import { useState, useEffect } from 'react';
import { Save, UserCircle, RefreshCcw, CheckCircle2 } from 'lucide-react';
import { getGlobalSettings, saveGlobalSettings } from '@/lib/db';

export default function SettingsPage() {
  const [students, setStudents] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<string>('');
  const [sheetUrls, setSheetUrls] = useState<string>('');
  const [appPin, setAppPin] = useState<string>('0411');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [error, setError] = useState<string | null>(null);

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
          localStorage.setItem('hw_student_name', savedName);
          localStorage.setItem('hw_sheet_urls', savedUrls);
        }
      } else {
        // Just fetch the pin if local storage existed
        const globalSettings = await getGlobalSettings();
        if (globalSettings && globalSettings.app_pin) {
          setAppPin(globalSettings.app_pin);
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
      app_pin: appPin
    });
    
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 2000);
    // Force reload or trigger an event so Navigation updates (in a real app we might use Context/Zustand)
    window.dispatchEvent(new Event('storage'));
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-3 bg-indigo-50 rounded-xl">
            <UserCircle className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">ตั้งค่าผู้ใช้งาน</h1>
            <p className="text-sm text-gray-500">เลือกว่าคุณคือใคร เพื่อให้ระบบดึงงานได้ถูกต้อง</p>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 text-red-600 rounded-lg text-sm mb-6">
            เกิดข้อผิดพลาด: {error}
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
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none"
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
                  className="w-full pl-4 pr-10 py-3 text-base bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all appearance-none cursor-pointer"
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
            <label className="block text-sm font-medium text-gray-700 mb-2">
              รหัส PIN สำหรับเข้าใช้งานระบบ (4 หลัก)
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
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-center text-xl tracking-[0.5em] font-bold text-gray-800"
            />
            <p className="text-xs text-gray-500 mt-2 text-center">
              รหัสผ่านที่ใช้สำหรับปลดล็อกเข้าสู่ระบบของทุกคนในครอบครัว (ค่าเริ่มต้น 0411)
            </p>
          </div>

          <div className="pt-4">
            <button
              onClick={handleSave}
              disabled={!selectedStudent || !sheetUrls || saveStatus === 'saving'}
              className={`w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-xl text-base font-medium text-white shadow-sm transition-all duration-200 ${
                !selectedStudent ? 'bg-gray-300 cursor-not-allowed' : 
                saveStatus === 'saved' ? 'bg-green-500 hover:bg-green-600' :
                'bg-indigo-600 hover:bg-indigo-700 hover:shadow-md'
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
    </div>
  );
}
