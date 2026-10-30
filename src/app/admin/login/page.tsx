'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  ShieldCheck,
  AlertCircle,
  ArrowLeft,
  Loader2,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentYear, setCurrentYear] = useState<number | null>(null);

  // กำหนดปีปัจจุบันฝั่ง Client และตรวจสอบพารามิเตอร์แจ้งเตือน error จาก Middleware
  useEffect(() => {
    setCurrentYear(new Date().getFullYear());

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const errorParam = params.get('error');
      if (errorParam === 'unauthorized') {
        setErrorMessage('กรุณาเข้าสู่ระบบด้วยบัญชีผู้ดูแลระบบ (Central Admin) ก่อนเข้าใช้งาน');
      } else if (errorParam === 'config_missing') {
        setErrorMessage('ระบบยังไม่ได้กำหนดค่า Supabase ใน Environment Variables (.env.local)');
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedEmail = email.trim();

    // ตรวจสอบความครบถ้วนของข้อมูล
    if (!trimmedEmail && !password) {
      setErrorMessage('กรุณากรอกอีเมลและรหัสผ่านสำหรับเข้าสู่ระบบ');
      return;
    }

    if (!trimmedEmail) {
      setErrorMessage('กรุณาระบุอีเมลผู้ดูแลระบบ');
      return;
    }

    // ตรวจสอบรูปแบบอีเมลเบื้องต้น
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(trimmedEmail)) {
      setErrorMessage('รูปแบบอีเมลไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง');
      return;
    }

    if (!password) {
      setErrorMessage('กรุณาระบุรหัสผ่าน');
      return;
    }

    // ตรวจสอบความพร้อมของค่า Environment Variables
    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ) {
      setErrorMessage(
        'ไม่พบการตั้งค่า NEXT_PUBLIC_SUPABASE_URL หรือ NEXT_PUBLIC_SUPABASE_ANON_KEY ในระบบ กรุณาตรวจสอบ .env.local'
      );
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();

      // 1. เข้าสู่ระบบด้วย signInWithPassword()
      const { data, error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password: password,
      });

      if (error) {
        if (
          error.message.includes('Invalid login credentials') ||
          error.message.includes('invalid_grant')
        ) {
          setErrorMessage('อีเมลหรือรหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง');
        } else {
          setErrorMessage(`เข้าสู่ระบบไม่สำเร็จ: ${error.message}`);
        }
        setLoading(false);
        return;
      }

      const user = data.user;

      // 2. ตรวจสอบสิทธิ์: ต้องมี user.app_metadata.role === 'admin' เท่านั้น
      // กฎเหล็ก: ห้ามใช้ user_metadata เป็นแหล่งตรวจสอบสิทธิ์
      const role = user?.app_metadata?.role;

      if (role !== 'admin') {
        // หากไม่ใช่ admin ให้ทำลาย session ทันที และปฏิเสธการเข้าถึง
        await supabase.auth.signOut();
        setErrorMessage('ปฏิเสธการเข้าใช้งาน: บัญชีนี้ไม่มีสิทธิ์ผู้ดูแลระบบ (Admin Role Required)');
        setLoading(false);
        return;
      }

      // 3. Login สำเร็จและมีสิทธิ์ admin -> นำทางไปหน้า /admin
      router.push('/admin');
      router.refresh();
    } catch (err: any) {
      console.error('Supabase Auth error:', err);
      setErrorMessage(err?.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อระบบยืนยันตัวตน');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex flex-col justify-between">
      {/* Top Navigation */}
      <header className="bg-white/90 backdrop-blur-md shadow-xs border-b border-gray-100 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 py-3 sm:py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <Image
              src="/logo.png"
              alt="เอ็ม มอเตอร์"
              width={40}
              height={40}
              className="rounded-full w-9 h-9 sm:w-10 sm:h-10 object-cover shadow-xs"
              priority
            />
            <div>
              <h1 className="text-sm sm:text-base font-bold text-gray-900 group-hover:text-red-600 transition-colors leading-tight">
                บริษัท เอ็ม มอเตอร์ จำกัด
              </h1>
              <p className="text-[11px] sm:text-xs text-gray-500">
                ระบบจัดการแคตตาล็อกรถจักรยานยนต์ Honda
              </p>
            </div>
          </Link>

          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium text-gray-600 hover:text-red-600 bg-white hover:bg-red-50 rounded-lg border border-gray-200 transition-all shadow-2xs"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">กลับหน้าหลักแคตตาล็อก</span>
            <span className="sm:hidden">หน้าหลัก</span>
          </Link>
        </div>
      </header>

      {/* Main Login Form Area */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 my-6">
        <div className="w-full max-w-md">
          {/* Card Container */}
          <div className="bg-white rounded-3xl shadow-xl border border-red-100/70 p-6 sm:p-8 backdrop-blur-sm">
            {/* Logo & Header */}
            <div className="text-center mb-6 sm:mb-8">
              <div className="inline-flex p-3 bg-red-50 rounded-2xl border border-red-100 mb-3 shadow-inner">
                <Image
                  src="/logo.png"
                  alt="เอ็ม มอเตอร์ โลโก้"
                  width={64}
                  height={64}
                  className="rounded-xl w-14 h-14 sm:w-16 sm:h-16 object-cover"
                />
              </div>

              <div className="flex items-center justify-center gap-1.5 mb-1.5">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded-full">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Central Admin
                </span>
              </div>

              <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900 tracking-tight">
                เข้าสู่ระบบผู้ดูแลส่วนกลาง
              </h2>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">
                สำหรับผู้ดูแลระบบ M Motor Catalog เท่านั้น
              </p>
            </div>

            {/* Error Alert Box */}
            {errorMessage && (
              <div
                className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-red-700 text-xs sm:text-sm animate-in fade-in duration-200"
                role="alert"
              >
                <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                <span className="leading-relaxed font-medium">{errorMessage}</span>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5" noValidate>
              {/* Email Field */}
              <div>
                <label
                  htmlFor="admin-email"
                  className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5"
                >
                  อีเมลผู้ดูแลระบบ <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <Mail className="h-4 w-4" />
                  </div>
                  <input
                    id="admin-email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    placeholder="admin@mmotor.com"
                    autoComplete="email"
                    disabled={loading}
                    className="w-full pl-10 pr-4 py-2.5 sm:py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:outline-hidden focus:ring-2 focus:ring-red-500 focus:border-transparent focus:bg-white transition-all disabled:opacity-60"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <label
                  htmlFor="admin-password"
                  className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5"
                >
                  รหัสผ่าน <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    id="admin-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    disabled={loading}
                    className="w-full pl-10 pr-11 py-2.5 sm:py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:outline-hidden focus:ring-2 focus:ring-red-500 focus:border-transparent focus:bg-white transition-all disabled:opacity-60"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={loading}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
                    title={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                    aria-label={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-red-600 hover:bg-red-700 active:scale-[0.99] text-white font-semibold rounded-xl text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer mt-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>กำลังเข้าสู่ระบบ...</span>
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4" />
                    <span>เข้าสู่ระบบ</span>
                  </>
                )}
              </button>
            </form>

            {/* Information Notice Box */}
            <div className="mt-6 pt-5 border-t border-gray-100 text-[11px] sm:text-xs text-gray-500 space-y-1.5 bg-gray-50/70 p-3.5 rounded-xl">
              <div className="flex items-start gap-2">
                <span className="text-red-500 font-bold shrink-0">•</span>
                <span>
                  <strong>บัญชี Central Admin:</strong> มีเพียงบัญชีเดียวสำหรับจัดการข้อมูลรถ รูปภาพ และตารางผ่อนทั้งระบบ
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-red-500 font-bold shrink-0">•</span>
                <span>
                  <strong>ลูกค้าทั่วไป:</strong> สามารถเข้าชมแคตตาล็อกและคำนวณค่างวดได้ทันทีโดยไม่ต้องเข้าสู่ระบบ
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white/80 border-t border-gray-200/60 py-4 text-center">
        <div className="max-w-7xl mx-auto px-4">
          <p className="text-xs text-gray-500" suppressHydrationWarning>
            © {currentYear || ''} บริษัท เอ็ม มอเตอร์ จำกัด — สงวนลิขสิทธิ์
          </p>
        </div>
      </footer>
    </div>
  );
}
