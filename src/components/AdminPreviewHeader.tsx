'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface AdminPreviewHeaderProps {
  motorcycleId?: string | number | null;
}

export default function AdminPreviewHeader({ motorcycleId }: AdminPreviewHeaderProps) {
  const [isAdmin, setIsAdmin] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    let isMounted = true;
    try {
      const supabase = createClient();

      const checkAdmin = async () => {
        try {
          const {
            data: { user },
            error,
          } = await supabase.auth.getUser();

          if (isMounted) {
            // ตรวจสอบสิทธิ์ Central Admin จาก app_metadata.role === 'admin' เท่านั้น
            // ห้ามใช้ข้อมูลจาก user_metadata เป็นตัวตัดสินสิทธิ์
            setIsAdmin(!error && !!user && user.app_metadata?.role === 'admin');
          }
        } catch {
          if (isMounted) setIsAdmin(false);
        }
      };

      checkAdmin();

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        if (isMounted) {
          setIsAdmin(!!session?.user && session.user.app_metadata?.role === 'admin');
        }
      });

      return () => {
        isMounted = false;
        subscription?.unsubscribe();
      };
    } catch (err) {
      console.error('Failed to initialize Supabase in AdminPreviewHeader:', err);
    }
  }, []);

  // ไม่แสดง Admin Preview Mode หากไม่ใช่ Admin หรืออยู่ในหน้าจัดการระบบหลังบ้าน (/admin หรือ /admin/login)
  if (!isAdmin || !pathname || pathname.startsWith('/admin')) {
    return null;
  }

  // หากกำลังดูหน้ารถคันใดคันหนึ่ง ให้ส่ง query param ?id=... เพื่อกลับไปยังรถคันเดิม
  const routeMatch = pathname.match(/^\/motorcycles\/(\d+)/);
  const resolvedId = motorcycleId ?? (routeMatch ? routeMatch[1] : null);
  const backToEditUrl = resolvedId ? `/admin?id=${resolvedId}` : '/admin';

  return (
    <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 animate-in fade-in duration-200">
      {/* ป้าย ADMIN MODE */}
      <div className="flex items-center gap-1.5 px-2 py-1 sm:px-2.5 sm:py-1.5 bg-gray-950 text-white border border-red-500/50 rounded-lg sm:rounded-xl shadow-xs">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
        </span>
        <span className="text-[10px] sm:text-xs font-bold text-red-300 tracking-wider">
          <span className="inline sm:hidden">ADMIN</span>
          <span className="hidden sm:inline">ADMIN MODE</span>
        </span>
      </div>

      {/* ปุ่มกลับไปหน้าแก้ไข */}
      <Link
        href={backToEditUrl}
        className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 bg-red-600 hover:bg-red-700 active:scale-95 text-white text-xs sm:text-sm font-semibold rounded-lg sm:rounded-xl shadow-xs transition-all cursor-pointer whitespace-nowrap"
        title="กลับไปหน้าจัดการข้อมูลรถในระบบหลังบ้าน"
      >
        <ArrowLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        <span className="hidden sm:inline">กลับไปหน้าแก้ไข</span>
        <span className="sm:hidden">แก้ไข</span>
      </Link>

      {/* เส้นแบ่งสายตาระหว่างเครื่องมือ Admin กับเมนูลูกค้า */}
      <div className="h-4 sm:h-5 w-px bg-gray-200 mx-0.5 sm:mx-1" />
    </div>
  );
}
