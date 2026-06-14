'use client';

import { useState, useEffect } from 'react';
import { Lock, Delete, Loader2, KeyRound } from 'lucide-react';
import { getGlobalSettings } from '@/lib/db';
import { clsx } from 'clsx';

export default function AuthWrapper({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [pin, setPin] = useState('');
  const [correctPin, setCorrectPin] = useState('0411');
  const [error, setError] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      // 1. Check local storage
      const authState = localStorage.getItem('hw_pin_auth');
      if (authState === 'true') {
        setIsAuthenticated(true);
      }
      
      // 2. Fetch global settings to get current PIN
      try {
        const settings = await getGlobalSettings();
        if (settings && settings.app_pin) {
          setCorrectPin(settings.app_pin);
        }
      } catch (e) {
        console.error('Failed to get PIN from db', e);
      }
      
      setLoading(false);
    };
    
    // Check auth on mount and whenever window focus happens (to catch PIN changes from other tabs)
    checkAuth();
    window.addEventListener('focus', checkAuth);
    return () => window.removeEventListener('focus', checkAuth);
  }, []);

  const handleKeyPress = (num: string) => {
    if (pin.length < 4) {
      const newPin = pin + num;
      setPin(newPin);
      setError(false);
      
      if (newPin.length === 4) {
        verifyPin(newPin);
      }
    }
  };

  const handleDelete = () => {
    if (pin.length > 0) {
      setPin(pin.slice(0, -1));
      setError(false);
    }
  };

  const verifyPin = (enteredPin: string) => {
    if (enteredPin === correctPin) {
      localStorage.setItem('hw_pin_auth', 'true');
      setIsAuthenticated(true);
    } else {
      setError(true);
      setTimeout(() => {
        setPin('');
        setError(false);
      }, 500);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-gray-50 z-50 fixed inset-0">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <div className="fixed inset-0 bg-white z-[9999] flex flex-col items-center justify-center animate-in fade-in duration-500">
      <div className="w-full max-w-sm px-8">
        <div className="flex flex-col items-center mb-12">
          <div className="w-24 h-24 bg-blue-50 rounded-3xl flex items-center justify-center mb-6 shadow-inner relative rotate-3">
            <Lock className="w-12 h-12 text-blue-600" />
            <div className="absolute -bottom-3 -right-3 bg-green-400 w-8 h-8 rounded-full border-4 border-white flex items-center justify-center shadow-sm">
              <KeyRound className="w-4 h-4 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">ป้อนรหัส PIN</h1>
          <p className="text-gray-500 text-sm text-center">ระบบถูกล็อกเพื่อความเป็นส่วนตัว<br/>กรุณาป้อนรหัสผ่าน 4 หลัก (ค่าเริ่มต้น: 0411)</p>
        </div>

        {/* PIN Dots */}
        <div className="flex justify-center gap-6 mb-12">
          {[0, 1, 2, 3].map((index) => (
            <div 
              key={index}
              className={clsx(
                "w-5 h-5 rounded-full transition-all duration-300",
                pin.length > index ? "bg-blue-600 scale-110 shadow-md" : "bg-gray-100 shadow-inner",
                error && "bg-red-500 scale-100 shadow-none"
              )}
            />
          ))}
        </div>

        {/* Numpad */}
        <div className="grid grid-cols-3 gap-y-6 gap-x-8 max-w-[280px] mx-auto">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              onClick={() => handleKeyPress(num.toString())}
              className="w-16 h-16 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center text-2xl font-semibold text-gray-800 hover:bg-blue-50 active:bg-blue-100 hover:text-blue-700 transition-all mx-auto shadow-sm"
            >
              {num}
            </button>
          ))}
          <div className="w-16 h-16"></div> {/* Empty space */}
          <button
            onClick={() => handleKeyPress('0')}
            className="w-16 h-16 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center text-2xl font-semibold text-gray-800 hover:bg-blue-50 active:bg-blue-100 hover:text-blue-700 transition-all mx-auto shadow-sm"
          >
            0
          </button>
          <button
            onClick={handleDelete}
            className="w-16 h-16 rounded-full flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 active:bg-red-100 transition-colors mx-auto"
          >
            <Delete className="w-7 h-7" />
          </button>
        </div>
      </div>
    </div>
  );
}
