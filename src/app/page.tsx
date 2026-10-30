'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { QrCode, Search, ChevronRight, Sparkles, PhoneCall } from 'lucide-react';
import AdminPreviewHeader from '@/components/AdminPreviewHeader';

interface Motorcycle {
  id: number;
  name: string;
  model: string;
  cash_price: number | null;
  finance_amount: number | null;
  cc_size: number | null;
  description: string | null;
  image_url: string | null;
  colors?: {
    id: number;
    color_name: string;
    color_code?: string | null;
    image_url: string;
    is_default?: number;
  }[];
}

export default function Home() {
  const [motorcycles, setMotorcycles] = useState<Motorcycle[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMotorcycles();
  }, []);

  const fetchMotorcycles = async () => {
    try {
      const response = await fetch('/api/motorcycles');
      const data = await response.json();
      setMotorcycles(data);
    } catch (error) {
      console.error('Failed to fetch motorcycles:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredMotorcycles = motorcycles.filter((m) => {
    const q = searchTerm.toLowerCase();
    return (
      m.name.toLowerCase().includes(q) ||
      m.model.toLowerCase().includes(q) ||
      (m.description && m.description.toLowerCase().includes(q))
    );
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">กำลังโหลดข้อมูลรถจักรยานยนต์...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex flex-col justify-between">
      <div>
        {/* Header */}
        <header className="bg-white shadow-md sticky top-0 z-30">
          <div className="max-w-7xl mx-auto px-4 py-3 sm:py-5">
            <div className="flex items-center justify-between gap-2 sm:gap-4">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                <Image
                  src="/logo.png"
                  alt="เอ็ม มอเตอร์"
                  width={48}
                  height={48}
                  className="rounded-full w-9 h-9 sm:w-12 sm:h-12 object-cover shadow-sm shrink-0"
                />
                <div className="min-w-0">
                  <h1 className="text-sm sm:text-2xl font-bold text-gray-900 leading-tight truncate sm:overflow-visible">
                    บริษัท เอ็ม มอเตอร์ จำกัด
                  </h1>
                  <p className="text-xs sm:text-sm text-gray-500 hidden sm:block">ผู้จำหน่ายรถจักรยานยนต์ Honda มือ 1</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <AdminPreviewHeader />
                <Link
                  href="/qr"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs sm:text-sm font-medium transition-colors"
                  title="สแกน QR Code"
                >
                  <QrCode className="h-4 w-4" />
                  <span className="hidden sm:inline">QR แคตตาล็อก</span>
                </Link>
              </div>
            </div>
          </div>
        </header>

        {/* Hero Banner */}
        <section className="max-w-7xl mx-auto px-4 pt-6 sm:pt-10 pb-4 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold mb-3">
            <Sparkles className="h-3.5 w-3.5" />
            <span>แคตตาล็อกรถจักรยานยนต์ Honda มือ 1 พร้อมโปรโมชั่น</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
            เลือกรุ่นรถที่คุณสนใจ
          </h2>
          <p className="text-sm sm:text-base text-gray-600 mt-2 max-w-2xl mx-auto">
            กดเลือกรุ่นรถเพื่อดูราคาสด ข้อมูลสเปก และคำนวณตารางค่างวดผ่อนชำระแบบรายเดือน
          </p>

          {/* Search box */}
          {motorcycles.length > 4 && (
            <div className="mt-6 max-w-md mx-auto relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="ค้นหารุ่นรถ เช่น Wave, PCX, Click..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent shadow-sm"
              />
            </div>
          )}
        </section>

        {/* Motorcycle Grid */}
        <main className="max-w-7xl mx-auto px-4 py-6 sm:py-8">
          {filteredMotorcycles.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
              {filteredMotorcycles.map((motorcycle) => (
                <Link
                  key={motorcycle.id}
                  href={`/motorcycles/${motorcycle.id}`}
                  className="bg-white rounded-2xl border border-gray-200 hover:border-red-500 hover:shadow-xl transition-all duration-300 flex flex-col justify-between overflow-hidden group hover:-translate-y-1"
                >
                  {/* Image Container */}
                  <div className="bg-slate-50 p-4 sm:p-6 flex items-center justify-center relative overflow-hidden h-36 sm:h-48 border-b border-gray-100">
                    {motorcycle.image_url ? (
                      <img
                        src={motorcycle.image_url}
                        alt={motorcycle.name}
                        className="w-full h-full object-contain group-hover:scale-108 transition-transform duration-300 drop-shadow-sm"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                        ไม่มีรูปภาพ
                      </div>
                    )}
                    {motorcycle.colors && motorcycle.colors.length > 0 && (
                      <span className="absolute top-2.5 left-2.5 px-2 py-0.5 bg-white/90 text-gray-800 rounded-md text-[10px] sm:text-xs font-semibold shadow-xs border border-gray-200 backdrop-blur-sm flex items-center gap-1">
                        🎨 {motorcycle.colors.length} สี
                      </span>
                    )}
                    {motorcycle.cc_size && (
                      <span className="absolute top-2.5 right-2.5 px-2 py-0.5 bg-gray-900/80 text-white rounded-md text-[10px] sm:text-xs font-semibold backdrop-blur-sm">
                        {motorcycle.cc_size} CC
                      </span>
                    )}
                  </div>

                  {/* Body Content */}
                  <div className="p-3.5 sm:p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <span className="text-[11px] font-semibold text-red-600 uppercase tracking-wide">
                        {motorcycle.model}
                      </span>
                      <h3 className="font-bold text-sm sm:text-lg text-gray-900 group-hover:text-red-600 transition-colors line-clamp-1 mt-0.5">
                        {motorcycle.name}
                      </h3>
                      {motorcycle.colors && motorcycle.colors.length > 0 && (
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <div className="flex -space-x-1 items-center">
                            {motorcycle.colors.slice(0, 5).map((c) => (
                              <span
                                key={c.id}
                                className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full border border-white shadow-xs inline-block"
                                style={{ backgroundColor: c.color_code || '#cbd5e1' }}
                                title={c.color_name}
                              />
                            ))}
                          </div>
                          <span className="text-[10px] sm:text-xs text-gray-500 font-medium">
                            {motorcycle.colors.length} สีตัวเลือก
                          </span>
                        </div>
                      )}
                      {motorcycle.description && (
                        <p className="text-gray-500 text-xs line-clamp-2 mt-1.5 hidden sm:block">
                          {motorcycle.description}
                        </p>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-gray-100">
                      {motorcycle.cash_price ? (
                        <div>
                          <p className="text-[11px] text-gray-400 font-medium">ราคาขายสด</p>
                          <p className="text-base sm:text-xl font-extrabold text-red-600">
                            ฿{motorcycle.cash_price.toLocaleString()}
                          </p>
                        </div>
                      ) : (
                        <p className="text-xs sm:text-sm font-semibold text-gray-600">
                          ดูตารางผ่อนชำระ
                        </p>
                      )}

                      <div className="mt-3 flex items-center justify-between text-xs font-semibold text-red-600 group-hover:text-red-700">
                        <span>ดูตารางผ่อน</span>
                        <ChevronRight className="h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm p-12 text-center max-w-md mx-auto">
              <p className="text-gray-700 font-bold text-lg mb-1">ไม่พบรถมอเตอร์ไซค์ที่ค้นหา</p>
              <p className="text-gray-400 text-sm mb-4">ลองค้นหาด้วยคำอื่น หรือกดล้างการค้นหา</p>
              <button
                onClick={() => setSearchTerm('')}
                className="px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 transition-colors"
              >
                แสดงรถทั้งหมด
              </button>
            </div>
          )}
        </main>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white mt-12 py-8">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h3 className="text-lg font-bold mb-1">บริษัท เอ็ม มอเตอร์ จำกัด</h3>
          <p className="text-gray-400 text-sm mb-4">ผู้จำหน่ายรถจักรยานยนต์ Honda มือ 1</p>
          <div className="flex justify-center gap-4 mb-4 text-sm">
            <a
              href="https://www.facebook.com/profile.php?id=61590568614695"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-white transition-colors"
            >
              Facebook
            </a>
            <span className="text-gray-600">|</span>
            <a
              href="https://linktr.ee/mmotorcompany"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-white transition-colors"
            >
              Linktree
            </a>
          </div>
          <p className="text-gray-500 text-xs"> 2026 บริษัท เอ็ม มอเตอร์ จำกัด. สงวนลิขสิทธิ์</p>
        </div>
      </footer>
    </div>
  );
}
